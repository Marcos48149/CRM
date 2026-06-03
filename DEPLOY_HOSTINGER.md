# Guía de Deploy en Hostinger VPS — AutoClaw SaaS

## Por qué VPS y no Hosting Compartido

Este proyecto necesita **VPS obligatoriamente** porque:
- Corre contenedores Docker por cada cliente (OpenClaw instances)
- Necesita acceso root al sistema
- Requiere PostgreSQL, Redis, y Nginx corriendo al mismo tiempo
- Necesita el socket de Docker (`/var/run/docker.sock`)

El hosting compartido o el Node.js managed de Hostinger NO soporta Docker.

---

## Plan de VPS Recomendado

| Plan | vCPU | RAM | Storage | Precio | ¿Alcanza? |
|------|------|-----|---------|--------|-----------|
| KVM 2 | 2 | 8 GB | 100 GB NVMe | ~$8.99/mes | ✅ MVP (hasta ~20 clientes) |
| KVM 4 | 4 | 16 GB | 200 GB NVMe | ~$15.99/mes | ✅ Crecimiento (hasta ~60 clientes) |
| KVM 8 | 8 | 32 GB | 400 GB NVMe | ~$29.99/mes | ✅ Escala (100+ clientes) |

**Empezá con KVM 2.** Podés hacer upgrade sin migrar datos.

Sistema operativo a seleccionar al crear el VPS: **Ubuntu 22.04 LTS**

---

## Arquitectura de Deploy en el VPS

```
Internet
    │
    ▼
[ Nginx ] ← reverse proxy, SSL (puerto 80/443)
    ├── autoclaw.tudominio.com → Next.js (puerto 3001)
    └── api.autoclaw.tudominio.com → NestJS (puerto 3000)
    
[ Docker Compose ] ← gestiona todos los servicios
    ├── api (NestJS)         → puerto 3000
    ├── web (Next.js)        → puerto 3001
    ├── postgres             → puerto 5432 (solo interno)
    ├── redis                → puerto 6379 (solo interno)
    └── [openclaw-cliente-X] → contenedores dinámicos por tenant
```

---

## PROMPT DE DEPLOY — Agregar al final del AGENTS.md

### PROMPT D.1 — Dockerfiles de Producción

```
Creá los Dockerfiles de producción para ambas apps:

apps/api/Dockerfile:
- Multi-stage build
- Stage 1 "builder": node:20-alpine, instala dependencias, compila TypeScript
- Stage 2 "production": node:20-alpine, copia solo dist/ y node_modules de producción
- No incluir devDependencies en la imagen final
- Usuario no-root para seguridad
- EXPOSE 3000
- CMD ["node", "dist/main.js"]
- .dockerignore: node_modules, dist, .env, coverage, test

apps/web/Dockerfile:
- Multi-stage build para Next.js standalone
- Stage 1 "deps": instala dependencias
- Stage 2 "builder": npm run build con output standalone
- Stage 3 "runner": node:20-alpine, copia .next/standalone y .next/static
- Usuario no-root
- EXPOSE 3001
- ENV PORT=3001
- CMD ["node", "server.js"]

Actualizar apps/web/next.config.ts:
- Agregar output: 'standalone' para build optimizado

VERIFICACIÓN:
- docker build -t autoclaw-api apps/api → imagen < 300MB
- docker build -t autoclaw-web apps/web → imagen < 200MB
```

---

### PROMPT D.2 — Docker Compose de Producción

```
Creá docker/docker-compose.prod.yml con estas especificaciones:

Servicios:

postgres:
  image: postgres:15-alpine
  restart: unless-stopped
  volumes: postgres_data:/var/lib/postgresql/data
  environment: POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD (desde .env)
  networks: autoclaw-net
  NO exponer puerto al exterior (solo red interna)

redis:
  image: redis:7-alpine
  restart: unless-stopped
  command: redis-server --appendonly yes
  volumes: redis_data:/data
  networks: autoclaw-net
  NO exponer puerto al exterior

api:
  build: ../apps/api
  restart: unless-stopped
  depends_on: [postgres, redis]
  environment: cargado desde .env
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock  ← para gestionar contenedores OpenClaw
    - /opt/autoclaw/tenants:/opt/autoclaw/tenants ← datos de tenants
  networks: autoclaw-net
  ports: "3000:3000"

web:
  build: ../apps/web
  restart: unless-stopped
  depends_on: [api]
  environment: NEXT_PUBLIC_API_URL=https://api.autoclaw.tudominio.com
  networks: autoclaw-net
  ports: "3001:3001"

Volumes nombrados: postgres_data, redis_data
Network: autoclaw-net (bridge)

Crear también docker/docker-compose.yml (para desarrollo local):
- Mismos servicios pero sin builds propios para api y web
- Solo postgres y redis como servicios externos
- api y web se corren con npm run dev desde Turborepo

VERIFICACIÓN:
- docker compose -f docker/docker-compose.prod.yml up -d --build
- Todos los contenedores en estado "healthy"
```

---

### PROMPT D.3 — Script de Setup del VPS

```
Creá scripts/setup-vps.sh — script que configura el VPS de cero:

#!/bin/bash
# AutoClaw VPS Setup Script
# Ejecutar como root en Ubuntu 22.04: bash setup-vps.sh

El script debe hacer EN ORDEN:

1. Actualizar sistema:
   apt update && apt upgrade -y

2. Instalar Docker y Docker Compose:
   - Usar el método oficial de Docker (apt-get con repo de Docker, NO el de snap)
   - Habilitar y arrancar el servicio Docker
   - Agregar usuario no-root al grupo docker

3. Instalar Nginx:
   apt install nginx -y
   systemctl enable nginx

4. Instalar Certbot (SSL):
   apt install certbot python3-certbot-nginx -y

5. Crear directorios del proyecto:
   mkdir -p /opt/autoclaw/tenants
   mkdir -p /opt/autoclaw/app
   chmod 755 /opt/autoclaw

6. Configurar UFW (firewall):
   ufw allow 22/tcp   ← SSH
   ufw allow 80/tcp   ← HTTP
   ufw allow 443/tcp  ← HTTPS
   ufw --force enable

7. Mensaje final con pasos manuales siguientes

Agregar también scripts/deploy.sh:
- Pull del repo desde GitHub
- docker compose build --no-cache
- docker compose up -d
- npx prisma migrate deploy (dentro del contenedor api)
- Verificar que todos los contenedores están corriendo

VERIFICACIÓN:
- chmod +x scripts/*.sh
- Los scripts no tienen errores de sintaxis bash (bash -n scripts/setup-vps.sh)
```

---

### PROMPT D.4 — Configuración Nginx

```
Creá nginx/autoclaw.conf — configuración de Nginx como reverse proxy con SSL:

Configuración para dos dominios virtuales:

1. api.autoclaw.com (o el dominio del cliente):
   - Redirige HTTP → HTTPS
   - Proxy pass a http://localhost:3000
   - Headers: X-Real-IP, X-Forwarded-For, X-Forwarded-Proto
   - Timeout: 60s (para webhooks de Meta que pueden demorar)
   - Rate limiting: 10 requests/segundo por IP en /api/v1/auth/*

2. app.autoclaw.com (dashboard):
   - Redirige HTTP → HTTPS
   - Proxy pass a http://localhost:3001
   - Caché para assets estáticos (_next/static): 1 año

Crear también nginx/README.md con pasos exactos para activar en el VPS:
1. Copiar el archivo a /etc/nginx/sites-available/autoclaw
2. Crear symlink en sites-enabled
3. Obtener certificado SSL con Certbot
4. Reload Nginx

VERIFICACIÓN:
- nginx -t debe pasar sin errores de sintaxis
```

---

### PROMPT D.5 — CI/CD para Deploy Automático en VPS

```
Actualizá .github/workflows/ci.yml para agregar deploy automático al VPS de Hostinger.

NUEVO JOB "deploy" (solo en push a main, después de que "build" pase):

steps:
1. Conectar al VPS por SSH usando appleboy/ssh-action
2. En el VPS ejecutar scripts/deploy.sh

SECRETS DE GITHUB requeridos (documentar en README):
- VPS_HOST: IP del VPS de Hostinger
- VPS_USERNAME: usuario SSH (generalmente "root" o usuario creado)
- VPS_SSH_KEY: clave privada SSH (sin passphrase)
- VPS_PORT: 22

El script deploy.sh (en el VPS) debe:
1. cd /opt/autoclaw/app
2. git pull origin main
3. docker compose -f docker/docker-compose.prod.yml build --no-cache api web
4. docker compose -f docker/docker-compose.prod.yml up -d
5. docker exec autoclaw-api npx prisma migrate deploy
6. docker image prune -f  ← limpia imágenes viejas para no llenar el disco

VERIFICACIÓN:
- Push a main → ver el job "deploy" en GitHub Actions correr sin errores
- Cambiar un texto en la web, pushear, y en 3 minutos verlo en producción
```

---

## Checklist de Deploy Inicial (Manual, primera vez)

Seguí estos pasos en orden la primera vez que deployés:

```
[ ] 1. Crear VPS KVM 2 en Hostinger con Ubuntu 22.04
[ ] 2. Conectarte por SSH: ssh root@TU_IP_VPS
[ ] 3. Ejecutar setup-vps.sh en el VPS
[ ] 4. Subir tu clave pública SSH al VPS (para CI/CD)
[ ] 5. Clonar el repo en /opt/autoclaw/app
[ ] 6. Crear .env en /opt/autoclaw/app con todas las variables de producción
[ ] 7. Ejecutar docker compose -f docker/docker-compose.prod.yml up -d --build
[ ] 8. Correr las migraciones: docker exec autoclaw-api npx prisma migrate deploy
[ ] 9. Apuntar tu dominio al IP del VPS (DNS A record)
[ ] 10. Activar Nginx con la config y obtener SSL con Certbot
[ ] 11. Configurar los secrets en GitHub para CI/CD automático
[ ] 12. Hacer un push de prueba para verificar deploy automático
```

---

## Estimación de Costos Mensuales

| Servicio | Costo |
|----------|-------|
| VPS Hostinger KVM 2 | ~$8.99/mes |
| Dominio (.com) | ~$1/mes |
| Meta API (WhatsApp) | Gratis hasta 1000 conversaciones/mes |
| OpenAI / Anthropic API | ~$10-30/mes según uso |
| **Total MVP** | **~$20-40/mes** |

Con el plan Starter de tu SaaS a $15.000 ARS/mes, **1 cliente paga toda la infraestructura**.

