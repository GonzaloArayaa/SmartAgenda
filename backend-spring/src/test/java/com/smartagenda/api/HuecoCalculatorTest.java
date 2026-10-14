package com.smartagenda.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.smartagenda.api.HuecoCalculator.Hueco;
import com.smartagenda.api.HuecoCalculator.Ocupado;
import com.smartagenda.api.HuecoCalculator.Rango;
import java.util.List;
import org.junit.jupiter.api.Test;

class HuecoCalculatorTest {
  private static int h(int hora, int minuto) {
    return hora * 60 + minuto;
  }

  private static Rango rango(int h1, int m1, int h2, int m2, int intervalo) {
    return new Rango(h(h1, m1), h(h2, m2), intervalo);
  }

  private static Ocupado turno(int h1, int m1, int h2, int m2) {
    return new Ocupado(h(h1, m1), h(h2, m2));
  }

  @Test
  void sinTurnosElHuecoEsTodoElTramo() {
    List<Hueco> huecos = HuecoCalculator.calcular(List.of(rango(9, 0, 13, 0, 30)), List.of(), null, 30);
    assertEquals(List.of(new Hueco(h(9, 0), h(13, 0), true)), huecos);
  }

  @Test
  void unTurnoEnElMedioDejaDosHuecos() {
    List<Hueco> huecos = HuecoCalculator.calcular(List.of(rango(9, 0, 13, 0, 30)),
        List.of(turno(10, 0, 10, 30)), null, 30);
    assertEquals(List.of(new Hueco(h(9, 0), h(10, 0), true), new Hueco(h(10, 30), h(13, 0), true)), huecos);
  }

  @Test
  void turnosPegadosAlPrincipioAlFinalOEntreSiNoDejanHueco() {
    List<Hueco> huecos = HuecoCalculator.calcular(List.of(rango(9, 0, 11, 0, 30)),
        List.of(turno(9, 0, 9, 30), turno(9, 30, 10, 0), turno(10, 30, 11, 0)), null, 30);
    assertEquals(List.of(new Hueco(h(10, 0), h(10, 30), true)), huecos);
  }

  @Test
  void agendaCompletaNoTieneHuecos() {
    assertTrue(HuecoCalculator.calcular(List.of(rango(9, 0, 10, 0, 30)),
        List.of(turno(9, 0, 9, 30), turno(9, 30, 10, 0)), null, 30).isEmpty());
  }

  @Test
  void horarioCortadoNoGeneraHuecoEnElDescanso() {
    List<Hueco> huecos = HuecoCalculator.calcular(
        List.of(rango(16, 0, 20, 0, 30), rango(9, 0, 13, 0, 30)),
        List.of(turno(17, 0, 18, 0), turno(10, 0, 11, 0)), null, 30);
    assertEquals(List.of(
        new Hueco(h(9, 0), h(10, 0), true), new Hueco(h(11, 0), h(13, 0), true),
        new Hueco(h(16, 0), h(17, 0), true), new Hueco(h(18, 0), h(20, 0), true)), huecos);
    assertTrue(huecos.stream().noneMatch(x -> x.inicio() < h(16, 0) && x.fin() > h(13, 0)));
  }

  @Test
  void unTurnoQueSobresaleDelTramoSoloRecortaElTramo() {
    List<Hueco> huecos = HuecoCalculator.calcular(List.of(rango(9, 0, 12, 0, 30)),
        List.of(turno(8, 30, 9, 30), turno(11, 30, 12, 30)), null, 30);
    assertEquals(List.of(new Hueco(h(9, 30), h(11, 30), true)), huecos);
  }

  @Test
  void unTurnoFueraDelTramoNoAfecta() {
    List<Hueco> huecos = HuecoCalculator.calcular(List.of(rango(9, 0, 10, 0, 30)),
        List.of(turno(13, 0, 14, 0)), null, 30);
    assertEquals(List.of(new Hueco(h(9, 0), h(10, 0), true)), huecos);
  }

  @Test
  void losTurnosDesordenadosSeOrdenan() {
    List<Hueco> huecos = HuecoCalculator.calcular(List.of(rango(9, 0, 12, 0, 30)),
        List.of(turno(11, 0, 11, 30), turno(9, 30, 10, 0)), null, 30);
    assertEquals(List.of(new Hueco(h(9, 0), h(9, 30), true), new Hueco(h(10, 0), h(11, 0), true),
        new Hueco(h(11, 30), h(12, 0), true)), huecos);
  }

  @Test
  void hoySoloCuentaLoQueQuedaDelDia() {
    List<Hueco> huecos = HuecoCalculator.calcular(List.of(rango(9, 0, 13, 0, 30)),
        List.of(turno(10, 0, 10, 30)), h(10, 10), 30);
    assertEquals(List.of(new Hueco(h(10, 30), h(13, 0), true)), huecos);
    assertTrue(HuecoCalculator.calcular(List.of(rango(9, 0, 13, 0, 30)), List.of(), h(13, 0), 30).isEmpty());
    assertTrue(HuecoCalculator.calcular(List.of(rango(9, 0, 13, 0, 30)), List.of(), h(18, 0), 30).isEmpty());
  }

  @Test
  void unHuecoMasCortoQueElServicioMasCortoEsMuerto() {
    // El servicio más corto dura 30 minutos: 20 minutos libres no sirven para nada
    List<Hueco> huecos = HuecoCalculator.calcular(List.of(rango(9, 0, 12, 0, 10)),
        List.of(turno(9, 0, 10, 0), turno(10, 20, 12, 0)), null, 30);
    assertEquals(List.of(new Hueco(h(10, 0), h(10, 20), false)), huecos);
    assertFalse(huecos.getFirst().aprovechable());
  }

  @Test
  void elHuecoDebeEncajarEnLaGrillaDelTramo() {
    // Turnos cada 30 min desde las 9:00. Libre 9:50-10:20 (30 min): el horario 10:00 terminaría 10:30
    List<Hueco> noEncaja = HuecoCalculator.calcular(List.of(rango(9, 0, 12, 0, 30)),
        List.of(turno(9, 0, 9, 50), turno(10, 20, 12, 0)), null, 30);
    assertEquals(List.of(new Hueco(h(9, 50), h(10, 20), false)), noEncaja);
    // Libre 9:50-10:30: el horario 10:00 entra justo
    List<Hueco> encaja = HuecoCalculator.calcular(List.of(rango(9, 0, 12, 0, 30)),
        List.of(turno(9, 0, 9, 50), turno(10, 30, 12, 0)), null, 30);
    assertEquals(List.of(new Hueco(h(9, 50), h(10, 30), true)), encaja);
  }

  @Test
  void sinServiciosActivosTodoEsMuerto() {
    List<Hueco> huecos = HuecoCalculator.calcular(List.of(rango(9, 0, 12, 0, 30)), List.of(), null, null);
    assertEquals(List.of(new Hueco(h(9, 0), h(12, 0), false)), huecos);
  }

  @Test
  void unIntervaloInvalidoNoRompeElCalculo() {
    List<Hueco> huecos = HuecoCalculator.calcular(List.of(rango(9, 0, 10, 0, 0)), List.of(), null, 30);
    assertEquals(1, huecos.size());
  }

  @Test
  void sinTramosNoHayHuecos() {
    assertTrue(HuecoCalculator.calcular(List.of(), List.of(turno(9, 0, 10, 0)), null, 30).isEmpty());
  }

  @Test
  void horariosCercanosAMedianocheNoDanLaVuelta() {
    List<Hueco> huecos = HuecoCalculator.calcular(List.of(rango(22, 0, 23, 59, 30)),
        List.of(turno(23, 0, 23, 30)), null, 30);
    assertEquals(List.of(new Hueco(h(22, 0), h(23, 0), true), new Hueco(h(23, 30), h(23, 59), false)), huecos);
  }
}
