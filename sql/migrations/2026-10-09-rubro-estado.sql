-- Ejecutar una vez en instalaciones existentes. Los rubros actuales siguen activos.
ALTER TABLE rubro ADD COLUMN estado VARCHAR(20) NOT NULL DEFAULT 'activo';
