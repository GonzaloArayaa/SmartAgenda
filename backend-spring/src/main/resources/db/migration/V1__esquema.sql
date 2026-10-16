-- V1: estructura de la base de datos de SmartAgenda Pro.
-- Flyway la ejecuta una sola vez al iniciar el backend en una base vacía.
-- Cada tabla fija utf8mb4 para que los acentos se guarden bien sin importar el valor por defecto del servidor.

-- ============================================================
-- TABLA: rol
-- ============================================================
CREATE TABLE IF NOT EXISTS rol (
    idRol INT AUTO_INCREMENT PRIMARY KEY,
    nombreRol VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: usuario
-- ============================================================
CREATE TABLE IF NOT EXISTS usuario (
    idUsuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    estado VARCHAR(20) DEFAULT 'activo',
    idRol INT NOT NULL,
    fechaRegistro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idRol) REFERENCES rol(idRol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: rubro
-- ============================================================
CREATE TABLE IF NOT EXISTS rubro (
    idRubro INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    estado VARCHAR(20) NOT NULL DEFAULT 'activo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: profesional
-- ============================================================
CREATE TABLE IF NOT EXISTS profesional (
    idProfesional INT AUTO_INCREMENT PRIMARY KEY,
    nombreNegocio VARCHAR(100) NOT NULL,
    descripcion TEXT,
    idRubro INT NOT NULL,
    idUsuario INT NOT NULL UNIQUE,
    FOREIGN KEY (idRubro) REFERENCES rubro(idRubro),
    FOREIGN KEY (idUsuario) REFERENCES usuario(idUsuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: servicio
-- ============================================================
CREATE TABLE IF NOT EXISTS servicio (
    idServicio INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    duracionMin INT NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    estado VARCHAR(20) DEFAULT 'activo',
    idProfesional INT NOT NULL,
    FOREIGN KEY (idProfesional) REFERENCES profesional(idProfesional)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: disponibilidad
-- ============================================================
CREATE TABLE IF NOT EXISTS disponibilidad (
    idDisponibilidad INT AUTO_INCREMENT PRIMARY KEY,
    diaSemana VARCHAR(15) NOT NULL,
    horaInicio TIME NOT NULL,
    horaFin TIME NOT NULL,
    intervaloMin INT DEFAULT 30,
    idProfesional INT NOT NULL,
    FOREIGN KEY (idProfesional) REFERENCES profesional(idProfesional)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: turno
-- ============================================================
CREATE TABLE IF NOT EXISTS turno (
    idTurno INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATE NOT NULL,
    horaInicio TIME NOT NULL,
    horaFin TIME NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente',
    fechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    idCliente INT NOT NULL,
    idServicio INT NOT NULL,
    idProfesional INT NOT NULL,
    FOREIGN KEY (idCliente) REFERENCES usuario(idUsuario),
    FOREIGN KEY (idServicio) REFERENCES servicio(idServicio),
    FOREIGN KEY (idProfesional) REFERENCES profesional(idProfesional)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: cancelacion
-- ============================================================
CREATE TABLE IF NOT EXISTS cancelacion (
    idCancelacion INT AUTO_INCREMENT PRIMARY KEY,
    motivo TEXT,
    fechaCancelacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    idTurno INT NOT NULL,
    FOREIGN KEY (idTurno) REFERENCES turno(idTurno)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: lista_espera
-- Clientes interesados en ocupar un turno que se libere.
-- ============================================================
CREATE TABLE IF NOT EXISTS lista_espera (
    idListaEspera INT AUTO_INCREMENT PRIMARY KEY,
    fechaDeseada DATE NOT NULL,
    horaDesde TIME NULL,
    horaHasta TIME NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'esperando',
    fechaSolicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
    fechaExpiracion DATETIME NULL,
    idCliente INT NOT NULL,
    idProfesional INT NOT NULL,
    idServicio INT NOT NULL,
    idTurnoOfertado INT NULL,
    FOREIGN KEY (idCliente) REFERENCES usuario(idUsuario),
    FOREIGN KEY (idProfesional) REFERENCES profesional(idProfesional),
    FOREIGN KEY (idServicio) REFERENCES servicio(idServicio),
    FOREIGN KEY (idTurnoOfertado) REFERENCES turno(idTurno)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: recomendacion
-- ============================================================
CREATE TABLE IF NOT EXISTS recomendacion (
    idRecomendacion INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATE NOT NULL,
    horaSugerida TIME NOT NULL,
    puntaje DECIMAL(5,2),
    idProfesional INT NOT NULL,
    idServicio INT NOT NULL,
    FOREIGN KEY (idProfesional) REFERENCES profesional(idProfesional),
    FOREIGN KEY (idServicio) REFERENCES servicio(idServicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: reporte
-- ============================================================
CREATE TABLE IF NOT EXISTS reporte (
    idReporte INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    datos TEXT,
    fechaGeneracion DATE DEFAULT (CURRENT_DATE),
    idUsuario INT NOT NULL,
    FOREIGN KEY (idUsuario) REFERENCES usuario(idUsuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
