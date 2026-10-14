package com.smartagenda.api;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;

/** Utilidades de horas y días compartidas por disponibilidad, recomendaciones y huecos. */
final class Horarios {
  private Horarios() {}

  /** Convierte lo que devuelve JDBC para una columna TIME (o un texto HH:MM[:SS]) en LocalTime. */
  static LocalTime hora(Object valor) {
    if (valor instanceof java.sql.Time time) return time.toLocalTime();
    return LocalTime.parse(String.valueOf(valor));
  }

  /** Convierte lo que devuelve JDBC para una columna DATE en LocalDate. */
  static LocalDate fecha(Object valor) {
    if (valor instanceof java.sql.Date date) return date.toLocalDate();
    if (valor instanceof LocalDate date) return date;
    return LocalDate.parse(String.valueOf(valor));
  }

  /** Nombre del día tal como se guarda en la tabla disponibilidad (sin tildes). */
  static String dia(DayOfWeek dia) {
    return switch (dia) {
      case MONDAY -> "Lunes";
      case TUESDAY -> "Martes";
      case WEDNESDAY -> "Miercoles";
      case THURSDAY -> "Jueves";
      case FRIDAY -> "Viernes";
      case SATURDAY -> "Sabado";
      case SUNDAY -> "Domingo";
    };
  }

  static int minutos(LocalTime hora) {
    return hora.getHour() * 60 + hora.getMinute();
  }

  static String texto(int minutosDelDia) {
    return String.format("%02d:%02d", minutosDelDia / 60, minutosDelDia % 60);
  }
}
