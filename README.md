# SmartAgenda Pro 📅

Sistema SaaS de Agenda Inteligente para Profesionales.

## Requisitos

- **PHP 8.0+** (con extensión PDO MySQL)
- **MySQL Server** (accesible vía DBeaver u otro cliente)
- **Node.js 18+** y npm

## Instalación y Setup

### 1. Base de Datos

Abrí **DBeaver** y conectate a tu MySQL Server. Luego:

**Opción A** — Ejecutar el SQL manualmente:
1. Abrí el archivo `sql/smartagenda_pro.sql` en DBeaver
2. Ejecutalo completo (crea la base de datos, tablas y datos demo)
3. Luego ejecutá el setup para hashear contraseñas:
   ```bash
   cd SmartAgenda_Pro
   php setup.php
   ```

**Opción B** — Solo ejecutar setup.php:
```bash
cd SmartAgenda_Pro
php setup.php
```
Esto crea la base de datos, tablas y datos de prueba automáticamente.

> **Nota:** Si tu MySQL usa un usuario/contraseña diferente a `root` sin contraseña,
> editá `config/database.php` y `setup.php` con tus credenciales.

### 2. Backend PHP

Abrí una terminal y ejecutá:
```bash
cd SmartAgenda_Pro
php -S localhost:8000
```
Esto levanta el servidor PHP en el puerto 8000.

### 3. Frontend React

Abrí **otra terminal** y ejecutá:
```bash
cd SmartAgenda_Pro/frontend
npm install
npm run dev
```
Esto levanta el frontend en `http://localhost:5173`

### 4. Abrir la App

Abrí tu navegador en: **http://localhost:5173**

## Usuarios de Prueba

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | admin@smartagenda.com | admin123 |
| Profesional | martinez@smartagenda.com | prof123 |
| Cliente | juanperez@smartagenda.com | cliente123 |

## Estructura del Proyecto

```
SmartAgenda_Pro/
├── api/              ← Backend PHP (endpoints REST)
│   ├── cors.php
│   ├── auth.php
│   ├── servicios.php
│   ├── turnos.php
│   ├── disponibilidad.php
│   ├── profesionales.php
│   ├── usuarios.php
│   ├── recomendaciones.php  ← Motor Inteligente
│   └── reportes.php
├── config/
│   └── database.php
├── sql/
│   └── smartagenda_pro.sql
├── setup.php
└── frontend/         ← Frontend React + Vite
    └── src/
        ├── components/
        ├── context/
        ├── pages/
        └── services/
```

## Funcionalidades

- ✅ Login/Registro con roles (Cliente, Profesional, Admin)
- ✅ Dashboard personalizado por rol
- ✅ CRUD de Servicios (Profesional)
- ✅ Configuración de Disponibilidad
- ✅ Agenda semanal con turnos coloreados
- ✅ Reserva de turnos con Motor Inteligente
- ✅ Cancelar y reprogramar turnos
- ✅ Búsqueda de profesionales por rubro
- ✅ Reportes y estadísticas con gráficos
- ✅ Panel de administración de usuarios
