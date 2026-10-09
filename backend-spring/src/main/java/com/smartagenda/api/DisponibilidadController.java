package com.smartagenda.api;

import jakarta.servlet.http.HttpSession;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/disponibilidad")
public class DisponibilidadController {
  private static final List<String> DIAS = List.of("Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo");
  private static final int INTERVALO_MIN = 5;
  private static final int INTERVALO_MAX = 240;

  private final JdbcTemplate jdbc;

  public DisponibilidadController(JdbcTemplate j) {
    jdbc = j;
  }

  @GetMapping
  public List<Map<String, Object>> list(@RequestParam int idProfesional) {
    return jdbc.queryForList("SELECT * FROM disponibilidad WHERE idProfesional=? ORDER BY FIELD(diaSemana,'Lunes','Martes','Miercoles','Jueves','Viernes','Sabado','Domingo')", idProfesional);
  }

  @PostMapping
  public Map<String, Object> create(@RequestBody Map<String, Object> b, HttpSession s) {
    Map<String, Object> u = SessionSupport.role(s, "Profesional", "Administrador");
    int p = SessionSupport.professionalFor(u, b);
    String dia = AuthController.text(b, "diaSemana"), inicio = AuthController.text(b, "horaInicio"), fin = AuthController.text(b, "horaFin");
    int intervalo = AuthController.number(b, "intervaloMin", 30);
    if (dia.isBlank() || inicio.isBlank() || fin.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "Datos incompletos");
    if (!DIAS.contains(dia)) throw new ApiException(HttpStatus.BAD_REQUEST, "Día de la semana no válido");
    validarHorario(hora(inicio), hora(fin), intervalo);
    if (jdbc.queryForObject("SELECT COUNT(*) FROM disponibilidad WHERE idProfesional=? AND diaSemana=?", Integer.class, p, dia) > 0)
      throw new ApiException(HttpStatus.CONFLICT, "Ya existe configuración para ese día. Use PUT para actualizar.");
    jdbc.update("INSERT INTO disponibilidad(diaSemana,horaInicio,horaFin,intervaloMin,idProfesional) VALUES(?,?,?,?,?)", dia, inicio, fin, intervalo, p);
    return Map.of("message", "Disponibilidad configurada", "id", jdbc.queryForObject("SELECT LAST_INSERT_ID()", Integer.class));
  }

  @PutMapping
  public Map<String, String> update(@RequestBody Map<String, Object> b, HttpSession s) {
    Map<String, Object> u = SessionSupport.role(s, "Profesional", "Administrador");
    int id = AuthController.number(b, "idDisponibilidad", 0);
    if (id <= 0) throw new ApiException(HttpStatus.BAD_REQUEST, "ID requerido");
    Map<String, Object> actual = find(id);
    SessionSupport.requireOwner(u, ((Number) actual.get("idProfesional")).intValue());
    // Se valida el resultado final: lo que llega en el pedido combinado con lo que ya estaba guardado
    LocalTime inicio = b.containsKey("horaInicio") ? hora(AuthController.text(b, "horaInicio")) : hora(String.valueOf(actual.get("horaInicio")));
    LocalTime fin = b.containsKey("horaFin") ? hora(AuthController.text(b, "horaFin")) : hora(String.valueOf(actual.get("horaFin")));
    int intervalo = b.containsKey("intervaloMin") ? AuthController.number(b, "intervaloMin", 0) : ((Number) actual.get("intervaloMin")).intValue();
    validarHorario(inicio, fin, intervalo);
    List<String> f = new ArrayList<>();
    List<Object> p = new ArrayList<>();
    for (String k : List.of("horaInicio", "horaFin", "intervaloMin")) ProfesionalController.add(b, k, f, p);
    if (f.isEmpty()) throw new ApiException(HttpStatus.BAD_REQUEST, "No hay datos para actualizar");
    p.add(id);
    jdbc.update("UPDATE disponibilidad SET " + String.join(",", f) + " WHERE idDisponibilidad=?", p.toArray());
    return Map.of("message", "Disponibilidad actualizada");
  }

  @DeleteMapping
  public Map<String, String> delete(@RequestParam int id, HttpSession s) {
    Map<String, Object> u = SessionSupport.role(s, "Profesional", "Administrador");
    SessionSupport.requireOwner(u, ((Number) find(id).get("idProfesional")).intValue());
    jdbc.update("DELETE FROM disponibilidad WHERE idDisponibilidad=?", id);
    return Map.of("message", "Disponibilidad eliminada");
  }

  private Map<String, Object> find(int id) {
    try {
      return jdbc.queryForMap("SELECT * FROM disponibilidad WHERE idDisponibilidad=?", id);
    } catch (org.springframework.dao.EmptyResultDataAccessException e) {
      throw new ApiException(HttpStatus.NOT_FOUND, "Disponibilidad no encontrada");
    }
  }

  private LocalTime hora(String texto) {
    try {
      return LocalTime.parse(texto);
    } catch (DateTimeParseException e) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "Formato de hora no válido (use HH:MM)");
    }
  }

  private void validarHorario(LocalTime inicio, LocalTime fin, int intervalo) {
    if (!fin.isAfter(inicio)) throw new ApiException(HttpStatus.BAD_REQUEST, "La hora de fin debe ser posterior a la de inicio");
    if (intervalo < INTERVALO_MIN || intervalo > INTERVALO_MAX)
      throw new ApiException(HttpStatus.BAD_REQUEST, "El intervalo debe estar entre " + INTERVALO_MIN + " y " + INTERVALO_MAX + " minutos");
  }
}
