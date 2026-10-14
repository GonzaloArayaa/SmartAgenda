package com.smartagenda.api;

import java.time.LocalDate;
import java.time.LocalTime;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class TurnoExpiration {
  private static final String YA_PASO = "(fecha<? OR (fecha=? AND horaFin<?))";

  private final JdbcTemplate jdbc;

  public TurnoExpiration(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  // Cierre automático de turnos cuya hora ya pasó:
  //  - confirmado -> finalizado: el turno se atendió, así que sigue contando en ingresos y estadísticas.
  //  - pendiente  -> vencido: nunca se confirmó, no se atendió.
  @Scheduled(fixedDelay = 60_000, initialDelay = 0)
  public void expirePastAppointments() {
    LocalDate today = LocalDate.now();
    LocalTime now = LocalTime.now();
    jdbc.update("UPDATE turno SET estado='finalizado' WHERE estado='confirmado' AND " + YA_PASO,
        today, today, now);
    jdbc.update("UPDATE turno SET estado='vencido' WHERE estado='pendiente' AND " + YA_PASO,
        today, today, now);
  }
}
