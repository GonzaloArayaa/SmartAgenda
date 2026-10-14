package com.smartagenda.api;

import jakarta.servlet.http.HttpSession;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
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

/** Huecos de la agenda: espacios libres entre los turnos, dentro de los tramos de atención. */
@RestController
@RequestMapping("/api/huecos")
public class HuecoController {
  private static final int MAX_DIAS = 31;

  private final JdbcTemplate jdbc;

  public HuecoController(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  /** Un día (fecha=) o un período de hasta 31 días (fechaDesde= y fechaHasta=). */
  @GetMapping
  public Map<String, Object> get(
      @RequestParam int idProfesional,
      @RequestParam(required = false) String fecha,
      @RequestParam(required = false) String fechaDesde,
      @RequestParam(required = false) String fechaHasta,
      HttpSession session) {
    Map<String, Object> user = SessionSupport.role(session, "Profesional", "Administrador");
    if (!SessionSupport.isAdmin(user) && SessionSupport.intValue(user, "idProfesional") != idProfesional) {
      throw new ApiException(HttpStatus.FORBIDDEN, "No tiene acceso a la agenda de otro profesional");
    }

    LocalDate desde = parseFecha(fecha != null ? fecha : fechaDesde, "fechaDesde");
    LocalDate hasta = fecha != null ? desde : parseFecha(fechaHasta, "fechaHasta");
    if (hasta.isBefore(desde)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "La fecha hasta no puede ser anterior a la fecha desde");
    }
    if (ChronoUnit.DAYS.between(desde, hasta) >= MAX_DIAS) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "El período no puede superar los " + MAX_DIAS + " días");
    }

    // Tramos de atención por día de la semana
    Map<String, List<HuecoCalculator.Rango>> rangosPorDia = new LinkedHashMap<>();
    jdbc.queryForList("SELECT diaSemana,horaInicio,horaFin,intervaloMin FROM disponibilidad "
            + "WHERE idProfesional=? ORDER BY horaInicio", idProfesional)
        .forEach(fila -> rangosPorDia
            .computeIfAbsent(String.valueOf(fila.get("diaSemana")), dia -> new ArrayList<>())
            .add(new HuecoCalculator.Rango(
                Horarios.minutos(Horarios.hora(fila.get("horaInicio"))),
                Horarios.minutos(Horarios.hora(fila.get("horaFin"))),
                ((Number) fila.get("intervaloMin")).intValue())));

    // Turnos del período que ocupan agenda
    Map<LocalDate, List<HuecoCalculator.Ocupado>> ocupadosPorFecha = new LinkedHashMap<>();
    jdbc.queryForList("SELECT fecha,horaInicio,horaFin FROM turno WHERE idProfesional=? "
            + "AND fecha BETWEEN ? AND ? AND estado IN ('pendiente','confirmado') ORDER BY fecha,horaInicio",
        idProfesional, desde, hasta)
        .forEach(fila -> ocupadosPorFecha
            .computeIfAbsent(Horarios.fecha(fila.get("fecha")), f -> new ArrayList<>())
            .add(new HuecoCalculator.Ocupado(
                Horarios.minutos(Horarios.hora(fila.get("horaInicio"))),
                Horarios.minutos(Horarios.hora(fila.get("horaFin"))))));

    Integer servicioMasCorto = jdbc.queryForObject(
        "SELECT MIN(duracionMin) FROM servicio WHERE idProfesional=? AND estado='activo'",
        Integer.class, idProfesional);

    LocalDate hoy = LocalDate.now();
    LocalTime ahora = LocalTime.now();
    int minutoActual = Horarios.minutos(ahora) + (ahora.getSecond() > 0 || ahora.getNano() > 0 ? 1 : 0);

    List<Map<String, Object>> dias = new ArrayList<>();
    int totalHuecos = 0, libres = 0, aprovechables = 0, muertos = 0;
    Map<String, Object> proximo = null;
    for (LocalDate dia = desde; !dia.isAfter(hasta); dia = dia.plusDays(1)) {
      String nombreDia = Horarios.dia(dia.getDayOfWeek());
      List<HuecoCalculator.Rango> rangos = rangosPorDia.getOrDefault(nombreDia, List.of());
      List<HuecoCalculator.Ocupado> ocupados = ocupadosPorFecha.getOrDefault(dia, List.of());
      boolean pasado = dia.isBefore(hoy);
      List<HuecoCalculator.Hueco> huecos = pasado ? List.of()
          : HuecoCalculator.calcular(rangos, ocupados, dia.equals(hoy) ? minutoActual : null, servicioMasCorto);

      int diaLibres = 0, diaAprovechables = 0;
      List<Map<String, Object>> detalle = new ArrayList<>();
      for (HuecoCalculator.Hueco hueco : huecos) {
        diaLibres += hueco.minutos();
        if (hueco.aprovechable()) diaAprovechables += hueco.minutos();
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("horaInicio", Horarios.texto(hueco.inicio()));
        item.put("horaFin", Horarios.texto(hueco.fin()));
        item.put("duracionMin", hueco.minutos());
        item.put("aprovechable", hueco.aprovechable());
        item.put("tipo", hueco.aprovechable() ? "aprovechable" : "muerto");
        detalle.add(item);
        if (proximo == null && hueco.aprovechable()) {
          proximo = new LinkedHashMap<>(item);
          proximo.put("fecha", dia.toString());
          proximo.put("diaSemana", nombreDia);
        }
      }
      totalHuecos += huecos.size();
      libres += diaLibres;
      aprovechables += diaAprovechables;
      muertos += diaLibres - diaAprovechables;

      Map<String, Object> resumenDia = new LinkedHashMap<>();
      resumenDia.put("fecha", dia.toString());
      resumenDia.put("diaSemana", nombreDia);
      resumenDia.put("atiende", !rangos.isEmpty());
      resumenDia.put("pasado", pasado);
      resumenDia.put("turnos", ocupados.size());
      resumenDia.put("minutosAtencion", rangos.stream().mapToInt(r -> r.fin() - r.inicio()).sum());
      resumenDia.put("minutosLibres", diaLibres);
      resumenDia.put("minutosAprovechables", diaAprovechables);
      resumenDia.put("minutosMuertos", diaLibres - diaAprovechables);
      resumenDia.put("huecos", detalle);
      dias.add(resumenDia);
    }

    Map<String, Object> resumen = new LinkedHashMap<>();
    resumen.put("cantidadHuecos", totalHuecos);
    resumen.put("minutosLibres", libres);
    resumen.put("minutosAprovechables", aprovechables);
    resumen.put("minutosMuertos", muertos);
    resumen.put("proximoHueco", proximo);

    Map<String, Object> resultado = new LinkedHashMap<>();
    resultado.put("idProfesional", idProfesional);
    resultado.put("fechaDesde", desde.toString());
    resultado.put("fechaHasta", hasta.toString());
    resultado.put("servicioMasCortoMin", servicioMasCorto);
    resultado.put("resumen", resumen);
    resultado.put("dias", dias);
    return resultado;
  }

  private LocalDate parseFecha(String valor, String campo) {
    if (valor == null || valor.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "Indique fecha, o fechaDesde y fechaHasta");
    }
    try {
      return LocalDate.parse(valor);
    } catch (DateTimeParseException e) {
      throw new ApiException(HttpStatus.BAD_REQUEST, campo + " debe tener formato AAAA-MM-DD");
    }
  }
}
