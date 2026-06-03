# AutoClaw

SaaS multi-tenant de atención al cliente automatizada vía WhatsApp, Instagram y VTEX, impulsado por agentes OpenClaw.

## Stack

- **Backend:** NestJS 10 (Node.js 20, TypeScript strict)
- **Frontend:** Next.js 14 (App Router, Tailwind CSS, Shadcn/UI)
- **Base de datos:** PostgreSQL + Redis (BullMQ para colas)
- **Infraestructura:** Docker, Railway
- **Testing:** Jest + Supertest (backend), Vitest + RTL (frontend), Playwright (E2E)

## Estructura del monorepo

```
autoclaw/
├── apps/
│   ├── api/          ← Backend NestJS
│   └── web/          ← Dashboard Next.js
├── packages/
│   └── shared/       ← Tipos TypeScript compartidos
├── turbo.json
└── package.json
```

## Setup local

```bash
# Requisitos: Node.js 20, Docker, PostgreSQL, Redis

git clone https://github.com/tu-usuario/autoclaw.git
cd autoclaw

# Instalar dependencias
npm install

# Configurar variables de entorno
cp apps/api/.env.example apps/api/.env
# Editar .env con credenciales locales

# Inicializar base de datos
npx prisma migrate dev --name init

# Iniciar en desarrollo
npm run dev
```

- API: http://localhost:3000
- Dashboard: http://localhost:3001

## Módulos

| Módulo | Descripción |
|--------|-------------|
| Auth | Registro, login, JWT, refresh tokens |
| Tenants | Multi-tenancy, plan, límites, stats |
| WhatsApp | Conexión Meta API, webhooks, mensajes |
| Instagram | Posts programados, comentarios, DMs |
| VTEX | Consulta pedidos, productos, herramientas OpenClaw |
| Workflows | Reglas trigger → acción configurables |
| Provisioner | Gestión contenedores Docker OpenClaw por tenant |
| Billing | Suscripciones MercadoPago, límites por plan |

## Variables de entorno

Ver `apps/api/.env.example` para la lista completa con documentación.

Variables principales:

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Conexión PostgreSQL |
| `REDIS_URL` | Conexión Redis |
| `JWT_SECRET` | Secreto para firmar access tokens |
| `JWT_REFRESH_SECRET` | Secreto para firmar refresh tokens |
| `ENCRYPTION_KEY` | Clave AES-256-GCM (32 caracteres) |
| `META_APP_ID` / `META_APP_SECRET` | Meta app para WhatsApp + Instagram |
| `DOCKER_SOCKET` | Socket Docker para provisioner |
| `MP_ACCESS_TOKEN` | Token MercadoPago |
| `CORS_ORIGIN` | Origen permitido en producción |

## Tests

```bash
# Todos los tests
npm test

# Solo backend
npm run test --workspace=apps/api

# Solo frontend
npm run test --workspace=apps/web

# E2E
npm run test:e2e

# Lint y typecheck
npm run lint
npm run typecheck
```
