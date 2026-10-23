package com.smartagenda.api;
import jakarta.servlet.http.HttpSession;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/profesionales") public class ProfesionalController {
  private static final int MAX_LOCALIDAD = 100;

  private final JdbcTemplate jdbc;
  private final DisponibilidadProfesionales disponibilidad;

  public ProfesionalController(JdbcTemplate jdbc, DisponibilidadProfesionales disponibilidad) {
    this.jdbc = jdbc;
    this.disponibilidad = disponibilidad;
  }

  /**
   * Búsqueda de profesionales. Filtros: texto libre (nombre, negocio, rubro o localidad), rubro,
   * localidad y fecha (solo los que tienen lugar para reservar ese día). Cada resultado indica si
   * tiene lugar hoy y cuál es su próximo lugar libre; la lista sale ordenada por disponibilidad.
   */
  @GetMapping public Object list(@RequestParam(required=false) Integer id,@RequestParam(required=false) Integer idUsuario,@RequestParam(required=false) String buscar,@RequestParam(required=false) Integer idRubro,@RequestParam(required=false) String localidad,@RequestParam(required=false) String fecha){
    String select="SELECT p.*,r.nombre rubro,u.nombre,u.apellido,u.email,u.telefono,"
        + "(SELECT f.version FROM foto_perfil f WHERE f.idUsuario=u.idUsuario) fotoVersion "
        + "FROM profesional p JOIN rubro r ON p.idRubro=r.idRubro JOIN usuario u ON p.idUsuario=u.idUsuario JOIN rol ro ON ro.idRol=u.idRol ";
    if(id!=null) return one(select+"WHERE p.idProfesional=?",id,"Profesional no encontrado");
    if(idUsuario!=null)return one(select+"WHERE p.idUsuario=?",idUsuario,"Perfil profesional no encontrado");

    LocalDate fechaElegida = parseFecha(fecha);
    // Solo se listan las cuentas activas que hoy tienen rol Profesional (si a alguien se le cambió el rol, deja de aparecer)
    List<Object> p=new ArrayList<>(); StringBuilder sql=new StringBuilder(select+"WHERE u.estado='activo' AND ro.nombreRol='Profesional'");
    if(buscar!=null&&!buscar.isBlank()){sql.append(" AND (p.nombreNegocio LIKE ? OR u.nombre LIKE ? OR u.apellido LIKE ? OR r.nombre LIKE ? OR p.localidad LIKE ?)");String t="%"+buscar.trim()+"%";p.add(t);p.add(t);p.add(t);p.add(t);p.add(t);}
    if(idRubro!=null){sql.append(" AND p.idRubro=?");p.add(idRubro);}
    if(localidad!=null&&!localidad.isBlank()){sql.append(" AND p.localidad=?");p.add(localidad.trim());}
    sql.append(" ORDER BY p.nombreNegocio");
    List<Map<String,Object>> profesionales = jdbc.queryForList(sql.toString(),p.toArray());

    Map<Integer, DisponibilidadProfesionales.Resultado> lugares = disponibilidad.calcular(
        profesionales.stream().map(fila -> ((Number) fila.get("idProfesional")).intValue()).toList(), fechaElegida);
    List<Map<String,Object>> resultado = new ArrayList<>();
    for (Map<String,Object> fila : profesionales) {
      DisponibilidadProfesionales.Resultado lugar = lugares.get(((Number) fila.get("idProfesional")).intValue());
      if (fechaElegida != null && lugar.enFecha() == null) continue; // sin lugar ese día
      fila.put("disponibleHoy", lugar.hoy() != null);
      if (lugar.proximo() != null) fila.put("proximoLugar", describir(lugar.proximo()));
      if (lugar.enFecha() != null) fila.put("lugarEnFecha", describir(lugar.enFecha()));
      resultado.add(fila);
    }
    Comparator<Map<String,Object>> porDisponibilidad = fechaElegida != null
        ? Comparator.comparing(fila -> horaDe(fila.get("lugarEnFecha")))
        : Comparator.comparing(fila -> fechaHoraDe(fila.get("proximoLugar")));
    resultado.sort(porDisponibilidad.thenComparing(fila -> String.valueOf(fila.get("nombreNegocio"))));
    return resultado;
  }

  /** Localidades donde hay profesionales activos, para el filtro de la búsqueda. */
  @GetMapping("/localidades") public List<String> localidades(){
    return jdbc.queryForList("SELECT DISTINCT p.localidad FROM profesional p JOIN usuario u ON p.idUsuario=u.idUsuario JOIN rol ro ON ro.idRol=u.idRol "
        + "WHERE u.estado='activo' AND ro.nombreRol='Profesional' AND p.localidad IS NOT NULL AND p.localidad<>'' ORDER BY p.localidad", String.class);
  }

  @PostMapping public Map<String,Object> create(@RequestBody Map<String,Object>b,HttpSession s){Map<String,Object>u=SessionSupport.user(s);String negocio=AuthController.text(b,"nombreNegocio");int rubro=AuthController.number(b,"idRubro",0);if(negocio.isBlank()||rubro==0)throw new ApiException(HttpStatus.BAD_REQUEST,"Nombre del negocio y rubro son requeridos");String localidad=localidadValida(b,false);int user=SessionSupport.intValue(u,"idUsuario");if(jdbc.queryForObject("SELECT COUNT(*) FROM profesional WHERE idUsuario=?",Integer.class,user)>0)throw new ApiException(HttpStatus.CONFLICT,"Ya tiene un perfil profesional");jdbc.update("INSERT INTO profesional(nombreNegocio,descripcion,localidad,idRubro,idUsuario) VALUES(?,?,?,?,?)",negocio,AuthController.text(b,"descripcion"),localidad,rubro,user);jdbc.update("UPDATE usuario SET idRol=(SELECT idRol FROM rol WHERE nombreRol='Profesional') WHERE idUsuario=?",user);return Map.of("message","Perfil profesional creado","id",jdbc.queryForObject("SELECT idProfesional FROM profesional WHERE idUsuario=?",Integer.class,user));}
  @PutMapping public Map<String,String> update(@RequestBody Map<String,Object>b,HttpSession s){Map<String,Object>u=SessionSupport.role(s,"Profesional","Administrador");int id=SessionSupport.professionalFor(u,b);if(id<=0)throw new ApiException(HttpStatus.BAD_REQUEST,"ID requerido");if(b.containsKey("localidad"))b.put("localidad",localidadValida(b,true));List<Object>p=new ArrayList<>();List<String>f=new ArrayList<>();add(b,"nombreNegocio",f,p);add(b,"descripcion",f,p);add(b,"localidad",f,p);add(b,"idRubro",f,p);if(f.isEmpty())throw new ApiException(HttpStatus.BAD_REQUEST,"No hay datos para actualizar");p.add(id);jdbc.update("UPDATE profesional SET "+String.join(",",f)+" WHERE idProfesional=?",p.toArray());return Map.of("message","Perfil profesional actualizado");}
  private Object one(String sql,int id,String error){try{return jdbc.queryForMap(sql,id);}catch(org.springframework.dao.EmptyResultDataAccessException e){throw new ApiException(HttpStatus.NOT_FOUND,error);}}
  static void add(Map<String,Object>b,String k,List<String>f,List<Object>p){if(b.containsKey(k)){f.add(k+"=?");p.add(b.get(k));}}

  /** Localidad del cuerpo del pedido, sin espacios sobrantes y dentro del largo permitido. */
  static String localidadValida(Map<String,Object> b, boolean obligatoria) {
    String localidad = AuthController.text(b, "localidad");
    if (obligatoria && localidad.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "La localidad es obligatoria");
    if (localidad.length() > MAX_LOCALIDAD) throw new ApiException(HttpStatus.BAD_REQUEST, "La localidad es demasiado larga");
    return localidad.isBlank() ? null : localidad;
  }

  private static LocalDate parseFecha(String fecha) {
    if (fecha == null || fecha.isBlank()) return null;
    LocalDate elegida;
    try {
      elegida = LocalDate.parse(fecha.trim());
    } catch (DateTimeParseException e) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "La fecha debe tener formato AAAA-MM-DD");
    }
    if (elegida.isBefore(LocalDate.now())) throw new ApiException(HttpStatus.BAD_REQUEST, "La fecha no puede ser anterior a hoy");
    return elegida;
  }

  private static Map<String,Object> describir(DisponibilidadProfesionales.Lugar lugar) {
    Map<String,Object> m = new LinkedHashMap<>();
    m.put("fecha", lugar.fecha().toString());
    m.put("hora", Horarios.texto(lugar.horaInicio()));
    m.put("minutosLibres", lugar.minutosLibres());
    return m;
  }

  // Los que no tienen lugar libre van al final
  private static String fechaHoraDe(Object lugar) {
    return lugar instanceof Map<?,?> m ? m.get("fecha") + " " + m.get("hora") : "9999-12-31 99:99";
  }

  private static String horaDe(Object lugar) {
    return lugar instanceof Map<?,?> m ? String.valueOf(m.get("hora")) : "99:99";
  }
}
