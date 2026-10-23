package com.smartagenda.api;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Dice si cada profesional tiene lugar para reservar, reutilizando el cálculo de huecos de la agenda:
 * "tiene lugar" un día si queda un hueco donde entra su servicio más corto, respetando la grilla de
 * horarios. Se calcula para varios profesionales de una vez (pocas consultas, sin importar cuántos sean).
 */
@Component
class DisponibilidadProfesionales {
  /** Cuántos días hacia adelante se busca el próximo lugar libre (hoy incluido). */
  static final int DIAS_PROXIMO_LUGAR = 14;

  /** Primer lugar libre de un día: la hora de inicio y el tiempo libre total aprovechable. */
  record Lugar(LocalDate fecha, int horaInicio, int minutosLibres) {}

  /** @param proximo primer lugar libre desde hoy (null si no hay en los próximos días); hoy y enFecha, null si no hay */
  record Resultado(Lugar hoy, Lugar proximo, Lugar enFecha) {}

  private final JdbcTemplate jdbc;

  DisponibilidadProfesionales(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  /** @param fechaElegida día que se quiere consultar además de "hoy" y el próximo lugar; puede ser null */
  Map<Integer, Resultado> calcular(Collection<Integer> ids, LocalDate fechaElegida) {
    Map<Integer, Resultado> resultados = new HashMap<>();
    if (ids.isEmpty()) return resultados;

    LocalDate hoy = LocalDate.now();
    LocalDate ultimo = hoy.plusDays(DIAS_PROXIMO_LUGAR - 1L);
    String marcas = String.join(",", ids.stream().map(id -> "?").toList());

    Map<Integer, Map<String, List<HuecoCalculator.Rango>>> rangos = new HashMap<>();
    for (Map<String, Object> f : jdbc.queryForList(
        "SELECT idProfesional,diaSemana,horaInicio,horaFin,intervaloMin FROM disponibilidad WHERE idProfesional IN (" + marcas + ")",
        ids.toArray())) {
      rangos.computeIfAbsent(id(f), k -> new HashMap<>())
          .computeIfAbsent(String.valueOf(f.get("diaSemana")), k -> new ArrayList<>())
          .add(new HuecoCalculator.Rango(Horarios.minutos(Horarios.hora(f.get("horaInicio"))),
              Horarios.minutos(Horarios.hora(f.get("horaFin"))), ((Number) f.get("intervaloMin")).intValue()));
    }

    Map<Integer, Integer> servicioMasCorto = new HashMap<>();
    for (Map<String, Object> f : jdbc.queryForList(
        "SELECT idProfesional,MIN(duracionMin) corto FROM servicio WHERE estado='activo' AND idProfesional IN (" + marcas + ") GROUP BY idProfesional",
        ids.toArray())) {
      servicioMasCorto.put(id(f), ((Number) f.get("corto")).intValue());
    }

    Map<Integer, Map<LocalDate, List<HuecoCalculator.Ocupado>>> ocupados = new HashMap<>();
    cargarOcupados(ocupados, ids, marcas, hoy, ultimo);
    if (fechaElegida != null && (fechaElegida.isBefore(hoy) || fechaElegida.isAfter(ultimo))) {
      cargarOcupados(ocupados, ids, marcas, fechaElegida, fechaElegida);
    }

    LocalTime ahora = LocalTime.now();
    int minutoActual = Horarios.minutos(ahora) + (ahora.getSecond() > 0 || ahora.getNano() > 0 ? 1 : 0);
    for (int id : ids) {
      Lugar lugarHoy = null, proximo = null, enFecha = null;
      for (LocalDate dia = hoy; !dia.isAfter(ultimo); dia = dia.plusDays(1)) {
        Lugar lugar = lugarDelDia(id, dia, dia.equals(hoy) ? minutoActual : null, rangos, ocupados, servicioMasCorto);
        if (lugar != null && proximo == null) proximo = lugar;
        if (lugar != null && dia.equals(hoy)) lugarHoy = lugar;
        if (dia.equals(fechaElegida)) enFecha = lugar;
      }
      if (fechaElegida != null && (fechaElegida.isAfter(ultimo))) {
        enFecha = lugarDelDia(id, fechaElegida, null, rangos, ocupados, servicioMasCorto);
      }
      resultados.put(id, new Resultado(lugarHoy, proximo, enFecha));
    }
    return resultados;
  }

  private Lugar lugarDelDia(int id, LocalDate dia, Integer minutoActual,
      Map<Integer, Map<String, List<HuecoCalculator.Rango>>> rangos,
      Map<Integer, Map<LocalDate, List<HuecoCalculator.Ocupado>>> ocupados, Map<Integer, Integer> servicioMasCorto) {
    List<HuecoCalculator.Rango> delDia = rangos.getOrDefault(id, Map.of()).getOrDefault(Horarios.dia(dia.getDayOfWeek()), List.of());
    if (delDia.isEmpty()) return null;
    Integer corto = servicioMasCorto.get(id);
    List<HuecoCalculator.Hueco> huecos = HuecoCalculator.calcular(delDia,
        ocupados.getOrDefault(id, Map.of()).getOrDefault(dia, List.of()), minutoActual, corto);
    Integer primero = null;
    int libres = 0;
    for (HuecoCalculator.Hueco hueco : huecos) {
      if (!hueco.aprovechable()) continue;
      libres += hueco.minutos();
      Integer horario = HuecoCalculator.primerHorario(delDia, hueco, corto);
      if (horario != null && (primero == null || horario < primero)) primero = horario;
    }
    return primero == null ? null : new Lugar(dia, primero, libres);
  }

  private void cargarOcupados(Map<Integer, Map<LocalDate, List<HuecoCalculator.Ocupado>>> destino,
      Collection<Integer> ids, String marcas, LocalDate desde, LocalDate hasta) {
    List<Object> params = new ArrayList<>(ids);
    params.add(desde);
    params.add(hasta);
    for (Map<String, Object> f : jdbc.queryForList(
        "SELECT idProfesional,fecha,horaInicio,horaFin FROM turno WHERE idProfesional IN (" + marcas
            + ") AND fecha BETWEEN ? AND ? AND estado IN ('pendiente','confirmado') ORDER BY fecha,horaInicio",
        params.toArray())) {
      destino.computeIfAbsent(id(f), k -> new HashMap<>())
          .computeIfAbsent(Horarios.fecha(f.get("fecha")), k -> new ArrayList<>())
          .add(new HuecoCalculator.Ocupado(Horarios.minutos(Horarios.hora(f.get("horaInicio"))),
              Horarios.minutos(Horarios.hora(f.get("horaFin")))));
    }
  }

  private static int id(Map<String, Object> fila) {
    return ((Number) fila.get("idProfesional")).intValue();
  }
}
