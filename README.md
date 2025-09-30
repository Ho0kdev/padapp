# 🏓 PadApp - Sistema de Gestión de Torneos de Pádel

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.16.2-green)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue)](https://www.postgresql.org/)

## 📋 Descripción del Proyecto

PadApp es una aplicación web completa para la gestión integral de torneos de pádel. Desarrollada con tecnologías modernas, permite administrar torneos, jugadores, clubes, rankings y mucho más de manera eficiente y profesional.

### 🎯 Objetivos Principales
- **Gestión Completa de Torneos**: Crear, administrar y seguir torneos de pádel
- **Sistema de Rankings**: Cálculo automático de puntos y rankings por categorías
- **Administración de Clubes**: Gestión de clubes, canchas y recursos
- **Experiencia de Usuario Optimizada**: Interfaz moderna y responsiva
- **Escalabilidad**: Arquitectura preparada para crecer

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico

#### Frontend
- **Next.js 15** - Framework React con App Router
- **React 19** - Biblioteca para interfaces de usuario
- **TypeScript** - Tipado estático para JavaScript
- **Tailwind CSS** - Framework de CSS utilitario
- **shadcn/ui** - Componentes de UI modernos
- **Radix UI** - Componentes accesibles y personalizables
- **Recharts** - Gráficos y visualizaciones
- **Lucide React** - Iconografía

#### Backend & Base de Datos
- **Next.js API Routes** - Backend serverless
- **Prisma ORM** - Modelado y acceso a base de datos
- **PostgreSQL** - Base de datos relacional
- **NextAuth.js** - Autenticación completa

#### Estado y Validaciones
- **Zustand** - Gestión de estado global
- **React Hook Form** - Manejo de formularios
- **Zod** - Validación de esquemas
- **date-fns** - Manipulación de fechas

#### Herramientas de Desarrollo
- **ESLint** - Linting de código
- **Prettier** - Formateo automático
- **TypeScript Compiler** - Verificación de tipos

## 📂 Estructura del Proyecto

```
padapp/
├── .env                          # Variables de entorno
├── .env.example                  # Ejemplo de configuración
├── docker-compose.yml           # Docker para PostgreSQL local
├── package.json                 # Dependencias y scripts
├── prisma/                      # Configuración de base de datos
│   ├── schema.prisma            # Esquema de base de datos
│   ├── migrations/              # Migraciones
│   └── seeds/                   # Datos de prueba
│       ├── index.ts             # Seeders principales
│       └── seed.sql             # SQL de inicialización
├── scripts/                     # Scripts utilitarios
│   └── database-selector.js     # Selector de base de datos
├── src/                         # Código fuente principal
│   ├── app/                     # App Router (Next.js 15)
│   │   ├── auth/                # Páginas de autenticación
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── dashboard/           # Panel administrativo
│   │   │   ├── admin/           # Administración del sistema
│   │   │   ├── categories/      # Gestión de categorías
│   │   │   ├── clubs/           # Gestión de clubes
│   │   │   ├── rankings/        # Rankings y puntuaciones
│   │   │   ├── tournaments/     # Gestión de torneos
│   │   │   └── users/           # Gestión de usuarios
│   │   └── api/                 # API Routes
│   │       ├── auth/            # Endpoints de autenticación
│   │       ├── tournaments/     # API de torneos
│   │       ├── clubs/           # API de clubes
│   │       ├── categories/      # API de categorías
│   │       ├── rankings/        # API de rankings
│   │       └── users/           # API de usuarios
│   ├── components/              # Componentes reutilizables
│   │   ├── admin/               # Componentes administrativos
│   │   ├── auth/                # Componentes de autenticación
│   │   ├── categories/          # Componentes de categorías
│   │   ├── clubs/               # Componentes de clubes
│   │   ├── courts/              # Componentes de canchas
│   │   ├── dashboard/           # Componentes del dashboard
│   │   ├── layout/              # Componentes de layout
│   │   ├── rankings/            # Componentes de rankings
│   │   ├── tournaments/         # Componentes de torneos
│   │   ├── users/               # Componentes de usuarios
│   │   └── ui/                  # Componentes base de UI
│   ├── hooks/                   # Custom hooks
│   ├── lib/                     # Utilidades y servicios
│   │   ├── services/            # Servicios de negocio
│   │   ├── validations/         # Esquemas de validación
│   │   ├── auth.ts              # Configuración de autenticación
│   │   ├── prisma.ts            # Cliente de Prisma
│   │   └── utils.ts             # Utilidades generales
│   └── types/                   # Definiciones de tipos TypeScript
└── public/                      # Archivos estáticos
```

## 🗄️ Modelo de Base de Datos

### Entidades Principales

#### 👤 **Usuarios y Autenticación**
- **User**: Usuarios del sistema con roles (ADMIN, CLUB_ADMIN, PLAYER, REFEREE)
- **Player**: Perfil extendido de jugadores con estadísticas
- **Account/Session**: Manejo de sesiones con NextAuth.js

#### 🏟️ **Clubes y Canchas**
- **Club**: Información de clubes de pádel
- **Court**: Canchas con características específicas (superficie, iluminación, etc.)

#### 🏆 **Torneos y Competiciones**
- **Tournament**: Torneos con múltiples tipos (Eliminación, Round Robin, etc.)
- **TournamentCategory**: Categorías por torneo
- **Team**: Equipos de jugadores inscritos
- **Match**: Partidos con sistema completo de sets y games

#### 🏅 **Rankings y Puntuaciones**
- **PlayerRanking**: Rankings anuales por categoría
- **TournamentStats**: Estadísticas individuales por torneo
- **Category**: Categorías de competencia

#### 📊 **Sistema de Logs**
- **TournamentLog, ClubLog, CourtLog, CategoryLog, RankingLog**: Auditoría completa

### Características Especiales
- **Cálculo Automático de Puntos**: Sistema complejo basado en posición, victorias y multiplicadores
- **Múltiples Formatos de Torneo**: Single/Double Elimination, Round Robin, Swiss, etc.
- **Gestión de Pagos**: Sistema de pagos por equipos
- **Notificaciones**: Sistema de notificaciones en tiempo real
- **Logs de Auditoría**: Seguimiento completo de todas las acciones

## 🚀 Funcionalidades Implementadas

### ✅ **Sistema de Autenticación y RBAC Completo**
- Login y registro con validación
- Autenticación con NextAuth.js + JWT
- **RBAC (Role-Based Access Control)** implementado
- 4 Roles: ADMIN, CLUB_ADMIN, PLAYER, REFEREE
- Sistema de permisos granular (Actions + Resources)
- Auditoría completa con `AuditLogger`
- Rutas protegidas con middleware
- Gestión de sesiones segura
- 📄 [Documentación RBAC completa](RBAC_GUIA_DEFINITIVA.md)

### ✅ **Dashboard Administrativo**
- Panel principal con estadísticas en tiempo real
- Actividad reciente de torneos
- Métricas de usuarios y clubes activos
- Componentes modulares y reutilizables

### ✅ **Gestión de Torneos**
- **CRUD Completo**: Crear, editar, eliminar torneos
- **Múltiples Formatos**:
  - Single Elimination (Eliminación Simple)
  - Double Elimination (Eliminación Doble)
  - Round Robin (Todos contra Todos)
  - Swiss System
  - Group Stage + Elimination
  - Americano
- **Estados de Torneo**: Draft → Published → Registration → In Progress → Completed
- **Configuración Avanzada**:
  - Fechas de registro y torneo
  - Número de participantes (min/max)
  - Tarifas de inscripción
  - Premio en metálico
  - Reglas de sets y games
  - Golden Point opcional

### ✅ **Sistema de Puntos Automático**
- **Cálculo Inteligente** basado en:
  - **Puntos Base**: 50 puntos por participación
  - **Puntos por Posición**: 1000 pts (1°), 700 pts (2°), 500 pts (3°), etc.
  - **Bonus por Rendimiento**: 25 pts por victoria, 5 pts por set ganado
  - **Multiplicadores Dinámicos**:
    - Por tipo de torneo (1.0x - 1.4x)
    - Por número de participantes (1.0x - 1.5x)
- **API Endpoint**: `POST /api/tournaments/{id}/calculate-points`
- **Actualización Automática**: Rankings actualizados al completar torneos
- **Transparencia Total**: Logs detallados de cada cálculo

### ✅ **Gestión de Clubes y Canchas**
- **CRUD de Clubes**: Información completa, ubicación, contacto
- **Gestión de Canchas**:
  - Características técnicas (superficie, iluminación, techo)
  - Estados (Disponible, Mantenimiento, Reservado)
  - Tarifas por hora
  - Notas y observaciones
- **Logs de Actividad**: Seguimiento de cambios

### ✅ **Sistema de Categorías**
- **Tipos de Categoría**:
  - Por Edad (Age)
  - Por Habilidad (Skill)
  - Por Ranking (Ranking)
  - Por Género (Gender)
  - Mixtas (Mixed)
- **Restricciones Configurables**: Edad, género, puntos de ranking
- **Estados**: Activo/Inactivo

### ✅ **Gestión de Usuarios**
- **Perfiles Completos**: Información personal, contacto de emergencia
- **Roles y Permisos**: Sistema granular de accesos
- **Estados**: Activo, Inactivo, Suspendido
- **Asociación con Jugadores**: Perfil extendido para competidores

### ✅ **Sistema de Rankings**
- **Rankings Anuales**: Puntuaciones por temporada
- **Múltiples Categorías**: Rankings independientes por categoría
- **Actualización Automática**: Se actualizan tras completar torneos
- **Histórico**: Mantiene registro de todas las temporadas
- **API de Temporadas**: `/api/rankings/seasons` para obtener años disponibles

### ✅ **Panel de Administración**
- **Dashboard de Torneos**: Estadísticas y métricas globales
- **Logs del Sistema**: Auditoría completa de acciones
- **Herramientas de Admin**: Solo para usuarios ADMIN
- **Monitoreo en Tiempo Real**: Estado de torneos y actividad

### ✅ **Sistema de Logs y Auditoría**
- **Logs Granulares**: Por cada entidad del sistema
- **Información Detallada**:
  - Acción realizada
  - Usuario responsable
  - Timestamp exacto
  - Datos anteriores y nuevos (oldData/newData)
  - IP y User Agent
  - Metadata adicional
- **Tipos de Logs**:
  - Torneos (creación, actualización, cambios de estado)
  - Clubes y Canchas
  - Categorías
  - Rankings y Puntos
  - Acciones de Usuario

### ✅ **Utilidades y Herramientas**
- **Selector de Base de Datos**: Script para alternar entre local/remoto
- **Seeds Completos**: Datos de prueba realistas
- **Scripts de Desarrollo**: Comandos optimizados
- **Variables de Entorno**: Configuración flexible

### ✅ **Sistema de Inscripciones**
- **CRUD Completo**: Crear, listar y gestionar inscripciones
- **Validación Anti-Duplicados**: Un jugador solo puede estar en un equipo por categoría
- **Endpoint de Verificación**: `/api/registrations/check-players` para optimización UX
- **Filtrado Inteligente**: Players ya inscritos no aparecen en selectores
- **Validación de Fechas**: Período de inscripción incluye último día completo
- **Filtros Avanzados**: Por torneo, categoría, estado y jugador
- **Lista de Espera**: Sistema de waitlist cuando se alcanza límite de equipos
- **Reglas de Negocio**: Un jugador puede inscribirse en múltiples categorías, pero solo un equipo por categoría
- **Protección RBAC**: Permisos granulares por rol

## 📋 Funcionalidades Pendientes por Desarrollar

### 🔶 **Prioridad Alta - Próximas Implementaciones**

#### 1. **Confirmación de Pagos**
- Integración con pasarelas de pago
- Confirmación manual de pagos
- Notificaciones de estado de pago

#### 2. **Gestión de Brackets/Llaves**
- Visualización gráfica de eliminatorias
- Generación automática de enfrentamientos
- Progresión automática de ganadores
- Brackets editables manualmente
- Soporte para todos los formatos de torneo

#### 3. **Sistema de Partidos**
- Carga de resultados en tiempo real
- Seguimiento set por set
- Validación de puntuaciones
- Historial completo de partidos
- Estadísticas automáticas

#### 4. **Programación y Calendario**
- Asignación automática de canchas
- Calendario de partidos
- Gestión de horarios
- Conflictos de programación
- Notificaciones de horarios

### 🔷 **Prioridad Media - Mejoras del Sistema**

#### 5. **Sistema de Pagos**
- Integración con pasarelas de pago
- Gestión de reembolsos
- Facturación automática
- Reportes financieros
- Control de pagos pendientes

#### 6. **Mejoras en Rankings**
- Rankings históricos detallados
- Comparación entre temporadas
- Rankings por región/club
- Exportación de datos
- Gráficos de evolución

#### 7. **Sistema de Notificaciones**
- Notificaciones push
- Emails automáticos
- SMS (opcional)
- Notificaciones personalizables
- Centro de notificaciones

#### 8. **Reportes y Estadísticas**
- Reportes por torneo
- Estadísticas de jugadores
- Análisis de rendimiento
- Exportación a PDF/Excel
- Dashboards personalizados

### 🔸 **Funcionalidades Avanzadas - Futuro**

#### 9. **Aplicación Móvil**
- PWA (Progressive Web App)
- App nativa (React Native)
- Sincronización offline
- Notificaciones push nativas
- Cámara para fotos de resultados

#### 10. **Integraciones Externas**
- APIs de federaciones
- Integración con otros sistemas
- Importación/Exportación de datos
- APIs públicas para desarrolladores
- Webhooks para eventos

#### 11. **Funcionalidades Sociales**
- Perfiles públicos de jugadores
- Comentarios y reviews
- Galería de fotos
- Sharing en redes sociales
- Foros de discusión

#### 12. **Optimizaciones y Rendimiento**
- Cache avanzado
- Optimización de consultas
- CDN para imágenes
- Lazy loading
- Server-side rendering optimizado

## 🔧 Configuración del Entorno de Desarrollo

### Prerrequisitos
- **Node.js** 18+ y npm/yarn
- **PostgreSQL** 12+ (local o remoto)
- **Docker** (opcional, para PostgreSQL local)

### Instalación Paso a Paso

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd padapp
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar base de datos**
```bash
# Usar PostgreSQL con Docker (recomendado)
docker-compose up -d

# O configurar manualmente PostgreSQL y actualizar .env
```

4. **Configurar variables de entorno**
```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Usar el selector de base de datos
npm run db:select

# O editar .env manualmente
DATABASE_URL="postgresql://postgres:padapp123@localhost:5432/padapp"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="tu-secret-key-aqui"
```

5. **Ejecutar migraciones y seeds**
```bash
npm run db:push
npm run db:seed
```

6. **Iniciar el servidor de desarrollo**
```bash
npm run dev
```

### Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Servidor de desarrollo con Turbopack
npm run build           # Build para producción
npm run start           # Servidor de producción
npm run lint            # Verificar linting
npm run type-check      # Verificar tipos TypeScript

# Base de datos
npm run db:generate     # Generar cliente Prisma
npm run db:push         # Aplicar cambios al esquema
npm run db:migrate      # Crear y aplicar migraciones
npm run db:deploy       # Deploy de migraciones (producción)
npm run db:studio       # Abrir Prisma Studio
npm run db:reset        # Resetear base de datos
npm run db:seed         # Ejecutar seeds

# Utilidades de desarrollo
npm run db:select       # Selector de base de datos (local/remoto)
npm run db:seed-select  # Seleccionar DB y ejecutar seeds
npm run dev-select      # Seleccionar DB y ejecutar dev
npm run format          # Formatear código
npm run format:check    # Verificar formato
```

### Configuración de Base de Datos

El proyecto soporta dos configuraciones de base de datos:

#### Opción 1: PostgreSQL Local con Docker
```bash
# Iniciar PostgreSQL con Docker Compose
docker-compose up -d

# Usar selector automático
npm run db:select
# Seleccionar opción 1 (Local)
```

#### Opción 2: PostgreSQL Remoto
```bash
# Configurar en .env
DATABASE_URL="postgresql://user:password@host:port/database"

# O usar selector automático
npm run db:select
# Seleccionar opción 2 (Remoto)
```

### Datos de Prueba

Una vez configurada la base de datos, puedes poblarla con datos de prueba:

```bash
npm run db:seed
```

**Credenciales de administrador por defecto:**
- Email: `admin@padapp.com`
- Contraseña: `123456`

Los seeds incluyen:
- Usuarios administradores y jugadores
- Clubes y canchas de ejemplo
- Categorías por edad y habilidad
- Torneo de ejemplo con equipos inscritos
- Rankings iniciales

## 📊 Sistema de Puntos - Guía Detallada

### Cómo Funciona el Cálculo de Puntos

El sistema otorga puntos basándose en **4 factores principales**:

#### 1. **Puntos Base por Participación**
- **50 puntos** automáticos por participar en cualquier torneo
- Se otorgan solo por inscribirse y jugar

#### 2. **Puntos por Posición Final**
| Posición | Puntos | Descripción |
|----------|--------|-------------|
| 🥇 1er Lugar | 1,000 pts | Campeón del torneo |
| 🥈 2do Lugar | 700 pts | Subcampeón |
| 🥉 3er Lugar | 500 pts | Tercer puesto |
| 4to Lugar | 400 pts | Cuarto puesto |
| 5to-8vo | 300 pts | Cuartos de final |
| 9no-16vo | 200 pts | Octavos de final |
| 17+ | 100 pts | Primera ronda |

#### 3. **Puntos por Rendimiento**
- **+25 puntos** por cada partida ganada
- **+5 puntos** por cada set ganado
- Sin límite de puntos adicionales

#### 4. **Multiplicadores**

**Por Tipo de Torneo:**
- Eliminación Doble: ×1.3
- Eliminación Simple: ×1.2
- Fase de Grupos + Eliminación: ×1.4
- Round Robin: ×1.1
- Suizo: ×1.1
- Americano: ×1.0

**Por Número de Participantes:**
- 32+ jugadores: ×1.5
- 16-31 jugadores: ×1.3
- 8-15 jugadores: ×1.1
- Menos de 8: ×1.0

### Fórmula Completa
```
PUNTOS FINALES = [
    (PARTICIPACIÓN + POSICIÓN + VICTORIAS + SETS)
    × MULTIPLICADOR_TORNEO
    × MULTIPLICADOR_PARTICIPANTES
] redondeado
```

### Ejemplo Práctico
**Jugador**: Campeón de torneo
**Torneo**: Eliminación Simple, 24 jugadores
**Resultado**: 1er lugar, 5 victorias, 10 sets ganados

**Cálculo**:
1. Participación: 50 pts
2. Posición (1°): 1,000 pts
3. Victorias: 5 × 25 = 125 pts
4. Sets: 10 × 5 = 50 pts
5. **Subtotal**: 1,225 pts

**Multiplicadores**:
6. Eliminación Simple: ×1.2
7. 16-31 jugadores: ×1.3
8. **Multiplicador total**: 1.2 × 1.3 = 1.56

**PUNTOS FINALES**: 1,225 × 1.56 = **1,911 puntos**

### Uso del Sistema

#### Para Administradores
```bash
# Completar torneo y calcular puntos automáticamente
POST /api/tournaments/{id}/calculate-points

# Verificar logs de cálculo
GET /api/admin/logs
```

#### Rankings Automáticos
- Los puntos se suman por categoría durante todo el año
- Rankings actualizados automáticamente tras cada torneo
- Histórico completo por temporadas

## 🔒 Sistema de Autenticación y RBAC (Role-Based Access Control)

PadApp implementa un sistema completo de control de acceso basado en roles con permisos granulares, auditoría y validaciones de seguridad en todos los niveles.

### 🎭 Roles de Usuario

#### 🔴 **ADMIN (Administrador del Sistema)**
**Acceso Total** - Puede realizar cualquier acción en el sistema
- Gestión completa de usuarios y roles
- Crear, editar y eliminar cualquier recurso
- Acceso a logs de auditoría y sistema
- Cálculo manual de puntos y rankings
- Configuración global del sistema
- Gestión de todos los clubes y torneos

#### 🟡 **CLUB_ADMIN (Administrador de Club)**
**Acceso a Recursos del Club** - Gestión limitada a su club
- Crear y gestionar torneos en su club
- Administrar canchas y recursos del club
- Ver inscripciones de torneos de su club
- Ver estadísticas y reportes del club
- Gestionar categorías disponibles
- **NO puede**: Acceder a otros clubes, modificar usuarios, ver logs del sistema

#### 🟢 **PLAYER (Jugador)**
**Acceso Personal** - Solo sus datos y funcionalidades públicas
- Inscribirse en torneos disponibles
- Ver sus propias inscripciones y equipos
- Ver sus estadísticas y rankings
- Actualizar su perfil personal
- Ver historial de partidos jugados
- **NO puede**: Ver otras inscripciones, modificar torneos, acceder a admin

#### 🔵 **REFEREE (Árbitro)**
**Acceso a Partidos** - Gestión de resultados y arbitraje
- Cargar resultados de partidos
- Gestionar partidos asignados
- Ver detalles de equipos y jugadores
- Acceso a herramientas de arbitraje
- **NO puede**: Modificar torneos, gestionar inscripciones

### 🛡️ Sistema de Permisos (RBAC)

El sistema RBAC se basa en **Actions** (acciones) y **Resources** (recursos):

#### Actions (Acciones)
```typescript
enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage'
}
```

#### Resources (Recursos)
```typescript
enum Resource {
  TOURNAMENT = 'tournament',
  CLUB = 'club',
  USER = 'user',
  CATEGORY = 'category',
  RANKING = 'ranking',
  REGISTRATION = 'registration',
  MATCH = 'match',
  PAYMENT = 'payment',
  LOG = 'log'
}
```

#### Matriz de Permisos

| Recurso | ADMIN | CLUB_ADMIN | PLAYER | REFEREE |
|---------|-------|------------|--------|---------|
| Torneos | ✅ MANAGE | ✅ MANAGE (solo su club) | 🟡 READ | 🟡 READ |
| Clubes | ✅ MANAGE | ✅ UPDATE (solo su club) | 🟡 READ | 🟡 READ |
| Usuarios | ✅ MANAGE | 🟡 READ | 🔴 UPDATE (solo perfil) | 🔴 - |
| Categorías | ✅ MANAGE | 🟡 READ | 🟡 READ | 🟡 READ |
| Rankings | ✅ MANAGE | 🟡 READ | 🟡 READ | 🟡 READ |
| Inscripciones | ✅ MANAGE | ✅ READ (su club) | 🟡 CREATE, READ (solo suyas) | 🔴 - |
| Partidos | ✅ MANAGE | 🟡 READ (su club) | 🟡 READ (suyos) | ✅ UPDATE (asignados) |
| Pagos | ✅ MANAGE | ✅ MANAGE (su club) | 🟡 READ (suyos) | 🔴 - |
| Logs | ✅ READ | 🔴 - | 🔴 - | 🔴 - |

### 🔐 Implementación Técnica

#### Funciones de Autorización

```typescript
// lib/rbac/index.ts

// Requiere autenticación (cualquier usuario logueado)
export async function requireAuth(): Promise<Session> {
  const session = await getServerSession(authOptions)
  if (!session) throw new AuthorizationError('No autorizado')
  return session
}

// Requiere autorización para acción específica
export async function authorize(
  action: Action,
  resource: Resource,
  resourceId?: string
): Promise<Session> {
  const session = await requireAuth()
  const hasPermission = await checkPermission(session, action, resource, resourceId)

  if (!hasPermission) {
    throw new AuthorizationError(`Sin permisos para ${action} en ${resource}`)
  }

  return session
}

// Verificar permiso sin lanzar error
export async function can(
  session: Session,
  action: Action,
  resource: Resource,
  resourceId?: string
): Promise<boolean> {
  return checkPermission(session, action, resource, resourceId)
}
```

#### Uso en API Routes

```typescript
// src/app/api/tournaments/route.ts

// GET - Requiere solo autenticación
export async function GET(request: NextRequest) {
  const session = await requireAuth()
  // ... lógica
}

// POST - Requiere permiso CREATE en TOURNAMENT
export async function POST(request: NextRequest) {
  const session = await authorize(Action.CREATE, Resource.TOURNAMENT)
  // ... lógica
}
```

```typescript
// src/app/api/tournaments/[id]/route.ts

// PUT - Requiere permiso UPDATE en torneo específico
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await authorize(Action.UPDATE, Resource.TOURNAMENT, params.id)
  // ... lógica
}

// DELETE - Solo ADMIN puede eliminar
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await authorize(Action.DELETE, Resource.TOURNAMENT, params.id)
  // ... lógica
}
```

#### Sistema de Auditoría

Todas las acciones sensibles se registran automáticamente:

```typescript
// Registrar acción en logs de auditoría
await AuditLogger.log(session, {
  action: Action.CREATE,
  resource: Resource.TOURNAMENT,
  resourceId: tournament.id,
  description: `Torneo ${tournament.name} creado`,
  oldData: null,
  newData: tournament,
}, request)
```

**Información capturada:**
- Usuario que realizó la acción
- Timestamp exacto
- IP address y User Agent
- Datos anteriores y nuevos (diff)
- Metadata adicional

### 🔒 Rutas Protegidas

```typescript
// middleware.ts
export const config = {
  matcher: [
    '/dashboard/:path*',      // Requiere login
    '/api/admin/:path*',      // Solo ADMIN
    '/api/tournaments/:path*', // Autenticado + permisos
    '/api/clubs/:path*',
    '/api/users/:path*',
    '/api/registrations/:path*'
  ]
}
```

### 🎯 Configuración de NextAuth

```typescript
// lib/auth.ts
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      credentials: {
        email: { type: "email" },
        password: { type: "password" }
      },
      async authorize(credentials) {
        // Validación con bcrypt
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user || !await bcrypt.compare(credentials.password, user.password)) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    })
  ],
  pages: {
    signIn: '/auth/login',
    signUp: '/auth/register'
  },
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.id as string,
        role: token.role as Role
      }
    })
  },
  session: { strategy: 'jwt' }
}
```

### 📚 Documentación Adicional

Para información completa sobre el sistema RBAC incluyendo:
- Implementación detallada de permisos
- Validaciones de seguridad
- Reglas de negocio
- Ejemplos de uso
- Troubleshooting

Ver: **[RBAC_GUIA_DEFINITIVA.md](RBAC_GUIA_DEFINITIVA.md)**

## 🧪 Testing y Calidad de Código

### Herramientas de Calidad Configuradas

#### ESLint
```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "prefer-const": "error"
  }
}
```

#### Prettier
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

#### TypeScript
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true
  }
}
```

### Scripts de Verificación
```bash
npm run lint          # Verificar linting
npm run type-check    # Verificar tipos TypeScript
npm run format:check  # Verificar formato de código
npm run format        # Formatear código automáticamente
```

## 🚀 Deployment y Producción

### Variables de Entorno Requeridas

```bash
# .env.production
DATABASE_URL="postgresql://user:pass@host:port/db"
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="production-secret-key"
```

### Build para Producción

```bash
# Instalar dependencias
npm ci --only=production

# Generar cliente Prisma
npm run db:generate

# Aplicar migraciones
npm run db:deploy

# Build de la aplicación
npm run build

# Iniciar servidor
npm run start
```

### Consideraciones de Rendimiento

#### Base de Datos
- Índices optimizados en Prisma schema
- Consultas con paginación implementada
- Connection pooling configurado

#### Frontend
- Server-side rendering con Next.js
- Componentes optimizados con React 19
- Code splitting automático
- Imágenes optimizadas

#### Caching
- Static generation para páginas públicas
- ISR (Incremental Static Regeneration)
- Cache de API routes cuando aplicable

## 📈 Monitoreo y Observabilidad

### Sistema de Logs

```typescript
// Estructura de logs
interface SystemLog {
  id: string
  action: LogAction
  description: string
  userId: string
  ipAddress?: string
  userAgent?: string
  oldData?: Json
  newData?: Json
  metadata?: Json
  createdAt: DateTime
}
```

### Métricas Disponibles
- Usuarios activos por período
- Torneos creados/completados
- Actividad por club
- Rankings más competitivos
- Estadísticas de uso

### Endpoints de Monitoreo

```bash
GET /api/admin/logs          # Logs del sistema
GET /api/admin/tournaments/stats  # Estadísticas de torneos
GET /api/users/stats         # Estadísticas de usuarios
```

## 🤝 Contribución y Desarrollo

### Workflow de Desarrollo

1. **Crear feature branch**
```bash
git checkout -b feature/nueva-funcionalidad
```

2. **Desarrollar con las herramientas del proyecto**
```bash
npm run dev-select  # Seleccionar DB y desarrollo
npm run db:studio   # Explorar datos
npm run lint        # Verificar código
```

3. **Testing local**
```bash
npm run type-check
npm run build
npm run db:seed     # Datos frescos para testing
```

4. **Commit y PR**
```bash
git add .
git commit -m "feat: descripción de la funcionalidad"
git push origin feature/nueva-funcionalidad
```

### Convenciones de Código

#### Nomenclatura
- **Componentes**: PascalCase (`TournamentForm.tsx`)
- **Hooks**: camelCase con prefijo use (`useAuth.ts`)
- **Utilidades**: camelCase (`calculatePoints.ts`)
- **API Routes**: kebab-case en URLs (`/api/tournaments/[id]/calculate-points`)

#### Estructura de Componentes
```typescript
// Ejemplo de componente bien estructurado
interface Props {
  tournament: Tournament
  onUpdate: (data: TournamentUpdate) => void
}

export function TournamentDetail({ tournament, onUpdate }: Props) {
  // Hooks primero
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  // Handlers
  const handleStatusChange = async (status: TournamentStatus) => {
    // Implementation
  }

  // Render
  return (
    <Card>
      {/* JSX */}
    </Card>
  )
}
```

#### Validaciones con Zod
```typescript
// lib/validations/tournament.ts
export const tournamentSchema = z.object({
  name: z.string().min(3, 'Mínimo 3 caracteres'),
  type: z.enum(['SINGLE_ELIMINATION', 'ROUND_ROBIN']),
  tournamentStart: z.date(),
  maxParticipants: z.number().min(4).max(128).optional()
})
```

### Base de Datos - Mejores Prácticas

#### Migraciones
```bash
# Crear migración
npm run db:migrate

# Reset en desarrollo (cuidado)
npm run db:reset
npm run db:seed
```

#### Seeds
```typescript
// prisma/seeds/index.ts
async function main() {
  // Crear datos en orden correcto
  const admin = await createAdminUser()
  const clubs = await createClubs()
  const categories = await createCategories()
  const tournaments = await createTournaments(clubs, categories)
}
```

## 📝 Documentación Técnica Adicional

### API Reference

#### Torneos
```typescript
// POST /api/tournaments
interface CreateTournamentRequest {
  name: string
  type: TournamentType
  tournamentStart: Date
  maxParticipants?: number
  organizerId: string
  categoryIds: string[]
}

// GET /api/tournaments?page=1&status=PUBLISHED
interface GetTournamentsResponse {
  tournaments: Tournament[]
  total: number
  page: number
  limit: number
}

// POST /api/tournaments/[id]/calculate-points
interface CalculatePointsResponse {
  success: boolean
  totalPointsAwarded: number
  playersAffected: number
  calculations: PlayerPointsCalculation[]
}
```

#### Rankings
```typescript
// GET /api/rankings?categoryId=xxx&seasonYear=2024
interface GetRankingsResponse {
  rankings: PlayerRanking[]
  category: Category
  seasonYear: number
}

// GET /api/rankings/seasons
interface GetSeasonsResponse {
  seasons: number[]
}
```

### Tipos TypeScript Principales

```typescript
// src/types/tournament.ts
export interface Tournament {
  id: string
  name: string
  type: TournamentType
  status: TournamentStatus
  tournamentStart: Date
  maxParticipants?: number
  organizer: User
  categories: TournamentCategory[]
  teams: Team[]
}

export interface TournamentStats {
  id: string
  tournamentId: string
  playerId: string
  matchesPlayed: number
  matchesWon: number
  setsWon: number
  pointsEarned: number
  finalPosition?: number
}
```

## 🔍 Troubleshooting

### Problemas Comunes

#### Error de Base de Datos
```bash
# Verificar conexión
npm run db:studio

# Resetear si es necesario (desarrollo)
npm run db:reset
npm run db:seed
```

#### Build Errors
```bash
# Limpiar y reinstalar
rm -rf .next node_modules
npm install
npm run build
```

#### TypeScript Errors
```bash
# Verificar tipos
npm run type-check

# Regenerar tipos de Prisma
npm run db:generate
```

#### Selector de Base de Datos
```bash
# Cambiar entre local y remoto fácilmente
npm run db:select

# O usar comandos combinados
npm run dev-select      # Seleccionar DB y dev
npm run db:seed-select  # Seleccionar DB y seed
```

### Logs para Debug

```typescript
// Habilitar debug de Prisma
// .env
DEBUG="prisma:query"

// Logs de aplicación
console.log('Tournament created:', {
  id: tournament.id,
  name: tournament.name,
  status: tournament.status
})
```

## 🔧 Changelog - Mejoras Recientes

### 🆕 Septiembre 30, 2024 - Sistema de Inscripciones y RBAC

#### Sistema de Inscripciones Completado
1. **✅ Validación Anti-Duplicados (Backend)**
   - Endpoint POST `/api/registrations` valida que un jugador solo pueda estar en un equipo por categoría
   - Verifica las 4 combinaciones posibles de player1/player2
   - Mensajes de error específicos indicando qué jugador ya está inscrito y en qué equipo
   - Regla de negocio: Un jugador puede inscribirse en múltiples categorías, pero solo un equipo por categoría

2. **✅ Endpoint Check-Players (Optimización UX)**
   - Nuevo endpoint GET `/api/registrations/check-players?tournamentId=xxx&categoryId=xxx`
   - Retorna array de IDs de jugadores ya inscritos
   - Permite filtrado en frontend antes de enviar formulario
   - Mejora experiencia de usuario evitando errores de validación tardíos

3. **✅ Filtrado Inteligente en Frontend**
   - `registration-form.tsx` filtra automáticamente jugadores ya inscritos
   - Select components sincronizan correctamente con React Hook Form usando `value` prop
   - Estados de carga (`checkingPlayers`) para feedback visual
   - Re-verificación automática al cambiar torneo o categoría

4. **✅ Validación de Fechas Mejorada**
   - Fecha límite de inscripción incluye el último día completo (hasta las 23:59:59)
   - Comparación de fechas normalizada a medianoche para evitar problemas de hora
   - Validación tanto de fecha inicio como fin de inscripciones

5. **✅ Filtros Avanzados en GET Registrations**
   - Soporte para valor "all" en filtros de status y tournamentId
   - Múltiples status simultáneos usando `searchParams.getAll()`
   - Filtrado por torneo implementado en `registrations-header.tsx`
   - Solo muestra torneos activos (PUBLISHED, REGISTRATION_OPEN, REGISTRATION_CLOSED, IN_PROGRESS)

6. **✅ Validación de Jugadores Diferentes**
   - Zod schema con `.refine()` valida que player1Id !== player2Id
   - Mensaje de error específico: "Los jugadores deben ser diferentes"
   - Previene errores comunes de inscripción

#### Sistema RBAC Refinado
7. **✅ Helper `isAdminOrClubAdmin`**
   - Agregado a `use-auth.ts` para lógica común de permisos
   - Memoizado con `useMemo` para optimización
   - Usado en múltiples componentes para mostrar/ocultar botones y acciones

8. **✅ Documentación RBAC Unificada**
   - Archivo `RBAC_GUIA_DEFINITIVA.md` consolidado con toda la información
   - Nueva sección "Validaciones y Reglas de Negocio" con 5 subsecciones
   - Estadísticas actualizadas: 26 archivos implementados, 5 en módulo de inscripciones
   - Changelog detallado con todas las mejoras de la sesión
   - Eliminado `RBAC_REFACTORING_REPORT.md` (contenido fusionado)

#### Bugs Corregidos
9. **✅ Fix: Select Components sin sincronización**
   - Problema: Radix UI Select con `defaultValue` no sincroniza con React Hook Form
   - Solución: Cambiado a `value={field.value}` en todos los Select del formulario
   - Afectó: tournament, category, player1, player2 selectors

10. **✅ Fix: Filtro de torneos**
    - Problema: `searchParams.get("status")` solo obtenía primer valor
    - Solución: Usar `searchParams.getAll("status")` para múltiples valores
    - Permite filtrar por múltiples estados simultáneamente

11. **✅ Fix: Error con valor "all" en filtros**
    - Problema: Zod schema no aceptaba "all" como valor válido
    - Solución: Agregado "all" a enum y lógica condicional para ignorarlo en queries
    - Aplica a status, tournamentId, categoryId

### Octubre 2024
- **✅ Fix: Conteo de torneos en categorías** - Corregido filtro para solo contar torneos en curso (PUBLISHED, REGISTRATION_OPEN, REGISTRATION_CLOSED, IN_PROGRESS)
- **✅ Fix: Botón Volver en detalle de usuario** - Navegación corregida de `router.back()` a `router.push('/dashboard/users')`

### Septiembre 2024
- Sistema de puntos automático implementado
- Rankings y temporadas funcionales
- Panel administrativo completo
- Sistema de logs y auditoría

---

## 📞 Contacto y Soporte

Para preguntas, sugerencias o reportar problemas:

- **GitHub Issues**: Para bugs y feature requests
- **Email**: [contacto]
- **Documentación**: Este README y comentarios en el código

---

**🏓 PadApp** - Sistema completo de gestión de torneos de pádel desarrollado con las mejores prácticas y tecnologías modernas.

### 📊 Estadísticas del Proyecto
- **26 archivos** con implementación RBAC completa
- **9 módulos principales**: Torneos, Clubes, Usuarios, Categorías, Rankings, Inscripciones, Canchas, Pagos, Admin
- **4 roles de usuario** con permisos granulares
- **Full TypeScript** con validaciones Zod
- **100% validado** en backend y frontend

*Última actualización: Septiembre 30, 2024*