package com.smartagenda.api;

import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/perfil")
public class PerfilController {
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
      if(negocio.length()>100) throw new ApiException(HttpStatus.BAD_REQUEST,"El nombre del negocio es demasiado largo");
      int rubro;
      try { rubro = AuthController.number(body,"idRubro",0); }
      catch(NumberFormatException e) { throw new ApiException(HttpStatus.BAD_REQUEST,"Rubro no válido"); }
      if(rubro<=0 || jdbc.queryForObject("SELECT COUNT(*) FROM rubro WHERE idRubro=? AND estado='activo'",Integer.class,rubro)==0)
        throw new ApiException(HttpStatus.BAD_REQUEST,"Seleccioná un rubro activo");
      int updated = jdbc.update("UPDATE profesional SET nombreNegocio=?,descripcion=?,idRubro=? WHERE idUsuario=?",negocio,descripcion,rubro,id);
      if(updated!=1) throw new ApiException(HttpStatus.CONFLICT,"No se encontró el perfil profesional");
    }
    Map<String,Object> updated = readProfile(id);
    session.setAttribute("user",updated);
    return Map.of("message","Perfil actualizado correctamente","user",updated);
  }

  private Map<String,Object> readProfile(int id) {
    return jdbc.queryForMap("SELECT u.idUsuario,u.nombre,u.apellido,u.email,u.telefono,u.estado,r.nombreRol rol,"
      + "p.idProfesional,p.nombreNegocio,p.descripcion,p.idRubro,rb.nombre nombreRubro "
      + "FROM usuario u JOIN rol r ON u.idRol=r.idRol "
      + "LEFT JOIN profesional p ON p.idUsuario=u.idUsuario "
      + "LEFT JOIN rubro rb ON rb.idRubro=p.idRubro WHERE u.idUsuario=?",id);
  }
}
