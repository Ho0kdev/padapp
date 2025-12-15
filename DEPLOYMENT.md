# 🚀 Guía de Deployment - PdlShot

Esta guía explica cómo desplegar PdlShot en producción usando Docker y Dokploy.

## 📋 Requisitos previos

- Dokploy configurado
- Repositorio GitHub conectado
- PostgreSQL database accesible
- Variables de entorno configuradas

---

## 🐳 Deployment con Docker (Recomendado)

### Paso 1: Configuración en Dokploy

1. **Ir a tu aplicación en Dokploy**
2. **Configurar el tipo de build:**
   - Build Type: **Dockerfile**
   - Dockerfile Path: `Dockerfile` (en la raíz del proyecto)

3. **Configurar variables de entorno:**

   **Variables REQUERIDAS:**
   ```bash
   # Database
   DATABASE_URL="postgresql://user:password@host:5432/dbname"

   # NextAuth
   NEXTAUTH_URL="https://tu-dominio.com"
   NEXTAUTH_SECRET="tu-super-secret-key-aqui"

   # MercadoPago
   MERCADOPAGO_ACCESS_TOKEN="APP_USR-xxx"
   MERCADOPAGO_PUBLIC_KEY="APP_USR-xxx"
   NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY="APP_USR-xxx"
   MERCADOPAGO_WEBHOOK_SECRET="app-xxx"

   # Next.js
   NODE_ENV="production"
   NEXT_TELEMETRY_DISABLED=1
   ```

4. **Configurar puerto:**
   - Port: `3000`

### Paso 2: Deploy

1. Click en **Deploy** en Dokploy
2. Espera a que el build termine (~5-10 minutos la primera vez)
3. El contenedor iniciará automáticamente

### Paso 3: Verificar deployment

Accede a: `https://tu-dominio.com/api/health`

Deberías ver:
```json
{
  "status": "ok",
  "timestamp": "2024-12-03T...",
  "database": "connected"
}
```

---

## 🔧 Configuración avanzada

### Migraciones de Prisma

**Opción 1 - Ejecutar manualmente (primera vez):**
```bash
# Conectarse al contenedor
docker exec -it <container-id> sh

# Ejecutar migraciones
npx prisma migrate deploy
```

**Opción 2 - Agregar a Dockerfile (automático):**

Si quieres que las migraciones se ejecuten automáticamente en cada deploy, modifica el `CMD` del Dockerfile:

```dockerfile
# En Dockerfile, cambiar la última línea:
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
```

⚠️ **Advertencia:** Esto hará que el contenedor falle si hay problemas con las migraciones.

### Seed de datos

Para cargar datos de prueba en producción:
```bash
# Conectarse al contenedor
docker exec -it <container-id> sh

# Ejecutar seed
npm run db:seed
```

---

## 🐛 Troubleshooting

### Error: "Cannot find module '@prisma/client'"

**Causa:** Prisma Client no se generó correctamente.

**Solución:** El Dockerfile ya incluye `pnpm run db:generate`, pero si persiste:
```bash
docker exec -it <container-id> npx prisma generate
```

### Error: "Connection refused to database"

**Causa:** La URL de la base de datos es incorrecta o no es accesible.

**Solución:**
1. Verifica `DATABASE_URL` en las variables de entorno de Dokploy
2. Asegúrate que la base de datos acepte conexiones desde el contenedor
3. Verifica que el formato sea: `postgresql://user:password@host:port/dbname`

### Build muy lento

**Causa:** Docker está descargando muchas capas.

**Solución:**
1. Dokploy cachea las capas de Docker, el segundo build será mucho más rápido
2. Primera vez: ~5-10 minutos
3. Builds subsecuentes: ~2-3 minutos

### Healthcheck falla

**Causa:** El endpoint `/api/health` no responde.

**Solución:**
1. Verifica que el contenedor esté corriendo: `docker ps`
2. Revisa los logs: `docker logs <container-id>`
3. Verifica la conexión a la base de datos

---

## 📊 Monitoreo

### Logs en tiempo real
```bash
docker logs -f <container-id>
```

### Verificar salud del contenedor
```bash
docker inspect --format='{{.State.Health.Status}}' <container-id>
```

### Métricas de uso
```bash
docker stats <container-id>
```

---

## 🔄 Actualizar a nueva versión

1. **Push a GitHub** (rama main)
2. **Dokploy detectará el cambio automáticamente** (si tienes auto-deploy habilitado)
3. O click en **Rebuild** manualmente en Dokploy

El proceso:
1. Dokploy clona el nuevo código
2. Construye nueva imagen Docker
3. Detiene el contenedor antiguo
4. Inicia el nuevo contenedor
5. Zero-downtime si tienes múltiples instancias

---

## ⚙️ Variables de entorno opcionales

```bash
# Email (si usas notificaciones)
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER="your-email@gmail.com"
EMAIL_SERVER_PASSWORD="your-app-password"
EMAIL_FROM="noreply@padelshot.com"

# Build optimization
NEXT_SKIP_LINT=1  # Saltear ESLint en build (más rápido)
SKIP_ENV_VALIDATION=1  # Saltear validación de env (si usas .env dinámico)
```

---

## 🏗️ Arquitectura del Dockerfile

El Dockerfile usa **multi-stage build** para optimizar el tamaño:

1. **Stage 1 (deps)**: Solo dependencias de producción (~200MB)
2. **Stage 2 (builder)**: Build de Next.js + Prisma (~1GB temporal)
3. **Stage 3 (runner)**: Imagen final optimizada (~300MB)

Beneficios:
- ✅ Imagen final pequeña
- ✅ Build rápido con caché
- ✅ Seguridad (usuario no-root)
- ✅ Healthcheck incluido

---

## 📦 Estructura de la imagen final

```
/app
├── node_modules/       # Solo dependencias de producción
├── .next/
│   ├── standalone/     # Next.js optimizado
│   └── static/         # Assets estáticos
├── prisma/            # Schema de Prisma
├── public/            # Assets públicos
└── server.js          # Entry point
```

---

## 🔒 Seguridad

- ✅ Usuario no-root (nextjs:nodejs)
- ✅ Multi-stage build (minimiza superficie de ataque)
- ✅ Variables de entorno via Dokploy (no en código)
- ✅ Healthcheck para monitoring
- ✅ No expone información sensible en logs

---

## 🚦 Checklist de deployment

- [ ] Variables de entorno configuradas en Dokploy
- [ ] DATABASE_URL apunta a PostgreSQL de producción
- [ ] NEXTAUTH_SECRET es diferente al de desarrollo
- [ ] MERCADOPAGO_WEBHOOK_SECRET configurado
- [ ] Dominio configurado y apuntando al servidor
- [ ] SSL/HTTPS habilitado
- [ ] Migraciones de Prisma ejecutadas
- [ ] Health check responde correctamente
- [ ] Logs no muestran errores críticos

---

## 📚 Recursos adicionales

- [Documentación de Next.js Deployment](https://nextjs.org/docs/deployment)
- [Documentación de Dokploy](https://docs.dokploy.com/)
- [Prisma Deploy Guide](https://www.prisma.io/docs/guides/deployment)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

---

**¿Problemas?** Revisa los logs con `docker logs <container-id>` o contacta al equipo de desarrollo.
