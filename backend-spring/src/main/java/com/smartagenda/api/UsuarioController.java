package com.smartagenda.api;
import jakarta.servlet.http.HttpSession;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/usuarios") public class UsuarioController {
  private static final List<String> ROLES = List.of("Cliente", "Profesional", "Administrador");
  private static final String TURNOS_PROXIMOS =
      " AND t.estado IN ('pendiente','confirmado') AND (t.fecha>? OR (t.fecha=? AND t.horaFin>?))";

  private final JdbcTemplate jdbc;
  private final SesionesActivas sesiones;

  public UsuarioController(JdbcTemplate jdbc, SesionesActivas sesiones) {
    this.jdbc = jdbc;
    this.sesiones = sesiones;
  }

  @GetMapping public List<Map<String,Object>> list(HttpSession s){
    SessionSupport.role(s,"Administrador");
    return jdbc.queryForList("SELECT u.idUsuario,u.nombre,u.apellido,u.email,u.telefono,u.estado,u.fechaRegistro,r.nombreRol rol,"
        + "EXISTS(SELECT 1 FROM profesional p WHERE p.idUsuario=u.idUsuario) tienePerfilProfesional,"
        + "(SELECT f.version FROM foto_perfil f WHERE f.idUsuario=u.idUsuario) fotoVersion "
        + "FROM usuario u JOIN rol r ON u.idRol=r.idRol ORDER BY u.fechaRegistro DESC");
  }

  /**
   * Datos personales y estado de una cuenta. El rol no se cambia por acá: tiene sus propias reglas
   * (ver {@link #cambiarRol}). Nadie puede desactivar su propia cuenta.
   */
  @PutMapping public Map<String,String> update(@RequestBody Map<String,Object>b,HttpSession s){
    Map<String,Object> admin = SessionSupport.role(s,"Administrador");
    int id=AuthController.number(b,"idUsuario",0);
    if(id<=0)throw new ApiException(HttpStatus.BAD_REQUEST,"ID de usuario requerido");
    if(b.containsKey("estado")){
      String estado=String.valueOf(b.get("estado"));
      if(!estado.equals("activo")&&!estado.equals("inactivo"))throw new ApiException(HttpStatus.BAD_REQUEST,"Estado no válido");
      if(id==SessionSupport.intValue(admin,"idUsuario")&&estado.equals("inactivo"))throw new ApiException(HttpStatus.FORBIDDEN,"No podés desactivar tu propia cuenta");
    }
    List<String> fields=new ArrayList<>();List<Object> params=new ArrayList<>();
    for(String field:List.of("estado","nombre","apellido","telefono"))ProfesionalController.add(b,field,fields,params);
    if(fields.isEmpty())throw new ApiException(HttpStatus.BAD_REQUEST,"No hay datos para actualizar");
    params.add(id);
    if(jdbc.update("UPDATE usuario SET "+String.join(",",fields)+" WHERE idUsuario=?",params.toArray())==0&&
        jdbc.queryForObject("SELECT COUNT(*) FROM usuario WHERE idUsuario=?",Integer.class,id)==0)
      throw new ApiException(HttpStatus.NOT_FOUND,"Usuario no encontrado");
    // Una cuenta desactivada no puede seguir usando una sesión que ya tenía abierta
    if("inactivo".equals(String.valueOf(b.get("estado"))))sesiones.cerrarSesionesDe(id);
    return Map.of("message","Usuario actualizado correctamente");
  }

  /**
   * Cambia el rol de un usuario (solo administradores). Reglas:
   * no se puede cambiar el propio rol; no se puede dejar un rol si hay turnos próximos que dependen de él;
   * para pasar a Profesional hace falta un perfil profesional (negocio, rubro y localidad) si no lo tenía.
   * Al terminar se cierran las sesiones abiertas del usuario para que el rol nuevo rija enseguida.
   */
  @Transactional
  @PutMapping("/rol") public Map<String,String> cambiarRol(@RequestBody Map<String,Object>b,HttpSession s){
    Map<String,Object> admin = SessionSupport.role(s,"Administrador");
    int id=AuthController.number(b,"idUsuario",0);
    String nuevoRol=AuthController.text(b,"rol");
    if(id<=0)throw new ApiException(HttpStatus.BAD_REQUEST,"ID de usuario requerido");
    if(!ROLES.contains(nuevoRol))throw new ApiException(HttpStatus.BAD_REQUEST,"Rol no válido");
    if(id==SessionSupport.intValue(admin,"idUsuario"))throw new ApiException(HttpStatus.FORBIDDEN,"No podés cambiar tu propio rol");

    Map<String,Object> usuario;
    try{usuario=jdbc.queryForMap("SELECT u.nombre,u.apellido,r.nombreRol rol FROM usuario u JOIN rol r ON u.idRol=r.idRol WHERE u.idUsuario=?",id);}
    catch(EmptyResultDataAccessException e){throw new ApiException(HttpStatus.NOT_FOUND,"Usuario no encontrado");}
    String actual=String.valueOf(usuario.get("rol"));
    if(actual.equals(nuevoRol))throw new ApiException(HttpStatus.CONFLICT,"El usuario ya tiene el rol "+nuevoRol);

    // Los turnos próximos del rol que se deja quedarían sin nadie que los gestione
    int proximos=0;
    if("Cliente".equals(actual))proximos=contarTurnosProximos("t.idCliente=?",id);
    if("Profesional".equals(actual))proximos=contarTurnosProximos("t.idProfesional=(SELECT idProfesional FROM profesional WHERE idUsuario=?)",id);
    if(proximos>0)throw new ApiException(HttpStatus.CONFLICT,"No se puede cambiar el rol: "+usuario.get("nombre")+" tiene "+proximos
        +(proximos==1?" turno próximo":" turnos próximos")+" como "+actual.toLowerCase()+". Tienen que cancelarse o completarse antes.");

    if("Profesional".equals(nuevoRol))asegurarPerfilProfesional(id,b);
    jdbc.update("UPDATE usuario SET idRol=(SELECT idRol FROM rol WHERE nombreRol=?) WHERE idUsuario=?",nuevoRol,id);
    sesiones.cerrarSesionesDe(id);
    return Map.of("message",usuario.get("nombre")+" "+usuario.get("apellido")+" ahora es "+nuevoRol+". Si estaba conectado/a, tiene que volver a iniciar sesión.");
  }

  /** Foto de perfil de un usuario. La ve cualquier usuario con sesión si es de un profesional; la de clientes y administradores, solo su dueño y los administradores. */
  @GetMapping("/{id}/foto") public ResponseEntity<byte[]> foto(@PathVariable int id,HttpSession s){
    Map<String,Object> actual=SessionSupport.user(s);
    List<Map<String,Object>> filas=jdbc.queryForList("SELECT f.tipoMime,f.datos,r.nombreRol rol FROM foto_perfil f JOIN usuario u ON u.idUsuario=f.idUsuario JOIN rol r ON r.idRol=u.idRol WHERE f.idUsuario=?",id);
    boolean permitido=!filas.isEmpty()&&("Profesional".equals(filas.get(0).get("rol"))||SessionSupport.isAdmin(actual)||SessionSupport.intValue(actual,"idUsuario")==id);
    if(!permitido)throw new ApiException(HttpStatus.NOT_FOUND,"El usuario no tiene foto");
    Map<String,Object> fila=filas.get(0);
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(String.valueOf(fila.get("tipoMime"))))
        .cacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePrivate().immutable()) // la URL lleva la versión: cambia con cada foto nueva
        .header("X-Content-Type-Options","nosniff")
        .body((byte[])fila.get("datos"));
  }

  private int contarTurnosProximos(String condicion,int id){
    LocalDate hoy=LocalDate.now();
    Integer n=jdbc.queryForObject("SELECT COUNT(*) FROM turno t WHERE "+condicion+TURNOS_PROXIMOS,Integer.class,id,hoy,hoy,LocalTime.now());
    return n==null?0:n;
  }

  /** Si el usuario nunca fue profesional, crea su perfil con los datos que mandó el administrador; si ya lo tenía, se conserva. */
  private void asegurarPerfilProfesional(int idUsuario,Map<String,Object> b){
    if(jdbc.queryForObject("SELECT COUNT(*) FROM profesional WHERE idUsuario=?",Integer.class,idUsuario)>0)return;
    String negocio=AuthController.text(b,"nombreNegocio");
    if(negocio.isBlank())throw new ApiException(HttpStatus.BAD_REQUEST,"Para pasar a Profesional indicá el nombre del negocio");
    if(negocio.length()>100)throw new ApiException(HttpStatus.BAD_REQUEST,"El nombre del negocio es demasiado largo");
    String localidad=ProfesionalController.localidadValida(b,true);
    int rubro=AuthController.number(b,"idRubro",0);
    if(rubro<=0||jdbc.queryForObject("SELECT COUNT(*) FROM rubro WHERE idRubro=? AND estado='activo'",Integer.class,rubro)==0)
      throw new ApiException(HttpStatus.BAD_REQUEST,"Seleccioná un rubro activo");
    jdbc.update("INSERT INTO profesional(nombreNegocio,descripcion,localidad,idRubro,idUsuario) VALUES(?,?,?,?,?)",negocio,AuthController.text(b,"descripcion"),localidad,rubro,idUsuario);
  }
}
