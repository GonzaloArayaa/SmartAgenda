package com.smartagenda.api;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class TurnoAvailability {
  private final JdbcTemplate jdbc;

  public TurnoAvailability(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public Slot validate(int professionalId, int serviceId, int clientId, String dateText,
      String timeText, Integer excludedAppointmentId) {
    LocalDate date;
    LocalTime start;
    try {
      date = LocalDate.parse(dateText);
      start = LocalTime.parse(timeText);
    } catch (DateTimeParseException exception) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "Fecha u hora no válida");
    }
    if (!LocalDateTime.of(date, start).isAfter(LocalDateTime.now())) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "El turno debe ser futuro");
    }

    List<Integer> durations = jdbc.queryForList(
        "SELECT duracionMin FROM servicio WHERE idServicio=? AND idProfesional=? AND estado='activo'",
        Integer.class, serviceId, professionalId);
    if (durations.isEmpty()) {
      throw new ApiException(HttpStatus.NOT_FOUND, "Servicio activo no encontrado");
    }
    LocalTime end = start.plusMinutes(durations.getFirst());
    if (!end.isAfter(start)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "La duración del servicio no es válida");
    }

    List<Map<String, Object>> rows = jdbc.queryForList(
        "SELECT horaInicio,horaFin,intervaloMin FROM disponibilidad WHERE idProfesional=? AND diaSemana=?",
        professionalId, Horarios.dia(date.getDayOfWeek()));
    if (rows.isEmpty()) {
      throw new ApiException(HttpStatus.CONFLICT, "El profesional no atiende ese día");
    }
    // Con horario cortado el día tiene varios tramos: el turno debe entrar completo en alguno
    final LocalTime slotStart = start;
    final LocalTime slotEnd = end;
    boolean respetaDisponibilidad = rows.stream().anyMatch(range -> {
      LocalTime workStart = Horarios.hora(range.get("horaInicio"));
      LocalTime workEnd = Horarios.hora(range.get("horaFin"));
      int interval = ((Number) range.get("intervaloMin")).intValue();
      return interval > 0 && !slotStart.isBefore(workStart) && !slotEnd.isAfter(workEnd)
          && (java.time.Duration.between(workStart, slotStart).toMinutes() % interval) == 0;
    });
    if (!respetaDisponibilidad) {
      throw new ApiException(HttpStatus.CONFLICT, "El horario no respeta la disponibilidad del profesional");
    }

    String exclusion = excludedAppointmentId == null ? "" : " AND idTurno<>?";
    String overlap = " AND estado IN ('pendiente','confirmado') AND horaInicio<? AND horaFin>?" + exclusion;
    Object[] providerParams = excludedAppointmentId == null
        ? new Object[] { professionalId, date, end, start }
        : new Object[] { professionalId, date, end, start, excludedAppointmentId };
    Integer providerCount = jdbc.queryForObject(
        "SELECT COUNT(*) FROM turno WHERE idProfesional=? AND fecha=?" + overlap,
        Integer.class, providerParams);
    if (providerCount != null && providerCount > 0) {
      throw new ApiException(HttpStatus.CONFLICT, "El horario seleccionado ya está ocupado");
    }

    Object[] clientParams = excludedAppointmentId == null
        ? new Object[] { clientId, date, end, start }
        : new Object[] { clientId, date, end, start, excludedAppointmentId };
    Integer clientCount = jdbc.queryForObject(
        "SELECT COUNT(*) FROM turno WHERE idCliente=? AND fecha=?" + overlap,
        Integer.class, clientParams);
    if (clientCount != null && clientCount > 0) {
      throw new ApiException(HttpStatus.CONFLICT, "El cliente ya tiene un turno en ese horario");
    }
    return new Slot(date, start, end);
  }

  public record Slot(LocalDate date, LocalTime start, LocalTime end) {}
}
