package com.smartagenda.api;

import jakarta.servlet.http.HttpSession;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reportes")
public class ReporteController {
  private final JdbcTemplate jdbc;

  public ReporteController(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @GetMapping
  public Object get(
      @RequestParam(defaultValue = "general") String tipo,
      @RequestParam(required = false) String fechaDesde,
      @RequestParam(required = false) String fechaHasta,
      @RequestParam(required = false) Integer idProfesional,
      HttpSession session) {
    if ("rubros".equals(tipo)) {
      return jdbc.queryForList("SELECT idRubro,nombre FROM rubro WHERE estado='activo' ORDER BY nombre");
    }
    Map<String, Object> user = SessionSupport.user(session);
    if (!"general".equals(tipo)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "Tipo de reporte no válido");
    }

    String role = String.valueOf(user.get("rol"));
    if ("Cliente".equals(role)) {
      throw new ApiException(HttpStatus.FORBIDDEN, "No tiene permisos para ver reportes");
    }
    if ("Profesional".equals(role)) {
      idProfesional = SessionSupport.intValue(user, "idProfesional");
    }

    LocalDate today = LocalDate.now();
    LocalDate from = parseDate(fechaDesde, today.withDayOfMonth(1), "fechaDesde");
    LocalDate to = parseDate(fechaHasta, today.withDayOfMonth(today.lengthOfMonth()), "fechaHasta");
    if (from.isAfter(to)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "La fecha desde no puede ser posterior a la fecha hasta");
    }

    String professionalClause = idProfesional == null ? "" : " AND t.idProfesional=?";
    String periodFilter = "t.fecha BETWEEN ? AND ?" + professionalClause;
    List<Object> periodParams = new ArrayList<>(List.of(from.toString(), to.toString()));
    if (idProfesional != null) periodParams.add(idProfesional);

    int total = count("SELECT COUNT(*) FROM turno t WHERE " + periodFilter, periodParams);
    int confirmed = count("SELECT COUNT(*) FROM turno t WHERE " + periodFilter + " AND t.estado='confirmado'", periodParams);
    int finished = count("SELECT COUNT(*) FROM turno t WHERE " + periodFilter + " AND t.estado='finalizado'", periodParams);
    int cancelled = count("SELECT COUNT(*) FROM turno t WHERE " + periodFilter + " AND t.estado='cancelado'", periodParams);
    BigDecimal income = jdbc.queryForObject(
        "SELECT COALESCE(SUM(s.precio),0) FROM turno t JOIN servicio s ON t.idServicio=s.idServicio WHERE "
            + periodFilter + " AND t.estado IN ('confirmado','finalizado')",
        BigDecimal.class,
        periodParams.toArray());

    List<Object> todayParams = new ArrayList<>(List.of(today.toString()));
    if (idProfesional != null) todayParams.add(idProfesional);
    int appointmentsToday = count(
        "SELECT COUNT(*) FROM turno t WHERE t.fecha=?" + professionalClause
            + " AND t.estado IN ('pendiente','confirmado')",
        todayParams);

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("periodo", Map.of("fechaDesde", from.toString(), "fechaHasta", to.toString()));
    result.put("totalTurnos", total);
    result.put("turnosHoy", appointmentsToday);
    result.put("totalConfirmados", confirmed);
    result.put("totalFinalizados", finished);
    result.put("totalCancelaciones", cancelled);
    result.put("tasaOcupacion", total == 0 ? 0 : Math.round(((confirmed + finished) * 1000.0) / total) / 10.0);
    result.put("ingresos", income == null ? BigDecimal.ZERO : income);
    result.put("turnosPorEstado", jdbc.queryForList(
        "SELECT estado,COUNT(*) total FROM turno t WHERE " + periodFilter + " GROUP BY estado ORDER BY estado",
        periodParams.toArray()));
    result.put("turnosPorDia", jdbc.queryForList(
        "SELECT fecha,COUNT(*) total FROM turno t WHERE " + periodFilter + " GROUP BY fecha ORDER BY fecha",
        periodParams.toArray()));
    result.put("serviciosTop", jdbc.queryForList(
        "SELECT s.idServicio,s.nombre,COUNT(*) total FROM turno t JOIN servicio s ON t.idServicio=s.idServicio WHERE "
            + periodFilter + " GROUP BY s.idServicio,s.nombre ORDER BY total DESC,s.nombre LIMIT 5",
        periodParams.toArray()));
    return result;
  }

  private LocalDate parseDate(String value, LocalDate fallback, String field) {
    if (value == null || value.isBlank()) return fallback;
    try {
      return LocalDate.parse(value);
    } catch (DateTimeParseException exception) {
      throw new ApiException(HttpStatus.BAD_REQUEST, field + " debe tener formato AAAA-MM-DD");
    }
  }

  private int count(String sql, List<Object> params) {
    Integer value = jdbc.queryForObject(sql, Integer.class, params.toArray());
    return value == null ? 0 : value;
  }
}
