package com.smartagenda.api;

import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/recomendaciones")
public class RecomendacionController {
  private final JdbcTemplate jdbc;

  public RecomendacionController(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @GetMapping
  public Map<String, Object> get(
      @RequestParam int idProfesional,
      @RequestParam int idServicio,
      @RequestParam String fecha) {
    LocalDate date;
    try {
      date = LocalDate.parse(fecha);
    } catch (Exception e) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "La fecha no es válida");
    }
    if (date.isBefore(LocalDate.now())) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "No se pueden consultar fechas pasadas");
    }

    Integer duration;
    try {
      duration = jdbc.queryForObject(
          "SELECT duracionMin FROM servicio WHERE idServicio=? AND idProfesional=? AND estado='activo'",
          Integer.class, idServicio, idProfesional);
    } catch (org.springframework.dao.EmptyResultDataAccessException e) {
      throw new ApiException(HttpStatus.NOT_FOUND, "Servicio no encontrado");
    }

    String day = dayName(date);
    List<Map<String, Object>> availability = jdbc.queryForList(
        "SELECT * FROM disponibilidad WHERE idProfesional=? AND diaSemana=?",
        idProfesional, day);
    if (availability.isEmpty()) {
      return response(fecha, day, idProfesional, idServicio, duration, List.of(),
          "El profesional no atiende ese día", 0);
    }

    Map<String, Object> row = availability.getFirst();
    LocalTime workStart = time(row.get("horaInicio"));
    LocalTime workEnd = time(row.get("horaFin"));
    int interval = ((Number) row.get("intervaloMin")).intValue();
    List<Appointment> appointments = jdbc.queryForList(
            "SELECT horaInicio,horaFin FROM turno WHERE idProfesional=? AND fecha=? "
                + "AND estado IN ('pendiente','confirmado') ORDER BY horaInicio",
            idProfesional, fecha)
        .stream()
        .map(a -> new Appointment(time(a.get("horaInicio")), time(a.get("horaFin"))))
        .toList();

    Map<LocalTime, Integer> demandByTime = new HashMap<>();
    jdbc.queryForList(
            "SELECT horaInicio,COUNT(*) demanda FROM turno WHERE idProfesional=? AND fecha<? "
                + "AND DAYOFWEEK(fecha)=DAYOFWEEK(?) AND estado IN ('confirmado','finalizado') "
                + "GROUP BY horaInicio",
            idProfesional, fecha, fecha)
        .forEach(history -> demandByTime.put(
            time(history.get("horaInicio")), ((Number) history.get("demanda")).intValue()));

    List<Map<String, Object>> slots = new ArrayList<>();
    for (LocalTime current = workStart;
         !current.plusMinutes(duration).isAfter(workEnd);
         current = current.plusMinutes(interval)) {
      LocalTime slotStart = current;
      LocalTime slotEnd = current.plusMinutes(duration);
      if (date.equals(LocalDate.now()) && !slotStart.isAfter(LocalTime.now())) continue;
      boolean free = appointments.stream().noneMatch(a -> overlaps(slotStart, slotEnd, a));
      if (!free) continue;
      slots.add(scoreSlot(slotStart, slotEnd, workStart, workEnd, duration,
          appointments, demandByTime.getOrDefault(slotStart, 0)));
    }

    List<Map<String, Object>> ranking = new ArrayList<>(slots);
    ranking.sort(Comparator
        .comparingInt((Map<String, Object> slot) -> (Integer) slot.get("puntaje"))
        .reversed()
        .thenComparing(slot -> LocalTime.parse((String) slot.get("horaInicio"))));
    for (int i = 0; i < ranking.size(); i++) {
      Map<String, Object> slot = ranking.get(i);
      slot.put("posicionRanking", i + 1);
      slot.put("recomendado", i < 3);
      slot.put("nivel", i == 0 ? "Mejor opción" : i < 3 ? "Recomendado" : "Disponible");
    }

    slots.sort(Comparator.comparing(slot -> LocalTime.parse((String) slot.get("horaInicio"))));
    String summary = slots.isEmpty()
        ? "No quedan horarios disponibles para esta fecha"
        : appointments.isEmpty()
            ? "La agenda está libre: priorizamos horarios cómodos para iniciar el día"
            : "Ordenamos las opciones para reducir huecos entre los turnos existentes";
    return response(fecha, day, idProfesional, idServicio, duration, slots, summary,
        appointments.size());
  }

  private Map<String, Object> scoreSlot(
      LocalTime start,
      LocalTime end,
      LocalTime workStart,
      LocalTime workEnd,
      int duration,
      List<Appointment> appointments,
      int historicalDemand) {
    Appointment previous = appointments.stream()
        .filter(a -> !a.end().isAfter(start))
        .max(Comparator.comparing(Appointment::end))
        .orElse(null);
    Appointment next = appointments.stream()
        .filter(a -> !a.start().isBefore(end))
        .min(Comparator.comparing(Appointment::start))
        .orElse(null);

    long gapBefore = ChronoUnit.MINUTES.between(previous == null ? workStart : previous.end(), start);
    long gapAfter = ChronoUnit.MINUTES.between(end, next == null ? workEnd : next.start());
    boolean joinsPrevious = previous != null && gapBefore == 0;
    boolean joinsNext = next != null && gapAfter == 0;
    boolean edgeStart = previous == null && gapBefore == 0;
    boolean edgeEnd = next == null && gapAfter == 0;
    boolean orphanBefore = gapBefore > 0 && gapBefore < duration;
    boolean orphanAfter = gapAfter > 0 && gapAfter < duration;

    int score = 48;
    if (appointments.isEmpty()) score += 12;
    if (joinsPrevious) score += 24;
    if (joinsNext) score += 24;
    if (joinsPrevious && joinsNext) score += 8;
    if (!appointments.isEmpty() && (edgeStart || edgeEnd)) score += 10;
    if (orphanBefore) score -= 14;
    if (orphanAfter) score -= 14;
    score += Math.min(12, historicalDemand * 3);
    score = Math.max(1, Math.min(100, score));

    List<String> reasons = new ArrayList<>();
    if (joinsPrevious && joinsNext) {
      reasons.add("Completa exactamente un espacio entre dos turnos");
    } else if (joinsPrevious || joinsNext) {
      reasons.add("Queda junto a otro turno y reduce tiempo muerto");
    } else if (appointments.isEmpty()) {
      reasons.add("Es una buena opción para comenzar la agenda del día");
    } else if (edgeStart || edgeEnd) {
      reasons.add("Extiende un bloque de trabajo sin fragmentar la agenda");
    } else {
      reasons.add("Está disponible y respeta la duración del servicio");
    }
    if (historicalDemand > 0) reasons.add("Es un horario solicitado habitualmente");
    if (orphanBefore || orphanAfter) reasons.add("Puede dejar un espacio corto sin aprovechar");

    Map<String, Object> slot = new LinkedHashMap<>();
    slot.put("horaInicio", start.toString());
    slot.put("horaFin", end.toString());
    slot.put("duracionMin", duration);
    slot.put("puntaje", score);
    slot.put("motivoPrincipal", reasons.getFirst());
    slot.put("motivos", reasons);
    slot.put("demandaHistorica", historicalDemand);
    slot.put("minutosLibresAntes", gapBefore);
    slot.put("minutosLibresDespues", gapAfter);
    return slot;
  }

  private Map<String, Object> response(
      String date,
      String day,
      int professional,
      int service,
      int duration,
      List<Map<String, Object>> slots,
      String summary,
      int appointments) {
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("fecha", date);
    result.put("diaSemana", day);
    result.put("profesional", professional);
    result.put("servicio", service);
    result.put("duracionServicio", duration);
    result.put("turnosExistentes", appointments);
    result.put("totalSlots", slots.size());
    result.put("resumenInteligente", summary);
    result.put("slots", slots);
    return result;
  }

  private boolean overlaps(LocalTime start, LocalTime end, Appointment appointment) {
    return start.isBefore(appointment.end()) && end.isAfter(appointment.start());
  }

  private String dayName(LocalDate date) {
    return switch (date.getDayOfWeek()) {
      case MONDAY -> "Lunes";
      case TUESDAY -> "Martes";
      case WEDNESDAY -> "Miercoles";
      case THURSDAY -> "Jueves";
      case FRIDAY -> "Viernes";
      case SATURDAY -> "Sabado";
      case SUNDAY -> "Domingo";
    };
  }

  private LocalTime time(Object value) {
    return value instanceof java.sql.Time t
        ? t.toLocalTime()
        : LocalTime.parse(String.valueOf(value));
  }

  private record Appointment(LocalTime start, LocalTime end) {}
}
