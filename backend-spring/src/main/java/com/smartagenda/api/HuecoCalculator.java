package com.smartagenda.api;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Calcula los huecos (espacios libres) de un día: lo que queda de cada tramo de atención una vez
 * descontados los turnos. Trabaja en minutos desde la medianoche para no tener problemas con
 * horarios cercanos a las 24:00. No depende de Spring ni de la base de datos.
 */
final class HuecoCalculator {
  private HuecoCalculator() {}

  /** Tramo de atención: [inicio, fin) y cada cuántos minutos arrancan los turnos. */
  record Rango(int inicio, int fin, int intervalo) {}

  /** Turno que ocupa [inicio, fin). */
  record Ocupado(int inicio, int fin) {}

  /**
   * Espacio libre [inicio, fin). Es aprovechable si en él puede reservarse el servicio más corto
   * respetando la grilla de horarios del tramo; si no, es un hueco muerto.
   */
  record Hueco(int inicio, int fin, boolean aprovechable) {
    int minutos() {
      return fin - inicio;
    }
  }

  /**
   * @param ahora minuto desde el cual cuenta el tiempo libre (hoy: la hora actual); null si todo el
   *     día cuenta (fechas futuras)
   * @param servicioMasCortoMin duración del servicio activo más corto; null si no hay servicios
   */
  static List<Hueco> calcular(List<Rango> rangos, List<Ocupado> ocupados, Integer ahora,
      Integer servicioMasCortoMin) {
    List<Ocupado> turnos = ocupados.stream().sorted(Comparator.comparingInt(Ocupado::inicio)).toList();
    List<Hueco> huecos = new ArrayList<>();
    for (Rango rango : rangos.stream().sorted(Comparator.comparingInt(Rango::inicio)).toList()) {
      int cursor = ahora == null ? rango.inicio() : Math.max(rango.inicio(), ahora);
      for (Ocupado turno : turnos) {
        if (turno.fin() <= cursor) continue;
        if (turno.inicio() >= rango.fin()) break;
        if (turno.inicio() > cursor) agregar(huecos, rango, cursor, turno.inicio(), servicioMasCortoMin);
        cursor = Math.max(cursor, turno.fin());
      }
      if (cursor < rango.fin()) agregar(huecos, rango, cursor, rango.fin(), servicioMasCortoMin);
    }
    return huecos;
  }

  private static void agregar(List<Hueco> huecos, Rango rango, int inicio, int fin, Integer servicioMasCortoMin) {
    if (fin <= inicio) return;
    huecos.add(new Hueco(inicio, fin, esAprovechable(rango, inicio, fin, servicioMasCortoMin)));
  }

  private static boolean esAprovechable(Rango rango, int inicio, int fin, Integer servicioMasCortoMin) {
    if (servicioMasCortoMin == null || servicioMasCortoMin <= 0) return false;
    int intervalo = Math.max(1, rango.intervalo());
    // Primer horario de la grilla del tramo que cae dentro del hueco
    int pasos = Math.floorDiv(inicio - rango.inicio() + intervalo - 1, intervalo);
    int primerHorario = rango.inicio() + Math.max(0, pasos) * intervalo;
    return primerHorario + servicioMasCortoMin <= fin;
  }
}
