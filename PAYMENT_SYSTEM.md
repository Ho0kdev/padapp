# Sistema de Pagos - PdlShot

Sistema completo de pagos integrado con Mercado Pago y gestión manual de pagos.

## 📋 Características

### 1. Pago con Mercado Pago
- ✅ Integración con SDK oficial de Mercado Pago
- ✅ Creación automática de preferencias de pago
- ✅ Redirección a checkout de Mercado Pago
- ✅ Webhook para recibir notificaciones automáticas
- ✅ Actualización automática del estado de pago
- ✅ Soporte para tarjetas de crédito/débito y wallets digitales
- ✅ Modo sandbox para testing

### 2. Pago Manual
- ✅ Solo disponible para ADMIN y CLUB_ADMIN
- ✅ Métodos: Efectivo, Transferencia Bancaria, Confirmación Manual
- ✅ Registro de comprobantes de pago
- ✅ Auditoría completa (quién confirmó y cuándo)
- ✅ Notas adicionales opcionales

### 3. Auditoría Completa
- ✅ PaymentLogService con 9 tipos de acciones
- ✅ Registro de IP, User Agent, timestamps
- ✅ Trazabilidad completa de todas las operaciones

## 🏗️ Arquitectura

### Backend

#### Servicios
- **PaymentService** (`src/lib/services/payment-service.ts`)
  - Creación de preferencias de Mercado Pago
  - Verificación de estado de pagos
  - Mapeo de estados y métodos

- **PaymentLogService** (`src/lib/services/payment-log-service.ts`)
  - Auditoría de todas las operaciones de pago
  - 9 acciones diferentes registradas

#### Endpoints API

```
POST   /api/registrations/[id]/payment/mercadopago
       Crea preferencia de pago y devuelve link de Mercado Pago

POST   /api/webhooks/mercadopago
       Recibe notificaciones de Mercado Pago (webhook)

POST   /api/registrations/[id]/payment/manual
       Marca pago como confirmado manualmente (ADMIN/CLUB_ADMIN)

GET    /api/registrations/[id]/payment
       Obtiene historial de pagos de una inscripción

POST   /api/registrations/[id]/payment
       Crea un pago (genérico, soporta todos los métodos)
```

### Frontend

#### Componentes
- **PaymentSelector** (`src/components/payments/payment-selector.tsx`)
  - Muestra opciones de pago disponibles
  - Botón para Mercado Pago (todos los usuarios)
  - Botón para pago manual (solo ADMIN/CLUB_ADMIN)
  - Estados: PAID, PENDING, sin pago

- **ManualPaymentDialog** (`src/components/payments/manual-payment-dialog.tsx`)
  - Formulario para registrar pagos manuales
  - Campos: monto, método, ID transacción, comprobante, notas
  - Validación con Zod

## 🚀 Configuración

### 1. Obtener Credenciales de Mercado Pago

#### Cuenta de Prueba (Sandbox)

1. Ir a https://www.mercadopago.com.ar/developers
2. Crear aplicación de prueba
3. Obtener credenciales:
   - Access Token de prueba: `TEST-XXXXXXXX...`
   - Public Key de prueba: `TEST-XXXXXXXX...`

#### Variables de Entorno

Agregar al archivo `.env`:

```bash
# Mercado Pago (Modo Test)
MERCADOPAGO_ACCESS_TOKEN="TEST-tu-access-token-aqui"
MERCADOPAGO_PUBLIC_KEY="TEST-tu-public-key-aqui"
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY="TEST-tu-public-key-aqui"
```

### 2. Configurar Webhook (Producción)

Para que Mercado Pago envíe notificaciones automáticas:

1. Ir a **Tus integraciones** → Tu aplicación → **Webhooks**
2. Configurar URL: `https://tu-dominio.com/api/webhooks/mercadopago`
3. Activar eventos: `payment`

#### Testing Local con ngrok

Para probar webhooks en desarrollo local:

```bash
# Instalar ngrok
npm install -g ngrok

# Exponer puerto 3000
ngrok http 3000

# Usar la URL de ngrok en la configuración del webhook
https://xxxx-xx-xx-xx-xx.ngrok.io/api/webhooks/mercadopago
```

## 🧪 Testing

### Tarjetas de Prueba de Mercado Pago

#### Tarjeta Aprobada
```
Número: 5031 7557 3453 0604
CVV: 123
Vencimiento: 11/25
Titular: APRO
DNI: 12345678
```

#### Tarjeta Rechazada
```
Número: 4444 4444 4444 4444
CVV: 123
Vencimiento: 11/25
Titular: OTHE
DNI: 12345678
```

### Usuarios de Prueba

Para probar con diferentes roles:

```bash
# Admin (puede confirmar pagos manualmente)
admin@padelshot.app / 123456

# Club Admin (puede confirmar pagos de sus torneos)
clubadmin@padelshot.app / 123456

# Player (solo puede pagar con Mercado Pago)
player@padelshot.app / 123456
```

## 💻 Uso en el Código

### Integrar en una Página

```tsx
import { PaymentSelector } from "@/components/payments/payment-selector"

export function RegistrationPage({ registration }) {
  return (
    <div>
      <h1>Inscripción</h1>

      <PaymentSelector
        registrationId={registration.id}
        amount={registration.tournamentCategory.registrationFee}
        tournamentName={registration.tournament.name}
        categoryName={registration.category.name}
        currentStatus={registration.payment?.paymentStatus}
        onPaymentComplete={() => router.refresh()}
      />
    </div>
  )
}
```

### Verificar Permisos para Pago Manual

```tsx
import { useAuth } from "@/hooks/use-auth"

export function MyComponent() {
  const { isAdminOrClubAdmin } = useAuth()

  return (
    <div>
      {isAdminOrClubAdmin && (
        <Button>Confirmar pago manualmente</Button>
      )}
    </div>
  )
}
```

## 🔄 Flujos de Pago

### Flujo 1: Pago con Mercado Pago

```
1. Usuario hace clic en "Pagar con Mercado Pago"
   ↓
2. Frontend llama POST /api/registrations/[id]/payment/mercadopago
   ↓
3. Backend crea preferencia en Mercado Pago
   ↓
4. Se crea RegistrationPayment con estado PENDING
   ↓
5. Usuario es redirigido al checkout de Mercado Pago
   ↓
6. Usuario completa el pago
   ↓
7. Mercado Pago envía webhook a /api/webhooks/mercadopago
   ↓
8. Backend actualiza RegistrationPayment a PAID
   ↓
9. Registration.registrationStatus cambia a PAID
   ↓
10. Usuario ve confirmación en su dashboard
```

### Flujo 2: Pago Manual

```
1. ADMIN/CLUB_ADMIN hace clic en "Registrar pago manual"
   ↓
2. Completa formulario:
   - Monto
   - Método (CASH, BANK_TRANSFER, MANUAL)
   - ID de transacción (opcional)
   - Comprobante (opcional)
   - Notas (opcional)
   ↓
3. Frontend llama POST /api/registrations/[id]/payment/manual
   ↓
4. Backend valida permisos (solo ADMIN/CLUB_ADMIN)
   ↓
5. Se crea/actualiza RegistrationPayment con estado PAID
   ↓
6. Se registra confirmedBy (quién confirmó) y confirmedAt (cuándo)
   ↓
7. Registration.registrationStatus cambia a PAID
   ↓
8. Se registra en PaymentLog
   ↓
9. Usuario ve confirmación
```

## 📊 Estados de Pago

El sistema utiliza badges visuales consistentes para mostrar estados y métodos de pago.

### Estados de Pago (PaymentStatus)

| Estado | Label | Color | CSS Class |
|--------|-------|-------|-----------|
| `PENDING` | Pendiente | Amarillo | `bg-yellow-100 text-yellow-800 border-yellow-200` |
| `PAID` | Pagado | Verde | `bg-green-100 text-green-800 border-green-200` |
| `FAILED` | Fallido | Rojo | `bg-red-100 text-red-800 border-red-200` |
| `REFUNDED` | Reembolsado | Púrpura | `bg-purple-100 text-purple-800 border-purple-200` |
| `CANCELLED` | Cancelado | Gris | `bg-gray-100 text-gray-800 border-gray-200` |

### Métodos de Pago (PaymentMethod)

| Método | Label | Color | CSS Class |
|--------|-------|-------|-----------|
| `MERCADOPAGO_CARD` | Tarjeta (MercadoPago) | Azul | `bg-blue-100 text-blue-800 border-blue-200` |
| `MERCADOPAGO_WALLET` | Wallet Digital | Púrpura | `bg-purple-100 text-purple-800 border-purple-200` |
| `BANK_TRANSFER` | Transferencia Bancaria | Teal | `bg-teal-100 text-teal-800 border-teal-200` |
| `CASH` | Efectivo | Verde | `bg-green-100 text-green-800 border-green-200` |
| `MANUAL` | Manual | Naranja | `bg-orange-100 text-orange-800 border-orange-200` |

### Uso de Helpers

El sistema proporciona helpers centralizados en `src/lib/utils/status-styles.ts`:

```tsx
import {
  getPaymentStatusStyle,
  getPaymentStatusLabel,
  getPaymentMethodStyle,
  getPaymentMethodLabel
} from '@/lib/utils/status-styles'

// Usar en componentes
<Badge className={getPaymentStatusStyle(payment.paymentStatus)}>
  {getPaymentStatusLabel(payment.paymentStatus)}
</Badge>

<Badge className={getPaymentMethodStyle(payment.paymentMethod)}>
  {getPaymentMethodLabel(payment.paymentMethod)}
</Badge>
```

## 🛡️ Seguridad

### Validación de Webhooks (Actualizado Diciembre 2024)

El sistema implementa **validación completa de firma** para todos los webhooks de MercadoPago:

1. **Validación de firma x-signature**: Verifica que el webhook realmente venga de MercadoPago
2. **Validación de timestamp**: Previene replay attacks (webhooks deben ser menores a 5 minutos)
3. **Validación de monto**: Verifica que el monto pagado coincida con el esperado (tolerancia: 0.01 ARS)
4. **Idempotencia**: No procesa pagos ya marcados como PAID (previene doble procesamiento)
5. **Búsqueda estricta**: Solo busca pagos por IDs únicos, sin fallbacks peligrosos

**IMPORTANTE**: En producción, la variable `MERCADOPAGO_WEBHOOK_SECRET` es OBLIGATORIA. En desarrollo, se permite continuar sin ella pero con warnings de seguridad.

### RBAC (Control de Acceso)

- **Crear preferencia de Mercado Pago**: Usuario dueño de la inscripción, organizador del torneo, o ADMIN
- **Confirmar pago manual**: Solo ADMIN o CLUB_ADMIN (organizador del torneo)
- **Ver historial de pagos**: Usuario autenticado con acceso a la inscripción
- **Webhook de MercadoPago**: Sin autenticación RBAC (validado por firma x-signature)

### Auditoría

Todas las operaciones de pago se registran en `PaymentLog`:
- Quién realizó la acción (usuario 'system' para webhooks automáticos)
- Cuándo se realizó
- IP y User Agent
- Datos anteriores y nuevos (para cambios)
- Metadata adicional

### Usuario SYSTEM

El sistema utiliza un usuario especial con ID `'system'` para logs de acciones automáticas como webhooks. Este usuario:
- No tiene contraseña (no puede autenticarse)
- Tiene rol ADMIN (solo para permisos de logging)
- Se crea automáticamente en el seed de la base de datos

## 🔍 Debugging

### Ver Logs de Webhook

Los webhooks de Mercado Pago se loguean en la consola:

```
📨 Webhook de Mercado Pago recibido: {...}
💳 Información del pago: {...}
✅ Pago actualizado: {...}
```

### Verificar Webhook

```bash
# GET endpoint de verificación
curl http://localhost:3000/api/webhooks/mercadopago
```

Respuesta:
```json
{
  "message": "Webhook de Mercado Pago funcionando",
  "timestamp": "2024-12-XX..."
}
```

### Ver Logs en Base de Datos

```sql
-- Ver todos los logs de pagos
SELECT * FROM payment_logs ORDER BY created_at DESC LIMIT 10;

-- Ver logs de un pago específico
SELECT * FROM payment_logs WHERE payment_id = 'payment-id-here';

-- Ver pagos confirmados manualmente
SELECT * FROM payment_logs WHERE action = 'PAYMENT_MANUALLY_CONFIRMED';
```

## 📝 Notas Importantes

1. **Webhook en Desarrollo**: En desarrollo local, el webhook no funcionará a menos que uses ngrok o similar para exponer tu localhost.

2. **Usuario System**: El webhook crea logs con `userId = 'system'`. El sistema crea automáticamente este usuario en el seed para mejor trazabilidad.

3. **Moneda**: El sistema está configurado para pesos argentinos (ARS). Para cambiar moneda, editar `PaymentService.createPaymentPreference()`.

4. **Ambiente**:
   - En desarrollo: usa `sandboxInitPoint` (testing)
   - En producción: usa `initPoint` (pagos reales)

5. **Seguridad del Webhook**: ✅ **IMPLEMENTADO** - El sistema valida firma x-signature y timestamp de todos los webhooks de MercadoPago.

## 🔐 Auditoría de Seguridad (Diciembre 2024)

### Vulnerabilidades Corregidas

El sistema de pagos fue sometido a una auditoría de seguridad completa. Se identificaron y corrigieron las siguientes vulnerabilidades:

#### 1. ✅ Webhook sin Validación de Firma (CRÍTICO)
**Problema**: Cualquiera podía enviar webhooks falsos para marcar pagos como aprobados.
**Solución**: Implementado `MercadoPagoValidationService` que valida firma x-signature y timestamp.
**Archivo**: `src/lib/services/mercadopago-validation-service.ts`

#### 2. ✅ Fallback Peligroso a PENDING (CRÍTICO)
**Problema**: Si había múltiples pagos PENDING, el webhook podía actualizar el pago incorrecto.
**Solución**: Removido el fallback. Ahora solo busca pagos por `mercadoPagoPaymentId` o `preferenceId`.
**Archivo**: `src/app/api/webhooks/mercadopago/route.ts:102-128`

#### 3. ✅ Sin Validación de Monto (ALTA)
**Problema**: El sistema aceptaba pagos sin verificar que el monto coincidiera.
**Solución**: Validación de monto con tolerancia de 0.01 ARS antes de aprobar pagos.
**Archivo**: `src/app/api/webhooks/mercadopago/route.ts:143-175`

#### 4. ✅ Race Condition (MEDIA)
**Problema**: Webhooks simultáneos podían procesar el mismo pago dos veces.
**Solución**: Check de idempotencia - no procesar pagos ya marcados como PAID.
**Archivo**: `src/app/api/webhooks/mercadopago/route.ts:130-138`

#### 5. ✅ Logs con Organizador en vez de Sistema (BAJA)
**Problema**: Los logs de webhook usaban el `organizerId` como actor, confundiendo la auditoría.
**Solución**: Creado usuario 'system' para logs de acciones automáticas.
**Archivo**: `prisma/seeds/index.ts:90-109`

### Configuración para Producción

Para habilitar todas las validaciones de seguridad en producción:

1. **Obtener Webhook Secret de MercadoPago**:
   - Ir a https://www.mercadopago.com.ar/developers
   - Tus integraciones → Tu aplicación → Webhooks
   - Copiar el "Secret key"

2. **Configurar Variable de Entorno**:
   ```bash
   MERCADOPAGO_WEBHOOK_SECRET="tu-secret-key-aqui"
   ```

3. **Ejecutar Seed para Crear Usuario System**:
   ```bash
   npm run db:seed
   ```

4. **Verificar Validaciones**:
   - En desarrollo: verás warnings si el secret no está configurado
   - En producción: el webhook rechazará peticiones sin firma válida (HTTP 401)

### Prevención de Confusión de Pagos

**¿Puede un pago aplicarse al usuario incorrecto?**

**NO** - Los pagos están vinculados por `external_reference` (registrationId) que es único por inscripción. Un pago NUNCA puede aplicarse a un usuario diferente.

**¿Puede confundirse entre múltiples pagos del mismo usuario?**

**NO (después de las correcciones)** - El sistema ahora busca pagos SOLO por IDs únicos:
- `mercadoPagoPaymentId` (único en DB)
- `mercadoPagoPreferenceId` (único por creación de preferencia)

Si un usuario crea múltiples pagos PENDING, cada uno tiene su propio `preferenceId` único que lo identifica correctamente.

## 🔮 Próximas Mejoras

- [x] ~~Validación de firma de webhook de Mercado Pago~~ ✅ **IMPLEMENTADO**
- [ ] Soporte para pagos parciales
- [ ] Reembolsos automáticos vía Mercado Pago
- [ ] Reportes de pagos
- [ ] Exportar historial de pagos (CSV/PDF)
- [ ] Recordatorios de pago por email
- [ ] Múltiples métodos de pago por inscripción
- [ ] QR de Mercado Pago para pagos presenciales

## 📚 Documentación Adicional

- [Documentación de Mercado Pago](https://www.mercadopago.com.ar/developers/es/docs)
- [SDK de Node.js](https://github.com/mercadopago/sdk-nodejs)
- [Testing con tarjetas de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards)
- [Webhooks de Mercado Pago](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks)
