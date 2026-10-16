# SmartAgenda Pro 📅

Sistema de agenda inteligente para profesionales, con frontend React y API REST en Spring Boot.

## Requisitos

- Java 21
- MySQL Server 8+
- Node.js 18+ y npm

## Base de datos

La base **se crea y se actualiza sola** cuando se inicia el backend ([Flyway](https://flywaydb.org/)): no hay que ejecutar scripts SQL ni crear la base a mano. Lo único que hace falta es tener MySQL prendido y un usuario con permisos.

### Primera vez: crear el usuario de MySQL

Desde DBeaver, la consola de MySQL o phpMyAdmin, como administrador (`root`):

```sql
CREATE USER IF NOT EXISTS 'smartagenda'@'localhost' IDENTIFIED BY '1234';
GRANT ALL PRIVILEGES ON smartagenda_pro.* TO 'smartagenda'@'localhost';
FLUSH PRIVILEGES;
```

Si el usuario ya existía, el `GRANT` alcanza. Con eso, al levantar el backend por primera vez se crea la base `smartagenda_pro` con su estructura y los datos de ejemplo (15 profesionales, 50 clientes y 1886 turnos de 2026).

### ¿Tenés una base de una versión anterior?

Si ya tenías la base `smartagenda_pro` de antes (por ejemplo, con pocos usuarios), Flyway no la modifica y el backend lo avisa en el log. Para empezar con los datos actuales, borrala **una sola vez** y reiniciá el backend:

```sql
DROP DATABASE smartagenda_pro;
```

Esto vale también para volver a dejar la base como nueva en cualquier momento.

### Cambiar la estructura de la base

Los cambios de base son scripts numerados en `backend-spring/src/main/resources/db/migration/`:

| Archivo | Contenido |
|---|---|
| `V1__esquema.sql` | Tablas |
| `V2__datos_de_ejemplo.sql` | Datos de ejemplo |

Para agregar un cambio (una columna, una tabla, datos), crear un archivo nuevo con el número siguiente, por ejemplo `V3__agregar_columna_x.sql`. Al reiniciar el backend se aplica solo, en todas las computadoras que tengan el código.

> **No editar** `V1` ni `V2` una vez publicados: Flyway detecta el cambio y el backend no arranca. Cualquier ajuste va en una versión nueva.

### Variables de conexión

El backend usa estos valores por defecto para desarrollo local:

| Variable | Valor por defecto |
|---|---|
| `DB_URL` | `jdbc:mysql://localhost:3306/smartagenda_pro?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=America/Argentina/Buenos_Aires` |
| `DB_USERNAME` | `smartagenda` |
| `DB_PASSWORD` | `1234` |

Se pueden reemplazar con variables de entorno antes de iniciar Spring Boot. Si se cambia `DB_URL`, conservar `createDatabaseIfNotExist=true` y `allowPublicKeyRetrieval=true`.

## Ejecutar la aplicación

En una terminal, iniciar el backend:

```powershell
cd backend-spring
.\mvnw.cmd spring-boot:run
```

La API queda disponible en `http://127.0.0.1:8080`. Está lista cuando aparece `Started SmartAgendaApplication`.

En otra terminal, iniciar el frontend:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Abrir `http://localhost:5173`.

## Usuarios de prueba

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | admin@smartagenda.com | admin123 |
| Profesional | martinez@smartagenda.com | prof123 |
| Cliente | juanperez@smartagenda.com | cliente123 |

## Problemas frecuentes

| Mensaje del backend | Causa y solución |
|---|---|
| `Access denied for user 'smartagenda'@'localhost' to database 'smartagenda_pro'` | El usuario no tiene permisos: ejecutar el `GRANT` de la sección *Primera vez*. |
| `Access denied for user 'smartagenda'` o `Communications link failure` | El usuario o la contraseña no coinciden, o MySQL no está prendido. |
| `Port 8080 was already in use` | Hay otro backend abierto: cerrar esa terminal o el proceso Java. |
| `Migration checksum mismatch` | Se editó `V1` o `V2`. Volver al archivo original y poner el cambio en una versión nueva. |

## Estructura

```text
SmartAgenda_Pro/
├── backend-spring/    ← API REST Spring Boot
│   └── src/main/resources/db/migration/   ← Esquema y datos de MySQL (Flyway)
└── frontend/          ← React + Vite
```

## Funcionalidades

- Login y registro con roles: Cliente, Profesional y Administrador.
- Gestión de servicios y disponibilidad, con horario cortado (varios tramos por día).
- Reserva, confirmación, cancelación y reprogramación de turnos.
- Búsqueda de profesionales y recomendaciones de horarios.
- Huecos de la agenda: espacios libres entre turnos.
- Reportes y administración de usuarios.
