# 🏓 PDLShot - Sistema de Gestión de Torneos de Pádel

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.16.2-green)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue)](https://www.postgresql.org/)

## 📋 Descripción del Proyecto

PDLShot es una aplicación web completa para la gestión integral de torneos de pádel. Desarrollada con tecnologías modernas, permite administrar torneos, jugadores, clubes, rankings y mucho más de manera eficiente y profesional.

**Estado Actual**: ✅ **97% completo** - Sistema production-ready con 46 API endpoints (100% RBAC protegidos), 90+ componentes React, 30+ tablas de base de datos, y sistema de UI/UX profesional con ordenamiento, filtros y navegación avanzada en 8 páginas principales.

### 🎯 Objetivos Principales
- **Gestión Completa de Torneos**: Crear, administrar y seguir torneos de pádel
- **Sistema de Rankings**: Cálculo automático de puntos y rankings por categorías
- **Administración de Clubes**: Gestión de clubes, canchas y recursos
- **Experiencia de Usuario Optimizada**: Interfaz moderna, responsiva y profesional con UX avanzado
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
padelshot/
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
- **Sistema de Pagos Completo**: Integración con Mercado Pago + Pagos manuales (ver [PAYMENT_SYSTEM.md](PAYMENT_SYSTEM.md))
- **Integridad de Torneos**: Validación de estado para generación de brackets + cancelación automática de inscripciones no confirmadas
- **Notificaciones**: Sistema de notificaciones en tiempo real
- **Logs de Auditoría**: Seguimiento completo de todas las acciones

## 🚀 Funcionalidades Implementadas

### ✅ **Sistema de Autenticación y RBAC Completo**
- Login y registro con validación
- Autenticación con NextAuth.js + JWT
- **RBAC (Role-Based Access Control)** 100% implementado
- **46 rutas API protegidas** - 100% de cobertura
- 4 Roles: ADMIN, CLUB_ADMIN, PLAYER, REFEREE
- Sistema de permisos granular (Actions + Resources)
- Auditoría completa con 9 servicios de logging
- Rutas protegidas con middleware
- Gestión de sesiones segura
- 📄 [Documentación RBAC completa](RBAC_GUIA_DEFINITIVA.md) con mapeo de todos los endpoints

### ✅ **Dashboard Administrativo**
- Panel principal con estadísticas en tiempo real
- Actividad reciente de torneos
- Métricas de usuarios y clubes activos
- Componentes modulares y reutilizables

### ✅ **Gestión de Torneos**
- **CRUD Completo**: Crear, editar, eliminar torneos
- **Múltiples Formatos Implementados** (6/7 - 86%):
  - ✅ Single Elimination (Eliminación Simple)
  - ✅ Double Elimination (Eliminación Doble)
  - ✅ Round Robin (Todos contra Todos)
  - ✅ Group Stage + Elimination (Fase de Grupos + Eliminación)
  - ✅ Americano (Round-Robin Circle Method - Equipos fijos)
  - ✅ Americano Social (Jugadores individuales en pools de 4 con configuración automática de rondas)
  - ⏳ Swiss System (Pendiente)
- **Estados de Torneo**: Draft → Published → Registration → In Progress → Completed
- **Configuración Avanzada**:
  - Fechas de registro y torneo
  - Número de participantes (min/max)
  - Tarifas de inscripción
  - Premio en metálico
  - Reglas de sets y games
  - Golden Point opcional
- **🆕 Validaciones de Integridad**:
  - **Control de Generación de Brackets**: Solo permite generar cuando `status = REGISTRATION_CLOSED` o `IN_PROGRESS`
  - **Limpieza Automática al Inicio**: Cancela inscripciones no confirmadas cuando torneo → `IN_PROGRESS`
  - **Protección contra Inscripciones Tardías**: Previene corrupción de brackets
  - **Auditoría Completa**: Registra todas las cancelaciones automáticas

### ✅ **Sistema de Puntos Automático** ⭐ MEJORADO
- **🆕 Puntos Base Configurables por Torneo**: Cada torneo define su nivel de importancia (100-5,000 pts)
- **Cálculo Inteligente Proporcional** basado en:
  - **Puntos Base**: 50 puntos por participación (fijo)
  - **Puntos por Posición**: Proporcionales al `rankingPoints` del torneo
    - 1° lugar: 100% del rankingPoints (ej: 1000 pts en torneo Premium)
    - 2° lugar: 70% del rankingPoints (ej: 500 pts en torneo Regional)
    - 3° lugar: 50% del rankingPoints, etc.
  - **Bonus por Rendimiento**: Proporcionales al rankingPoints
    - Victoria: (rankingPoints/1000) × 25 pts
    - Set ganado: (rankingPoints/1000) × 5 pts
  - **Multiplicadores Dinámicos**:
    - Por tipo de torneo (1.0x - 1.4x)
    - Por número de participantes (1.0x - 1.5x)
- **Niveles de Torneos Sugeridos**:
  - Premium/Nacional: 1000-1500 pts
  - Regional Alto: 600-900 pts
  - Regional: 400-600 pts
  - Local/Club: 100-300 pts
- **🆕 Visualización Detallada**: Pestaña "Puntos" en torneos con breakdown completo por jugador
- **🆕 Reversión Inteligente**: Recálculo automático al revertir torneos (COMPLETED → IN_PROGRESS)
  - Resetea puntos de TournamentStats a 0
  - Recalcula rankings excluyendo torneos revertidos
  - Garantiza integridad de datos
- **API Endpoints**:
  - `POST /api/tournaments/{id}/calculate-points` - Calcular puntos
  - `GET /api/tournaments/{id}/stats` - Obtener stats con breakdown
- **Actualización Automática**: Rankings actualizados al completar torneos
- **Transparencia Total**: Logs detallados de cada cálculo
- 📄 [Documentación completa del sistema de puntos](POINTS_CALCULATION.md)

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
- **🆕 Historial de Puntos por Jugador**: Pestaña dedicada mostrando todos los torneos jugados
  - Desglose completo del cálculo de puntos por torneo
  - Link a cada torneo
  - Estadísticas de rendimiento (posición, partidos, sets)
- **Histórico**: Mantiene registro de todas las temporadas
- **API de Temporadas**: `/api/rankings/seasons` para obtener años disponibles
- **API de Historial**: `/api/players/{playerId}/tournament-stats` - Stats detalladas por jugador

### ✅ **Panel de Administración**
- **Dashboard de Torneos**: Estadísticas y métricas globales
- **Logs del Sistema**: Auditoría completa de acciones
- **Herramientas de Admin**: Solo para usuarios ADMIN
- **Monitoreo en Tiempo Real**: Estado de torneos y actividad

### ✅ **Sistema de Logs y Auditoría**
- **Logs Granulares**: 9 servicios de logging implementados
- **Información Detallada**:
  - Acción realizada
  - Usuario responsable
  - Timestamp exacto
  - Datos anteriores y nuevos (oldData/newData)
  - IP y User Agent
  - Metadata adicional
- **Servicios de Logging**:
  1. UserLogService - Gestión de usuarios
  2. TournamentLogService - Torneos y competiciones
  3. ClubLogService - Clubes y organizaciones
  4. CourtLogService - Canchas y recursos
  5. CategoryLogService - Categorías de competencia
  6. RankingsLogService - Rankings y puntos
  7. RegistrationLogService - Inscripciones
  8. TeamLogService - Equipos formados
  9. MatchLogService - Partidos y resultados
- **📄 [Documentación completa del sistema de logs](LOGGING_SYSTEM.md)**

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

### ✅ **Sistema de Pagos Completo** ⭐ NUEVO (Diciembre 2025) 🔒 SEGURO
- **Integración con MercadoPago**: SDK oficial, checkout seguro, webhooks con validación de firma (HMAC-SHA256)
- **Pagos Manuales**: Efectivo, transferencia, confirmación manual (solo ADMIN/CLUB_ADMIN)
- **Estados**: PENDING, PAID, FAILED, CANCELLED, REFUNDED
- **🔒 Seguridad**: Puntuación 9/10 - Validación de firma, timestamp, monto e idempotencia
- **Auditoría completa**: PaymentLogService con logs de IP, User Agent y trazabilidad total
- **Soporte de pagos parciales**: Sistema flexible para múltiples pagos

📄 **Documentación completa**: Ver [PAYMENT_SYSTEM.md](PAYMENT_SYSTEM.md) para auditoría de seguridad, configuración completa y guía de testing.

### ✅ **Sistema de Equipos**
- **Formación de Equipos**: 2 jugadores registrados forman un equipo
- **CRUD Completo**: Gestión completa de equipos
- **Validaciones de Negocio**: Un jugador solo puede estar en un equipo por categoría
- **Logs Completos**: TeamLogService con auditoría total
- **Estadísticas**: Tracking de partidos, victorias, sets ganados
- **API Protegida**: 6 endpoints con RBAC completo

### ✅ **Gestión de Brackets/Llaves**
- **Generación Automática**: BracketService de 1,700+ líneas
- **Visualización Gráfica**: Componentes para todos los formatos
- **Progresión Automática**: `progressWinner()` avanza ganadores automáticamente
- **6 Formatos Soportados**:
  - ✅ Single Elimination (con byes)
  - ✅ Double Elimination (upper/lower brackets)
  - ✅ Round Robin completo
  - ✅ Group Stage + Elimination (clasificación automática)
  - ✅ Americano (Circle Method rotation)
  - ✅ Americano Social (pools de 4 jugadores)
- **Seeding Inteligente**: Distribución óptima de byes
- **Referencias de Progresión**: `team1FromMatchId`/`team2FromMatchId`
- **Edición Manual**: Modificación de brackets cuando es necesario

### ✅ **Sistema de Partidos**
- **Carga de Resultados**: `POST /api/matches/[id]/result`
- **Seguimiento Detallado**: Sets, games y tiebreaks
- **Validación Completa**: Scores, winners, formato de sets
- **Progresión Automática**: Winners avanzan en eliminatorias
- **Clasificación de Grupos**: Automática al completar fase de grupos
- **Historial Completo**: Todos los partidos con resultados
- **Estadísticas**: Tracking automático por jugador/equipo
- **Logs de Auditoría**: MatchLogService con todos los cambios
- **5 Endpoints API**: Con protección RBAC completa

### ✅ **Programación y Calendario**
- **Calendario de Partidos**: Visualización de matches programados
- **Gestión de Horarios**: Asignación de fechas a partidos
- **Asignación de Canchas**: Manual a través de court_id
- **Filtros**: Por torneo, fecha, cancha, estado
- ⏳ **Pendiente**: Asignación automática de canchas, detección de conflictos, notificaciones de cambios

### ✅ **Sistema de UI/UX Avanzado** ⭐ NUEVO (Diciembre 2025)
- **🆕 Ordenamiento Dinámico en Todas las Tablas**:
  - **8 Páginas Mejoradas**: Usuarios, Clubes, Categorías, Equipos, Partidos, Rankings, Torneos, Inscripciones
  - **27+ Columnas Ordenables**: Click en header para ordenar ASC/DESC
  - **Iconos Visuales Intuitivos**:
    - `↕️` Columna sin orden aplicado
    - `↑` Ordenamiento ascendente activo
    - `↓` Ordenamiento descendente activo
  - **Persistencia en URL**: Parámetros `orderBy` y `order` mantienen estado
  - **Reset Automático**: Vuelve a página 1 al cambiar ordenamiento

- **🆕 Navegación Clickeable en Tablas**:
  - **Click en Fila → Detalle**: Navegación directa desde cualquier tabla
  - **Detección Inteligente**: No navega al hacer click en botones/dropdowns
  - **Hover Effects**: Feedback visual `hover:bg-muted/50` en todas las filas
  - **Mobile Responsive**: Cards clickeables en vista móvil
  - **Consistencia Total**: Mismo patrón en desktop y mobile

- **🆕 Filtros Avanzados Mejorados**:
  - **Usuarios**: Estado + Rol + Género (3 filtros)
  - **Clubes**: Estado + Ciudad + País (3 filtros, dinámicos desde BD)
  - **Categorías**: Estado (1 filtro)
  - **Equipos**: Estado + Torneo (2 filtros)
  - **Partidos**: Estado + Torneo (2 filtros)
  - **Rankings**: Categoría + Temporada (2 filtros)
  - **Torneos**: Estado (múltiples simultáneos)
  - **Inscripciones**: Estado + Torneo (2 filtros)

- **🆕 Búsqueda Mejorada**:
  - **Placeholders Descriptivos**: Cada página describe qué se puede buscar
  - **Búsqueda Inteligente**: Múltiples campos simultáneos (nombre, email, ciudad, etc.)
  - **Búsqueda en Tiempo Real**: Actualización inmediata con debounce

- **🆕 Backend API Mejorado**:
  - **Ordenamiento Dinámico**: Función `buildOrderBy()` en 8 endpoints
  - **Validación de Columnas**: Solo columnas permitidas pueden ordenarse
  - **Type Safety**: Tipos TypeScript `'asc' | 'desc'` estrictos
  - **Endpoint de Filtros**: `/api/clubs/filters` para filtros dinámicos

- **Columnas Ordenables por Página**:
  - **Usuarios (6)**: Usuario, Email, Rol, Estado, Género, Fecha Registro
  - **Clubes (3)**: Club, Ubicación, Estado
  - **Categorías (3)**: Nombre, Tipo, Estado
  - **Equipos (3)**: Equipo, Estado, Fecha Creación
  - **Partidos (2)**: Horario/Cancha, Estado
  - **Rankings (3)**: Posición, Puntos, Temporada
  - **Torneos (4)**: Nombre, Estado, Fecha Inicio, Tipo
  - **Inscripciones (2)**: Estado, Fecha Inscripción

- **Patrón de Código Consistente**:
  - 3 funciones standard: `handleSort()`, `getSortIcon()`, `handleRowClick()`
  - Same hooks: `useRouter()`, `useSearchParams()`
  - Consistencia total en nombres y comportamiento
  - Type-safe en todos los componentes

## 📋 Funcionalidades Pendientes por Desarrollar

### 🔶 **Prioridad Alta - Próximas Implementaciones**

#### 1. **Confirmación de Pagos**
- Integración con pasarelas de pago (Stripe, MercadoPago, PayPal)
- Confirmación manual de pagos por administradores
- Notificaciones automáticas de estado de pago
- Gestión de reembolsos
- Facturación automática

#### 2. **Mejoras en Programación de Partidos**
- Asignación automática de canchas basada en disponibilidad
- Detección automática de conflictos de horarios
- Notificaciones push de cambios de horario
- Algoritmo de optimización de uso de canchas
- Vista de calendario completo del torneo

#### 3. **Sistema Swiss (7mo formato de torneo)**
- Implementación del formato Swiss System
- Emparejamiento automático por ranking
- Prevención de rematches
- Cálculo de tie-breaks

### 🔷 **Prioridad Media - Mejoras del Sistema**

#### 4. **Mejoras en Rankings**
- Rankings históricos detallados
- Comparación entre temporadas
- Rankings por región/club
- Exportación de datos
- Gráficos de evolución

#### 5. **Sistema de Notificaciones Completo**
- Notificaciones push web y móvil
- Emails automáticos transaccionales
- SMS para confirmaciones críticas (opcional)
- Centro de notificaciones en la app
- Notificaciones personalizables por usuario
- Webhooks para integraciones externas

#### 6. **Reportes y Estadísticas Avanzadas**
- Reportes por torneo
- Estadísticas de jugadores
- Análisis de rendimiento
- Exportación a PDF/Excel
- Dashboards personalizados por rol
- Analytics en tiempo real

#### 7. **Mejoras en Americano Social - Gestión de Jugadores Extra**
- **Selección Manual de Jugadores cuando no es múltiplo de 4**:
  - Interfaz para seleccionar qué jugadores quedan afuera cuando hay excedente
  - Opciones de selección:
    - Generar con primeros N jugadores (por fecha de inscripción)
    - Generar con mejores N jugadores (por ranking)
    - Selección manual específica del organizador
  - Mover automáticamente jugadores excedentes a `WAITLIST`
  - Notificaciones a jugadores afectados
  - Vista previa de pools antes de confirmar generación
- **Contexto**: Actualmente si hay 13 CONFIRMED/PAID el sistema devuelve error. Se requiere solución manual cambiando estado de 1 jugador.

### 🔸 **Funcionalidades Avanzadas - Futuro**

#### 8. **Aplicación Móvil**
- PWA (Progressive Web App)
- App nativa (React Native)
- Sincronización offline
- Notificaciones push nativas
- Cámara para fotos de resultados

#### 9. **Integraciones Externas**
- APIs de federaciones nacionales/internacionales
- Integración con sistemas de gestión de clubes
- Importación/Exportación masiva de datos
- APIs públicas REST para desarrolladores externos
- Webhooks configurables para eventos del sistema
- Integración con plataformas de streaming (transmisión de partidos)

#### 10. **Funcionalidades Sociales**
- Perfiles públicos de jugadores con bio y stats
- Sistema de comentarios en torneos y partidos
- Galería de fotos por torneo
- Sharing automático en redes sociales
- Foros de discusión por comunidad
- Sistema de badges y logros

#### 11. **Optimizaciones y Rendimiento**
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
cd padelshot
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
DATABASE_URL="postgresql://postgres:padelshot123@localhost:5432/padelshot"
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
- Email: `admin@padelshot.app`
- Contraseña: `123456`

Los seeds incluyen:
- Usuarios administradores y jugadores
- Clubes y canchas de ejemplo
- Categorías por edad y habilidad
- Torneo de ejemplo con equipos inscritos
- Rankings iniciales

## 📊 Sistema de Puntos Automático

Puntos configurables por torneo (100-5,000 pts) basados en **4 factores**:

1. **Participación base**: 50 puntos fijos
2. **Posición final**: Proporcional al `rankingPoints` del torneo (1° = 100%, 2° = 70%, 3° = 50%, etc.)
3. **Rendimiento**: Victorias (+25 pts) y sets ganados (+5 pts)
4. **Multiplicadores**: Por tipo de torneo (×1.0-1.4) y participantes (×1.0-1.5)

**Fórmula**: `[(Base + Posición + Rendimiento) × MultTorneo × MultParticipantes]`

**Ejemplo**: Campeón de torneo Premium (1000 pts base) con 5 victorias → **~1,900 puntos finales**

### Niveles de Torneo Sugeridos
- **Premium/Nacional**: 1000-1500 pts
- **Regional Alto**: 600-900 pts
- **Regional**: 400-600 pts
- **Local/Club**: 100-300 pts

### Rankings Automáticos
- Puntos sumados por categoría durante todo el año
- Actualización automática tras completar torneos
- Histórico completo por temporadas

📄 **Documentación completa**: Ver [POINTS_CALCULATION.md](POINTS_CALCULATION.md) para fórmulas detalladas, tablas de puntos por posición y ejemplos prácticos.

## 🔒 Sistema de Autenticación y RBAC

Sistema completo de control de acceso basado en roles con permisos granulares y auditoría.

### 🎭 Cuatro Roles de Usuario
- **ADMIN**: Acceso total al sistema
- **CLUB_ADMIN**: Gestión limitada a su club
- **PLAYER**: Acceso personal (inscripciones, rankings propios)
- **REFEREE**: Gestión de partidos y resultados

### 📊 Cobertura Completa
- **46 rutas API protegidas** (100% de cobertura RBAC)
- **9 servicios de logging** con auditoría completa
- **4 acciones principales**: CREATE, READ, UPDATE, DELETE
- **9 recursos**: Tournament, Club, User, Category, Registration, Payment, Ranking, Match, Team

### 🔐 Quick Reference

```typescript
import { requireAuth, authorize, Action, Resource } from '@/lib/rbac'

// Autenticación básica
await requireAuth()

// Autorización con permisos
const session = await authorize(Action.CREATE, Resource.TOURNAMENT)

// Verificación condicional
const canEdit = await can(session, Action.UPDATE, Resource.TOURNAMENT, id)
```

| Operación | RBAC Requerido | Ejemplo |
|-----------|---------------|---------|
| Listar recursos | `requireAuth()` | GET /api/tournaments |
| Crear recurso | `authorize(CREATE, Resource)` | POST /api/tournaments |
| Actualizar propio | `requireAuth()` + ownership | PUT /api/users/[id] |
| Actualizar cualquiera | `authorize(UPDATE, Resource)` | PUT /api/tournaments/[id] |
| Eliminar | `authorize(DELETE, Resource)` | DELETE /api/clubs/[id] |

📄 **Documentación completa**: Ver [RBAC_GUIA_DEFINITIVA.md](RBAC_GUIA_DEFINITIVA.md) para mapeo detallado de todos los endpoints, matriz de permisos y ejemplos completos.

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
// GET /api/rankings?categoryId=xxx&seasonYear=2025
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

### 🆕 Diciembre 4, 2025 - Mejoras en Filtros, Búsqueda Inteligente y Sistema de Pagos

#### 🔍 Sistema de Búsqueda Inteligente Multi-Palabra
1. **✅ Búsqueda Inteligente en 7 Módulos**
   - Implementado en: Registrations, Users, Teams, Tournaments, Clubs, Categories, Rankings
   - Una palabra: búsqueda con OR en todos los campos
   - Múltiples palabras: búsqueda con AND (todas deben aparecer)
   - Ejemplo: "Eduardo Mendoza" ahora encuentra correctamente jugadores con ambos nombres

2. **✅ Filtros de Categoría Dinámicos**
   - Agregado filtro terciario de categorías en página de Registrations
   - Agregado filtro terciario de categorías en página de Teams
   - Solo muestra categorías que tienen datos reales (no todas las activas)
   - Nuevos endpoints: `/api/registrations/filters` y `/api/teams/filters`

#### 💰 Correcciones Sistema de Pagos
3. **✅ Lógica de Estado de Pago Centralizada**
   - Movida toda la lógica a `status-styles.ts` para consistencia
   - Helpers: `getTotalPaid()`, `getRegistrationPaymentStatus()`
   - Prioridad correcta: Pagos → Fee → Estado
   - Corregido problema de "Sin Costo" cuando hay pagos

4. **✅ Sistema de Fallback para registrationFee**
   - Implementado fallback automático cuando `tournamentCategory.registrationFee` es NULL
   - Usa `tournament.registrationFee` como respaldo
   - No requiere migración de datos
   - Permite flexibilidad para fees diferentes por categoría

5. **✅ Herencia Automática de Fees en Formulario**
   - Formulario de torneo ahora hereda `registrationFee`, `prizePool` y `maxTeams` a cada categoría
   - Previene valores NULL para torneos nuevos
   - Mantiene compatibilidad con datos existentes

#### 🏆 Gestión de Categorías de Torneos
6. **✅ Validación Granular de Eliminación**
   - Permite eliminar categorías vacías sin afectar otras con datos
   - Valida específicamente las categorías a eliminar
   - Solo bloquea si ESAS categorías tienen equipos/inscripciones
   - Operaciones Prisma granulares (deleteMany específico, no todo)

7. **✅ Optimización de Grid de Equipos**
   - Cambiado grid de 3 a 4 columnas en detalle de torneo
   - Mejor aprovechamiento del espacio

**Archivos modificados**: 15 archivos
**Nuevos endpoints**: 2 endpoints de filtros
**Módulos con búsqueda inteligente**: 7 módulos

### 🆕 Octubre 20, 2025 - Actualización del README con Funcionalidades Implementadas
- ✅ **Nueva sección "Sistema de Equipos"** - Documentada gestión completa con 6 endpoints
- ✅ **Nueva sección "Gestión de Brackets/Llaves"** - Documentado BracketService completo (1,700+ líneas)
- ✅ **Nueva sección "Sistema de Partidos"** - Documentada carga de resultados y progresión automática
- ✅ **Nueva sección "Programación y Calendario"** - Documentadas funcionalidades básicas implementadas
- ✅ **Reorganización de funcionalidades pendientes** - Eliminados duplicados, actualizadas prioridades
- ✅ **Estadísticas del proyecto actualizadas** - Desglose detallado por categorías (Backend, Frontend, RBAC, Core)
- ✅ **Changelog actualizado** - Reflejando estado real del proyecto (97% core completo)
- 📊 **10 funcionalidades principales completadas** - Torneos, Brackets, Partidos, Equipos, Inscripciones, Clubes, Rankings, RBAC, Logs, Puntos

### 🆕 Octubre 19, 2025 - Documentación Completa del Sistema RBAC
- ✅ **46 rutas API documentadas** - Mapeo completo de todo el sistema
- ✅ **100% de cobertura RBAC** - Todas las rutas protegidas
- ✅ **Tabla de referencia por módulo** - 10 módulos con desglose detallado
- ✅ **3 archivos de documentación actualizados**:
  - RBAC_GUIA_DEFINITIVA.md - Guía completa con mapeo de endpoints
  - CLAUDE.md - Quick reference para desarrollo
  - README.md - Estadísticas y cobertura actualizada
- 📊 **Estadísticas de cobertura** - Por tipo de protección, recurso y acción
- 📚 **Guía de referencia** - Archivos destacados por módulo
- 🔒 **9 servicios de logging** - Auditoría completa implementada

### 🆕 Septiembre 30, 2025 - Sistema de Inscripciones, RBAC y Puntos Configurables

#### 🎯 Sistema de Puntos Configurables por Torneo [NUEVO]
1. **✅ Campo rankingPoints en Tournament**
   - Cada torneo define su nivel de importancia (100-5,000 pts)
   - Default: 1000 puntos (equivalente a sistema anterior)
   - Permite diferenciar torneos Premium, Regional, Local

2. **✅ Cálculo Proporcional de Puntos**
   - Puntos por posición basados en porcentajes del rankingPoints
   - Campeón recibe 100% del rankingPoints configurado
   - Bonus de victorias y sets también proporcionales
   - Mantiene multiplicadores por tipo y participantes

3. **✅ Formulario Actualizado**
   - Campo "Puntos de Ranking" en formulario de torneos
   - Validaciones: mínimo 100, máximo 5,000 pts
   - Descripción con ejemplos de niveles sugeridos
   - Valor por defecto: 1000 pts

4. **✅ Seeds con Diferentes Niveles**
   - Torneo Premium (1000 pts): We Need Padel OCT-25
   - Torneo Regional Alto (750 pts): Torneo de Estadísticas
   - Torneo Regional (500 pts): Padel Noa OCT-25
   - Torneo Local (250 pts): Encuentro de Padel

5. **✅ Documentación Completa**
   - POINTS_CALCULATION.md completamente actualizado
   - Ejemplos prácticos con diferentes niveles de torneo
   - Estrategias para jugadores y organizadores

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

### Octubre 7, 2025
- **✅ Sistema de Logs Completo** - 9 módulos con logging (Usuarios, Inscripciones, Equipos, Torneos, Clubes, Canchas, Categorías, Rankings, Partidos)
- **✅ Panel de Administración Mejorado** - Visualización completa de logs con filtros avanzados
- **✅ Documentación LOGGING_SYSTEM.md** - Guía completa del sistema de auditoría

### Octubre 3, 2025
- **✅ Migración de Inscripciones Completada** - Sistema desacoplado: inscripciones individuales + formación de equipos

### Octubre 1, 2025
- **✅ Formato Americano Implementado** - Sistema completo de Round-Robin usando Circle Method
  - Algoritmo de rotación con bye automático para equipos impares
  - Generación de 4-10 rondas adaptativas
  - Garantiza que todos los equipos jueguen entre sí exactamente una vez
  - Implementado en `bracket-service.ts:1432-1531`
  - Documentación completa actualizada en `TOURNAMENT_FORMATS.md`

### Octubre 2025
- **✅ Fix: Conteo de torneos en categorías** - Corregido filtro para solo contar torneos en curso (PUBLISHED, REGISTRATION_OPEN, REGISTRATION_CLOSED, IN_PROGRESS)
- **✅ Fix: Botón Volver en detalle de usuario** - Navegación corregida de `router.back()` a `router.push('/dashboard/users')`

### Septiembre 2025
- Sistema de puntos automático implementado
- Rankings y temporadas funcionales
- Panel administrativo completo
- Sistema de logs y auditoría

---

## 🗺️ Roadmap

### Estado Actual
**97% de funcionalidad core completa** - El sistema está listo para manejar torneos completos de principio a fin.

### Fases del Proyecto

#### ✅ Fase 1 - Funcionalidad Core (Completada al 90%)
- ✅ Sistema de autenticación y RBAC (100%)
- ✅ CRUD completo de entidades principales (100%)
- ✅ Sistema de inscripciones (90% - falta integración de pagos)
- ✅ Gestión de brackets - 6 formatos (86% - falta Sistema Suizo)
- ✅ Sistema de partidos con resultados y progresión automática
- ✅ Sistema de puntos configurables y rankings anuales
- ✅ Panel administrativo con logs de auditoría (100%)

#### ⏳ Fase 2 - Gestión Operativa (Pendiente)
- Calendario visual y programación de canchas
- Sistema de notificaciones multi-canal (push, email, SMS)
- Reportes avanzados y analytics
- Sistema de reservas de canchas

#### ⏳ Fase 3 - Funcionalidades Avanzadas (Pendiente)
- Progressive Web App (PWA) para móviles
- Funcionalidades sociales (perfiles, feed, chat)
- Reservas inteligentes con precios dinámicos
- Sistema de membresías

#### ⏳ Fase 4 - Escalabilidad Enterprise (Pendiente)
- Multi-tenancy para múltiples organizaciones
- APIs públicas con documentación OpenAPI
- Optimizaciones de performance (Redis, CDN, sharding)
- Observabilidad completa (monitoring, alertas)

### Próximos Pasos Inmediatos
1. **Completar integración de pagos con Stripe** (3-4 días)
2. **Implementar Sistema Suizo** para completar todos los formatos (1 semana)
3. **Sistema de notificaciones por email** (2-3 días)
4. **Panel público de inscripción** sin login requerido (2 días)

Para el roadmap completo con detalles de cada sprint y estimaciones, ver el historial del proyecto.

---

## 📞 Contacto y Soporte

Para preguntas, sugerencias o reportar problemas:

- **GitHub Issues**: Para bugs y feature requests
- **Email**: [contacto]
- **Documentación**: Este README y comentarios en el código

---

**🏓 PDLShot** - Sistema completo de gestión de torneos de pádel desarrollado con las mejores prácticas y tecnologías modernas.

### 📊 Estadísticas del Proyecto

#### Backend & API
- **46 rutas API** con implementación RBAC completa (100% de cobertura)
- **10 módulos principales**: Torneos (17), Clubes (11), Inscripciones (8), Usuarios (7), Equipos (6), Categorías (6), Partidos (5), Rankings (4), Admin (3), Utilidades (1)
- **9 servicios de logging** con auditoría completa (User, Tournament, Club, Court, Category, Registration, Team, Match, Rankings)
- **1 servicio de brackets** (1,700+ líneas) con generación automática y progresión de ganadores
- **4 servicios especializados**: Points Calculation, Americano Social, Group Classification, Match Progression

#### Sistema de Autenticación y Permisos
- **4 roles de usuario** con permisos granulares (ADMIN, CLUB_ADMIN, PLAYER, REFEREE)
- **9 acciones** (CREATE, READ, UPDATE, DELETE, MANAGE, LIST, APPROVE, REJECT, DASHBOARD)
- **11 recursos** (TOURNAMENT, CLUB, USER, CATEGORY, REGISTRATION, PAYMENT, RANKING, MATCH, TEAM, COURT, LOG)
- **0 rutas sin protección** - Sistema completamente seguro

#### Funcionalidades Core
- **6 de 7 formatos de torneo implementados** (86% completado):
  - ✅ Single Elimination
  - ✅ Double Elimination
  - ✅ Round Robin
  - ✅ Group Stage + Elimination
  - ✅ Americano (fixed teams)
  - ✅ Americano Social (individual players)
  - ⏳ Swiss System (pendiente)
- **Sistema de puntos configurable** con 4 niveles de torneo (100-5,000 pts)
- **Gestión completa de partidos** con sets, games, tiebreaks y progresión automática
- **Sistema de equipos** con validación anti-duplicados
- **Programación y calendario** con asignación de canchas

#### Frontend & Componentes
- **90+ componentes React 19** organizados por módulos
- **30+ tablas en base de datos** con relaciones complejas
- **Full TypeScript** con modo strict
- **Validaciones Zod** en todas las operaciones (100% validado en backend y frontend)
- **shadcn/ui + Radix UI** para componentes accesibles

#### Progreso General
- **🎯 97% de funcionalidad core completa**
- **📈 100% RBAC implementado y documentado**
- **📝 7 documentos técnicos** (README, CLAUDE, RBAC_GUIA, LOGGING_SYSTEM, POINTS_CALCULATION, TOURNAMENT_FORMATS, PAYMENT_SYSTEM)

*Última actualización: Diciembre 26, 2025*