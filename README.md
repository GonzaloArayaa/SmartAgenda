# SmartAgenda Pro 📅

Sistema de agenda inteligente para profesionales, con frontend React y API REST en Spring Boot.

## Requisitos

- Java 21
- MySQL Server 8+
- Node.js 18+ y npm

## Base de datos

Crear la base `smartagenda_pro` y ejecutar una vez el archivo `sql/smartagenda_pro.sql` desde DBeaver o phpMyAdmin.

El backend toma estos valores por defecto para desarrollo local:

```text
DB_URL=jdbc:mysql://localhost:3306/smartagenda_pro
DB_USERNAME=smartagenda
DB_PASSWORD=1234
```

Se pueden reemplazar mediante variables de entorno antes de iniciar Spring Boot.

## Ejecutar la aplicación

En una terminal, iniciar el backend:

```powershell
cd backend-spring
.\mvnw.cmd spring-boot:run
```

La API queda disponible en `http://127.0.0.1:8080`.

En otra terminal, iniciar el frontend:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1
```

Abrir `http://127.0.0.1:5173`.

## Usuarios de prueba

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | admin@smartagenda.com | admin123 |
| Profesional | martinez@smartagenda.com | prof123 |
| Cliente | juanperez@smartagenda.com | cliente123 |

## Estructura

```text
SmartAgenda_Pro/
├── backend-spring/    ← API REST Spring Boot
├── frontend/          ← React + Vite
└── sql/               ← Esquema y datos demostrativos de MySQL
```

## Funcionalidades

- Login y registro con roles: Cliente, Profesional y Administrador.
- Gestión de servicios y disponibilidad.
- Reserva, confirmación, cancelación y reprogramación de turnos.
- Búsqueda de profesionales y recomendaciones de horarios.
- Reportes y administración de usuarios.
