package com.smartagenda.api;

import java.time.LocalDate;
import java.time.LocalTime;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class TurnoExpiration {
  private final JdbcTemplate jdbc;

  public TurnoExpiration(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @Scheduled(fixedDelay = 60_000, initialDelay = 0)
  public void expirePastAppointments() {
    LocalDate today = LocalDate.now();
    jdbc.update("UPDATE turno SET estado='vencido' WHERE estado IN ('pendiente','confirmado') "
        + "AND (fecha<? OR (fecha=? AND horaFin<?))", today, today, LocalTime.now());
  }
}
