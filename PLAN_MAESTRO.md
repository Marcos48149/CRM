# AutoClaw SaaS — Plan Maestro de Desarrollo

> Plataforma SaaS para automatización de WhatsApp, Instagram y VTEX, usando OpenClaw como motor de agentes IA.

---

## 1. Visión del Producto

**Qué es:** Una plataforma multi-tenant donde negocios se registran, conectan sus canales (WhatsApp, Instagram, VTEX) y configuran automatizaciones sin tocar código.

**Motor:** OpenClaw corre en contenedores Docker aislados, uno por cliente.

**Modelo de negocio:** SaaS con planes mensuales (Starter / Pro / Enterprise).

---

## 2. Stack Tecnológico

### Backend
- **Runtime:** Node.js 20 LTS
- **Framework:** NestJS (TypeScript) — arquitectura modular, testeable, escalable
- **Base de datos:** PostgreSQL + Prisma ORM
- **Cache / Colas:** Redis (BullMQ para jobs asincrónicos)
- **Auth:** JWT + Refresh Tokens (sin librerías de auth externas innecesarias)
- **Contenedores OpenClaw:** Docker SDK para Node.js

### Frontend (Dashboard)
- **Framework:** Next.js 14 (App Router)
- **UI:** Shadcn/UI + Tailwind CSS
- **Estado:** Zustand (simple, sin Redux)
- **HTTP:** Axios con interceptores

### Infraestructura (MVP)
- **Hosting:** Railway (backend + DB + Redis en un proyecto)
- **Contenedores clientes:** Docker en el mismo servidor o Coolify self-hosted
- **CI/CD:** GitHub Actions (lint + test + deploy automático)

### Testing
- **Backend:** Jest + Supertest (unit + integration)
- **Frontend:** Vitest + React Testing Library
- **E2E:** Playwright (solo flujos críticos: registro, onboarding, envío de mensaje)

---

## 3. Arquitectura del Sistema

```
┌──────────────────────────────────────────────────┐
│                DASHBOARD (Next.js)               │
│  Login | Tenants | Workflows | Métricas | Config │
└─────────────────────┬────────────────────────────┘
                      │ HTTPS REST API
┌─────────────────────▼────────────────────────────┐
│              BACKEND (NestJS)                    │
│                                                  │
│  Auth Module      → JWT, registro, login         │
│  Tenants Module   → CRUD clientes, planes        │
│  Provisioner      → Levanta/para contenedores    │
│  WhatsApp Module  → Meta Cloud API proxy         │
│  Instagram Module → Meta Graph API proxy         │
│  VTEX Module      → VTEX REST API proxy          │
│  Workflows Module → Config de automatizaciones   │
│  Metrics Module   → Logs, eventos, stats         │
│                                                  │
└──────┬───────────────────────────────────────────┘
       │ Docker SDK
┌──────▼────────────────────────────────────────┐
│         CONTENEDORES OPENCLAW                 │
│  tenant-abc/ → OpenClaw instance A            │
│  tenant-xyz/ → OpenClaw instance B            │
│  (cada uno con su SOUL.md, TOOLS.md config)   │
└───────────────────────────────────────────────┘
```

---

## 4. Estructura de Carpetas del Proyecto

```
autoclaw/
├── apps/
│   ├── api/                    ← NestJS backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── tenants/
│   │   │   │   ├── provisioner/
│   │   │   │   ├── whatsapp/
│   │   │   │   ├── instagram/
│   │   │   │   ├── vtex/
│   │   │   │   ├── workflows/
│   │   │   │   └── metrics/
│   │   │   ├── common/         ← guards, decorators, pipes, filters
│   │   │   ├── config/         ← configuración centralizada
│   │   │   └── main.ts
│   │   ├── test/
│   │   └── prisma/
│   │       └── schema.prisma
│   └── web/                    ← Next.js dashboard
│       ├── app/
│       │   ├── (auth)/         ← login, register
│       │   ├── (dashboard)/    ← área autenticada
│       │   │   ├── overview/
│       │   │   ├── whatsapp/
│       │   │   ├── instagram/
│       │   │   ├── vtex/
│       │   │   └── settings/
│       │   └── layout.tsx
│       ├── components/
│       ├── lib/
│       └── __tests__/
├── packages/
│   └── shared/                 ← tipos TypeScript compartidos
├── docker/
│   ├── openclaw-template/      ← template base para cada cliente
│   └── docker-compose.yml
├── .github/
│   └── workflows/
│       └── ci.yml
├── turbo.json                  ← Turborepo monorepo
└── package.json
```

---

## 5. Modelo de Base de Datos (Prisma)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  tenantId  String
  role      Role     @default(OWNER)
  createdAt DateTime @default(now())
}

model Tenant {
  id            String       @id @default(cuid())
  name          String
  slug          String       @unique
  plan          Plan         @default(STARTER)
  status        TenantStatus @default(ACTIVE)
  containerName String?      // nombre del contenedor Docker
  users         User[]
  workflows     Workflow[]
  integrations  Integration[]
  metrics       Metric[]
  createdAt     DateTime     @default(now())
}

model Integration {
  id        String          @id @default(cuid())
  tenant    Tenant          @relation(fields: [tenantId], references: [id])
  tenantId  String
  type      IntegrationType // WHATSAPP | INSTAGRAM | VTEX
  config    Json            // credenciales encriptadas
  active    Boolean         @default(false)
  createdAt DateTime        @default(now())
}

model Workflow {
  id        String   @id @default(cuid())
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  tenantId  String
  name      String
  trigger   String   // WHATSAPP_MESSAGE | INSTAGRAM_MENTION | VTEX_ORDER
  actions   Json     // pasos del workflow
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
}

model Metric {
  id        String   @id @default(cuid())
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  tenantId  String
  event     String
  payload   Json
  createdAt DateTime @default(now())
}

enum Role { OWNER ADMIN VIEWER }
enum Plan { STARTER PRO ENTERPRISE }
enum TenantStatus { ACTIVE SUSPENDED CANCELLED }
enum IntegrationType { WHATSAPP INSTAGRAM VTEX }
```

---

## 6. Fases de Desarrollo (Roadmap)

### FASE 1 — Fundamentos (Semanas 1-3)
**Objetivo:** Proyecto andando, auth funcionando, CI/CD activo.

- [ ] Setup monorepo (Turborepo + workspaces)
- [ ] NestJS base con módulos vacíos y estructura limpia
- [ ] Prisma schema + migraciones iniciales
- [ ] Auth module: registro, login, JWT, refresh token
- [ ] Middleware de tenants (cada request sabe a qué tenant pertenece)
- [ ] Next.js base con layout de dashboard y páginas de auth
- [ ] GitHub Actions: lint + test en cada PR
- [ ] Tests: auth unit + integration tests

**Entregable:** Login funcionando end-to-end, usuario puede registrarse y acceder al dashboard vacío.

---

### FASE 2 — Gestión de Tenants y Provisioner (Semanas 4-5)
**Objetivo:** Un cliente se registra y se le levanta su instancia OpenClaw automáticamente.

- [ ] Tenants CRUD completo
- [ ] Provisioner service: crea contenedor Docker con OpenClaw al registrar tenant
- [ ] Template de configuración OpenClaw (SOUL.md, TOOLS.md base)
- [ ] API para obtener status del contenedor
- [ ] Dashboard: página de overview con estado de la instancia
- [ ] Tests: provisioner unit tests con Docker mock

**Entregable:** Al registrar un cliente, su OpenClaw arranca solo.

---

### FASE 3 — Integración WhatsApp (Semanas 6-8)
**Objetivo:** El cliente conecta su WhatsApp Business y puede configurar respuestas automáticas.

- [ ] Meta Cloud API integration (webhook + envío de mensajes)
- [ ] WhatsApp module en NestJS (recibir mensajes, enrutar a OpenClaw, responder)
- [ ] Configuración de workflows básicos: respuesta automática, menú de opciones
- [ ] Dashboard: página WhatsApp con configuración y log de mensajes
- [ ] Tests: webhook handler tests, workflow execution tests

**Entregable:** Negocio conecta WA y tiene respuestas automáticas configuradas desde el dashboard.

---

### FASE 4 — Integración Instagram (Semanas 9-11)
**Objetivo:** Programación y publicación de contenidos en Instagram.

- [ ] Meta Graph API integration (posts, reels, stories, DMs)
- [ ] Instagram module: publicación programada, respuesta a comentarios/DMs
- [ ] Calendario de contenidos en el dashboard (UI visual)
- [ ] Sistema de aprobación: borrador → revisión → publicado
- [ ] Tests: scheduler tests, API proxy tests

**Entregable:** Cliente puede programar contenidos y responder DMs automáticamente.

---

### FASE 5 — Integración VTEX (Semanas 12-14)
**Objetivo:** El agente IA puede consultar catálogo, stock, pedidos de VTEX.

- [ ] VTEX REST API integration (catálogo, pedidos, clientes, stock)
- [ ] VTEX module: sync de productos, consulta de pedidos
- [ ] OpenClaw TOOLS.md con herramientas VTEX para cada tenant
- [ ] Workflows: "consultar estado de pedido por WhatsApp", "ver stock de producto"
- [ ] Tests: VTEX API mock tests, workflow end-to-end

**Entregable:** Un cliente de WhatsApp puede preguntar por su pedido y el agente responde con datos reales de VTEX.

---

### FASE 6 — Billing y Pulido (Semanas 15-16)
**Objetivo:** Producto comercializable, con planes y pagos.

- [ ] MercadoPago / Stripe integration para suscripciones
- [ ] Planes con límites (mensajes/mes, workflows activos, integraciones)
- [ ] Métricas y analytics en dashboard
- [ ] Onboarding wizard para nuevos clientes
- [ ] Documentación básica de uso
- [ ] E2E tests con Playwright: flujo completo registro → primer mensaje automatizado

**Entregable:** Producto listo para vender.

---

## 7. Principios de Desarrollo

1. **Una responsabilidad por módulo** — cada módulo de NestJS hace UNA cosa.
2. **Sin magia innecesaria** — preferir código explícito sobre decoradores complejos.
3. **Test primero en lógica de negocio** — services siempre tienen unit tests.
4. **Variables de entorno para todo secreto** — nunca hardcodear credenciales.
5. **Errores tipados** — excepciones con mensajes claros, no strings genéricos.
6. **Migraciones versionadas** — todo cambio de DB pasa por Prisma migrate.
7. **Docker desde el día 1** — el entorno de dev es igual al de producción.

---

## 8. Variables de Entorno Requeridas

```env
# App
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/autoclaw

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here

# Meta (WhatsApp + Instagram)
META_APP_ID=
META_APP_SECRET=
META_WEBHOOK_VERIFY_TOKEN=

# VTEX
VTEX_ACCOUNT_NAME=
VTEX_API_KEY=
VTEX_API_TOKEN=

# Docker
DOCKER_SOCKET=/var/run/docker.sock
OPENCLAW_IMAGE=openclaw/openclaw:latest

# Encryption (para credenciales de integraciones)
ENCRYPTION_KEY=32-char-random-string
```

---

## 9. Convenciones de Código

```
# Nombres de archivos
kebab-case.ts            ✅
camelCase.ts             ❌

# Nombres de clases
PascalCase               ✅

# Nombres de variables/funciones
camelCase                ✅

# Constantes
UPPER_SNAKE_CASE         ✅

# Endpoints REST
GET    /tenants           → listar
POST   /tenants           → crear
GET    /tenants/:id       → obtener
PATCH  /tenants/:id       → actualizar
DELETE /tenants/:id       → eliminar
```

---

## 10. Checklist antes de cada PR

- [ ] Tests pasan (`npm test`)
- [ ] Sin errores de TypeScript (`npm run typecheck`)
- [ ] Sin errores de lint (`npm run lint`)
- [ ] Variables de entorno documentadas en `.env.example`
- [ ] Migraciones de DB incluidas si hay cambios de schema
- [ ] Ningún `console.log` en código de producción
