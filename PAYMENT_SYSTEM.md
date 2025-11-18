# Sistema de Pagos - PadApp

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
admin@padapp.com / 123456

# Club Admin (puede confirmar pagos de sus torneos)
clubadmin@padapp.com / 123456

# Player (solo puede pagar con Mercado Pago)
player@padapp.com / 123456
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

| Estado | Descripción | Color |
|--------|-------------|-------|
| `PENDING` | Pago iniciado pero no confirmado | Amarillo |
| `PAID` | Pago completado exitosamente | Verde |
| `FAILED` | Pago rechazado | Rojo |
| `CANCELLED` | Pago cancelado por el usuario | Gris |
| `REFUNDED` | Pago reembolsado | Naranja |

## 🛡️ Seguridad

### RBAC (Control de Acceso)

- **Crear preferencia de Mercado Pago**: Usuario dueño de la inscripción, organizador del torneo, o ADMIN
- **Confirmar pago manual**: Solo ADMIN o CLUB_ADMIN (organizador del torneo)
- **Ver historial de pagos**: Usuario autenticado con acceso a la inscripción

### Auditoría

Todas las operaciones de pago se registran en `PaymentLog`:
- Quién realizó la acción
- Cuándo se realizó
- IP y User Agent
- Datos anteriores y nuevos (para cambios)
- Metadata adicional

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

2. **Usuario System**: El webhook crea logs con `userId = 'system'`. Considera crear un usuario "system" en la DB para mejor trazabilidad.

3. **Moneda**: El sistema está configurado para pesos argentinos (ARS). Para cambiar moneda, editar `PaymentService.createPaymentPreference()`.

4. **Ambiente**:
   - En desarrollo: usa `sandboxInitPoint` (testing)
   - En producción: usa `initPoint` (pagos reales)

5. **Seguridad del Webhook**: El endpoint de webhook NO tiene autenticación RBAC porque es llamado por Mercado Pago. Considerar implementar validación de firma de Mercado Pago para mayor seguridad.

## 🔮 Próximas Mejoras

- [ ] Validación de firma de webhook de Mercado Pago
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
