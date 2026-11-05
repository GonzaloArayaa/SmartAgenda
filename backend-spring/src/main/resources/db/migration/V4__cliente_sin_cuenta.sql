-- ============================================================
-- V4: clientes sin cuenta (demanda espontánea)
-- Un profesional puede cargar a una persona que todavía no se registró en la app.
-- Esa persona queda en "usuario" sin contraseña (no puede iniciar sesión) y con
-- cuentaActiva = 0. Si más adelante se registra con el mismo email, se activa la
-- misma cuenta y conserva su historial de turnos.
-- ============================================================

-- El email pasa a ser opcional (el UNIQUE sigue valiendo: MySQL admite varios NULL)
ALTER TABLE usuario MODIFY email VARCHAR(100) NULL;

-- Sin contraseña = sin acceso a la app
ALTER TABLE usuario MODIFY contrasena VARCHAR(255) NULL;

-- 1 = cuenta con acceso (todas las existentes); 0 = cargada por un profesional, sin acceso todavía
ALTER TABLE usuario ADD COLUMN cuentaActiva TINYINT(1) NOT NULL DEFAULT 1 AFTER estado;

-- Todo usuario debe tener al menos un dato de contacto: email o teléfono
ALTER TABLE usuario ADD CONSTRAINT chk_usuario_contacto
    CHECK (email IS NOT NULL OR (telefono IS NOT NULL AND telefono <> ''));
