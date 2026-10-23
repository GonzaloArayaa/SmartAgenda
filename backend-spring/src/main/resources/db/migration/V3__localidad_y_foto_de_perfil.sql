-- ============================================================
-- V3: localidad de los profesionales y foto de perfil
-- ============================================================

-- Localidad donde atiende cada profesional (se pide al registrarse y en el perfil, y se usa en la búsqueda)
ALTER TABLE profesional ADD COLUMN localidad VARCHAR(100) NULL AFTER descripcion;
CREATE INDEX idx_profesional_localidad ON profesional (localidad);

-- Foto de perfil: una por usuario. "version" sube con cada cambio para que el navegador no use una copia vieja.
CREATE TABLE IF NOT EXISTS foto_perfil (
    idUsuario INT PRIMARY KEY,
    tipoMime VARCHAR(20) NOT NULL,
    datos MEDIUMBLOB NOT NULL,
    version INT NOT NULL DEFAULT 1,
    FOREIGN KEY (idUsuario) REFERENCES usuario(idUsuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Localidades de los profesionales de ejemplo (los datos de la V2)
UPDATE profesional SET localidad = 'Ciudad de Mendoza' WHERE idProfesional IN (1, 4, 10);
UPDATE profesional SET localidad = 'Godoy Cruz'        WHERE idProfesional IN (2, 7, 12);
UPDATE profesional SET localidad = 'Guaymallén'        WHERE idProfesional IN (3, 8, 13);
UPDATE profesional SET localidad = 'Las Heras'         WHERE idProfesional IN (5, 9);
UPDATE profesional SET localidad = 'Luján de Cuyo'     WHERE idProfesional IN (6, 14);
UPDATE profesional SET localidad = 'Maipú'             WHERE idProfesional IN (11, 15);
