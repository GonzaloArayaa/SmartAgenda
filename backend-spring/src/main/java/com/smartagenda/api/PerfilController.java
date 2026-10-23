package com.smartagenda.api;

import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/perfil")
public class PerfilController {
  /** Tamaño máximo de la foto de perfil. */
  static final int MAX_FOTO_BYTES = 2 * 1024 * 1024;

  private final JdbcTemplate jdbc;

  public PerfilController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

  @GetMapping
  public Map<String,Object> get(HttpSession session) {
    int id = SessionSupport.intValue(SessionSupport.user(session),"idUsuario");
    return readProfile(id);
  }

  @Transactional
  @PutMapping
  public Map<String,Object> update(@RequestBody Map<String,Object> body, HttpSession session) {
    Map<String,Object> current = SessionSupport.user(session);
    int id = SessionSupport.intValue(current,"idUsuario");
    String nombre = AuthController.text(body,"nombre");
    String apellido = AuthController.text(body,"apellido");
    String telefono = AuthController.text(body,"telefono");
    if(nombre.isBlank() || apellido.isBlank())
      throw new ApiException(HttpStatus.BAD_REQUEST,"Nombre y apellido son obligatorios");
    if(nombre.length()>50 || apellido.length()>50 || telefono.length()>20)
      throw new ApiException(HttpStatus.BAD_REQUEST,"Algún dato personal supera el largo permitido");
    jdbc.update("UPDATE usuario SET nombre=?,apellido=?,telefono=? WHERE idUsuario=?",nombre,apellido,telefono,id);
    if("Profesional".equals(current.get("rol"))) {
      String negocio = AuthController.text(body,"nombreNegocio");
      String descripcion = AuthController.text(body,"descripcion");
      if(negocio.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST,"El nombre del negocio es obligatorio");
      String localidad = ProfesionalController.localidadValida(body, true);
      if(negocio.length()>100) throw new ApiException(HttpStatus.BAD_REQUEST,"El nombre del negocio es demasiado largo");
      int rubro;
      try { rubro = AuthController.number(body,"idRubro",0); }
      catch(NumberFormatException e) { throw new ApiException(HttpStatus.BAD_REQUEST,"Rubro no válido"); }
      if(rubro<=0 || jdbc.queryForObject("SELECT COUNT(*) FROM rubro WHERE idRubro=? AND estado='activo'",Integer.class,rubro)==0)
        throw new ApiException(HttpStatus.BAD_REQUEST,"Seleccioná un rubro activo");
      int updated = jdbc.update("UPDATE profesional SET nombreNegocio=?,descripcion=?,localidad=?,idRubro=? WHERE idUsuario=?",negocio,descripcion,localidad,rubro,id);
      if(updated!=1) throw new ApiException(HttpStatus.CONFLICT,"No se encontró el perfil profesional");
    }
    Map<String,Object> updated = readProfile(id);
    session.setAttribute("user",updated);
    return Map.of("message","Perfil actualizado correctamente","user",updated);
  }

  /** Sube (o reemplaza) la foto de perfil. Solo JPG, PNG o WebP, de hasta 2 MB; se reconoce por el contenido del archivo. */
  @PostMapping(value="/foto", consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
  public Map<String,Object> subirFoto(@RequestParam("foto") MultipartFile foto, HttpSession session) throws IOException {
    int id = SessionSupport.intValue(SessionSupport.user(session),"idUsuario");
    if(foto.isEmpty()) throw new ApiException(HttpStatus.BAD_REQUEST,"Elegí una imagen");
    if(foto.getSize()>MAX_FOTO_BYTES) throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE,"La foto supera el máximo de 2 MB");
    byte[] datos = foto.getBytes();
    String tipo = TipoImagen.detectar(datos);
    if(tipo==null) throw new ApiException(HttpStatus.BAD_REQUEST,"Formato no permitido: usá una imagen JPG, PNG o WebP");
    jdbc.update("INSERT INTO foto_perfil(idUsuario,tipoMime,datos) VALUES(?,?,?) ON DUPLICATE KEY UPDATE tipoMime=VALUES(tipoMime),datos=VALUES(datos),version=version+1",id,tipo,datos);
    Map<String,Object> updated = readProfile(id);
    session.setAttribute("user",updated);
    return Map.of("message","Foto de perfil actualizada","user",updated);
  }

  @DeleteMapping("/foto")
  public Map<String,Object> quitarFoto(HttpSession session) {
    int id = SessionSupport.intValue(SessionSupport.user(session),"idUsuario");
    jdbc.update("DELETE FROM foto_perfil WHERE idUsuario=?",id);
    Map<String,Object> updated = readProfile(id);
    session.setAttribute("user",updated);
    return Map.of("message","Foto de perfil eliminada","user",updated);
  }

  private Map<String,Object> readProfile(int id) {
    return jdbc.queryForMap("SELECT u.idUsuario,u.nombre,u.apellido,u.email,u.telefono,u.estado,r.nombreRol rol,"
      + "p.idProfesional,p.nombreNegocio,p.descripcion,p.localidad,p.idRubro,rb.nombre nombreRubro,"
      + "(SELECT f.version FROM foto_perfil f WHERE f.idUsuario=u.idUsuario) fotoVersion "
      + "FROM usuario u JOIN rol r ON u.idRol=r.idRol "
      + "LEFT JOIN profesional p ON p.idUsuario=u.idUsuario "
      + "LEFT JOIN rubro rb ON rb.idRubro=p.idRubro WHERE u.idUsuario=?",id);
  }
}
