# Sistema de Recuperación de Contraseña - Guía de Configuración

## 📋 Resumen

Sistema completo de recuperación de contraseña con:
- ✅ Tokens seguros (SHA256, 1 hora de validez)
- ✅ Emails HTML profesionales con Resend
- ✅ Audit logging completo
- ✅ UI/UX optimizado con validación en tiempo real
- ✅ Protección contra enumeración de usuarios
- ✅ RBAC compatible (endpoints públicos)

---

## 🚀 Pasos de Instalación

### 1. Aplicar Migración de Base de Datos

**Detén el servidor de desarrollo** primero (si está corriendo):

```bash
# Presiona Ctrl+C para detener el servidor
```

Luego ejecuta:

```bash
# Regenerar Prisma Client con el nuevo schema
npx prisma generate

# Aplicar cambios a la base de datos
npm run db:push
```

### 2. Configurar Variables de Entorno

Agrega estas variables a tu archivo `.env`:

```env
# ========================================
# RESEND (Email Service)
# ========================================
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxxx"
RESEND_FROM_EMAIL="PadelShot <noreply@tudominio.com>"

# ========================================
# NEXTAUTH (requerido para URLs de reset)
# ========================================
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="tu-secreto-nextauth"
```

### 3. Obtener API Key de Resend

1. Ve a [resend.com](https://resend.com) y crea una cuenta
2. Verifica tu dominio de email (o usa el dominio de prueba `onboarding.resend.dev`)
3. Ve a **API Keys** → **Create API Key**
4. Copia la key y agrégala a `.env` como `RESEND_API_KEY`

**Para desarrollo local:**
```env
# Puedes usar el dominio de prueba de Resend
RESEND_FROM_EMAIL="PadelShot <onboarding@resend.dev>"
```

**Para producción:**
```env
# Debes verificar tu dominio primero en Resend
RESEND_FROM_EMAIL="PadelShot <noreply@padelshot.app>"
```

### 4. Reiniciar el Servidor

```bash
npm run dev
```

---

## 📁 Archivos Creados

### Backend (API)

| Archivo | Descripción |
|---------|-------------|
| `src/lib/services/email-service.ts` | Servicio de emails con templates HTML |
| `src/lib/services/password-reset-service.ts` | Lógica de tokens de recuperación |
| `src/lib/services/user-log-service.ts` | Logging actualizado (3 nuevas acciones) |
| `src/lib/validations/password-reset.ts` | Schemas Zod para validación |
| `src/app/api/auth/forgot-password/route.ts` | POST: Solicitar reset |
| `src/app/api/auth/verify-reset-token/route.ts` | POST: Verificar token |
| `src/app/api/auth/reset-password/route.ts` | POST: Cambiar contraseña |

### Frontend (UI)

| Archivo | Descripción |
|---------|-------------|
| `src/app/auth/forgot-password/page.tsx` | Página de solicitud de reset |
| `src/app/auth/reset-password/page.tsx` | Página de cambio de contraseña |
| `src/components/auth/login-form.tsx` | Actualizado con link "Olvidé mi contraseña" |

### Base de Datos

| Modelo | Descripción |
|--------|-------------|
| `PasswordResetToken` | Tabla de tokens de recuperación |
| 3 nuevos `LogAction` | `PASSWORD_RESET_REQUESTED`, `PASSWORD_RESET_COMPLETED`, `PASSWORD_RESET_FAILED` |

---

## 🔄 Flujo de Recuperación

### 1. Usuario solicita reset

```
Usuario → /auth/forgot-password → Ingresa email
    ↓
POST /api/auth/forgot-password
    ↓
✓ Valida email (Zod)
✓ Busca usuario en DB
✓ Invalida tokens anteriores
✓ Genera nuevo token (32 bytes aleatorios)
✓ Guarda token en DB (expira en 1 hora)
✓ Envía email con link único
✓ Log de solicitud (UserLogService)
    ↓
Usuario recibe email con link: /auth/reset-password?token=abc123...
```

### 2. Usuario hace clic en el link

```
Usuario → /auth/reset-password?token=abc123...
    ↓
Frontend verifica token automáticamente
POST /api/auth/verify-reset-token
    ↓
✓ Token válido y no expirado → Muestra formulario
✗ Token inválido → Muestra error + link para solicitar nuevo
```

### 3. Usuario ingresa nueva contraseña

```
Usuario → Ingresa nueva contraseña + confirma
    ↓
POST /api/auth/reset-password
    ↓
✓ Valida token nuevamente
✓ Hashea nueva contraseña (bcrypt)
✓ Actualiza password en DB
✓ Marca token como usado
✓ Invalida otros tokens del usuario
✓ Log de cambio exitoso
✓ Envía email de confirmación
    ↓
Usuario → Redirigido a /auth/login (puede iniciar sesión)
```

---

## 🎨 Características de UI/UX

### Página de Solicitud (`/auth/forgot-password`)
- ✅ Formulario simple con campo de email
- ✅ Validación en tiempo real con Zod
- ✅ Loading state durante envío
- ✅ Mensaje de éxito con instrucciones claras
- ✅ Link para volver al login

### Página de Reset (`/auth/reset-password`)
- ✅ Verificación automática del token al cargar
- ✅ Estados: Verificando / Token Inválido / Formulario / Éxito
- ✅ Campos de contraseña con toggle de visibilidad (👁️)
- ✅ Validación de coincidencia de contraseñas
- ✅ Redirección automática a login tras éxito (3 segundos)

### Formulario de Login
- ✅ Link "¿Olvidaste tu contraseña?" sobre el campo de contraseña

---

## 🔒 Seguridad Implementada

| Medida | Implementación |
|--------|----------------|
| **Anti-Enumeración** | Siempre retorna mensaje genérico (no revela si email existe) |
| **Tokens Criptográficos** | `crypto.randomBytes(32)` (64 caracteres hex) |
| **Expiración Temporal** | 1 hora de validez |
| **Un Solo Uso** | Token se marca como `used=true` tras cambio |
| **Invalidación en Lote** | Al crear nuevo token, invalida tokens anteriores del usuario |
| **Logging de Seguridad** | Registra IP, user agent, éxitos y fallos |
| **Protección de Estado** | Valida que usuario no esté `SUSPENDED` |
| **Password Hashing** | bcrypt con salt=10 |

---

## 📧 Emails Enviados

### Email de Recuperación
- **Asunto**: "Recuperación de Contraseña - PadelShot"
- **Contenido**:
  - Saludo personalizado
  - Botón CTA grande para reset
  - Link alternativo (copia/pega)
  - Advertencia de expiración (1 hora)
  - Nota de seguridad ("¿No solicitaste esto?")

### Email de Confirmación
- **Asunto**: "Contraseña Actualizada - PadelShot"
- **Contenido**:
  - Confirmación de cambio exitoso
  - Alerta de seguridad ("¿No fuiste tú?")

---

## 🧪 Testing Manual

### 1. Solicitar Reset (Email No Existente)

```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"noexiste@test.com"}'

# Respuesta esperada: 200 OK (mensaje genérico, sin revelar que no existe)
```

### 2. Solicitar Reset (Email Existente)

```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@padelshot.app"}'

# Respuesta esperada: 200 OK + Email enviado
# Verifica: Inbox de admin@padelshot.app
```

### 3. Verificar Token

```bash
curl -X POST http://localhost:3000/api/auth/verify-reset-token \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN_DEL_EMAIL_AQUI"}'

# Respuesta esperada: {"valid":true,"message":"Token válido"}
```

### 4. Cambiar Contraseña

```bash
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token":"TOKEN_DEL_EMAIL_AQUI",
    "password":"nuevapassword123",
    "confirmPassword":"nuevapassword123"
  }'

# Respuesta esperada: 200 OK + Email de confirmación enviado
```

### 5. Intentar Reusar Token

```bash
# Intentar usar el mismo token nuevamente
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token":"TOKEN_USADO_ANTERIORMENTE",
    "password":"otrapassword",
    "confirmPassword":"otrapassword"
  }'

# Respuesta esperada: 400 Bad Request - "Este token ya fue utilizado"
```

---

## 🗄️ Base de Datos

### Tabla `password_reset_tokens`

```sql
SELECT * FROM password_reset_tokens WHERE userId = 'USER_ID_AQUI';
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | String | CUID único |
| `token` | String | Token de 64 caracteres (índice único) |
| `userId` | String | FK a `users.id` |
| `expiresAt` | DateTime | Timestamp de expiración |
| `used` | Boolean | `false` al crear, `true` tras uso |
| `usedAt` | DateTime? | Timestamp de uso |
| `ipAddress` | String? | IP de quien solicitó |
| `createdAt` | DateTime | Timestamp de creación |

### Logs de Auditoría

Ver logs de recuperación de contraseñas:

```sql
SELECT * FROM user_logs
WHERE action IN (
  'PASSWORD_RESET_REQUESTED',
  'PASSWORD_RESET_COMPLETED',
  'PASSWORD_RESET_FAILED'
)
ORDER BY createdAt DESC;
```

---

## 🧹 Mantenimiento

### Limpiar Tokens Expirados (Cron Job Recomendado)

Crea un endpoint o cron job que ejecute:

```typescript
import { PasswordResetService } from '@/lib/services/password-reset-service'

// Ejecutar cada día a las 2:00 AM
const deletedCount = await PasswordResetService.cleanupExpiredTokens()
console.log(`Tokens expirados eliminados: ${deletedCount}`)
```

---

## 🎯 Próximos Pasos Opcionales

1. **Rate Limiting**: Limitar solicitudes por IP (ej: 3 intentos/hora)
2. **Captcha**: Agregar reCAPTCHA en formulario de solicitud
3. **2FA**: Autenticación de dos factores
4. **Email Templates**: Personalizar diseño de emails con herramienta como [react.email](https://react.email)
5. **Notificaciones**: Email al cambiar contraseña desde perfil (no solo reset)

---

## 📞 Soporte

- **Documentación Resend**: https://resend.com/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **Zod Docs**: https://zod.dev

---

## ✅ Checklist de Implementación

- [x] Schema de Prisma actualizado
- [x] Migración de DB aplicada (`npx prisma generate` + `npm run db:push`)
- [x] Resend instalado (`pnpm add resend`)
- [x] Variables de entorno configuradas (`.env`)
- [x] API endpoints creados (3 rutas)
- [x] Servicios de backend implementados (email, reset, logging)
- [x] Validaciones Zod creadas
- [x] Páginas frontend creadas (forgot, reset)
- [x] Login form actualizado con link de recuperación
- [ ] Testing manual completo
- [ ] Resend API key configurada y dominio verificado

---

**🎉 ¡Sistema de Recuperación de Contraseña Completado!**
