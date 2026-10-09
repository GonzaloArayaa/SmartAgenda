package com.smartagenda.api;

import jakarta.servlet.http.HttpSession;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/turnos")
public class TurnoController {
  private final JdbcTemplate jdbc;
  private final TurnoAvailability availability;
  private final TurnoExpiration expiration;

  public TurnoController(JdbcTemplate jdbc, TurnoAvailability availability, TurnoExpiration expiration) {
    this.jdbc = jdbc;
    this.availability = availability;
    this.expiration = expiration;
  }

  @GetMapping
  public List<Map<String, Object>> list(@RequestParam Map<String, String> query, HttpSession session) {
    Map<String, Object> user = SessionSupport.user(session);
    expiration.expirePastAppointments();
    StringBuilder sql = new StringBuilder(
        "SELECT t.*,s.nombre servicio_nombre,s.duracionMin,p.nombreNegocio,"
            + "uc.nombre cliente_nombre,uc.apellido cliente_apellido,uc.email cliente_email,"
            + "up.nombre profesional_nombre,up.apellido profesional_apellido "
            + "FROM turno t JOIN servicio s ON t.idServicio=s.idServicio "
            + "JOIN profesional p ON t.idProfesional=p.idProfesional "
            + "JOIN usuario uc ON t.idCliente=uc.idUsuario "
            + "JOIN usuario up ON p.idUsuario=up.idUsuario WHERE 1=1");
    List<Object> params = new ArrayList<>();
    for (String key : List.of("idProfesional", "idCliente", "idServicio", "fecha", "estado")) {
      if (query.containsKey(key) && !query.get(key).isBlank()) {
        sql.append(" AND t.").append(key).append("=?");
        params.add(query.get(key));
      }
    }
    if (query.containsKey("fechaDesde") && !query.get("fechaDesde").isBlank()) {
      sql.append(" AND t.fecha>=?");
      params.add(query.get("fechaDesde"));
    }
    if (query.containsKey("fechaHasta") && !query.get("fechaHasta").isBlank()) {
      sql.append(" AND t.fecha<=?");
      params.add(query.get("fechaHasta"));
    }
    String role = String.valueOf(user.get("rol"));
    if ("Cliente".equals(role)) {
      sql.append(" AND t.idCliente=?");
      params.add(SessionSupport.intValue(user, "idUsuario"));
    }
    if ("Profesional".equals(role)) {
      sql.append(" AND t.idProfesional=?");
      params.add(SessionSupport.intValue(user, "idProfesional"));
    }
    sql.append(" ORDER BY t.fecha DESC,t.horaInicio ASC");
    return jdbc.queryForList(sql.toString(), params.toArray());
  }

  @GetMapping("/clientes")
  public List<Map<String, Object>> clients(@RequestParam(defaultValue = "") String buscar,
      @RequestParam(defaultValue = "false") boolean incluirInactivos, HttpSession session) {
    SessionSupport.role(session, "Profesional", "Administrador");
    String pattern = "%" + buscar.trim() + "%";
    return jdbc.queryForList(
        "SELECT u.idUsuario,u.nombre,u.apellido,u.email FROM usuario u "
            + "JOIN rol r ON r.idRol=u.idRol WHERE r.nombreRol='Cliente' "
            + (incluirInactivos ? "" : "AND u.estado='activo' ")
            + "AND (u.nombre LIKE ? OR u.apellido LIKE ? OR u.email LIKE ?) "
            + "ORDER BY u.apellido,u.nombre",
        pattern, pattern, pattern);
  }

  @GetMapping("/servicios")
  public List<Map<String, Object>> historyServices(HttpSession session) {
    Map<String, Object> user = SessionSupport.role(session, "Profesional", "Administrador");
    if ("Profesional".equals(user.get("rol"))) {
      return jdbc.queryForList("SELECT idServicio,nombre FROM servicio WHERE idProfesional=? ORDER BY nombre",
          SessionSupport.intValue(user, "idProfesional"));
    }
    return jdbc.queryForList("SELECT idServicio,nombre FROM servicio ORDER BY nombre");
  }

  @PostMapping
  @Transactional
  public Map<String, Object> create(@RequestBody Map<String, Object> body, HttpSession session) {
    Map<String, Object> user = SessionSupport.role(session, "Cliente", "Profesional", "Administrador");
    String role = String.valueOf(user.get("rol"));
    int professional = "Profesional".equals(role)
        ? SessionSupport.intValue(user, "idProfesional")
        : AuthController.number(body, "idProfesional", 0);
    int client = "Cliente".equals(role)
        ? SessionSupport.intValue(user, "idUsuario")
        : AuthController.number(body, "idCliente", 0);
    int service = AuthController.number(body, "idServicio", 0);
    if (professional <= 0 || client <= 0 || service <= 0) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "Cliente, profesional y servicio son requeridos");
    }
    Integer activeClient = jdbc.queryForObject(
        "SELECT COUNT(*) FROM usuario u JOIN rol r ON r.idRol=u.idRol "
            + "WHERE u.idUsuario=? AND u.estado='activo' AND r.nombreRol='Cliente'",
        Integer.class, client);
    if (activeClient == null || activeClient == 0) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "El cliente no está disponible");
    }
    TurnoAvailability.Slot slot = availability.validate(professional, service, client,
        AuthController.text(body, "fecha"), AuthController.text(body, "horaInicio"), null);
    jdbc.update("INSERT INTO turno(fecha,horaInicio,horaFin,estado,idCliente,idServicio,idProfesional) "
            + "VALUES(?,?,?,'pendiente',?,?,?)",
        slot.date(), slot.start(), slot.end(), client, service, professional);
    return Map.of("message", "Turno reservado exitosamente",
        "id", jdbc.queryForObject("SELECT LAST_INSERT_ID()", Integer.class));
  }

  @PutMapping
  @Transactional
  public Map<String, Object> update(@RequestBody Map<String, Object> body, HttpSession session) {
    Map<String, Object> user = SessionSupport.user(session);
    expiration.expirePastAppointments();
    int id = AuthController.number(body, "idTurno", 0);
    String action = AuthController.text(body, "accion");
    if (id <= 0 || action.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "ID de turno y acción requeridos");
    }
    Map<String, Object> appointment;
    try {
      appointment = jdbc.queryForMap("SELECT * FROM turno WHERE idTurno=? FOR UPDATE", id);
    } catch (org.springframework.dao.EmptyResultDataAccessException exception) {
      throw new ApiException(HttpStatus.NOT_FOUND, "Turno no encontrado");
    }
    authorize(user, appointment, action);
    String state = String.valueOf(appointment.get("estado"));
    if ("vencido".equals(state)) {
      throw new ApiException(HttpStatus.CONFLICT, "El turno ya venció y no admite cambios");
    }
    switch (action) {
      case "confirmar" -> {
        requireState(state, "pendiente", "Solo se pueden confirmar turnos pendientes");
        jdbc.update("UPDATE turno SET estado='confirmado' WHERE idTurno=?", id);
        return Map.of("message", "Turno confirmado exitosamente");
      }
      case "finalizar" -> {
        requireState(state, "confirmado", "Solo se pueden finalizar turnos confirmados");
        jdbc.update("UPDATE turno SET estado='finalizado' WHERE idTurno=?", id);
        return Map.of("message", "Turno finalizado exitosamente");
      }
      case "cancelar" -> {
        requireActive(state);
        jdbc.update("UPDATE turno SET estado='cancelado' WHERE idTurno=?", id);
        jdbc.update("INSERT INTO cancelacion(motivo,idTurno) VALUES(?,?)",
            AuthController.textOr(body, "motivo", "Sin motivo especificado"), id);
        Integer waitlistId = offerWaitlist(id, appointment);
        return waitlistId == null
            ? Map.of("message", "Turno cancelado correctamente")
            : Map.of("message", "Turno cancelado y ofrecido a un cliente en lista de espera",
                "idListaEspera", waitlistId);
      }
      case "reprogramar" -> {
        requireActive(state);
        int professional = ((Number) appointment.get("idProfesional")).intValue();
        int client = ((Number) appointment.get("idCliente")).intValue();
        int service = ((Number) appointment.get("idServicio")).intValue();
        TurnoAvailability.Slot slot = availability.validate(professional, service, client,
            AuthController.text(body, "fecha"), AuthController.text(body, "horaInicio"), id);
        jdbc.update("UPDATE turno SET fecha=?,horaInicio=?,horaFin=? WHERE idTurno=?",
            slot.date(), slot.start(), slot.end(), id);
        return Map.of("message", "Turno reprogramado exitosamente");
      }
      default -> throw new ApiException(HttpStatus.BAD_REQUEST, "Acción no válida");
    }
  }

  private void authorize(Map<String, Object> user, Map<String, Object> appointment, String action) {
    String role = String.valueOf(user.get("rol"));
    if ("Administrador".equals(role)) return;
    if ("Cliente".equals(role)
        && ((Number) appointment.get("idCliente")).intValue() == SessionSupport.intValue(user, "idUsuario")
        && List.of("cancelar", "reprogramar").contains(action)) return;
    if ("Profesional".equals(role)
        && ((Number) appointment.get("idProfesional")).intValue() == SessionSupport.intValue(user, "idProfesional")
        && List.of("confirmar", "finalizar", "cancelar", "reprogramar").contains(action)) return;
    throw new ApiException(HttpStatus.FORBIDDEN, "No tiene permisos para modificar este turno");
  }

  private void requireState(String current, String expected, String message) {
    if (!expected.equals(current)) throw new ApiException(HttpStatus.BAD_REQUEST, message);
  }

  private void requireActive(String state) {
    if (!List.of("pendiente", "confirmado").contains(state)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "No se puede modificar este turno");
    }
  }

  private Integer offerWaitlist(int appointmentId, Map<String, Object> appointment) {
    jdbc.update("UPDATE lista_espera SET estado='vencida' "
        + "WHERE estado='ofertada' AND fechaExpiracion<NOW()");
    List<Map<String, Object>> candidates = jdbc.queryForList(
        "SELECT idListaEspera FROM lista_espera WHERE estado='esperando' "
            + "AND idProfesional=? AND idServicio=? AND fechaDeseada=? "
            + "AND (horaDesde IS NULL OR horaDesde<=?) "
            + "AND (horaHasta IS NULL OR horaHasta>=?) ORDER BY fechaSolicitud LIMIT 1",
        appointment.get("idProfesional"), appointment.get("idServicio"), appointment.get("fecha"),
        appointment.get("horaInicio"), appointment.get("horaInicio"));
    if (candidates.isEmpty()) return null;
    int id = ((Number) candidates.getFirst().get("idListaEspera")).intValue();
    jdbc.update("UPDATE lista_espera SET estado='ofertada',idTurnoOfertado=?,"
        + "fechaExpiracion=DATE_ADD(NOW(),INTERVAL 10 MINUTE) WHERE idListaEspera=?", appointmentId, id);
    return id;
  }
}
