# AGENTS.md — AutoClaw SaaS

> Este archivo contiene el contexto completo del proyecto y los prompts exactos para construirlo fase por fase usando un agente IA (Copilot, Cursor, Claude Code, etc).
> Ejecutá los prompts EN ORDEN. No saltes fases. Cada prompt asume que el anterior está completo y testeado.

---

## CONTEXTO DEL PROYECTO

**Nombre:** AutoClaw  
**Tipo:** SaaS multi-tenant  
**Stack:** NestJS (Node.js 20, TypeScript) + Next.js 14 + PostgreSQL + Redis + Docker  
**Monorepo:** Turborepo con workspaces en `apps/api` y `apps/web`  
**Testing:** Jest + Supertest (backend), Vitest + RTL (frontend), Playwright (E2E)  
**Principios:** Arquitectura limpia, un módulo = una responsabilidad, sin dependencias innecesarias, código explícito sobre magia.

---

## REGLAS PERMANENTES PARA EL AGENTE

Antes de cada prompt, el agente debe:

1. Seguir arquitectura limpia: separar Controller → Service → Repository
2. Tipar TODO con TypeScript estricto (sin `any`)
3. Usar variables de entorno para toda configuración sensible
4. Crear tests unitarios para cada Service creado
5. Crear tests de integración para cada Controller creado
6. Manejar errores con excepciones tipadas de NestJS (`NotFoundException`, `BadRequestException`, etc.)
7. NO instalar librerías que no estén en el prompt — preguntar antes
8. NO agregar comentarios obvios en el código — el código debe ser autoexplicativo
9. Cada archivo nuevo debe tener su test correspondiente en la misma carpeta con sufijo `.spec.ts`

---

## ═══════════════════════════════════════════
## FASE 1 — FUNDAMENTOS
## ═══════════════════════════════════════════

### PROMPT 1.1 — Setup del Monorepo

```
Creá un monorepo llamado "autoclaw" usando Turborepo con las siguientes especificaciones exactas:

ESTRUCTURA:
autoclaw/
├── apps/
│   ├── api/       ← NestJS app (va en este prompt)
│   └── web/       ← Next.js app (va en próximo prompt)
├── packages/
│   └── shared/    ← tipos TypeScript compartidos
├── turbo.json
├── package.json   ← root con workspaces
└── .gitignore

CONFIGURACIÓN TURBO (turbo.json):
- Pipeline con tasks: build, test, lint, typecheck
- build depende de ^build (upstream)
- test y lint son independientes

ROOT package.json:
- workspaces: ["apps/*", "packages/*"]
- scripts: dev, build, test, lint, typecheck (todos usando turbo)
- Node.js 20 requerido (engines field)

PACKAGE shared (packages/shared/):
- TypeScript puro, sin dependencias externas
- Exportar tipos: TenantPlan, TenantStatus, IntegrationType, UserRole
- tsconfig.json extendido de base estricta

APP API (apps/api/):
- NestJS 10 con TypeScript strict
- Instalar SOLO: @nestjs/core, @nestjs/common, @nestjs/platform-express, @nestjs/config, @nestjs/jwt, @nestjs/mapped-types, reflect-metadata, rxjs
- Instalar dev: @nestjs/testing, @types/node, typescript, ts-jest, jest, supertest, @types/supertest
- tsconfig.json con strict: true, decorator support
- jest.config.ts configurado para ts-jest con paths
- .env.example con todas las variables documentadas (ver sección Variables de Entorno del PLAN_MAESTRO.md)
- main.ts con: ValidationPipe global, prefijo /api/v1, CORS habilitado para desarrollo

VERIFICACIÓN FINAL:
- `npm run dev` desde la raíz debe iniciar ambas apps sin errores
- `npm run test` debe pasar (aunque no haya tests aún, debe correr sin error)
- `npm run typecheck` debe pasar sin errores de TypeScript
```

---

### PROMPT 1.2 — Setup Next.js Dashboard

```
En apps/web/ configurá el dashboard de Next.js con estas especificaciones:

INSTALACIÓN:
- Next.js 14 con App Router y TypeScript strict
- Tailwind CSS
- Shadcn/UI (inicializar con: npx shadcn-ui@latest init)
- Componentes Shadcn a instalar: button, input, label, card, badge, toast, dialog, dropdown-menu, table, form, select, tabs, avatar
- Zustand para estado global
- Axios para HTTP
- Zod para validación de formularios
- React Hook Form

ESTRUCTURA DE CARPETAS:
apps/web/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── overview/page.tsx
│   │   ├── whatsapp/page.tsx
│   │   ├── instagram/page.tsx
│   │   ├── vtex/page.tsx
│   │   └── settings/page.tsx
│   ├── layout.tsx   ← root layout con fuentes y providers
│   └── page.tsx     ← redirect a /login
├── components/
│   ├── ui/          ← componentes Shadcn (auto-generados)
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   └── header.tsx
│   └── shared/
├── lib/
│   ├── api.ts       ← instancia de Axios con interceptores JWT
│   ├── auth.ts      ← helpers de auth (getToken, setToken, clearToken)
│   └── utils.ts     ← cn() utility de Shadcn
├── store/
│   └── auth.store.ts ← Zustand store para usuario autenticado
└── __tests__/

CONFIGURACIÓN:
- Fuente: Geist Sans (Google Fonts o next/font)
- Variables CSS: definir colores del tema en globals.css (primary, secondary, destructive, muted, accent)
- Palette: dark sidebar (#0f172a), fondo claro (#f8fafc), accent azul (#3b82f6)
- lib/api.ts: interceptor que agrega Authorization: Bearer {token} en cada request, interceptor de respuesta que hace logout automático en 401
- Middleware de Next.js: proteger rutas /(dashboard)/* redirigiendo a /login si no hay token

VERIFICACIÓN:
- `npm run dev` desde apps/web muestra página de login sin errores de consola
- Navegar a /overview sin token debe redirigir a /login
```

---

### PROMPT 1.3 — Módulo de Auth (Backend)

```
Creá el módulo de Auth completo en apps/api/src/modules/auth/ con estas especificaciones:

ESTRUCTURA:
auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── auth.guard.ts          ← JwtAuthGuard
├── dto/
│   ├── register.dto.ts
│   └── login.dto.ts
├── strategies/
│   └── jwt.strategy.ts
└── auth.service.spec.ts   ← tests unitarios

PRISMA SCHEMA (agregar en prisma/schema.prisma):
- Model User: id (cuid), email (unique), password (hash), role (OWNER|ADMIN|VIEWER), tenantId, createdAt
- Model Tenant: id (cuid), name, slug (unique), plan (STARTER|PRO|ENTERPRISE), status (ACTIVE|SUSPENDED|CANCELLED), createdAt
- Model RefreshToken: id (cuid), userId, token (unique), expiresAt, createdAt
Ejecutar: npx prisma migrate dev --name init

ENDPOINTS:
POST /api/v1/auth/register
  Body: { name: string, email: string, password: string, tenantName: string }
  - Valida con class-validator (email válido, password mín 8 chars, campos requeridos)
  - Crea Tenant con slug generado del tenantName (lowercase, sin espacios, sin caracteres especiales)
  - Crea User como OWNER del tenant
  - Hashea password con bcrypt (10 rounds)
  - Retorna: { accessToken, refreshToken, user: { id, email, role } }

POST /api/v1/auth/login
  Body: { email: string, password: string }
  - Valida credenciales
  - Retorna: { accessToken, refreshToken, user: { id, email, role } }

POST /api/v1/auth/refresh
  Body: { refreshToken: string }
  - Valida que el refreshToken exista en DB y no esté expirado
  - Retorna nuevo par de tokens

POST /api/v1/auth/logout
  Headers: Authorization Bearer
  - Invalida el refreshToken en DB

GET /api/v1/auth/me
  Headers: Authorization Bearer
  - Retorna datos del usuario autenticado + tenant

TOKENS:
- accessToken: JWT, expira en 15 minutos, payload: { sub: userId, email, role, tenantId }
- refreshToken: JWT, expira en 7 días, guardado en DB para invalidación

TESTS en auth.service.spec.ts:
- register: crea usuario y tenant correctamente
- register: lanza ConflictException si el email ya existe
- login: retorna tokens con credenciales válidas
- login: lanza UnauthorizedException con credenciales inválidas
- refresh: retorna nuevos tokens con refreshToken válido
- refresh: lanza UnauthorizedException con refreshToken expirado/inexistente

VERIFICACIÓN:
- `npm test` en apps/api debe pasar todos los tests del módulo auth
- `npm run typecheck` sin errores
```

---

### PROMPT 1.4 — Páginas de Auth (Frontend)

```
Implementá las páginas de login y registro en apps/web con las siguientes especificaciones:

PÁGINA LOGIN (app/(auth)/login/page.tsx):
- Formulario con: email, password, botón "Iniciar sesión"
- Validación con Zod + React Hook Form: email válido, password requerido
- Al submit: llama POST /api/v1/auth/login
- En éxito: guarda accessToken y refreshToken, actualiza Zustand store, redirige a /overview
- En error 401: muestra toast "Credenciales incorrectas"
- Link "¿No tenés cuenta? Registrate"
- Estado de loading en el botón mientras espera respuesta

PÁGINA REGISTER (app/(auth)/register/page.tsx):
- Formulario con: nombre, nombre del negocio, email, password, confirmar password
- Validación Zod: password mín 8 chars, passwords deben coincidir
- Al submit: llama POST /api/v1/auth/register
- En éxito: misma lógica que login (guarda tokens, redirige a /overview)
- En error 409: muestra toast "El email ya está registrado"
- Link "¿Ya tenés cuenta? Iniciá sesión"

ZUSTAND STORE (store/auth.store.ts):
- State: user (id, email, role) | null, isAuthenticated: boolean
- Actions: setUser, clearUser
- Persistencia en localStorage SOLO del accessToken y refreshToken (no del user object, ese se re-fetcha)

LAYOUT DASHBOARD (app/(dashboard)/layout.tsx):
- Sidebar con navegación: Overview, WhatsApp, Instagram, VTEX, Configuración
- Header con: nombre del tenant, avatar del usuario, botón de logout
- El logout llama POST /api/v1/auth/logout y luego limpia el store y redirige a /login

DISEÑO:
- Páginas de auth: fondo oscuro (#0f172a) con card centrada, logo "AutoClaw" en la parte superior
- Sidebar: fondo #0f172a, texto blanco, ítem activo con fondo #1e293b y accent azul
- Tipografía: Geist Sans para UI, tamaños consistentes con escala de Tailwind

TESTS (__tests__/login.test.tsx):
- Renderiza el formulario
- Muestra error de validación si email inválido
- Llama a la API con los datos correctos al hacer submit
- Muestra toast de error en credenciales incorrectas

VERIFICACIÓN:
- Flujo completo: registro → login → ver dashboard → logout → redirige a login
```

---

### PROMPT 1.5 — CI/CD con GitHub Actions

```
Configurá el pipeline de CI/CD en .github/workflows/ci.yml con estas especificaciones:

TRIGGER:
- Push a main y develop
- Pull requests a main

JOBS:

Job 1: "quality" (lint + typecheck)
  - Ubuntu latest, Node.js 20
  - Cache de node_modules con actions/cache
  - Steps: checkout, setup-node, npm ci, npm run lint, npm run typecheck

Job 2: "test" (depende de quality)
  - Ubuntu latest, Node.js 20
  - Servicios: PostgreSQL 15 y Redis 7 como containers
  - Variables de entorno para tests: DATABASE_URL apuntando al PostgreSQL del servicio, JWT_SECRET=test-secret-ci
  - Steps: checkout, setup-node, npm ci, npx prisma migrate deploy, npm run test

Job 3: "build" (depende de test)
  - Verifica que el build de producción pase
  - npm run build en ambas apps

IMPORTANTE:
- Usar secrets de GitHub para credenciales sensibles (DATABASE_URL de producción nunca en el YAML)
- El job de test debe usar una DB limpia en cada ejecución
- Si algún job falla, los siguientes no se ejecutan

Crear también .github/pull_request_template.md con:
- Checklist: tests pasan, typecheck limpio, variables de entorno documentadas, sin console.log

VERIFICACIÓN:
- Push a una rama y verificar que los 3 jobs pasan en GitHub Actions
```

---

## ═══════════════════════════════════════════
## FASE 2 — TENANTS Y PROVISIONER
## ═══════════════════════════════════════════

### PROMPT 2.1 — Módulo de Tenants

```
Creá el módulo de Tenants en apps/api/src/modules/tenants/ con estas especificaciones:

ESTRUCTURA:
tenants/
├── tenants.module.ts
├── tenants.controller.ts
├── tenants.service.ts
├── dto/
│   ├── update-tenant.dto.ts
│   └── tenant-response.dto.ts
└── tenants.service.spec.ts

ENDPOINTS (todos requieren JwtAuthGuard):
GET /api/v1/tenants/me
  - Retorna el tenant del usuario autenticado con sus integraciones activas

PATCH /api/v1/tenants/me
  - Body: { name?: string }
  - Solo el OWNER puede modificar
  - Retorna tenant actualizado

GET /api/v1/tenants/me/stats
  - Retorna: { totalMessages: number, activeWorkflows: number, integrations: string[] }
  - Datos del último mes

REGLAS DE ACCESO:
- Usar decorator custom @CurrentUser() que extrae el user del JWT
- Usar decorator custom @RequireRole(Role.OWNER) para endpoints que requieren ser owner
- El tenant siempre se extrae del JWT (tenantId en el payload) — nunca confiar en el body

TESTS en tenants.service.spec.ts:
- getTenant: retorna el tenant correcto para el tenantId dado
- getTenant: lanza NotFoundException si el tenant no existe
- updateTenant: actualiza el nombre correctamente
- getStats: retorna estadísticas con valores correctos

DECORADORES (crear en common/decorators/):
- current-user.decorator.ts
- require-role.decorator.ts
- Actualizar auth.guard.ts para que funcione con RequireRole

VERIFICACIÓN:
- GET /api/v1/tenants/me con token válido retorna datos del tenant
- PATCH sin ser OWNER retorna 403
- `npm test` pasa todos los tests
```

---

### PROMPT 2.2 — Provisioner Service (Docker)

```
Creá el Provisioner Service que gestiona los contenedores OpenClaw por tenant.

INSTALACIÓN:
- npm install dockerode @types/dockerode --workspace=apps/api

ESTRUCTURA:
provisioner/
├── provisioner.module.ts
├── provisioner.service.ts
├── provisioner.service.spec.ts
└── openclaw-template/
    ├── SOUL.md          ← personalidad base del agente
    ├── AGENTS.md        ← descripción del rol
    └── TOOLS.md         ← herramientas habilitadas base

SOUL.md TEMPLATE (contenido base para cada cliente):
- Agente de atención al cliente profesional, amable y conciso
- Responde en el idioma del cliente
- Si no sabe algo, deriva a un humano en vez de inventar
- Nunca revela que es una IA a menos que se le pregunte directamente

TOOLS.md TEMPLATE:
- Herramientas habilitadas: web_search, send_message, get_order_status (placeholder)
- Cada tool con descripción de cuándo usarla

PROVISIONER SERVICE — métodos:
createContainer(tenantId: string, tenantSlug: string): Promise<void>
  - Crea directorio: /opt/autoclaw/tenants/{tenantSlug}/
  - Copia los templates SOUL.md, AGENTS.md, TOOLS.md en ese directorio
  - Crea contenedor Docker con imagen openclaw/openclaw:latest
  - Variables de entorno del contenedor: TENANT_ID, TENANT_SLUG
  - Volumen: directorio del tenant → /workspace dentro del contenedor
  - Guarda el containerName en el Tenant de la DB
  - Inicia el contenedor

stopContainer(tenantId: string): Promise<void>
  - Para el contenedor del tenant (no lo elimina)

startContainer(tenantId: string): Promise<void>
  - Inicia el contenedor del tenant si está parado

removeContainer(tenantId: string): Promise<void>
  - Para y elimina el contenedor y el directorio del tenant

getContainerStatus(tenantId: string): Promise<'running' | 'stopped' | 'not_found'>

INTEGRACIÓN:
- Llamar createContainer desde AuthService.register() después de crear el Tenant
- En caso de error al crear el contenedor, hacer rollback del tenant en DB

TESTS (con mock de dockerode):
- createContainer: crea el directorio y el contenedor correctamente
- createContainer: hace rollback de DB si Docker falla
- getContainerStatus: retorna 'running' cuando el contenedor está activo
- getContainerStatus: retorna 'not_found' cuando no existe

VARIABLES DE ENTORNO a agregar en .env.example:
DOCKER_SOCKET=/var/run/docker.sock
OPENCLAW_IMAGE=openclaw/openclaw:latest
TENANTS_DATA_DIR=/opt/autoclaw/tenants

VERIFICACIÓN:
- Registrar un nuevo usuario crea el contenedor OpenClaw automáticamente
- GET /api/v1/tenants/me/stats incluye el status del contenedor
- `npm test` pasa con los mocks de Docker
```

---

### PROMPT 2.3 — Dashboard Overview

```
Implementá la página Overview del dashboard en apps/web/app/(dashboard)/overview/page.tsx

COMPONENTES A CREAR en components/dashboard/:
- stats-card.tsx: card con título, valor numérico grande y descripción
- container-status.tsx: badge con estado del contenedor (verde=running, gris=stopped, rojo=error)
- quick-actions.tsx: botones de acciones rápidas (conectar WhatsApp, crear workflow, ver métricas)

PÁGINA OVERVIEW:
- Fetch al cargar: GET /api/v1/tenants/me/stats
- Mostrar 3 stats cards: "Mensajes este mes", "Workflows activos", "Integraciones conectadas"
- Mostrar estado del contenedor OpenClaw
- Mostrar quick-actions si alguna integración no está conectada
- Loading skeleton mientras carga (usar Shadcn Skeleton)
- Si la API falla, mostrar estado de error con botón de reintento

DISEÑO:
- Grid de 3 columnas para stats cards en desktop, 1 columna en mobile
- Colores de stats cards: fondo blanco, borde sutil, número grande en negro/slate
- Container status prominent en la parte superior con indicador visual

TESTS (__tests__/overview.test.tsx):
- Muestra skeleton durante la carga
- Muestra las stats correctamente después de cargar
- Muestra estado de error si la API falla

VERIFICACIÓN:
- La página carga sin errores con datos reales del backend
- El skeleton se muestra correctamente durante el fetch
```

---

## ═══════════════════════════════════════════
## FASE 3 — WHATSAPP
## ═══════════════════════════════════════════

### PROMPT 3.1 — Módulo WhatsApp (Backend)

```
Creá el módulo de WhatsApp en apps/api/src/modules/whatsapp/ con estas especificaciones:

INSTALACIÓN:
- npm install axios --workspace=apps/api (si no está instalado)

ESTRUCTURA:
whatsapp/
├── whatsapp.module.ts
├── whatsapp.controller.ts
├── whatsapp.service.ts
├── webhook.handler.ts     ← procesa mensajes entrantes
├── meta-api.service.ts    ← cliente HTTP para Meta Cloud API
├── dto/
│   ├── connect.dto.ts
│   ├── send-message.dto.ts
│   └── webhook-event.dto.ts
└── whatsapp.service.spec.ts

ENDPOINTS:

POST /api/v1/whatsapp/connect
  Auth: JwtAuthGuard, RequireRole(OWNER)
  Body: { phoneNumberId: string, accessToken: string, webhookSecret: string }
  - Guarda las credenciales encriptadas en Integration (type: WHATSAPP)
  - Verifica que las credenciales son válidas llamando a Meta API
  - Retorna { connected: true, phoneNumber: string }

DELETE /api/v1/whatsapp/disconnect
  Auth: JwtAuthGuard, RequireRole(OWNER)
  - Marca la integración como inactiva

GET /api/v1/whatsapp/status
  Auth: JwtAuthGuard
  - Retorna estado de la integración y número conectado

POST /api/v1/whatsapp/send (para testing desde el dashboard)
  Auth: JwtAuthGuard, RequireRole(OWNER)
  Body: { to: string, message: string }
  - Envía un mensaje de prueba

GET /api/v1/whatsapp/webhook (verificación Meta)
  - Verifica el webhook con hub.challenge de Meta
  - Usa WEBHOOK_VERIFY_TOKEN del tenant

POST /api/v1/whatsapp/webhook (mensajes entrantes)
  - Valida firma HMAC del request
  - Parsea el evento de Meta
  - Llama a webhook.handler.ts para procesarlo
  - Responde 200 inmediatamente (procesamiento async con BullMQ)

WEBHOOK HANDLER:
- Recibe mensaje → lo envía al contenedor OpenClaw del tenant vía HTTP interno
- Recibe respuesta de OpenClaw → llama Meta API para enviar la respuesta al usuario
- Si OpenClaw no responde en 5s, envía mensaje de fallback: "Un momento, te respondo enseguida"
- Guarda el evento en Metric

META API SERVICE:
- sendTextMessage(phoneNumberId, accessToken, to, text): Promise<void>
- getPhoneNumberInfo(phoneNumberId, accessToken): Promise<{ displayPhoneNumber }>
- Usar Axios con timeout de 10s
- Manejo de errores de Meta API con mensajes descriptivos

ENCRIPTACIÓN (crear common/utils/crypto.ts):
- encryptCredentials(data: object): string — AES-256-GCM con ENCRYPTION_KEY
- decryptCredentials(encrypted: string): object
- Usar módulo crypto nativo de Node.js (sin dependencias extra)

TESTS:
- connect: guarda integración y llama Meta API para verificar
- connect: lanza BadRequestException si credenciales inválidas
- webhook handler: procesa mensaje y envía respuesta
- webhook: retorna 400 si firma HMAC inválida

VARIABLES DE ENTORNO:
META_WHATSAPP_API_VERSION=v18.0
ENCRYPTION_KEY=   ← string de 32 caracteres

VERIFICACIÓN:
- Conectar un número de WhatsApp desde el dashboard
- Enviar mensaje de prueba y recibirlo
- `npm test` pasa todos los tests
```

---

### PROMPT 3.2 — Módulo Workflows

```
Creá el módulo de Workflows en apps/api/src/modules/workflows/ con estas especificaciones:

CONCEPTO:
Un Workflow define QUÉ hacer cuando llega un evento (mensaje de WhatsApp, mención en Instagram, nuevo pedido en VTEX).

STRUCTURE de un Workflow (guardado como JSON en DB):
{
  "trigger": "WHATSAPP_MESSAGE",
  "conditions": [
    { "field": "message.text", "operator": "contains", "value": "pedido" }
  ],
  "actions": [
    { "type": "QUERY_OPENCLAW", "prompt": "El usuario pregunta por su pedido. Su mensaje es: {{message.text}}" },
    { "type": "SEND_REPLY", "channel": "whatsapp" }
  ]
}

ENDPOINTS:

GET /api/v1/workflows
  - Lista todos los workflows del tenant con estado activo/inactivo

POST /api/v1/workflows
  Body: { name, trigger, conditions, actions }
  - Valida la estructura del workflow
  - Crea el workflow en DB

PATCH /api/v1/workflows/:id
  - Actualiza el workflow (solo el owner del tenant puede)

DELETE /api/v1/workflows/:id
  - Elimina el workflow

PATCH /api/v1/workflows/:id/toggle
  - Activa o desactiva el workflow

WORKFLOW EXECUTOR SERVICE (workflows/workflow-executor.service.ts):
- executeWorkflow(workflow, event): Promise<WorkflowResult>
- Evalúa condiciones del workflow contra el evento
- Ejecuta cada action en secuencia
- Action QUERY_OPENCLAW: llama al contenedor Docker del tenant via HTTP, interpola {{variables}} del evento en el prompt
- Action SEND_REPLY: llama al servicio correspondiente (WhatsApp, etc.)
- Retorna resultado con éxito/error de cada step

INTEGRACIÓN:
- WhatsApp webhook handler usa WorkflowExecutorService para procesar mensajes

TESTS:
- executeWorkflow: ejecuta correctamente con condición que matchea
- executeWorkflow: no ejecuta si condición no matchea
- evaluateCondition: todos los operadores (contains, equals, startsWith, endsWith)
- executeAction QUERY_OPENCLAW: llama al contenedor con el prompt correcto

VERIFICACIÓN:
- Crear workflow en el dashboard que responda "Gracias por contactarnos" a cualquier mensaje
- Enviar mensaje de WhatsApp y recibir esa respuesta automáticamente
```

---

### PROMPT 3.3 — Página WhatsApp (Frontend)

```
Implementá la página de WhatsApp en apps/web/app/(dashboard)/whatsapp/page.tsx

SECCIONES:

1. ESTADO DE CONEXIÓN
- Si no está conectado: card con instrucciones y formulario de conexión
  - Campos: Phone Number ID, Access Token (Meta API), Webhook Secret
  - Botón "Conectar WhatsApp"
  - Link a documentación de Meta para obtener las credenciales
- Si está conectado: badge verde con el número conectado y botón "Desconectar"

2. WORKFLOWS DE WHATSAPP
- Lista de workflows activos con: nombre, trigger, estado (toggle para activar/desactivar)
- Botón "Nuevo Workflow"
- Modal/Sheet para crear workflow con:
  - Nombre del workflow
  - Selector de trigger: "Cualquier mensaje", "Mensaje contiene palabra clave"
  - Campo de palabra clave (si aplica)
  - Prompt para OpenClaw (textarea grande con placeholder explicativo)
  - Botón guardar

3. MENSAJES RECIENTES (últimos 20)
- Tabla con: fecha, número del remitente (parcialmente oculto por privacidad), preview del mensaje, estado (respondido/fallback)
- Actualización en tiempo real cada 30 segundos (polling simple, sin WebSockets)

COMPONENTES A CREAR:
- components/whatsapp/connection-card.tsx
- components/whatsapp/workflow-list.tsx
- components/whatsapp/workflow-form.tsx (en un Sheet de Shadcn)
- components/whatsapp/messages-table.tsx

TESTS:
- Muestra formulario de conexión cuando no está conectado
- Muestra estado conectado con número cuando sí lo está
- El formulario de workflow valida campos requeridos
- La tabla de mensajes muestra datos correctamente

VERIFICACIÓN:
- Flujo completo: conectar WhatsApp → crear workflow → ver mensajes en tabla
```

---

## ═══════════════════════════════════════════
## FASE 4 — INSTAGRAM
## ═══════════════════════════════════════════

### PROMPT 4.1 — Módulo Instagram (Backend)

```
Creá el módulo de Instagram en apps/api/src/modules/instagram/ con estas especificaciones:

FUNCIONALIDADES:
1. Conexión con Instagram Business via Meta Graph API
2. Publicación programada de posts (imágenes con caption)
3. Respuesta automática a comentarios
4. Respuesta automática a DMs

ESTRUCTURA:
instagram/
├── instagram.module.ts
├── instagram.controller.ts
├── instagram.service.ts
├── meta-graph.service.ts   ← cliente Meta Graph API
├── scheduler.service.ts    ← gestiona publicaciones programadas (BullMQ)
├── dto/
│   ├── connect.dto.ts
│   ├── create-post.dto.ts
│   └── webhook-event.dto.ts
└── instagram.service.spec.ts

ENDPOINTS:

POST /api/v1/instagram/connect
  Body: { accessToken: string, instagramAccountId: string }
  - Verifica credenciales con Graph API
  - Guarda Integration en DB

GET /api/v1/instagram/status
  - Estado de conexión y cuenta conectada

POST /api/v1/instagram/posts
  Auth: JwtAuthGuard, RequireRole(OWNER)
  Body: { imageUrl: string, caption: string, scheduledAt?: string (ISO date) }
  - Si scheduledAt está en el futuro: agrega job a BullMQ con delay
  - Si scheduledAt no está o es ahora: publica inmediatamente
  - Retorna { postId, status: 'published' | 'scheduled' }

GET /api/v1/instagram/posts
  - Lista posts con estado: published, scheduled, failed

DELETE /api/v1/instagram/posts/:id
  - Cancela un post programado (si aún no se publicó)

POST /api/v1/instagram/webhook
  - Webhook de Meta para comentarios y DMs
  - Procesa con WorkflowExecutorService

META GRAPH SERVICE:
- publishPost(accessToken, accountId, imageUrl, caption): Promise<{ id }>
- getAccountInfo(accessToken, accountId): Promise<{ name, username }>
- Manejo de rate limiting de Meta API (retry con backoff exponencial, máx 3 intentos)

SCHEDULER SERVICE (BullMQ):
- Cola "instagram-posts"
- Worker que procesa jobs de publicación
- Si falla: marca post como 'failed' en DB, guarda el error

TESTS:
- publishPost: llama Meta API con parámetros correctos
- schedule: agrega job a la cola con el delay correcto
- webhook: procesa comentario y ejecuta workflow correspondiente
- retry: reintenta máximo 3 veces con backoff en error de Meta API

VERIFICACIÓN:
- Conectar cuenta de Instagram
- Programar un post para 2 minutos después y verificar que se publique
```

---

### PROMPT 4.2 — Calendario de Contenidos (Frontend)

```
Implementá la página de Instagram con calendario de contenidos.

COMPONENTES:
- components/instagram/content-calendar.tsx: vista de calendario mensual
  - Usar una librería de calendario ligera (react-calendar o implementar con CSS Grid)
  - Cada día muestra un punto si tiene posts programados
  - Click en un día abre la lista de posts de ese día
  
- components/instagram/post-card.tsx: card con preview del post
  - Imagen pequeña, caption truncada, estado (programado/publicado/fallido), fecha/hora
  - Botón de cancelar si está programado

- components/instagram/new-post-form.tsx: formulario en Sheet/Dialog
  - URL de imagen (con preview)
  - Caption (textarea con contador de caracteres, máx 2200)
  - Selector de fecha y hora para programar
  - Botón "Publicar ahora" y botón "Programar"

PÁGINA INSTAGRAM:
- Sección de conexión (igual lógica que WhatsApp)
- Tabs: "Calendario" | "Publicados" | "Programados" | "Fallidos"
- Botón "Nuevo Post" siempre visible
- En tab Calendario: componente content-calendar
- En otras tabs: lista de posts filtrada por estado

VALIDACIONES:
- URL de imagen debe ser una URL válida y pública
- Caption no puede superar 2200 caracteres
- No se puede programar para el pasado

VERIFICACIÓN:
- Crear post programado para mañana, verificar que aparece en el calendario
- Cancelar el post y verificar que desaparece
```

---

## ═══════════════════════════════════════════
## FASE 5 — VTEX
## ═══════════════════════════════════════════

### PROMPT 5.1 — Módulo VTEX (Backend)

```
Creá el módulo de VTEX en apps/api/src/modules/vtex/ con estas especificaciones:

FUNCIONALIDADES:
1. Conexión con VTEX REST API
2. Consulta de pedidos por número o email del cliente
3. Consulta de catálogo / stock de productos
4. Exposición de estas funciones como herramientas para OpenClaw

ESTRUCTURA:
vtex/
├── vtex.module.ts
├── vtex.controller.ts
├── vtex.service.ts
├── vtex-api.service.ts   ← cliente HTTP para VTEX
├── dto/
│   ├── connect.dto.ts
│   └── query.dto.ts
└── vtex.service.spec.ts

VTEX API SERVICE:
Headers requeridos: X-VTEX-API-AppKey, X-VTEX-API-AppToken
Base URL: https://{accountName}.vtexcommercestable.com.br

Métodos:
- getOrder(accountName, appKey, appToken, orderId): Promise<VtexOrder>
- searchOrders(accountName, appKey, appToken, email): Promise<VtexOrder[]>
- getProduct(accountName, appKey, appToken, productId): Promise<VtexProduct>
- searchProducts(accountName, appKey, appToken, query): Promise<VtexProduct[]>
- getInventory(accountName, appKey, appToken, skuId): Promise<VtexInventory>

Tipos TypeScript para respuestas VTEX (definir en packages/shared/):
- VtexOrder: orderId, status, totalValue, items[], creationDate, clientProfileData
- VtexProduct: id, name, description, price, images[]
- VtexInventory: skuId, warehouseName, totalQuantity

ENDPOINTS:

POST /api/v1/vtex/connect
  Body: { accountName: string, appKey: string, appToken: string }
  - Verifica credenciales consultando un endpoint de VTEX
  - Guarda Integration encriptada

GET /api/v1/vtex/status
  - Estado de conexión y accountName

GET /api/v1/vtex/orders?orderId=XXX o ?email=xxx@xxx.com
  Auth: JwtAuthGuard
  - Proxy a VTEX API con credenciales del tenant

GET /api/v1/vtex/products?q=nombre_producto
  Auth: JwtAuthGuard
  - Proxy a VTEX API

POST /api/v1/vtex/openclaw-tool
  Auth: JwtAuthGuard (llamado por el contenedor OpenClaw del tenant)
  Body: { tool: 'get_order' | 'search_products', params: object }
  - Endpoint especial que OpenClaw llama como herramienta
  - Ejecuta la consulta a VTEX con las credenciales del tenant
  - Retorna resultado formateado para que OpenClaw lo entienda

INTEGRACIÓN CON OPENCLAW:
Al conectar VTEX, actualizar el TOOLS.md del contenedor del tenant con:
  - Tool: get_order_status — URL del endpoint /vtex/openclaw-tool
  - Tool: search_products — URL del endpoint /vtex/openclaw-tool
  - Auth header con token interno del tenant (JWT de servicio con expiración larga)

TESTS:
- connect: verifica credenciales y guarda integración
- getOrder: retorna pedido formateado correctamente
- searchProducts: retorna lista de productos
- openclaw-tool: ejecuta la herramienta correcta según el parámetro

VERIFICACIÓN:
- Conectar cuenta VTEX
- Enviar mensaje de WhatsApp "¿Cuál es el estado del pedido 123456?" 
- El agente consulta VTEX y responde con el estado real
```

---

### PROMPT 5.2 — Página VTEX (Frontend)

```
Implementá la página de VTEX en apps/web/app/(dashboard)/vtex/page.tsx

SECCIONES:

1. CONEXIÓN (igual patrón que WhatsApp/Instagram):
- Formulario: Account Name, App Key, App Token
- Link a guía de cómo obtener las credenciales en VTEX

2. PANEL DE CONSULTA (para que el cliente pruebe desde el dashboard):
- Buscador de pedidos: input con número de pedido o email, botón buscar
- Muestra resultado en card: número de pedido, estado, fecha, total, items
- Buscador de productos: input de texto libre

3. HERRAMIENTAS OPENCLAW HABILITADAS:
- Lista de tools que OpenClaw puede usar (get_order_status, search_products)
- Toggle para habilitar/deshabilitar cada tool
- Descripción de qué hace cada tool

VERIFICACIÓN:
- Buscar un pedido real desde el dashboard y ver los datos
- Verificar que el toggle de tools actualiza el TOOLS.md del contenedor
```

---

## ═══════════════════════════════════════════
## FASE 6 — BILLING Y PULIDO
## ═══════════════════════════════════════════

### PROMPT 6.1 — Sistema de Planes y Límites

```
Implementá el sistema de planes con límites en apps/api/src/modules/tenants/

PLANES Y LÍMITES:
const PLAN_LIMITS = {
  STARTER: {
    messagesPerMonth: 500,
    activeWorkflows: 3,
    integrations: ['WHATSAPP'],
  },
  PRO: {
    messagesPerMonth: 5000,
    activeWorkflows: 20,
    integrations: ['WHATSAPP', 'INSTAGRAM', 'VTEX'],
  },
  ENTERPRISE: {
    messagesPerMonth: -1,  // ilimitado
    activeWorkflows: -1,
    integrations: ['WHATSAPP', 'INSTAGRAM', 'VTEX'],
  },
}

IMPLEMENTACIÓN:

1. UsageService (tenants/usage.service.ts):
   - trackMessage(tenantId): incrementa contador mensual en Redis
   - getMonthlyUsage(tenantId): retorna uso del mes actual
   - isWithinLimit(tenantId, limitType): boolean

2. PlanGuard (common/guards/plan.guard.ts):
   - Decorator @RequirePlan(Plan.PRO) para endpoints que requieren plan específico
   - Retorna 403 con mensaje claro si el plan no lo permite

3. En WhatsApp webhook handler:
   - Antes de procesar mensaje, verificar límite mensual
   - Si excede límite: responder al usuario "Has alcanzado tu límite del plan Starter. Actualizá tu plan en autoclaw.app"
   - Guardar el evento como "rate_limited" en Metric

4. En workflow creation:
   - Verificar límite de workflows activos antes de crear

TESTS:
- isWithinLimit: retorna true cuando no se alcanzó el límite
- isWithinLimit: retorna false cuando se superó el límite
- PlanGuard: retorna 403 para plan insuficiente
- Webhook: responde con mensaje de límite cuando se supera

VERIFICACIÓN:
- Con plan STARTER, crear 4 workflows debe fallar con error descriptivo
```

---

### PROMPT 6.2 — Integración MercadoPago

```
Implementá el módulo de billing con MercadoPago Subscriptions.

INSTALACIÓN:
npm install mercadopago --workspace=apps/api

ESTRUCTURA:
billing/
├── billing.module.ts
├── billing.controller.ts
├── billing.service.ts
└── billing.service.spec.ts

ENDPOINTS:

POST /api/v1/billing/subscribe
  Auth: JwtAuthGuard, RequireRole(OWNER)
  Body: { plan: 'PRO' | 'ENTERPRISE' }
  - Crea un preapproval (suscripción) en MercadoPago
  - Retorna { checkoutUrl } para que el usuario complete el pago

POST /api/v1/billing/webhook (MercadoPago IPN)
  - Recibe notificaciones de pago
  - Valida la firma del webhook
  - En pago exitoso: actualiza plan del tenant en DB
  - En cancelación: baja a plan STARTER

GET /api/v1/billing/current
  Auth: JwtAuthGuard
  - Retorna plan actual, fecha de renovación, uso del mes

PRECIOS (en ARS, configurar en variables de entorno):
PLAN_PRO_PRICE_ARS=15000
PLAN_ENTERPRISE_PRICE_ARS=45000

VARIABLES DE ENTORNO:
MP_ACCESS_TOKEN=
MP_WEBHOOK_SECRET=
PLAN_PRO_PRICE_ARS=
PLAN_ENTERPRISE_PRICE_ARS=

TESTS:
- subscribe: crea preapproval con los parámetros correctos
- webhook: actualiza plan en pago exitoso
- webhook: retorna 400 si firma inválida

PÁGINA SETTINGS (frontend):
- Tab "Plan y Facturación" con:
  - Plan actual destacado
  - Uso del mes (barra de progreso: mensajes usados / límite)
  - Cards de planes con botón "Actualizar" que redirige al checkout de MercadoPago
  - Historial de pagos (si está disponible)
```

---

### PROMPT 6.3 — Onboarding Wizard

```
Implementá un wizard de onboarding para nuevos usuarios.

LÓGICA:
- Se muestra automáticamente si el tenant tiene status 'onboarding' (agregar campo a Tenant en DB)
- 4 pasos: Bienvenida → Conectar WhatsApp → Crear primer workflow → Listo
- Se puede cerrar/saltear después del paso 1
- Al completar el paso 4: actualizar tenant status a 'active'

IMPLEMENTACIÓN FRONTEND:
- components/onboarding/onboarding-wizard.tsx: modal que aparece sobre el dashboard
- Muestra progreso con stepper visual
- Cada paso tiene instrucciones claras y botones de acción directa
- Guarda el progreso en el tenant (campo onboardingStep)

VERIFICACIÓN:
- Registrar cuenta nueva → ver wizard automáticamente
- Completar todos los pasos → wizard desaparece y overview muestra datos reales
```

---

### PROMPT 6.4 — Tests E2E con Playwright

```
Implementá tests E2E para los flujos críticos del producto.

INSTALACIÓN:
npm install @playwright/test --workspace=apps/web
npx playwright install chromium --with-deps

TESTS E2E (apps/web/e2e/):

1. auth.spec.ts:
   - Usuario puede registrarse con datos válidos y llega al dashboard
   - Usuario no puede registrarse con email duplicado (ve mensaje de error)
   - Usuario puede hacer login y logout

2. whatsapp.spec.ts:
   - Usuario puede conectar WhatsApp (mockear Meta API)
   - Usuario puede crear un workflow
   - Usuario puede activar/desactivar workflow

3. billing.spec.ts:
   - Usuario ve su plan actual
   - Botón de upgrade redirige a MercadoPago

CONFIGURACIÓN playwright.config.ts:
- Base URL: http://localhost:3001 (web)
- Screenshots en fallos
- Videos en fallos
- Usar un servidor de testing dedicado (no el de producción)
- Timeouts razonables: 10s por acción, 30s por test

SCRIPTS a agregar en root package.json:
- "test:e2e": "turbo run test:e2e"

VERIFICACIÓN:
- `npm run test:e2e` pasa los 3 archivos de tests
- Los screenshots de fallos se guardan en apps/web/test-results/
```

---

### PROMPT 6.5 — Métricas y Analytics

``````

---

## ═══════════════════════════════════════════
## PROMPT FINAL — Revisión y Deploy
## ═══════════════════════════════════════════

### PROMPT F.1 — Checklist de Producción

```
Revisá el proyecto completo y asegurate que esté listo para producción:

SEGURIDAD:
- [ ] Todas las credenciales de integraciones están encriptadas en DB (AES-256)
- [ ] Rate limiting en endpoints públicos (express-rate-limit en /auth/* y /webhook/*)
- [ ] Validación de entrada en todos los DTOs con class-validator
- [ ] Signatures HMAC verificadas en todos los webhooks (Meta, MercadoPago)
- [ ] CORS configurado correctamente (solo el dominio del dashboard)
- [ ] Headers de seguridad con Helmet

PERFORMANCE:
- [ ] Índices en Prisma: tenantId en todas las tablas relacionadas, email en User
- [ ] Paginación en todos los endpoints que retornan listas
- [ ] Queries a VTEX/Meta con timeout configurado

OBSERVABILIDAD:
- [ ] Logger de NestJS configurado (sin console.log, solo Logger)
- [ ] Logs estructurados: nivel, timestamp, tenantId, requestId

CONFIGURACIÓN DE RAILWAY:
- Crear railway.toml con configuración de build y start para apps/api
- Variables de entorno de producción documentadas en README
- Healthcheck endpoint: GET /api/v1/health retorna { status: 'ok', timestamp }

README.md en la raíz con:
- Descripción del producto
- Instrucciones de setup local
- Descripción de cada módulo
- Guía de variables de entorno
- Cómo correr tests

VERIFICACIÓN FINAL:
- `npm run build` pasa sin errores
- `npm run test` todos los tests en verde
- `npm run lint` sin warnings
- `npm run typecheck` sin errores
```

---

## NOTAS PARA EL AGENTE

- Si en algún prompt hay ambigüedad, elegir la opción más simple que cumpla el requisito.
- Si una dependencia nueva es necesaria y no está en el prompt, mencionarla antes de instalar.
- Nunca modificar archivos fuera del scope del prompt actual sin avisar.
- Al terminar cada prompt, ejecutar los comandos de verificación y confirmar que pasan.
- Si un test falla, corregirlo antes de continuar con el siguiente prompt.
