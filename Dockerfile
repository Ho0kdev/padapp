# Dockerfile para PadApp - Next.js 16 + pnpm + Prisma
# Multi-stage build optimizado para producción

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:24-alpine AS deps

# Instalar dependencias del sistema necesarias para Prisma
RUN apk add --no-cache libc6-compat openssl

# Habilitar Corepack para pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Instalar dependencias de producción
RUN pnpm install --frozen-lockfile --prod

# ============================================
# Stage 2: Builder
# ============================================
FROM node:24-alpine AS builder

# Instalar dependencias del sistema
RUN apk add --no-cache libc6-compat openssl

# Habilitar Corepack para pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Instalar todas las dependencias (incluyendo devDependencies)
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY . .

# Variables de entorno necesarias para el build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV SKIP_ENV_VALIDATION=1

# Generar Prisma Client
RUN pnpm run db:generate

# Build de Next.js
RUN pnpm run build

# ============================================
# Stage 3: Runner (Imagen final)
# ============================================
FROM node:24-alpine AS runner

# Instalar dependencias del sistema necesarias para Prisma
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Variables de entorno de producción
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Crear usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar archivos públicos
COPY --from=builder /app/public ./public

# Copiar archivos de build de Next.js
# Next.js genera automáticamente archivos standalone cuando se configura
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copiar Prisma Client generado
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copiar node_modules de producción (necesario para Prisma)
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Cambiar a usuario no-root
USER nextjs

# Exponer puerto
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando de inicio
CMD ["node", "server.js"]
