# 📧 Guía de Templates de Email

Esta carpeta contiene los templates HTML para los emails de PadelShot.

## 📁 Archivos de Templates

| Archivo | Descripción | Usado en |
|---------|-------------|----------|
| `password-reset.ts` | Email de recuperación de contraseña | `/api/auth/forgot-password` |
| `password-changed.ts` | Email de confirmación de cambio | `/api/auth/reset-password` |

---

## ✏️ Cómo Editar un Template

### 1. Editar el Contenido HTML

Abre el archivo del template que quieres modificar (ej: `password-reset.ts`):

```typescript
// src/lib/email-templates/password-reset.ts
export function getPasswordResetEmailTemplate(params: PasswordResetTemplateParams): string {
  const { name, resetUrl, expiresInMinutes } = params

  return `
<!DOCTYPE html>
<html lang="es">
  <!-- Aquí puedes editar el HTML -->
  <body>
    <h1>Tu nuevo diseño</h1>
  </body>
</html>
  `
}
```

### 2. Personalizar Colores

Los colores principales están en línea (inline styles). Puedes cambiarlos:

```html
<!-- Color del header (gradiente azul/morado) -->
<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">

<!-- Cambiar por tu marca: -->
<div style="background: linear-gradient(135deg, #YOUR_COLOR_1 0%, #YOUR_COLOR_2 100%);">
```

**Colores actuales**:
- **Header**: `#667eea` → `#764ba2` (azul/morado)
- **Success**: `#28a745` (verde)
- **Warning**: `#ffc107` (amarillo)
- **Danger**: `#dc3545` (rojo)

### 3. Cambiar el Logo

Reemplaza el emoji por tu logo:

```html
<!-- Actual (emoji) -->
<h1 style="color: white; margin: 0; font-size: 28px;">🎾 PadelShot</h1>

<!-- Con imagen -->
<img src="https://tudominio.com/logo.png" alt="PadelShot" style="height: 50px;" />
```

### 4. Modificar Textos

Edita directamente los párrafos HTML:

```html
<p>Hola <strong>${name}</strong>,</p>
<p>Recibimos una solicitud para restablecer tu contraseña.</p>

<!-- Cambiar por: -->
<p>¡Hola <strong>${name}</strong>! 👋</p>
<p>Vimos que olvidaste tu contraseña. ¡No te preocupes!</p>
```

### 5. Personalizar Botones

Cambia el texto y estilo del botón CTA:

```html
<!-- Actual -->
<a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); ...">
  Restablecer Contraseña
</a>

<!-- Personalizado -->
<a href="${resetUrl}" style="background: #YOUR_BRAND_COLOR; ...">
  Cambiar mi Contraseña
</a>
```

---

## 🎨 Ejemplos de Personalización

### Ejemplo 1: Cambiar Colores de Marca

```typescript
// password-reset.ts (líneas 21-23)
<div style="background: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
  <h1 style="color: white; margin: 0; font-size: 28px;">⚡ TuMarca</h1>
</div>
```

### Ejemplo 2: Agregar Logo

```typescript
<div style="background: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
  <img src="https://padelshot.app/logo.png" alt="PadelShot" style="height: 60px;" />
</div>
```

### Ejemplo 3: Cambiar Tono de Mensaje

```html
<!-- Formal -->
<p>Estimado/a <strong>${name}</strong>,</p>
<p>Hemos recibido su solicitud de restablecimiento de contraseña.</p>

<!-- Casual -->
<p>¡Hola <strong>${name}</strong>! 👋</p>
<p>Vimos que necesitas cambiar tu contraseña. ¡Vamos a arreglarlo!</p>
```

---

## 🧪 Probar tus Cambios

Después de editar un template:

1. **Guarda el archivo** (los cambios se aplican inmediatamente)
2. **Solicita un nuevo email** de prueba:
   ```bash
   # Ve a http://localhost:3000/auth/forgot-password
   # Ingresa tu email de prueba
   ```
3. **Revisa el inbox** y verifica el nuevo diseño

---

## 🎯 Variables Disponibles

### Template de Password Reset

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `name` | Nombre del usuario | "Juan Pérez" |
| `resetUrl` | URL única de reset | "http://localhost:3000/auth/reset-password?token=abc123..." |
| `expiresInMinutes` | Minutos de validez | 60 |

### Template de Password Changed

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `name` | Nombre del usuario | "Juan Pérez" |

---

## 📱 Responsive Design

Los templates ya son **responsive** por defecto:

```html
<body style="max-width: 600px; margin: 0 auto; padding: 20px;">
  <!-- El email se adapta a móviles automáticamente -->
</body>
```

---

## ⚡ Mejores Prácticas

1. **Usa inline styles**: Los emails requieren CSS inline (no hojas externas)
2. **Prueba en múltiples clientes**: Gmail, Outlook, Apple Mail, móvil
3. **Mantén el HTML simple**: Evita JavaScript y CSS complejo
4. **Incluye texto alternativo**: Siempre agrega fallback text si las imágenes no cargan
5. **Respeta el ancho máximo**: 600px es el estándar

---

## 🚀 Herramientas Recomendadas

Si quieres diseños más avanzados, considera usar:

- **[React Email](https://react.email)**: Templates con React components
- **[MJML](https://mjml.io)**: Framework para emails responsive
- **[Maizzle](https://maizzle.com)**: Tailwind CSS para emails
- **[Litmus](https://litmus.com)**: Testing en múltiples clientes

---

## 📝 Notas

- Los cambios en los templates se aplican **inmediatamente** (no requiere restart del servidor)
- Los emails se envían desde: `RESEND_FROM_EMAIL` (configurado en `.env`)
- Para testing local, usa el dominio de prueba de Resend: `onboarding@resend.dev`

---

**¿Dudas?** Consulta la documentación de [Resend](https://resend.com/docs) para más detalles sobre emails HTML.
