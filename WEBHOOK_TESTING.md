# 🔔 Guía de Testing de Webhooks con ngrok

Esta guía te ayudará a probar los webhooks de MercadoPago en tu entorno de desarrollo local.

## 📋 Prerequisitos

- ✅ ngrok instalado (`npm install -g ngrok`)
- ✅ Servidor de desarrollo corriendo (`npm run dev`)
- ✅ Cuenta de MercadoPago con credenciales de prueba configuradas

## 🚀 Paso 1: Iniciar ngrok

Abre una **nueva terminal** (mantén tu servidor de desarrollo corriendo en otra) y ejecuta:

```bash
ngrok http 3000
```

Deberías ver algo como:

```
ngrok

Session Status                online
Account                       Tu cuenta (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://xxxx-xx-xx-xx-xx.ngrok-free.app -> http://localhost:3000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

### 🔗 Copia la URL de Forwarding

La URL que dice `https://xxxx-xx-xx-xx-xx.ngrok-free.app` es tu URL pública temporal.

**IMPORTANTE**: Esta URL cambia cada vez que reinicias ngrok (en el plan gratuito).

## 🔧 Paso 2: Configurar el Webhook en MercadoPago

### Opción A: Portal de Desarrolladores (Recomendado)

1. Ve a https://www.mercadopago.com.ar/developers/panel
2. Selecciona tu aplicación
3. Ve a la sección **"Webhooks"** o **"Notificaciones"**
4. Haz clic en **"Configurar notificaciones"**
5. Ingresa la URL: `https://tu-url-de-ngrok.ngrok-free.app/api/webhooks/mercadopago`

   Ejemplo: `https://a1b2-123-45-67-89.ngrok-free.app/api/webhooks/mercadopago`

6. Selecciona los eventos:
   - ✅ `payment` (Pagos)
   - ✅ `merchant_order` (Órdenes - opcional)

7. Guarda la configuración

### Opción B: Usando la API de MercadoPago

```bash
curl -X POST \
  'https://api.mercadopago.com/v1/webhooks' \
  -H 'Authorization: Bearer TU_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://tu-url-de-ngrok.ngrok-free.app/api/webhooks/mercadopago",
    "events": [
      {
        "topic": "payment"
      }
    ]
  }'
```

## 🧪 Paso 3: Probar el Flujo Completo

### 1. Crear un Pago de Prueba

1. Inicia sesión como jugador en tu app
2. Ve a una inscripción pendiente de pago
3. Haz clic en **"Pagar con Mercado Pago"**
4. Serás redirigido al checkout de MercadoPago

### 2. Completar el Pago con Tarjeta de Prueba

Usa esta tarjeta de prueba:

```
Número: 5031 7557 3453 0604
CVV: 123
Vencimiento: 11/25
Titular: APRO
DNI: 12345678
```

### 3. Verificar el Webhook

Después de completar el pago, deberías ver en la **consola de tu servidor**:

```
📨 Webhook de Mercado Pago recibido: {
  action: 'payment.created',
  api_version: 'v1',
  data: { id: '1234567890' },
  ...
}
💳 Información del pago: {
  id: 1234567890,
  status: 'approved',
  ...
}
✅ Pago actualizado exitosamente
```

### 4. Verificar en la Base de Datos

El estado del pago debería cambiar automáticamente:
- `RegistrationPayment.paymentStatus` → `PAID`
- `Registration.registrationStatus` → `PAID`

## 🔍 Monitoreo en Tiempo Real

### ngrok Web Interface

Abre http://127.0.0.1:4040 en tu navegador para ver:
- ✅ Todas las peticiones HTTP que llegan a tu servidor
- ✅ Request/Response completos del webhook
- ✅ Tiempos de respuesta
- ✅ Errores si los hay

### Logs del Servidor

Mantén visible la consola donde corre `npm run dev` para ver:
- Logs del webhook entrante
- Estado del pago procesado
- Errores si ocurren

## ❌ Troubleshooting

### El webhook no llega

**Problema**: No ves el log "📨 Webhook de Mercado Pago recibido"

**Soluciones**:
1. Verifica que ngrok esté corriendo
2. Verifica que la URL del webhook esté configurada correctamente en MercadoPago
3. Verifica que la URL termine en `/api/webhooks/mercadopago`
4. Revisa el panel de ngrok (http://127.0.0.1:4040) para ver si llegan peticiones

### Error 404 en el webhook

**Problema**: MercadoPago reporta error 404

**Soluciones**:
1. Verifica que tu servidor de desarrollo esté corriendo
2. Verifica que la ruta del webhook exista: `src/app/api/webhooks/mercadopago/route.ts`
3. Verifica la URL en el panel de ngrok

### El pago se crea pero no se actualiza

**Problema**: El pago queda en PENDING después de pagar

**Soluciones**:
1. Verifica que el webhook esté llegando (revisa logs)
2. Verifica que no haya errores en el procesamiento del webhook
3. Verifica que el `mercadoPagoPaymentId` se esté guardando correctamente

### Error de CORS

**Problema**: Error de CORS en el webhook

**Solución**: Los webhooks no tienen problemas de CORS porque son llamadas servidor-a-servidor, no desde el navegador.

## 🎯 Endpoint de Verificación

Puedes verificar que tu webhook está funcionando haciendo una petición GET:

```bash
curl https://tu-url-de-ngrok.ngrok-free.app/api/webhooks/mercadopago
```

Deberías recibir:
```json
{
  "message": "Webhook de Mercado Pago funcionando",
  "timestamp": "2024-12-XX..."
}
```

## 📝 Notas Importantes

### Plan Gratuito de ngrok

- ✅ URL cambia cada vez que reinicias ngrok
- ✅ Máximo 40 conexiones/minuto
- ✅ Suficiente para desarrollo y testing

### Plan de Pago de ngrok (Opcional)

Si necesitas:
- URL fija que no cambie
- Más conexiones simultáneas
- Dominios personalizados

Puedes actualizar en https://ngrok.com/pricing

### Credenciales de Producción

**IMPORTANTE**:
- Las credenciales que tienes configuradas son de **PRODUCCIÓN** (`APP_USR-...`)
- Para testing, deberías usar credenciales de **TEST** (`TEST-...`)
- Obtén credenciales de test en: https://www.mercadopago.com.ar/developers/panel/app/testing

Para cambiar a modo test:
1. Ve al panel de desarrolladores de MercadoPago
2. Copia las credenciales de TEST
3. Actualiza tu `.env`:
```bash
MERCADOPAGO_ACCESS_TOKEN="TEST-xxxx..."
MERCADOPAGO_PUBLIC_KEY="TEST-xxxx..."
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY="TEST-xxxx..."
```

## 🔄 Flujo Completo del Webhook

```
1. Usuario completa pago en MercadoPago
   ↓
2. MercadoPago procesa el pago
   ↓
3. MercadoPago envía webhook a tu servidor (vía ngrok)
   ↓
4. Tu servidor recibe el webhook en /api/webhooks/mercadopago
   ↓
5. El webhook consulta el estado del pago a MercadoPago
   ↓
6. Se actualiza RegistrationPayment.paymentStatus a PAID
   ↓
7. Se actualiza Registration.registrationStatus a PAID
   ↓
8. Se registra en PaymentLog
   ↓
9. Usuario es redirigido a la página de éxito
```

## 🆘 Soporte

Si tienes problemas:
1. Revisa los logs de la consola del servidor
2. Revisa el panel de ngrok (http://127.0.0.1:4040)
3. Revisa la documentación de MercadoPago: https://www.mercadopago.com.ar/developers/es/docs

## ✅ Checklist de Testing

- [ ] ngrok instalado y corriendo
- [ ] Servidor de desarrollo corriendo
- [ ] URL de webhook configurada en MercadoPago
- [ ] Pago de prueba creado exitosamente
- [ ] Webhook recibido y procesado
- [ ] Estado del pago actualizado a PAID
- [ ] Estado de la inscripción actualizado a PAID
- [ ] Log registrado en PaymentLog
- [ ] Usuario redirigido correctamente

---

**Última actualización**: Diciembre 2024
