# ✅ Deploy Checklist - Dokploy/Producción

## 🔧 **Problema Resuelto**
- ✅ Agregado `postinstall: "prisma generate"` en package.json
- ✅ Modificado build script: `"build": "prisma generate && next build"`

---

## 📋 **Variables de Entorno Requeridas en Dokploy**

### **Database** (OBLIGATORIO)
```bash
DATABASE_URL="postgresql://user:password@host:5432/dbname"
```

### **Authentication** (OBLIGATORIO)
```bash
NEXTAUTH_URL="https://tu-dominio.com"
NEXTAUTH_SECRET="genera-con: openssl rand -base64 32"
```

### **MercadoPago** (OBLIGATORIO para pagos)
```bash
MERCADOPAGO_ACCESS_TOKEN="tu-access-token"
MERCADOPAGO_PUBLIC_KEY="tu-public-key"
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY="tu-public-key"
MERCADOPAGO_WEBHOOK_SECRET="tu-webhook-secret"  # CRÍTICO para seguridad
```

### **Email** (Opcional - si usas notificaciones)
```bash
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER="tu-email@gmail.com"
EMAIL_SERVER_PASSWORD="tu-app-password"
EMAIL_FROM="noreply@padelshot.com"
```

---

## 🚀 **Pasos para Deploy Exitoso**

### **1. Verificar Variables de Entorno en Dokploy**
- [ ] DATABASE_URL configurada y funcionando
- [ ] NEXTAUTH_URL con tu dominio real
- [ ] NEXTAUTH_SECRET generado
- [ ] Variables de MercadoPago (si vas a usar pagos)
- [ ] MERCADOPAGO_WEBHOOK_SECRET configurado

### **2. Hacer Commit y Push**
```bash
git add package.json
git commit -m "fix: add prisma generate to build process"
git push
```

### **3. Redeploy en Dokploy**
- Dokploy detectará el push automáticamente
- O hacer redeploy manual desde el dashboard

### **4. Verificar Build Logs**
Buscar en los logs:
- ✅ `prisma generate` ejecutándose
- ✅ `next build` completándose
- ❌ Cualquier error de variables faltantes

### **5. Migrar Base de Datos** (primera vez)
Si es el primer deploy, ejecutar en Dokploy:
```bash
npx prisma migrate deploy
npx tsx prisma/seeds/index.ts  # Si quieres datos de prueba
```

---

## 🔍 **Diagnóstico de Errores Comunes**

### Error: "DATABASE_URL not found"
**Solución**: Configurar DATABASE_URL en Dokploy

### Error: "Prisma Client not generated"
**Solución**: Ya corregido con postinstall script

### Error: "NEXTAUTH_SECRET is not set"
**Solución**:
```bash
# Generar un secret
openssl rand -base64 32
# Agregarlo a Dokploy
```

### Error: "unexpected EOF" (el que tenías)
**Solución**: Ya corregido con `prisma generate` en build

---

## 🛡️ **Seguridad en Producción**

### **IMPORTANTE: Configurar MERCADOPAGO_WEBHOOK_SECRET**

Sin esta variable, el webhook de MercadoPago **NO validará** las firmas:
1. Ir a https://mercadopago.com.ar/developers
2. Tu aplicación → Webhooks → Copiar "Secret key"
3. Agregar a variables de entorno en Dokploy:
   ```bash
   MERCADOPAGO_WEBHOOK_SECRET="app-XXXXXXXXX"
   ```

**Sin esto, el sistema de pagos es vulnerable** 🔴

---

## ✅ **Verificación Post-Deploy**

Después del deploy exitoso, verificar:

- [ ] Sitio cargando correctamente
- [ ] Login funcionando
- [ ] Base de datos conectada
- [ ] Prisma Client generado (no hay errores de "Unknown field")
- [ ] Sistema de pagos funcionando (si aplica)
- [ ] Webhooks de MercadoPago validando firma (logs)

---

## 📞 **Si Sigue Fallando**

1. **Ver logs completos de Dokploy**
2. **Verificar que DATABASE_URL sea accesible desde Dokploy**
3. **Probar build localmente**:
   ```bash
   npm run build
   ```
4. **Verificar que todas las variables estén configuradas**

---

**Última actualización**: Diciembre 2024
**Cambios recientes**: Auditoría de seguridad MercadoPago
