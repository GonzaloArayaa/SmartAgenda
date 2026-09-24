package com.smartagenda.api;

import jakarta.servlet.http.HttpSession;
import java.time.LocalTime;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/turnos")
public class TurnoController {
  private final JdbcTemplate jdbc;
  public TurnoController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

  @GetMapping public List<Map<String,Object>> list(@RequestParam Map<String,String> query, HttpSession session) {
    Map<String,Object> user = SessionSupport.user(session);
    StringBuilder sql = new StringBuilder("SELECT t.*,s.nombre servicio_nombre,s.duracionMin,p.nombreNegocio,uc.nombre cliente_nombre,uc.apellido cliente_apellido,uc.email cliente_email,up.nombre profesional_nombre,up.apellido profesional_apellido FROM turno t JOIN servicio s ON t.idServicio=s.idServicio JOIN profesional p ON t.idProfesional=p.idProfesional JOIN usuario uc ON t.idCliente=uc.idUsuario JOIN usuario up ON p.idUsuario=up.idUsuario WHERE 1=1");
    List<Object> params = new ArrayList<>();
    for (String key : List.of("idProfesional", "idCliente", "fecha", "estado")) if (query.containsKey(key)) { sql.append(" AND t.").append(key).append("=?"); params.add(query.get(key)); }
    if (query.containsKey("fechaDesde")) { sql.append(" AND t.fecha>=?"); params.add(query.get("fechaDesde")); }
    if (query.containsKey("fechaHasta")) { sql.append(" AND t.fecha<=?"); params.add(query.get("fechaHasta")); }
    String role = String.valueOf(user.get("rol"));
    if ("Cliente".equals(role)) { sql.append(" AND t.idCliente=?"); params.add(SessionSupport.intValue(user,"idUsuario")); }
    if ("Profesional".equals(role)) { sql.append(" AND t.idProfesional=?"); params.add(SessionSupport.intValue(user,"idProfesional")); }
    sql.append(" ORDER BY t.fecha DESC,t.horaInicio ASC");
    return jdbc.queryForList(sql.toString(), params.toArray());
  }

  @PostMapping public Map<String,Object> create(@RequestBody Map<String,Object> body, HttpSession session) {
    Map<String,Object> user = SessionSupport.role(session, "Cliente", "Administrador");
    String fecha = AuthController.text(body,"fecha"), hora = AuthController.text(body,"horaInicio");
    int servicio = AuthController.number(body,"idServicio",0), profesional = AuthController.number(body,"idProfesional",0);
    if (fecha.isBlank() || hora.isBlank() || servicio <= 0 || profesional <= 0) throw new ApiException(HttpStatus.BAD_REQUEST,"Datos incompletos");
    Integer duracion;
    try { duracion = jdbc.queryForObject("SELECT duracionMin FROM servicio WHERE idServicio=? AND idProfesional=?", Integer.class, servicio, profesional); }
    catch (org.springframework.dao.EmptyResultDataAccessException e) { throw new ApiException(HttpStatus.NOT_FOUND,"Servicio no encontrado"); }
    String fin = LocalTime.parse(hora).plusMinutes(duracion).toString();
    if (ocupado(profesional, fecha, hora, fin, null)) throw new ApiException(HttpStatus.CONFLICT,"El horario seleccionado ya está ocupado");
    jdbc.update("INSERT INTO turno(fecha,horaInicio,horaFin,estado,idCliente,idServicio,idProfesional) VALUES(?,?,?,'pendiente',?,?,?)", fecha,hora,fin,SessionSupport.intValue(user,"idUsuario"),servicio,profesional);
    return Map.of("message","Turno reservado exitosamente","id",jdbc.queryForObject("SELECT LAST_INSERT_ID()",Integer.class));
  }

  @PutMapping public Map<String,String> update(@RequestBody Map<String,Object> body, HttpSession session) {
    Map<String,Object> user = SessionSupport.user(session); int id = AuthController.number(body,"idTurno",0); String accion = AuthController.text(body,"accion");
    if (id <= 0 || accion.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST,"ID de turno y acción requeridos");
    Map<String,Object> turno;
    try { turno = jdbc.queryForMap("SELECT * FROM turno WHERE idTurno=?",id); }
    catch (org.springframework.dao.EmptyResultDataAccessException e) { throw new ApiException(HttpStatus.NOT_FOUND,"Turno no encontrado"); }
    authorize(user, turno, accion);
    String estado = String.valueOf(turno.get("estado"));
    if ("confirmar".equals(accion)) { validState(estado,"pendiente","Solo se pueden confirmar turnos pendientes"); jdbc.update("UPDATE turno SET estado='confirmado' WHERE idTurno=?",id); return Map.of("message","Turno confirmado exitosamente"); }
    if ("finalizar".equals(accion)) { validState(estado,"confirmado","Solo se pueden finalizar turnos confirmados"); jdbc.update("UPDATE turno SET estado='finalizado' WHERE idTurno=?",id); return Map.of("message","Turno finalizado exitosamente"); }
    if ("cancelar".equals(accion)) { if (!List.of("pendiente","confirmado").contains(estado)) throw new ApiException(HttpStatus.BAD_REQUEST,"No se puede cancelar este turno"); jdbc.update("UPDATE turno SET estado='cancelado' WHERE idTurno=?",id); jdbc.update("INSERT INTO cancelacion(motivo,idTurno) VALUES(?,?)",AuthController.textOr(body,"motivo","Sin motivo especificado"),id); return Map.of("message","Turno cancelado correctamente"); }
    if ("reprogramar".equals(accion)) { String fecha=AuthController.text(body,"fecha"),hora=AuthController.text(body,"horaInicio"); if(fecha.isBlank()||hora.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST,"Nueva fecha y hora requeridas"); int duracion=jdbc.queryForObject("SELECT duracionMin FROM servicio WHERE idServicio=?",Integer.class,turno.get("idServicio")); String fin=LocalTime.parse(hora).plusMinutes(duracion).toString(); if(ocupado(((Number)turno.get("idProfesional")).intValue(),fecha,hora,fin,id)) throw new ApiException(HttpStatus.CONFLICT,"El nuevo horario no está disponible"); jdbc.update("UPDATE turno SET fecha=?,horaInicio=?,horaFin=? WHERE idTurno=?",fecha,hora,fin,id); return Map.of("message","Turno reprogramado exitosamente"); }
    throw new ApiException(HttpStatus.BAD_REQUEST,"Acción no válida");
  }
  private void authorize(Map<String,Object> user, Map<String,Object> turno, String action) {
    String role=String.valueOf(user.get("rol")); if("Administrador".equals(role)) return;
    if("Cliente".equals(role) && ((Number)turno.get("idCliente")).intValue()==SessionSupport.intValue(user,"idUsuario") && List.of("cancelar","reprogramar").contains(action)) return;
    if("Profesional".equals(role) && ((Number)turno.get("idProfesional")).intValue()==SessionSupport.intValue(user,"idProfesional") && List.of("confirmar","finalizar","cancelar","reprogramar").contains(action)) return;
    throw new ApiException(HttpStatus.FORBIDDEN,"No tiene permisos para modificar este turno");
  }
  private void validState(String current,String expected,String message) { if(!expected.equals(current)) throw new ApiException(HttpStatus.BAD_REQUEST,message); }
  private boolean ocupado(int profesional,String fecha,String inicio,String fin,Integer excluded) { String sql="SELECT COUNT(*) FROM turno WHERE idProfesional=? AND fecha=? AND estado IN ('pendiente','confirmado') AND horaInicio<? AND horaFin>?"+(excluded==null?"":" AND idTurno!=?"); List<Object> params=new ArrayList<>(List.of(profesional,fecha,fin,inicio)); if(excluded!=null)params.add(excluded); return jdbc.queryForObject(sql,Integer.class,params.toArray())>0; }
}
