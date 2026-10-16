package com.smartagenda.config;

import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class FlywayConfig {
  private static final Logger log = LoggerFactory.getLogger(FlywayConfig.class);

  /**
   * Aplica las migraciones pendientes. Si la base ya existía pero nunca fue gestionada por Flyway
   * (una instalación anterior), Flyway la toma como actualizada hasta la V2 sin modificarla; en ese
   * caso se avisa en el log, porque una base de una versión muy vieja puede tener datos desactualizados.
   */
  @Bean
  FlywayMigrationStrategy migrationStrategy(DataSource dataSource) {
    JdbcTemplate jdbc = new JdbcTemplate(dataSource);
    return flyway -> {
      boolean conHistorial = existeTabla(jdbc, "flyway_schema_history");
      boolean conDatos = existeTabla(jdbc, "usuario");
      flyway.migrate();
      if (!conHistorial && conDatos) {
        log.warn("""

            ============================================================
             Base de datos existente sin historial de Flyway.
             Se tomó como actualizada hasta la V2 y NO se modificó.
             Si es de una versión anterior del proyecto (por ejemplo, con
             pocos usuarios o turnos), borrala y reiniciá el backend para
             que se cree de nuevo con los datos actuales:
                 DROP DATABASE smartagenda_pro;
            ============================================================""");
      }
    };
  }

  private boolean existeTabla(JdbcTemplate jdbc, String tabla) {
    Integer cantidad = jdbc.queryForObject(
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=?",
        Integer.class, tabla);
    return cantidad != null && cantidad > 0;
  }
}
