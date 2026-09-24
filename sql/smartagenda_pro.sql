-- ============================================================
-- SmartAgenda Pro - Base de Datos
-- Sistema SaaS de Agenda Inteligente para Profesionales
-- ============================================================

CREATE DATABASE IF NOT EXISTS smartagenda_pro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smartagenda_pro;

-- ============================================================
-- TABLA: rol
-- ============================================================
CREATE TABLE IF NOT EXISTS rol (
    idRol INT AUTO_INCREMENT PRIMARY KEY,
    nombreRol VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;

-- ============================================================
-- TABLA: rubro
-- ============================================================
CREATE TABLE IF NOT EXISTS rubro (
    idRubro INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;

-- ============================================================
-- TABLA: cancelacion
-- ============================================================
CREATE TABLE IF NOT EXISTS cancelacion (
    idCancelacion INT AUTO_INCREMENT PRIMARY KEY,
    motivo TEXT,
    fechaCancelacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    idTurno INT NOT NULL,
    FOREIGN KEY (idTurno) REFERENCES turno(idTurno)
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;

-- ============================================================
-- DATOS DE PRUEBA
-- ============================================================

-- Roles
INSERT INTO rol (nombreRol) VALUES ('Cliente'), ('Profesional'), ('Administrador');

-- Rubros
INSERT INTO rubro (nombre) VALUES ('Medicina'), ('Peluqueria'), ('Tecnico'), ('Consultoria'), ('Fitness');

-- Usuarios (contraseñas hasheadas con password_hash de PHP)
-- Para generar estos hashes se usó el script setup.php
-- admin123 / prof123 / cliente123 son las contraseñas en texto plano
INSERT INTO usuario (nombre, apellido, email, contrasena, telefono, estado, idRol) VALUES
('Admin', 'Sistema', 'admin@smartagenda.com', '$2y$10$YSRkE1y5ZHbRGWax98IXJeUFg2nHMB.vSECMhVTMGN1rGKp1fDNYq', '2615550000', 'activo', 3),
('Carlos', 'Martinez', 'martinez@smartagenda.com', '$2y$10$YSRkE1y5ZHbRGWax98IXJeUFg2nHMB.vSECMhVTMGN1rGKp1fDNYq', '2615551111', 'activo', 2),
('Juan', 'Perez', 'juanperez@smartagenda.com', '$2y$10$YSRkE1y5ZHbRGWax98IXJeUFg2nHMB.vSECMhVTMGN1rGKp1fDNYq', '2615552222', 'activo', 1),
('Laura', 'Fernandez', 'laura@smartagenda.com', '$2y$10$YSRkE1y5ZHbRGWax98IXJeUFg2nHMB.vSECMhVTMGN1rGKp1fDNYq', '2615553333', 'activo', 1),
('Maria', 'Gonzalez', 'maria@smartagenda.com', '$2y$10$YSRkE1y5ZHbRGWax98IXJeUFg2nHMB.vSECMhVTMGN1rGKp1fDNYq', '2615554444', 'activo', 2);

-- Profesionales
INSERT INTO profesional (nombreNegocio, descripcion, idRubro, idUsuario) VALUES
('Consultorio Dr. Martinez', 'Medico clinico con 10 anios de experiencia. Atencion personalizada y seguimiento integral.', 1, 2),
('Estilo Maria', 'Peluqueria y estetica profesional. Cortes modernos y colorimetria avanzada.', 2, 5);

-- Servicios del Dr. Martinez (idProfesional = 1)
INSERT INTO servicio (nombre, descripcion, duracionMin, precio, estado, idProfesional) VALUES
('Consulta General', 'Consulta medica general con revision completa', 30, 5000.00, 'activo', 1),
('Chequeo Completo', 'Chequeo integral con analisis y diagnostico', 60, 12000.00, 'activo', 1),
('Control Seguimiento', 'Visita de control y seguimiento de tratamiento', 20, 3500.00, 'activo', 1);

-- Servicios de Maria (idProfesional = 2)
INSERT INTO servicio (nombre, descripcion, duracionMin, precio, estado, idProfesional) VALUES
('Corte de Pelo', 'Corte moderno personalizado', 45, 4500.00, 'activo', 2),
('Colorimetria', 'Tintura y colorimetria profesional', 90, 15000.00, 'activo', 2),
('Brushing', 'Lavado y brushing profesional', 30, 3000.00, 'activo', 2);

-- Disponibilidad del Dr. Martinez (idProfesional = 1)
INSERT INTO disponibilidad (diaSemana, horaInicio, horaFin, intervaloMin, idProfesional) VALUES
('Lunes', '08:00', '17:00', 30, 1),
('Martes', '08:00', '17:00', 30, 1),
('Miercoles', '08:00', '13:00', 30, 1),
('Jueves', '08:00', '17:00', 30, 1),
('Viernes', '08:00', '13:00', 30, 1);

-- Disponibilidad de Maria (idProfesional = 2)
INSERT INTO disponibilidad (diaSemana, horaInicio, horaFin, intervaloMin, idProfesional) VALUES
('Lunes', '09:00', '18:00', 30, 2),
('Martes', '09:00', '18:00', 30, 2),
('Miercoles', '09:00', '18:00', 30, 2),
('Jueves', '09:00', '18:00', 30, 2),
('Viernes', '09:00', '15:00', 30, 2),
('Sabado', '09:00', '13:00', 30, 2);

-- Turnos de ejemplo
INSERT INTO turno (fecha, horaInicio, horaFin, estado, idCliente, idServicio, idProfesional) VALUES
('2026-06-16', '08:00', '08:30', 'confirmado', 3, 1, 1),
('2026-06-16', '09:00', '10:00', 'pendiente', 4, 2, 1),
('2026-06-16', '10:30', '11:00', 'confirmado', 3, 3, 1),
('2026-06-17', '10:00', '10:45', 'pendiente', 3, 4, 2),
('2026-06-15', '08:00', '08:30', 'finalizado', 4, 1, 1),
('2026-06-14', '09:00', '09:30', 'cancelado', 3, 1, 1);

-- Cancelacion de ejemplo
INSERT INTO cancelacion (motivo, idTurno) VALUES
('No puedo asistir por motivos personales', 6);
