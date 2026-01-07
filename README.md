# 🏓 PDLShot - Sistema de Gestión de Torneos de Pádel

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-green)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue)](https://www.postgresql.org/)

## 📋 Descripción

PDLShot es una aplicación web completa para la gestión integral de torneos de pádel. Sistema production-ready con autenticación, control de acceso basado en roles (RBAC), pagos integrados, y 6 formatos de torneo diferentes.

**Estado**: ✅ **97% completo** - 46 API endpoints (100% RBAC), 90+ componentes React, 30+ tablas de base de datos.

### 🎯 Características Principales

- ✅ **6 Formatos de Torneo**: Eliminación Simple/Doble, Round Robin, Fase de Grupos, Americano, Americano Social
- ✅ **Sistema RBAC Completo**: 4 roles (ADMIN, ORGANIZER, PLAYER, REFEREE) con permisos granulares
- ✅ **Pagos Integrados**: MercadoPago + pagos manuales con auditoría completa
- ✅ **Rankings Automáticos**: Cálculo configurable de puntos (100-5000 pts por torneo)
- ✅ **Auditoría Total**: 9 servicios de logging para trazabilidad completa
- ✅ **UI/UX Avanzado**: Ordenamiento dinámico, filtros, navegación clickeable en 8 módulos
- ✅ **Recuperación de Contraseña**: Sistema seguro con tokens y emails HTML

---

## 🚀 Quick Start

### Prerrequisitos
- Node.js 18+
- PostgreSQL 12+ (o Docker)
- npm/pnpm

### Instalación

```bash
# 1. Clonar repositorio
git clone <repository-url>
cd padelshot

# 2. Instalar dependencias
npm install

# 3. Configurar base de datos
docker-compose up -d  # O configurar PostgreSQL manualmente

# 4. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 5. Aplicar migraciones y seeds
npm run db:push
npm run db:seed

# 6. Iniciar servidor de desarrollo
npm run dev
```

### Variables de Entorno Requeridas

```bash
# Base de datos
DATABASE_URL="postgresql://postgres:password@localhost:5432/padelshot"

# Autenticación
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
HOSTNAME="0.0.0.0"

# MercadoPago (Pagos)
MERCADOPAGO_ACCESS_TOKEN="TEST-your-token"
MERCADOPAGO_PUBLIC_KEY="TEST-your-public-key"
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY="TEST-your-public-key"
MERCADOPAGO_WEBHOOK_SECRET="your-webhook-secret"  # Requerido en producción

# Resend (Emails)
RESEND_API_KEY="re_xxxxx"
RESEND_FROM_EMAIL="PadelShot <noreply@padelshot.app>"
```

### Credenciales de Test

```
Admin:      admin@padelshot.app / 123456
Organizer: clubadmin@padelshot.app / 123456
Player:     player@padelshot.app / 123456
```

---

## 📂 Stack Tecnológico

### Frontend
- **Next.js 16** (App Router + Turbopack)
- **React 19** (Server Components)
- **TypeScript 5** (strict mode)
- **Tailwind CSS 4** + shadcn/ui + Radix UI
- **React Hook Form 7** + Zod 4
- **Recharts 3** (gráficos)

### Backend
- **Next.js API Routes** (serverless)
- **Prisma 6 ORM** + PostgreSQL
- **NextAuth.js 4** (JWT + Credentials)
- **MercadoPago SDK 2.11** (pagos)
- **Resend 6.6** (emails)

### Seguridad
- **bcryptjs** (password hashing)
- **RBAC completo** (100% endpoints protegidos)
- **Rate limiting** (100 read/min, 30 write/min)
- **Webhook signature validation** (HMAC-SHA256)

---

## 🗄️ Base de Datos (30+ Tablas)

### Entidades Principales

- **Usuarios**: User, Player, Account, Session, PasswordResetToken
- **Clubes**: Club, Court
- **Torneos**: Tournament, TournamentCategory, TournamentZone, ZoneTeam
- **Competencia**: Registration, Team, Match, MatchSet, MatchGame
- **Rankings**: PlayerRanking, TournamentStats, Category
- **Americano Social**: AmericanoPool, AmericanoPoolPlayer, AmericanoPoolMatch
- **Auditoría**: 9 tablas de logs (*Log)
- **Pagos**: RegistrationPayment, PaymentLog

Ver [schema.prisma](prisma/schema.prisma) para modelo completo.

---

## 📚 Documentación Completa

### Guías de Desarrollo

- 📘 **[CLAUDE.md](CLAUDE.md)** - Quick Start para desarrolladores (comandos, patrones, troubleshooting)

### Sistemas Principales

- 🔐 **[RBAC_GUIA_DEFINITIVA.md](RBAC_GUIA_DEFINITIVA.md)** - Sistema de permisos completo (46 endpoints documentados)
- 📊 **[POINTS_CALCULATION.md](POINTS_CALCULATION.md)** - Sistema de puntos configurable (fórmulas + ejemplos)
- 💰 **[PAYMENT_SYSTEM.md](PAYMENT_SYSTEM.md)** - Integración MercadoPago + auditoría de seguridad
- 🏆 **[TOURNAMENT_FORMATS.md](TOURNAMENT_FORMATS.md)** - 6 formatos implementados (1,637 líneas)

### Funcionalidades Específicas

- 📝 **[LOGGING_SYSTEM.md](LOGGING_SYSTEM.md)** - 9 servicios de auditoría
- 🔑 **[PASSWORD_RECOVERY_SETUP.md](PASSWORD_RECOVERY_SETUP.md)** - Recuperación de contraseña segura

---

## ⚙️ Comandos Principales

```bash
# Desarrollo
npm run dev              # Dev server con Turbopack
npm run dev-select       # Selector de DB + dev server
npm run build            # Build para producción
npm run lint             # ESLint
npm run type-check       # TypeScript check

# Base de datos
npm run db:select        # Selector de DB (local/remoto)
npm run db:push          # Push schema (desarrollo)
npm run db:migrate       # Crear migración
npm run db:studio        # Prisma Studio
npm run db:reset         # Reset completo
npm run db:seed          # Cargar seeds
```

---

## 🏆 Funcionalidades Principales

### Sistema de Torneos (6 Formatos)

1. **Eliminación Simple** ✅ - Knockout clásico con byes automáticos
2. **Eliminación Doble** ✅ - Upper/Lower bracket con segundas oportunidades
3. **Round Robin** ✅ - Todos contra todos
4. **Fase de Grupos + Eliminación** ✅ - Grupos + knockout con clasificación automática
5. **Americano** ✅ - Parejas fijas, Circle Method rotation
6. **Americano Social** ✅ - Jugadores individuales, pools de 4, múltiples rondas
7. **Sistema Suizo** ⏳ - Pendiente

📄 Ver [TOURNAMENT_FORMATS.md](TOURNAMENT_FORMATS.md) para algoritmos detallados.

### Sistema de Puntos Configurable

- **Puntos base por torneo**: 100-5,000 pts (define importancia del torneo)
- **Cálculo multicapa**: Participación + Posición + Rendimiento + Multiplicadores
- **Ejemplos**:
  - Torneo Premium (1000 pts): Campeón → ~1,900 pts finales
  - Torneo Regional (500 pts): Campeón → ~995 pts finales
  - Torneo Local (250 pts): Campeón → ~359 pts finales

📄 Ver [POINTS_CALCULATION.md](POINTS_CALCULATION.md) para fórmulas y tablas completas.

### Sistema de Pagos Seguro 🔒

- **MercadoPago**: Tarjetas, wallets, transferencias
- **Pagos Manuales**: Efectivo, transferencia (solo ADMIN/ORGANIZER)
- **Seguridad 9/10**: Validación de firma HMAC-SHA256, timestamp, monto, idempotencia
- **Auditoría**: PaymentLogService con IP, User-Agent, trazabilidad total

📄 Ver [PAYMENT_SYSTEM.md](PAYMENT_SYSTEM.md) para configuración y auditoría de seguridad.

### Sistema RBAC (100% Cobertura)

- **4 Roles**: ADMIN, ORGANIZER, PLAYER, REFEREE
- **46 Rutas Protegidas**: 100% con RBAC implementado
- **9 Servicios de Logging**: Auditoría completa de todas las operaciones
- **Ownership Contextual**: Permisos basados en relaciones (userId, organizerId, etc.)

📄 Ver [RBAC_GUIA_DEFINITIVA.md](RBAC_GUIA_DEFINITIVA.md) para matriz de permisos completa.

---

## 🎯 Roadmap

### ✅ Fase 1 - Core (97% Completo)

- ✅ Autenticación y RBAC (100%)
- ✅ CRUD completo (100%)
- ✅ Sistema de inscripciones (100%)
- ✅ 6/7 formatos de torneo (86%)
- ✅ Sistema de partidos (100%)
- ✅ Rankings y puntos (100%)
- ✅ Pagos MercadoPago (100%)
- ✅ Auditoría completa (100%)

### ⏳ Fase 2 - Gestión Operativa

- ⏳ Sistema Suizo (7mo formato)
- ⏳ Calendario visual y programación
- ⏳ Notificaciones multi-canal
- ⏳ Reportes avanzados y analytics

### ⏳ Fase 3 - Avanzado

- ⏳ PWA para móviles
- ⏳ Funcionalidades sociales
- ⏳ Reservas inteligentes
- ⏳ Sistema de membresías

---

## 🧪 Testing

### Testing Manual

```bash
# Usuarios de prueba (creados por seeds)
Admin:      admin@padelshot.app / 123456
Organizer: clubadmin@padelshot.app / 123456
Player:     player@padelshot.app / 123456

# Tarjetas de prueba MercadoPago
Aprobada:   5031 7557 3453 0604 (Mastercard)
Rechazada:  4444 4444 4444 4444 (Visa)
CVV:        123
Nombre:     APRO (aprobar) / OTHE (rechazar)
```

---

## 🔧 Troubleshooting

### Error de Base de Datos

```bash
# Verificar conexión
npm run db:studio

# Reset si es necesario (desarrollo)
npm run db:reset
npm run db:seed
```

### Prisma Client Desincronizado

```bash
# Detener dev server (Ctrl+C)
npx prisma generate
npm run dev
```

### Build Errors

```bash
# Limpiar y reinstalar
rm -rf .next node_modules
npm install
npm run build
```

---

## 📊 Estadísticas del Proyecto

### Backend & API
- **46 rutas API** con RBAC completo (100%)
- **19 servicios** de negocio especializados
- **9 servicios de logging** con auditoría completa
- **30+ tablas** de base de datos con relaciones

### Frontend
- **90+ componentes** React 19 organizados por módulos
- **8 páginas principales** con UI/UX avanzado
- **Ordenamiento dinámico** en 27+ columnas
- **Filtros avanzados** en todos los módulos

### Sistema RBAC
- **4 roles** con permisos granulares
- **9 acciones** (CREATE, READ, UPDATE, DELETE, MANAGE, LIST, APPROVE, REJECT, DASHBOARD)
- **16 recursos** protegidos
- **0 rutas sin protección**

---

## 📝 Changelog Reciente

### Diciembre 2025
- ✅ Sistema de pagos MercadoPago + validación de firma HMAC-SHA256
- ✅ Recuperación de contraseña segura con tokens y emails HTML
- ✅ Sistema de puntos configurable por torneo (100-5000 pts)
- ✅ Americano Social con múltiples rondas (1-10)
- ✅ UI/UX avanzado: ordenamiento, filtros, navegación clickeable

### Octubre 2025
- ✅ Sistema de logs completo (9 servicios)
- ✅ Panel de administración con visualización de logs
- ✅ 6 formatos de torneo implementados
- ✅ RBAC 100% completo (46 endpoints)

Ver historial completo en commits de Git.

---

## 🤝 Contribución

### Workflow

1. Fork del proyecto
2. Crear feature branch (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'feat: descripción'`)
4. Push a branch (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

### Convenciones

- **Componentes**: PascalCase (`TournamentForm.tsx`)
- **Hooks**: camelCase con prefijo `use` (`useAuth.ts`)
- **API Routes**: kebab-case (`/api/tournaments/[id]/calculate-points`)

---

## 📞 Contacto y Soporte

- **GitHub Issues**: Para bugs y feature requests
- **Documentación**: Este README + docs específicos en `/`

---

## 📄 Licencia

[Especificar licencia]

---

**PDLShot** - Sistema completo de gestión de torneos de pádel desarrollado con las mejores prácticas y tecnologías modernas.

*Última actualización: Diciembre 2025*
