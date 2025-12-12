# Web App Comisión

Aplicación full-stack para visualizar y administrar registros provenientes de una base de datos PostgreSQL existente. Implementa autenticación segura basada en usuarios/contraseñas, control de acceso por usuario y registro de actividad.

## Arquitectura

- **Backend:** Node.js + Express + PostgreSQL (pg). Patrón modular (config, middleware, servicios y rutas). Autenticación con JWT almacenado en cookie httpOnly, hashing con bcrypt, validaciones con `express-validator`, logging con Winston y bitácora de actividad (`logs/activity.log`).
- **Frontend:** React (Vite) + TailwindCSS. Router con rutas públicas/privadas, contexto global para sesión y componentes reutilizables (login, tabla, formularios).
- **Frontend:** React (Vite) + TailwindCSS. Router con rutas públicas/privadas, contexto global para sesión y componentes reutilizables (login, tabla, formularios, dashboard dinámico por rol).
- **Seguridad:**
  - Hashing de contraseñas (bcrypt) y tokens con expiración configurable.
  - Cookies httpOnly/SameSite, Helmet, CORS restringido mediante variable `ALLOWED_ORIGIN`.
  - Consultas parametrizadas y capa de servicios para garantizar filtros `owner_id = usuario`.
  - Registro de actividad con usuario, endpoint y estado (auditoría básica).

## Estructura

```
Web-app-comision
├── backend
│   ├── src
│   │   ├── config / controllers / db / logger / middleware / routes / services / utils
│   │   ├── app.js · server.js
│   ├── .env.example · package.json · .eslintrc.json
├── frontend
│   ├── src (components, context, pages, services)
│   ├── vite.config.js · tailwind.config.js · package.json · .env.example
└── README.md
```

## Base de datos

Se asume un esquema mínimo:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT (md5(random()::text || clock_timestamp()::text))::uuid,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer'
);

CREATE TABLE records (
  id UUID PRIMARY KEY DEFAULT (md5(random()::text || clock_timestamp()::text))::uuid,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected')),
  owner_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Ajusta tipos (UUID/serial) para calzar con tu base. El backend acepta IDs tipo UUID o numéricos, siempre parametrizados.

### Script automático

Puedes crear las tablas (y un usuario administrador opcional) ejecutando:

```powershell
cd backend
$env:ADMIN_SEED_USER = "admin.demo"
$env:ADMIN_SEED_PASSWORD = "ContraseñaSegura123!"
node scripts/init-db.js
```

Si no defines las variables `ADMIN_SEED_USER`/`ADMIN_SEED_PASSWORD`, el script solo creará tablas y triggers; con ellas presentes inserta **o actualiza** al usuario admin con la contraseña indicada.

## Variables de entorno

### Backend (`backend/.env`)

```
PORT=4000
DATABASE_URL=postgres://user:pass@host:5432/db
JWT_SECRET=super-secret
SESSION_COOKIE_NAME=webapp_session
SESSION_TTL_MINUTES=60
LOG_LEVEL=info
ALLOWED_ORIGIN=http://localhost:5173
APP_BASE_URL=http://localhost:5173
SMTP_HOST=smtp.uautonoma.cl
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=usuario@uautonoma.cl
SMTP_PASSWORD=contraseña-super-segura
EMAIL_FROM="Comisiones UA <usuario@uautonoma.cl>"
PASSWORD_RESET_TOKEN_TTL_MINUTES=30
```

- `APP_BASE_URL` se usa para construir el enlace de restablecimiento enviado al correo institucional.
- `SMTP_*`, `EMAIL_FROM` deben apuntar al servidor/transporte oficial de la universidad para que los mensajes salgan desde `correo_institucional`.
- `PASSWORD_RESET_TOKEN_TTL_MINUTES` controla los minutos de vigencia del token que recibe el usuario antes de expirar.

### Frontend (`frontend/.env`)

```
VITE_API_BASE_URL=http://localhost:4000/api
```

## Puesta en marcha local

1. **Backend**
   ```powershell
   cd backend
   npm install
   copy .env.example .env  # ajusta valores reales
   npm run dev
   ```

2. **Frontend**
   ```powershell
   cd frontend
   npm install
   copy .env.example .env
   npm run dev
   ```

La UI quedará en `http://localhost:5173`, proxyeando `/api` hacia el backend.

## Endpoints clave

- `POST /api/auth/login` – recibe `username` + `password`, responde usuario y setea cookie.
- `GET /api/auth/me` – retorna datos del usuario autenticado.
- `POST /api/auth/logout` – elimina cookie.
- `GET /api/records` – lista registros filtrados por `owner_id = usuario`.
- `POST /api/records` – crea registro asociado al usuario autenticado.
- `PUT /api/records/:recordId` / `DELETE /api/records/:recordId` – sólo si el registro pertenece al usuario.
- `GET /api/admin/schema` – (solo rol `admin`) devuelve todas las tablas del esquema `comision_ua` excepto `users`, junto con un resumen de casos por asesor.

## Buenas prácticas incluidas

- **Validaciones** y saneamiento en cada endpoint.
- **Consultas parametrizadas** a PostgreSQL para prevenir inyección.
- **Control de acceso** en middleware `requireAuth` más filtros en servicios.
- **Logging** de aplicación (Winston) + bitácora de actividad por petición.
- **Manejo de errores** centralizado.

## Flujo de usuario

- **Perfil viewer**
  1. Ingresa credenciales en `/login`.
  2. El backend valida y retorna cookie + datos básicos.
  3. La vista principal consulta `/api/records` y muestra sólo registros asignados.
  4. Puede crear/editar/eliminar sus registros. Cada acción queda auditada.
- **Perfil admin**
  - Tras iniciar sesión, el dashboard llama a `/api/admin/schema` y renderiza:
    - Resumen numérico de asesores/casos/valor total de comisiones.
    - Listado detallado de casos por asesor (agrupados y ordenados por volumen) incluyendo estudiante, programa, versión, estado de pago y categorías asociadas.
    - Pestañas para explorar cada tabla del esquema `comision_ua` (asesores, comisiones, estudiantes, categorías, etc.) excepto `users`.
  - Así un administrador puede revisar todos los casos y el backlog de cada asesor en un solo lugar.

## Despliegue sugerido

- **Backend:** contenedor Node 18 con variables en secreto, ejecutar `npm ci && npm run start`. Usar proxy (NGINX) + HTTPS. Alternativa: desplegar en servicios como Azure App Service, Render o Railway.
- **Frontend:** generar build (`npm run build`) y servir con CDN estático (Vercel, Netlify, S3 + CloudFront). Configurar variable `VITE_API_BASE_URL` apuntando al host público del backend.
- **Base de datos:** PostgreSQL gestionado (Azure PG, RDS, Supabase). Implementa roles de lectura/escritura y rotación de contraseñas.
- **CI/CD:** pipeline que ejecute linters y pruebas (al menos `npm run lint`) antes de hacer deploy. Almacena secretos en el gestor correspondiente (GitHub Actions Secrets, Azure Key Vault, etc.).

## Próximos pasos opcionales

- Añadir MFA o integración SSO (OAuth2/OpenID Connect).
- Implementar pruebas automatizadas (Jest/Supertest para API, Vitest/RTL para UI).
- Añadir tablero adicional (gráficos con Recharts/Chart.js) y exportaciones CSV.
- Incluir rate limiting y detección de intentos fallidos.
- Configurar Docker Compose para backend + frontend + PostgreSQL en entornos de QA.
