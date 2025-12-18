# Formatos de Torneos - Documentación Técnica

Este documento describe todos los formatos de torneo implementados y pendientes en el sistema de gestión de torneos de pádel.

---

## 📋 Índice

- [Validaciones Generales de Generación de Brackets](#-validaciones-generales-de-generación-de-brackets)
- [Formatos Implementados](#formatos-implementados)
  - [Eliminación Simple](#eliminación-simple)
  - [Round Robin (Todos contra Todos)](#round-robin-todos-contra-todos)
  - [Doble Eliminación](#doble-eliminación)
  - [Fase de Grupos + Eliminación](#fase-de-grupos--eliminación)
  - [Americano](#americano)
  - [Americano Social](#americano-social)
- [Formatos Pendientes](#formatos-pendientes)
  - [Sistema Suizo](#sistema-suizo)

---

## 🔒 Validaciones Generales de Generación de Brackets

**IMPORTANTE**: Todas las generaciones de brackets y pools (para todos los formatos) están sujetas a las siguientes validaciones de integridad:

### Validación de Estado del Torneo

**Regla**: Los brackets/pools **SOLO pueden generarse** cuando el torneo está en uno de estos estados:
- ✅ `REGISTRATION_CLOSED` (Inscripciones cerradas)
- ✅ `IN_PROGRESS` (Torneo en progreso)

**Estados NO permitidos** para generación:
- ❌ `DRAFT` - Error: "El torneo debe estar publicado antes de generar el bracket"
- ❌ `PUBLISHED` - Error: "Las inscripciones deben estar cerradas antes de generar el bracket"
- ❌ `REGISTRATION_OPEN` - Error: "Las inscripciones deben estar cerradas antes de generar el bracket"
- ❌ `COMPLETED` - Error: "No se puede regenerar el bracket de un torneo completado"

**Razón**: Esta validación previene que nuevos jugadores/equipos se inscriban después de que el bracket ha sido generado, lo cual corrompería la estructura del torneo.

### Limpieza Automática al Iniciar Torneo

Cuando un torneo cambia a estado `IN_PROGRESS` (ya sea automáticamente por fecha o manualmente), el sistema ejecuta una **limpieza automática**:

**Se cancelan automáticamente**:
1. **Inscripciones** que cumplan TODAS estas condiciones:
   - Estado ≠ `CONFIRMED` o `PAID`
   - NO tienen pagos parciales (ningún pago con status `PAID`)
   - NO están ya canceladas

2. **Equipos** que:
   - Tienen al menos una inscripción cancelada

**Se preservan**:
- ✅ Inscripciones con estado `CONFIRMED` o `PAID`
- ✅ Inscripciones con pagos parciales (aunque no estén 100% pagadas)

**Auditoría**:
- Todas las cancelaciones se registran en `RegistrationLog` y `TeamLog`
- Usuario: `'SYSTEM'` (automático) o el ID del usuario que cambió el estado (manual)

**Implementación**:
- Servicio: `TournamentStatusService.cancelUnconfirmedRegistrations()`
- Archivo: `src/lib/services/tournament-status-service.ts:176-331`

### API Endpoints Afectados

Todos estos endpoints validan el estado del torneo antes de generar:
- `POST /api/tournaments/[id]/generate-bracket` (formatos convencionales)
- `POST /api/tournaments/[id]/americano-social/generate` (Americano Social)

---

## Formatos Implementados

### ✅ Eliminación Simple

**Estado**: Completamente implementado

**Descripción**:
Sistema de torneo knockout tradicional donde cada equipo es eliminado tras una sola derrota. Los equipos avanzan a través de rondas sucesivas hasta que queda un solo ganador.

**Características**:
- Máxima eficiencia: mínimo número de partidos
- Alta intensidad: una derrota y estás fuera
- Maneja automáticamente byes cuando el número de equipos no es potencia de 2
- Distribución balanceada de byes (seeds altos reciben ventaja)

**Estructura**:
```
Equipos → Potencia de 2 más cercana (con byes si es necesario)

Ejemplo con 8 equipos:
┌─────────────┐
│  Cuartos    │  Semifinales    Final
├─────────────┤
│ 1 vs 8      │─┐
│             │ ├─ Winner QF1 vs Winner QF2 ─┐
│ 4 vs 5      │─┘                             │
│                                             ├─ CAMPEÓN
│ 3 vs 6      │─┐                             │
│             │ ├─ Winner QF3 vs Winner QF4 ─┘
│ 2 vs 7      │─┘
└─────────────┘

Ejemplo con 6 equipos (con byes):
┌─────────────┐
│  Cuartos    │  Semifinales    Final
├─────────────┤
│ 1 vs BYE    │─┐  (avanza directamente)
│             │ ├─ 1 vs Winner QF2 ─┐
│ 4 vs 5      │─┘                   │
│                                   ├─ CAMPEÓN
│ 3 vs 6      │─┐                   │
│             │ ├─ Winner QF3 vs 2 ─┘
│ 2 vs BYE    │─┘  (avanza directamente)
└─────────────┘
```

**Número de Partidos**:
- Con N equipos: `N - 1` partidos totales
- 8 equipos = 7 partidos
- 16 equipos = 15 partidos
- 32 equipos = 31 partidos

**Casos de Uso**:
- Torneos rápidos (1 día)
- Torneos con muchos equipos y poco tiempo
- Torneos profesionales estándar

**Implementación**:
- Función: `generateSingleEliminationBracket()` en `bracket-service.ts:130`
- Sistema de byes: `distributeByes()` en `bracket-service.ts:686`
- Progresión automática: `progressWinner()` en `bracket-service.ts:795`

---

### ✅ Round Robin (Todos contra Todos)

**Estado**: Completamente implementado

**Descripción**:
Formato de liga donde cada equipo juega contra todos los demás equipos exactamente una vez. El ganador se determina por puntos acumulados en la tabla general.

**Características**:
- Máxima justicia deportiva: todos juegan la misma cantidad de partidos
- Todos los equipos se enfrentan entre sí
- Sin eliminación: todos juegan hasta el final
- Sistema de puntos:
  - **2 puntos por victoria**
  - **1 punto por derrota** (partido jugado)
  - **0 puntos por derrota por walkover**
- Tie-breaking: puntos → diff sets → diff juegos → sets ganados

**Estructura**:
```
Todos vs Todos (matriz completa)

Ejemplo con 4 equipos:
Jornada 1: A vs B, C vs D
Jornada 2: A vs C, B vs D
Jornada 3: A vs D, B vs C

Tabla Final:
Pos  Equipo  PJ  PG  PP  Sets    Pts
1    A       3   3   0   6-0     6
2    B       3   2   1   4-2     4
3    C       3   1   2   2-4     2
4    D       3   0   3   0-6     0
```

**Número de Partidos**:
- Con N equipos: `N × (N - 1) / 2` partidos
- 4 equipos = 6 partidos
- 6 equipos = 15 partidos
- 8 equipos = 28 partidos
- 10 equipos = 45 partidos

**Ventajas**:
- No hay sorpresas: el mejor equipo generalmente gana
- Todos los equipos juegan el mismo número de partidos
- Ideal para determinar rankings completos

**Desventajas**:
- Muchos partidos con equipos grandes
- Requiere mucho tiempo (varios días/semanas)
- Puede haber partidos sin importancia al final

**Casos de Uso**:
- Ligas de clubes
- Torneos con 4-8 equipos
- Cuando se quiere un ranking completo
- Torneos sociales/recreativos

**Implementación**:
- Función: `generateRoundRobinBracket()` en `bracket-service.ts:482`
- Cálculo de tabla: `calculateGroupStandings()` en `bracket-service.ts:1062`

---

### ✅ Doble Eliminación

**Estado**: Completamente implementado

**Descripción**:
Sistema que da a cada equipo dos oportunidades. Los equipos tienen "dos vidas" - necesitan perder dos veces para ser eliminados completamente del torneo.

**Características**:
- Dos brackets: Upper (ganadores) y Lower (perdedores)
- Cada equipo puede perder una vez y seguir compitiendo
- Gran Final: ganador del upper vs ganador del lower
- Bracket reset posible si gana el del lower (tendría que ganar 2 veces)
- Más justo que eliminación simple
- Más partidos pero menos que round robin

**Estructura**:
```
UPPER BRACKET (Winners)          LOWER BRACKET (Losers)
═══════════════════════          ═══════════════════════

Round 1:                         Lower Round 1:
1 vs 8 ─┐                        Loser(1vs8) vs Loser(4vs5) ─┐
        ├─ UF1 ─┐                                            ├─ LF1 ─┐
4 vs 5 ─┘       │                Loser(3vs6) vs Loser(2vs7) ─┘       │
                ├─ CHAMPION                                           │
3 vs 6 ─┐       │                Lower Round 2:                       │
        ├─ UF2 ─┘                Loser(UF1) vs Winner(LF1) ──────────┤
2 vs 7 ─┘                                                             │
                                 Lower Round 3:                       │
                                 Loser(UF2) vs Winner(LF2) ──────────┘
                                                                      │
                                 GRAND FINAL                          │
                                 Winner Upper vs Winner Lower ←───────┘

Si gana el del Lower Bracket → Bracket Reset (2da Gran Final)
```

**Número de Partidos**:
- Con N equipos: entre `2N - 2` y `2N - 1` partidos
- 8 equipos = 14-15 partidos
- 16 equipos = 30-31 partidos

**Ventajas**:
- Más justo: una mala racha no te elimina
- Segunda oportunidad para equipos fuertes que perdieron temprano
- Más emocionante: caminos de "redención"

**Desventajas**:
- Más complejo de entender para jugadores
- Puede ser largo (casi el doble de partidos que simple)
- Ganador del upper tiene ventaja psicológica

**Casos de Uso**:
- Torneos competitivos de 2-3 días
- Cuando quieres dar segundas oportunidades
- Torneos profesionales o semi-profesionales
- 8-16 equipos idealmente

**Implementación**:
- Función: `generateDoubleEliminationBracket()` en `bracket-service.ts:184`
- Progresión de perdedores: `progressLoserToLowerBracket()` en `bracket-service.ts:1009`
- Upper bracket: roundNumber 1-N
- Lower bracket: roundNumber 101-10N
- Gran Final: roundNumber 200

---

### ✅ Fase de Grupos + Eliminación

**Estado**: Completamente implementado con configuración automática flexible

**Descripción**:
Sistema híbrido que combina una fase de grupos inicial (round robin por grupos) seguida de una fase eliminatoria con los mejores equipos de cada grupo. Es el formato más utilizado en competiciones profesionales (Mundial, Champions League, etc.).

**Características**:
- Fase 1: Grupos con round robin interno
- Fase 2: Playoffs con clasificados
- Configuración automática según número de equipos
- Distribución serpiente para balancear grupos
- Sistema de mejores terceros cuando es necesario
- Clasificación siempre a potencia de 2 (4, 8, 16, 32)
- Sistema de puntos en fase de grupos:
  - **2 puntos por victoria**
  - **1 punto por derrota** (partido jugado)
  - **0 puntos por derrota por walkover**

**Configuración Automática (Máximo 4 equipos por grupo)**:

| Equipos | Grupos | Tamaño Grupos | Clasifican | Mejores 2dos | Fase Final |
|---------|--------|---------------|------------|--------------|------------|
| 8       | 2      | 4-4           | Top 2      | -            | Semifinales (4) |
| 9-11    | 3      | 3-4           | Top 1      | 1 mejor      | Semifinales (4) |
| 12-16   | 4      | 3-4           | Top 2      | -            | Cuartos (8) |
| 17-20   | 5      | 3-4           | Top 1      | 3 mejores    | Cuartos (8) |
| 21-24   | 6      | 3-4           | Top 1      | 2 mejores    | Cuartos (8) |
| 25-32   | 8      | 3-4           | Top 2      | -            | Octavos (16) |
| 33-40   | 10     | 3-4           | Top 1      | 6 mejores    | Octavos (16) |
| 41-48   | 12     | 3-4           | Top 1      | 4 mejores    | Octavos (16) |
| 49-64   | 16     | 3-4           | Top 2      | -            | Dieciseisavos (32) |
| 65+     | N/4    | 3-4           | Top 2      | -            | Variable |

**Estructura**:

```
FASE DE GRUPOS
═══════════════════════════════════════════

Grupo A         Grupo B         Grupo C         Grupo D
1. Team1 (6pts) 1. Team5 (6pts) 1. Team9  (6pts) 1. Team13 (6pts)
2. Team2 (4pts) 2. Team6 (4pts) 2. Team10 (4pts) 2. Team14 (4pts)
3. Team3 (2pts) 3. Team7 (2pts) 3. Team11 (2pts) 3. Team15 (2pts)
4. Team4 (0pts) 4. Team8 (0pts) 4. Team12 (0pts) 4. Team16 (0pts)

Top 2 de cada grupo clasifican (8 equipos)

FASE ELIMINATORIA - Cuartos de Final
═══════════════════════════════════════════

Seeding: Primeros vs Segundos cruzados

QF1: 1A vs 2B ─┐
               ├─ SF1 ─┐
QF2: 1B vs 2A ─┘       │
                       ├─ FINAL
QF3: 1C vs 2D ─┐       │
               ├─ SF2 ─┘
QF4: 1D vs 2C ─┘
```

**Ejemplo Detallado: Torneo de 20 Equipos (Nueva Configuración)**

```
DISTRIBUCIÓN INICIAL (Serpiente)
═══════════════════════════════════════════
Con 20 equipos → 5 grupos de 4 equipos máximo
Grupo A: Equipos 1, 10, 11, 20 (4 equipos)
Grupo B: Equipos 2, 9, 12, 19 (4 equipos)
Grupo C: Equipos 3, 8, 13, 18 (4 equipos)
Grupo D: Equipos 4, 7, 14, 17 (4 equipos)
Grupo E: Equipos 5, 6, 15, 16 (4 equipos)

Cada grupo: 4 equipos × 6 partidos = 6 partidos por grupo
Total fase de grupos: 30 partidos

TABLA GRUPO A (ejemplo)
Pos  Equipo    PJ  PG  PP  Sets   Juegos  Pts
1    Team 1    3   3   0   6-0    36-18   6  ← Clasificado
2    Team 10   3   2   1   4-2    32-24   4  ← Candidato mejor 2do
3    Team 11   3   1   2   2-4    26-30   2
4    Team 20   3   0   3   0-6    16-38   0

CLASIFICACIÓN A CUARTOS
═══════════════════════════════════════════
Sistema: Top 1 de cada grupo + 3 mejores segundos = 8 clasificados

Clasificados directos (Primeros):
- 1A, 1B, 1C, 1D, 1E = 5 equipos

Mejores segundos: 3 mejores segundos
- Ordenados por: Puntos → Diff Sets → Diff Juegos → Sets Ganados
- Supongamos: 2A (4pts, +2), 2B (4pts, +1), 2C (4pts, 0)
- Clasifican: 2A, 2B, 2C

Total clasificados: 8 equipos ✅ (potencia de 2)

CUARTOS DE FINAL (8 equipos con seeding estándar)
═══════════════════════════════════════════
QF1: Seed 1 (1A) vs Seed 8 (2C) ─┐
                                  ├─ SF1 ─┐
QF2: Seed 4 (1D) vs Seed 5 (1E) ─┘       │
                                         ├─ FINAL
QF3: Seed 2 (1B) vs Seed 7 (2B) ─┐       │
                                  ├─ SF2 ─┘
QF4: Seed 3 (1C) vs Seed 6 (2A) ─┘

Seeding:
- Seeds 1-5: Primeros de cada grupo (ordenados por criterios)
- Seeds 6-8: Mejores segundos (ordenados por criterios)
```

**Número de Partidos**:

Fase de Grupos (N equipos en grupos de G):
- Partidos por grupo con g equipos: `g × (g - 1) / 2`
- Total: suma de todos los grupos

Fase Eliminatoria (C clasificados):
- `C - 1` partidos

**Ejemplos (Máximo 4 equipos por grupo)**:
- 8 equipos (2 grupos de 4):
  - Fase grupos: 6 + 6 = 12 partidos
  - Semifinales: 2 partidos
  - Final: 1 partido
  - **Total: 15 partidos**

- 16 equipos (4 grupos de 4):
  - Fase grupos: 6 × 4 = 24 partidos
  - Cuartos: 4 partidos
  - Semifinales: 2 partidos
  - Final: 1 partido
  - **Total: 31 partidos**

- 20 equipos (5 grupos de 4):
  - Fase grupos: 6 × 5 = 30 partidos
  - Cuartos: 4 partidos (top 1 + 3 mejores 2dos)
  - Semifinales: 2 partidos
  - Final: 1 partido
  - **Total: 37 partidos**

**Ventajas**:
- Balance perfecto entre justicia y eficiencia
- Fase de grupos da oportunidad de recuperarse de una mala jornada
- Fase eliminatoria da emoción de knockout
- Garantiza mínimo de partidos por equipo
- Configuración automática óptima

**Desventajas**:
- Más complejo de organizar
- Requiere tiempo (varios días mínimo)
- Puede haber partidos sin importancia al final de grupos

**Casos de Uso**:
- **Torneos de fin de semana** (2-3 días)
- **Torneos con 12-32 equipos**
- Cuando quieres balance justicia/emoción
- Formato más común en pádel profesional

**Sistema de Mejores Segundos** (Actualizado):

Cuando se necesitan más clasificados además de los primeros, se usa el sistema de mejores segundos:

```
Criterios de desempate entre segundos/terceros de diferentes grupos:
1. Puntos totales
2. Diferencia de sets
3. Diferencia de juegos
4. Sets ganados totales

Ejemplo con 5 grupos (clasifican Top 1 + 3 mejores 2dos):
Grupo A - 2do: 4pts, +2 sets, +8 juegos
Grupo B - 2do: 4pts, +2 sets, +5 juegos
Grupo C - 2do: 4pts, +1 sets, +10 juegos
Grupo D - 2do: 3pts, +3 sets, +12 juegos
Grupo E - 2do: 3pts, +2 sets, +8 juegos

Ranking de segundos:
1. Grupo A (4pts, +2, +8) ✅ Clasificado
2. Grupo B (4pts, +2, +5) ✅ Clasificado
3. Grupo C (4pts, +1, +10) ✅ Clasificado
4. Grupo D (3pts, +3, +12) ❌ Eliminado
5. Grupo E (3pts, +2, +8) ❌ Eliminado

Total clasificados: 5 primeros + 3 mejores segundos = 8 equipos
```

**Distribución Serpiente**:

Para balancear la fuerza de los grupos, los equipos se distribuyen en serpiente:

```
Ejemplo con 16 equipos en 4 grupos:

Equipos ordenados por ranking/seed: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16

Distribución:
1 → A    (ida)
2 → B    (ida)
3 → C    (ida)
4 → D    (ida)
5 → D    (vuelta) ←
6 → C    (vuelta) ←
7 → B    (vuelta) ←
8 → A    (vuelta) ←
9 → A    (ida)
10 → B   (ida)
11 → C   (ida)
12 → D   (ida)
13 → D   (vuelta) ←
14 → C   (vuelta) ←
15 → B   (vuelta) ←
16 → A   (vuelta) ←

Resultado:
Grupo A: 1, 8, 9, 16
Grupo B: 2, 7, 10, 15
Grupo C: 3, 6, 11, 14
Grupo D: 4, 5, 12, 13

Cada grupo tiene una mezcla equilibrada de seeds altos, medios y bajos
```

**Clasificación Automática** ⭐ NUEVO:

El sistema ahora clasifica automáticamente los equipos a la fase eliminatoria cuando se completa la fase de grupos:

1. **Detección automática**: Al cargar el último resultado de fase de grupos, el sistema detecta que todos los partidos están completados
2. **Cálculo de tablas**: Automáticamente calcula las posiciones finales de todos los grupos usando `calculateGroupStandings()`
3. **Clasificación**: Llama a `classifyTeamsToEliminationPhase()` para asignar equipos a la fase eliminatoria
4. **Sin intervención manual**: Todo el proceso es automático, sin necesidad de clicks adicionales

```typescript
// Proceso automático en POST /api/matches/[id]/result
if (allGroupMatchesCompleted) {
  // 1. Calcular tablas de todos los grupos
  for (const zone of zones) {
    await BracketService.calculateGroupStandings(zone.id)
  }

  // 2. Clasificar a fase eliminatoria
  await BracketService.classifyTeamsToEliminationPhase(tournamentId, categoryId)

  // ✅ Los partidos de cuartos/semifinales ahora tienen equipos asignados
}
```

**Tablas de Posiciones con Estadísticas Completas** ⭐ NUEVO:

El endpoint `/api/tournaments/[id]/groups` ahora devuelve estadísticas completas:

```json
{
  "zones": [
    {
      "id": "zone-1",
      "name": "Grupo A",
      "standings": [
        {
          "teamId": "team-1",
          "teamName": "Team 1",
          "matchesPlayed": 3,
          "matchesWon": 3,
          "matchesLost": 0,
          "setsWon": 6,
          "setsLost": 0,
          "gamesWon": 36,
          "gamesLost": 18,
          "points": 6
        }
      ]
    }
  ]
}
```

**Vista de Árbol Mejorada** ⭐ NUEVO:

El componente `bracket-tree.tsx` ahora:
- Muestra columna de grupos con todos los equipos y sus puntos
- Marca en verde los equipos clasificados (según lógica del torneo)
- Marca en gris los equipos no clasificados
- Filtra partidos de grupos del árbol (solo muestra eliminatorias)
- Orden correcto: Grupos → Semifinales → Final (izquierda a derecha)
- Líneas conectoras corregidas

**Walkovers**: Ahora se cuentan correctamente como partidos jugados en las estadísticas

**Implementación**:
- Función principal: `generateGroupStageEliminationBracket()` en `bracket-service.ts:481`
- Configuración óptima: `calculateOptimalGroupConfiguration()` en `bracket-service.ts:353`
- Cálculo de tablas: `calculateGroupStandings()` en `bracket-service.ts:1062`
- Clasificación: `classifyTeamsToEliminationPhase()` en `bracket-service.ts:1218`
- Clasificación automática: `src/app/api/matches/[id]/result/route.ts:224-266`
- Asignación playoffs: `assignClassifiedTeamsToPlayoffs()` en `bracket-service.ts:1360`
- Distribución serpiente: Líneas 521-548 en `generateGroupStageEliminationBracket()`

**Componentes UI**:
- Generador: `src/components/brackets/bracket-generator.tsx`
- Visualización: `src/components/brackets/bracket-visualization.tsx`
- Vista de árbol: `src/components/brackets/bracket-tree.tsx` ⭐ MEJORADO
- Visualización de grupos: `src/components/brackets/groups-visualization.tsx` ⭐ MEJORADO
- Tablas de grupos: `src/components/brackets/group-standings.tsx`
- Página dashboard: `src/app/dashboard/tournaments/[id]/brackets/page.tsx`

**APIs**:
- Generar bracket: `POST /api/tournaments/[id]/generate-bracket`
- Ver bracket: `GET /api/tournaments/[id]/bracket?categoryId=xxx`
- Ver grupos: `GET /api/tournaments/[id]/groups?categoryId=xxx` ⭐ MEJORADO (incluye estadísticas)
- Clasificar: `POST /api/tournaments/[id]/classify` (también automático al completar grupos)
- Cargar resultado: `POST /api/matches/[id]/result` ⭐ MEJORADO (clasifica automáticamente)

---

### ✅ Americano

**Estado**: Completamente implementado

**Descripción**:
Formato basado en Round-Robin donde todos los equipos juegan entre sí. En pádel, el Americano usa parejas fijas (equipos de 2 jugadores) que rotan sus enfrentamientos. Sistema de liga donde todos juegan contra todos.

**Características Implementadas**:
- Todos los equipos juegan entre sí exactamente una vez
- Algoritmo Round-Robin Circle Method para rotación
- Sistema de bye automático para número impar de equipos
- 4-10 rondas adaptativas según número de equipos
- Ranking basado en victorias y diferencia de sets

**Estructura Real**:
```
8 Equipos (parejas): A, B, C, D, E, F, G, H

Ronda 1:
Pista 1: A vs B
Pista 2: C vs D
Pista 3: E vs F
Pista 4: G vs H

Ronda 2 (rotación usando Circle Method):
Pista 1: A vs H
Pista 2: B vs G
Pista 3: C vs F
Pista 4: D vs E

Ronda 3:
Pista 1: A vs G
Pista 2: H vs F
Pista 3: B vs E
Pista 4: C vs D

... continúa hasta que todos jueguen contra todos

Ranking Final:
Pos  Equipo  PJ  PG  PP  Sets a favor  Sets en contra  Diff
1    A       7   6   1   18            8               +10
2    E       7   5   2   16            10              +6
3    C       7   5   2   15            11              +4
4    B       7   4   3   14            12              +2
...
```

**Algoritmo Round-Robin Circle Method**:
```
Equipos: [0, 1, 2, 3, 4, 5, 6, 7]

El equipo 0 permanece fijo, los demás rotan en sentido horario

Ronda 1: (0 vs 7), (1 vs 6), (2 vs 5), (3 vs 4)
Ronda 2: (0 vs 6), (7 vs 5), (1 vs 4), (2 vs 3)
Ronda 3: (0 vs 5), (6 vs 4), (7 vs 3), (1 vs 2)
Ronda 4: (0 vs 4), (5 vs 3), (6 vs 2), (7 vs 1)
...

Para equipos impares, se agrega un "bye" (equipo fantasma)
```

**Número de Partidos**:
- Con N equipos: cada uno juega `(N - 1)` partidos
- Total de partidos: `N × (N - 1) / 2`
- 8 equipos = 7 partidos por equipo = 28 partidos totales
- 6 equipos = 5 partidos por equipo = 15 partidos totales

**Ventajas**:
- Todos juegan la misma cantidad de partidos
- No hay eliminación: todos participan en todas las rondas
- Ranking más justo: se basa en todos los enfrentamientos
- Ideal para torneos de liga

**Desventajas**:
- Requiere muchos partidos: crece cuadráticamente
- No es práctico para más de 12-16 equipos
- Requiere gestión de múltiples pistas simultáneas
- Duración total del torneo puede ser larga

**Casos de Uso**:
- Torneos de liga con 4-12 equipos
- Competiciones donde se quiere ranking completo
- Formato "todos contra todos"
- Ideal para 8 equipos en 4 pistas

**Implementación**:
- Función principal: `generateAmericanoBracket()` en `bracket-service.ts:1432`
- Algoritmo de rotación: `generateRoundRobinPairings()` en `bracket-service.ts:1492`
- Validación: Mínimo 4 equipos requeridos
- Cálculo adaptativo: Máximo 10 rondas
- Manejo de bye: Automático para equipos impares
- Integración: Líneas 98-100 en switch case principal

**Componentes UI**:
- Generador: `src/components/brackets/bracket-generator.tsx`
- Visualización: `src/components/brackets/bracket-visualization.tsx`
- Tabla de posiciones: Reutiliza componentes de Round-Robin
- Página dashboard: `src/app/dashboard/tournaments/[id]/brackets/page.tsx`

**APIs**:
- Generar bracket: `POST /api/tournaments/[id]/generate-bracket`
- Ver bracket: `GET /api/tournaments/[id]/bracket?categoryId=xxx`
- Cargar resultado: `POST /api/matches/[id]/result`

---

### ✅ Americano Social

**Estado**: Completamente implementado

**Descripción**:
Variante del formato Americano diseñado específicamente para torneos sociales de pádel. A diferencia del Americano tradicional (equipos fijos), en el Americano Social los **jugadores individuales** se agrupan en pools de 4, donde cada jugador juega 3 partidos con diferentes compañeros contra diferentes rivales dentro del mismo pool.

**Diferencia Clave con Americano Tradicional**:
- **Americano**: Equipos fijos de 2 jugadores que juegan contra todos los demás equipos
- **Americano Social**: Jugadores individuales que rotan compañeros y rivales dentro de pools de 4

**Características Implementadas**:
- Sistema de pools de exactamente 4 jugadores
- Cada jugador juega 3 partidos con diferentes compañeros
- Rotación automática de parejas dentro del pool
- Ranking individual por pool y ranking global del torneo
- Requiere múltiplo de 4 jugadores (4, 8, 12, 16, 20, etc.)
- Sistema de puntos basado en games ganados

**Estructura Real - Un Pool de 4 Jugadores [A, B, C, D]**:

```
POOL A - 4 Jugadores: Alice (A), Bob (B), Carol (C), David (D)

Ronda 1:
Pista 1: AB vs CD
  • Alice + Bob (Team A)
  • vs
  • Carol + David (Team B)

Ronda 2:
Pista 1: AC vs BD
  • Alice + Carol (Team A)
  • vs
  • Bob + David (Team B)

Ronda 3:
Pista 1: AD vs BC
  • Alice + David (Team A)
  • vs
  • Bob + Carol (Team B)

Cada jugador:
✅ Juega 3 partidos
✅ Juega con 3 compañeros diferentes (todos los demás del pool)
✅ Juega contra todos los demás del pool

Ranking del Pool (basado en games ganados):
Pos  Jugador  PJ  Victorias  Games+  Games-  Diff  Puntos
1    Alice    3   3          18      6       +12   18
2    Carol    3   2          15      9       +6    15
3    Bob      3   1          12      12      0     12
4    David    3   0          6       18      -12   6
```

**Estructura Completa - Torneo con 12 Jugadores**:

```
12 Jugadores → 3 Pools de 4 jugadores

POOL A (4 jugadores)
- 3 rondas
- 3 partidos totales

POOL B (4 jugadores)
- 3 rondas
- 3 partidos totales

POOL C (4 jugadores)
- 3 rondas
- 3 partidos totales

Total de partidos: 9 partidos simultáneos (3 canchas)

RANKING GLOBAL (todos los jugadores del torneo):
Combina resultados de todos los pools
Ordenado por: Games ganados → Games perdidos → Partidos ganados

Pos  Jugador        Pool  PJ  Games+  Games-  Diff  Puntos
1    Alice Silva    A     3   18      6       +12   18
2    Juan Pérez     B     3   17      8       +9    17
3    María López    C     3   16      9       +7    16
4    Carol White    A     3   15      9       +6    15
5    Pedro García   B     3   14      10      +4    14
...
```

**Número de Partidos**:
- Por pool de 4 jugadores: 3 partidos
- Con N jugadores (múltiplo de 4):
  - Número de pools: `N / 4`
  - Total de partidos: `(N / 4) × 3`
  - Ejemplos:
    - 8 jugadores = 2 pools = 6 partidos
    - 12 jugadores = 3 pools = 9 partidos
    - 16 jugadores = 4 pools = 12 partidos
    - 20 jugadores = 5 pools = 15 partidos

**Sistema de Puntuación**:
- **Puntos**: Cada game ganado = 1 punto
- **Ranking por Pool**: Games ganados totales
- **Ranking Global**: Combina todos los jugadores de todos los pools
- **Desempate**:
  1. Games ganados totales
  2. Diferencia de games (ganados - perdidos)
  3. Partidos ganados
  4. Games perdidos (menos es mejor)

**Ventajas**:
- Formato social: conoces nuevos jugadores
- Todos juegan la misma cantidad (3 partidos)
- No hay eliminación: todos participan hasta el final
- Equitativo: juegas con todos como compañero
- Ranking justo basado en rendimiento individual
- Ideal para torneos recreativos
- Fácil de organizar en paralelo (múltiples pools)

**Desventajas**:
- Requiere exactamente múltiplo de 4 jugadores
- No hay equipos fijos (puede no gustar a todos)
- Depende mucho de los compañeros que te toquen
- Rankings de pools diferentes no son directamente comparables

**Casos de Uso**:
- **Torneos sociales de club** (8-20 jugadores)
- **Eventos recreativos** donde se quiere socializar
- **Torneos de integración** para nuevos socios
- **Formato "mixto"** (puede jugarse hombre-mujer)
- **Ligas regulares** con rotación de compañeros
- Ideal para **2-4 horas** de duración

**Ejemplo Práctico: Torneo Social de 16 Jugadores**:

```
16 jugadores → 4 pools (A, B, C, D)
4 canchas disponibles

Horario:
10:00 - 11:00: Ronda 1 de todos los pools (4 partidos simultáneos)
11:15 - 12:15: Ronda 2 de todos los pools (4 partidos simultáneos)
12:30 - 13:30: Ronda 3 de todos los pools (4 partidos simultáneos)
13:30 - 14:00: Premiación según ranking global

Total: 12 partidos en 3.5 horas
Cada jugador: 3 partidos garantizados
```

**Implementación Técnica**:

**Modelos de Base de Datos**:
```prisma
model AmericanoPool {
  id           String
  tournamentId String
  categoryId   String
  name         String  // "Pool A", "Pool B"
  poolNumber   Int     // 1, 2, 3...

  players      AmericanoPoolPlayer[]
  matches      AmericanoPoolMatch[]
}

model AmericanoPoolPlayer {
  id          String
  poolId      String
  playerId    String
  position    Int     // 1-4
  gamesWon    Int     // Total games ganados
  gamesLost   Int     // Total games perdidos
  matchesWon  Int     // Partidos ganados
  matchesLost Int     // Partidos perdidos
  totalPoints Int     // = gamesWon
}

model AmericanoPoolMatch {
  id         String
  poolId     String
  roundNumber Int    // 1, 2, 3
  player1Id  String  // Team A - Jugador 1
  player2Id  String  // Team A - Jugador 2
  player3Id  String  // Team B - Jugador 1
  player4Id  String  // Team B - Jugador 2

  teamAScore Int?    // Sets ganados por Team A
  teamBScore Int?    // Sets ganados por Team B
  winnerTeam String? // "A" o "B"
  status     String  // SCHEDULED, COMPLETED

  sets       AmericanoPoolMatchSet[]
}

model AmericanoGlobalRanking {
  id           String
  tournamentId String
  categoryId   String
  playerId     String
  gamesWon     Int    // Acumulado de todos los pools
  gamesLost    Int
  matchesWon   Int
  matchesLost  Int
  totalPoints  Int    // = gamesWon
}
```

**Servicio Principal**: `src/lib/services/americano-social-service.ts`

**Métodos Principales**:
```typescript
// Generar pools y partidos
AmericanoSocialService.generateAmericanoSocialPools(
  tournamentId,
  categoryId,
  players // Array de jugadores inscritos
)

// Actualizar resultado de partido
AmericanoSocialService.updateMatchResult(
  matchId,
  teamAScore, // Sets ganados por Team A
  teamBScore, // Sets ganados por Team B
  sets        // Array de SetResult
)

// Obtener rankings
AmericanoSocialService.getPoolRankings(poolId)
AmericanoSocialService.getGlobalRanking(tournamentId, categoryId)
```

**Validaciones**:
- ✅ Número de jugadores debe ser múltiplo de 4
- ✅ Mínimo 4 jugadores requeridos
- ✅ Todos los jugadores deben estar inscritos en la categoría
- ✅ Verifica que no existan pools previamente creados

**Algoritmo de Rotación**:
```typescript
// Pool con jugadores: [A, B, C, D]
// Partidos generados automáticamente:

Partido 1: (A, B) vs (C, D)  // roundNumber: 1
Partido 2: (A, C) vs (B, D)  // roundNumber: 2
Partido 3: (A, D) vs (B, C)  // roundNumber: 3

// Garantiza que:
// - Cada jugador juega con todos los demás como compañero
// - Cada jugador juega contra todos los demás como rival
// - Total: 3 partidos por jugador
```

**Componentes UI**:
- Vista principal: `src/app/dashboard/tournaments/[id]/americano-social/page.tsx`
- Detalle de pools: `src/components/tournaments/americano-social/americano-social-detail.tsx`
- Configuración de pools: `src/components/tournaments/americano-social/americano-pools-setup.tsx` ⭐ NUEVO
- Carga de resultados: `src/components/tournaments/americano-social/americano-match-result-dialog.tsx`
- Tabla de pools: `src/components/tournaments/americano-social/pool-card.tsx`
- Ranking global: `src/components/tournaments/americano-social/global-ranking-table.tsx`

**APIs Implementadas**:
- Preview de configuración: `GET /api/tournaments/[id]/americano-social/preview?categoryId=xxx` ⭐ NUEVO
- Generar pools: `POST /api/tournaments/[id]/americano-social/generate`
  - Body: `{ categoryId, numberOfRounds?, force? }`
- Ver pools: `GET /api/tournaments/[id]/americano-social/pools?categoryId=xxx`
- Cargar resultado: `POST /api/americano-social/matches/[id]/result`

**Ejemplo de Respuesta API - Pools**:
```json
{
  "pools": [
    {
      "id": "pool-1",
      "name": "Pool A",
      "poolNumber": 1,
      "players": [
        {
          "playerId": "player-1",
          "firstName": "Alice",
          "gamesWon": 18,
          "gamesLost": 6,
          "position": 1
        },
        // ... 3 más jugadores
      ],
      "matches": [
        {
          "roundNumber": 1,
          "player1": { "firstName": "Alice" },
          "player2": { "firstName": "Bob" },
          "player3": { "firstName": "Carol" },
          "player4": { "firstName": "David" },
          "status": "COMPLETED",
          "teamAScore": 2,
          "teamBScore": 0
        }
        // ... 2 partidos más
      ]
    }
    // ... más pools
  ],
  "globalRanking": [
    {
      "playerId": "player-1",
      "firstName": "Alice",
      "lastName": "Silva",
      "gamesWon": 18,
      "totalPoints": 18,
      "position": 1
    }
    // ... más jugadores
  ]
}
```

**Flujo de Trabajo (Actualizado Dic 2025)**:
1. Admin selecciona torneo con tipo AMERICANO_SOCIAL
2. Click en "Generar Pools" → Se abre dialog de configuración ⭐ NUEVO
3. **Dialog de Configuración Automática**:
   - Selector de categoría (si hay múltiples)
   - Sistema calcula automáticamente:
     * Número de jugadores CONFIRMED/PAID
     * Número de pools que se generarían (N/4)
     * Rondas recomendadas (mín, óptimo, máx)
   - Slider interactivo para seleccionar rondas (1-10)
   - Preview en tiempo real:
     * Total de pools y partidos
     * Distribución por ronda
     * Lista de jugadores confirmados
   - Advertencia si hay pools existentes
4. Validación automática:
   - ✅ Múltiplo de 4 jugadores (4, 8, 12, 16...)
   - ✅ Solo jugadores CONFIRMED o PAID
   - ⚠️ Error si no cumple requisitos
5. Admin confirma → Sistema genera pools y partidos
6. Jugadores se dividen aleatoriamente en pools de 4
7. Se generan 3 partidos × pools × rondas con rotación automática
8. Admin/Árbitro carga resultados partido por partido
9. Rankings se actualizan automáticamente (pool y global)
10. Al final: Ranking global determina ganadores 1°, 2°, 3°

**Sistema de Configuración Automática de Rondas (Dic 2025)** ⭐:

El sistema ahora incluye un **dialog de configuración inteligente** que calcula automáticamente el número óptimo de rondas:

```typescript
// Servicio: AmericanoSocialService
static calculateOptimalRounds(numPlayers: number): {
  min: number
  optimal: number
  max: number
} {
  if (numPlayers < 4 || numPlayers % 4 !== 0) {
    return { min: 1, optimal: 1, max: 1 }
  }

  // Fórmula teórica: Con N jugadores, máximo = (N-1) / 3
  const theoreticalMax = Math.floor((numPlayers - 1) / 3)

  // Óptimo = 70% del máximo teórico, cap a 5 rondas
  const optimal = Math.min(Math.max(2, Math.floor(theoreticalMax * 0.7)), 5)

  // Máximo = teórico, cap a 10 rondas
  const max = Math.min(theoreticalMax, 10)

  return { min: 1, optimal, max }
}

// Ejemplos:
// 8 jugadores  → { min: 1, optimal: 2, max: 2 }
// 12 jugadores → { min: 1, optimal: 2, max: 3 }
// 16 jugadores → { min: 1, optimal: 3, max: 5 }
// 20 jugadores → { min: 1, optimal: 4, max: 6 }
```

**API Preview** (`GET /api/tournaments/[id]/americano-social/preview`):
```typescript
// Respuesta del endpoint preview
{
  isValid: boolean                    // true si múltiplo de 4
  numPlayers: number                  // Jugadores CONFIRMED + PAID
  numPools: number                    // N / 4
  roundsRecommendation: {
    min: number                       // Siempre 1
    optimal: number                   // Calculado automáticamente
    max: number                       // Máximo recomendado
  }
  hasExistingPools: boolean          // Advertencia si hay pools
  existingPoolsCount: number
  category: { id, name }
  players: Array<{id, firstName, lastName}>
  error?: string                      // Si no es válido
}
```

**Características del Dialog**:
- ✅ Selector de categoría (múltiples categorías en torneo)
- ✅ Cálculo automático de rondas óptimas
- ✅ Slider interactivo (mín → óptimo → máx)
- ✅ Badges visuales: "Recomendado", "Pocas rondas", "Muchas rondas"
- ✅ Preview de distribución:
  - Total de pools y partidos
  - Breakdown por ronda
  - Lista de jugadores confirmados
- ✅ Validación en tiempo real
- ✅ Advertencia si pools existentes (regeneración)

**Estados de Registro Considerados**:
- ✅ `CONFIRMED` - Jugador confirmado
- ✅ `PAID` - Jugador pagado
- ❌ `PENDING` - NO se cuenta (aún no confirmado)
- ❌ `CANCELLED` - NO se cuenta (cancelado)
- ❌ `WAITLIST` - NO se cuenta (lista de espera)

**Lógica**: Solo jugadores que **definitivamente van a participar** se cuentan para generar pools.

---

### 🆕 Sistema de Múltiples Rondas (Actualizado: Dic 2025)

**Descripción**:
El sistema Americano Social ahora soporta **múltiples rondas** con rotación inteligente que minimiza la repetición de parejas entre rondas.

**Configuración**:
```prisma
model Tournament {
  americanoRounds Int @default(1) // 1-10 rondas configurables
}

model AmericanoPool {
  roundNumber Int @default(1) // Número de ronda
  @@unique([tournamentId, categoryId, roundNumber, poolNumber])
}
```

**Cálculo Matemático de Rondas Óptimas**:
```typescript
// Basado en Social Golfer Problem (NP-completo)
function calculateMaxRoundsWithoutRepetition(numPlayers: number): number {
  const numPools = numPlayers / 4
  return Math.max(1, numPools - 1)
}

// Ejemplos verificados:
// 8 jugadores  → 1 ronda sin repetir (2-1 = 1)
// 12 jugadores → 2 rondas sin repetir (3-1 = 2)
// 16 jugadores → 3 rondas sin repetir (4-1 = 3)
// 20 jugadores → 4 rondas sin repetir (5-1 = 4)
```

**Fórmula Explicada**:
- Este es el problema del "Social Golfer": maximizar rondas sin repetir parejas en grupos
- Es un problema NP-completo sin fórmula exacta
- Fórmula conservadora: `(N/4) - 1` basada en análisis de casos conocidos
- Con N jugadores formamos N/4 pools por ronda
- Cada pool genera C(4,2) = 6 parejas únicas
- **Rondas máximas sin repetir** ≈ número de pools menos 1

**Algoritmo de Generación Inteligente**:

**Ronda 1:** Distribución aleatoria (base)
```typescript
shuffledPlayers = mezclarAleatoriamente(players)
pools = dividirEnGruposDe4(shuffledPlayers)
```

**Rondas 2+:** Minimizar TODAS las repeticiones en el pool (greedy mejorado)
```typescript
// Tracking de jugadores que han compartido pool
playerPoolHistory = Map<playerId, Set<jugadoresQueCompartieronPoolId>>

for cada nueva ronda:
  for cada pool a crear:
    1. Seleccionar jugador "anchor" (primero disponible)
    2. Para cada candidato disponible:
       a. Crear pool temporal = [pool actual + candidato]
       b. Contar TODAS las parejas repetidas en ese pool temporal
          usando countPoolRepetitions(pool, history)
       c. Asignar score de repeticiones totales
    3. Seleccionar candidato con MENOR score total
    4. Actualizar playerPoolHistory con nuevas interacciones

// Método auxiliar crítico
countPoolRepetitions(pool, history):
  repetitions = 0
  for cada par (i,j) en pool:
    if history[i].has(j): repetitions++
  return repetitions
  // Retorna 0 si el pool es perfecto (sin repeticiones)
```

**Ejemplo Visual de 3 Rondas (8 jugadores)**:

```
JUGADORES: Juan, Pedro, María, Ana, Carlos, Luis, Sofia, Laura

RONDA 1 (aleatorio):
- R1 - Pool A: [Juan, Pedro, María, Ana]
  Partidos: JP-MA, JM-PA, JA-PM
- R1 - Pool B: [Carlos, Luis, Sofia, Laura]
  Partidos: CL-SL, CS-LL, CL-LS

RONDA 2 (mínimas repeticiones con 8 jugadores):
- R2 - Pool A: [Juan, Carlos, Pedro, Luis]
  Partidos: JC-PL, JP-CL, JL-CP
  Score de repeticiones: 1 (JP ya se conocían de R1)
  ↑ 5 parejas nuevas, 1 repetida
- R2 - Pool B: [María, Sofia, Ana, Laura]
  Partidos: MS-AL, MA-SL, ML-AS
  Score de repeticiones: 1 (MA ya se conocían de R1)
  ↑ 5 parejas nuevas, 1 repetida

Con 8 jugadores: Ronda 2 tiene mínimo 2 repeticiones totales (inevitable)

RONDA 3 (muchas más repeticiones con 8 jugadores):
- R3 - Pool A: [Juan, María, Pedro, Ana]
  Score: 4 (JP, JM, JA, PA ya se conocían)
- R3 - Pool B: [Carlos, Sofia, Luis, Laura]
  Score: 4 (CS, CL, SL, LL ya se conocían)

TOTAL con 1 ronda: 6 partidos, 3 games por jugador, 0 repeticiones ✓
TOTAL con 2 rondas: 12 partidos, 6 games por jugador, 2 repeticiones mínimas
TOTAL con 3 rondas: 18 partidos, 9 games por jugador, 10+ repeticiones
```

**Utilidad Matemática**:
Archivo: `src/lib/utils/americano-rounds.ts`

```typescript
// Calcula rondas máximas sin repetir
calculateMaxRoundsWithoutRepetition(numPlayers: number): number

// Genera mensaje informativo
getRoundsRecommendationMessage(numPlayers: number): string
// Ejemplo output:
// "Con 8 jugadores (2 pools por ronda), se recomienda hasta 1 ronda
//  para minimizar repeticiones. A partir de la ronda 2, es inevitable
//  que algunos jugadores compartan pool nuevamente (el algoritmo
//  minimizará estas repeticiones)."

// Valida configuración
isValidRoundsConfiguration(rounds: number, numPlayers: number): boolean
```

**UI - Formulario de Creación**:
```tsx
{/* Campo visible solo para AMERICANO_SOCIAL */}
{form.watch("type") === "AMERICANO_SOCIAL" && (
  <FormField name="americanoRounds">
    <Input type="number" min={1} max={10} />
    <FormDescription>
      Cada ronda genera nuevos pools con rotación de jugadores.
      {/* Mensaje dinámico según número de jugadores */}
      Con 8 jugadores, se recomienda hasta 1 ronda para minimizar repeticiones.
    </FormDescription>
  </FormField>
)}
```

**UI - Visualización por Rondas**:

**Opción 1: Una sola ronda**
```
Tab: Pools
├─ Pool A (4 jugadores, 3 partidos)
├─ Pool B (4 jugadores, 3 partidos)
└─ Pool C (4 jugadores, 3 partidos)
```

**Opción 2: Múltiples rondas (con tabs)**
```
Tab: Pools
├─ [Tab] Ronda 1
│   ├─ R1 - Pool A (4 jugadores, 3 partidos)
│   └─ R1 - Pool B (4 jugadores, 3 partidos)
├─ [Tab] Ronda 2
│   ├─ R2 - Pool A (4 jugadores, 3 partidos)
│   └─ R2 - Pool B (4 jugadores, 3 partidos)
└─ [Tab] Ronda 3
    ├─ R3 - Pool A (4 jugadores, 3 partidos)
    └─ R3 - Pool B (4 jugadores, 3 partidos)
```

---

### 📅 Sistema de Programación de Partidos (Actualizado: Dic 18, 2025)

**Descripción**:
Sistema completo de programación de partidos con fecha, hora y cancha para torneos Americano Social.

**Características**:
- ✅ Programar partidos desde vista de pools (no solo vista individual)
- ✅ Selector de fecha y hora (intervalos de 15 minutos)
- ✅ Visualización de información programada en tarjetas de partido
- ✅ Iniciar partidos programados (SCHEDULED → IN_PROGRESS)
- ✅ Información de cancha y horario en PDFs de planillas

**Modelo de Datos**:
```prisma
model AmericanoPoolMatch {
  id           String
  poolId       String
  tournamentId String
  categoryId   String
  roundNumber  Int

  // Jugadores del partido
  player1Id String
  player2Id String
  player3Id String
  player4Id String

  // Resultado
  status     MatchStatus @default(SCHEDULED)
  teamAScore Int?
  teamBScore Int?
  winnerTeam String?

  // Programación
  scheduledFor DateTime?  // ⭐ Fecha y hora programada
  completedAt  DateTime?

  // Nota: La cancha se asigna al pool, no al partido individual
  pool AmericanoPool @relation(fields: [poolId], references: [id])
}

model AmericanoPool {
  id           String
  tournamentId String
  categoryId   String
  name         String
  courtId      String?  // ⭐ Cancha asignada al pool
  poolNumber   Int
  roundNumber  Int

  court   Court?                @relation(fields: [courtId], references: [id])
  players AmericanoPoolPlayer[]
  matches AmericanoPoolMatch[]
}
```

**Componentes UI**:

1. **Dialog de Programación** (`AmericanoMatchScheduleDialog`):
```tsx
<AmericanoMatchScheduleDialog
  match={match}
  poolName={pool.name}           // Props opcionales
  tournamentName={tournament.name}
  open={isOpen}
  onSuccess={handleRefresh}
/>

// Características:
// - Selector de fecha (date input)
// - Selector de hora (dropdown con intervalos de 15 min)
// - Vista previa de programación actual
// - Botón para limpiar programación
// - Validación en tiempo real
```

2. **Tarjeta de Partido** (`AmericanoMatchCard`):
```tsx
<AmericanoMatchCard
  match={match}
  poolCourt={pool.court}  // ⭐ Cancha del pool
  canManage={true}
  onSchedule={() => openScheduleDialog(match)}
  onStartMatch={() => confirmStart(match)}
  onLoadResult={() => openResultDialog(match)}
/>

// Muestra:
// - Fecha/hora si está programado (scheduledFor)
// - Nombre de cancha del pool (poolCourt.name)
// - Dropdown con acciones: Programar, Iniciar, Cargar resultado
```

**API Endpoints**:

```typescript
// Programar partido
PATCH /api/americano-matches/[id]/schedule
Body: {
  scheduledFor: string | null  // ISO 8601 datetime o null para limpiar
}
Response: { success: true, match: {...} }

// Iniciar partido
PATCH /api/americano-matches/[id]/status
Body: {
  status: "IN_PROGRESS" | "SCHEDULED" | "COMPLETED"
}
Response: { success: true, match: {...} }

// El resultado se carga igual que antes
POST /api/americano-matches/[id]/result
```

**Flujo de Trabajo**:

1. **Admin programa partido**:
   - Click en menú del partido → "Programar partido"
   - Selecciona fecha: "18/12/2025"
   - Selecciona hora: "15:30"
   - Guarda → Estado: SCHEDULED

2. **Info visible en tarjeta**:
   ```
   ┌─────────────────────────────────────────┐
   │ Partido 1               [PROGRAMADO]    │
   │ ─────────────────────────────────────   │
   │ Alice Silva / Bob Jones                 │
   │         6-4  6-3                        │
   │ Carol White / David Brown               │
   │ ─────────────────────────────────────   │
   │ 📅 18/12/2025 15:30                     │
   │ 📍 Cancha Principal                     │
   └─────────────────────────────────────────┘
   ```

3. **Inicio de partido**:
   - Click en menú → "Iniciar partido"
   - Confirmación → Estado: IN_PROGRESS
   - El partido aparece como "En Progreso"

4. **Carga de resultado**:
   - Click en menú → "Cargar resultado"
   - Ingresa sets y games
   - Guarda → Estado: COMPLETED

**PDFs de Planillas (Scoresheets)**:

Los PDFs ahora incluyen información de programación:

```
┌────────────────────────────────────────────────────────────┐
│ Torneo Social de Pádel                                     │
│                                                            │
│ R1 - Pool A                                                │
│ Ronda 1                                                    │
│ Cancha: Cancha Principal          ⭐ NUEVO                │
│ ──────────────────────────────────────────────────────── │
│                                                            │
│ Jugadores                                                  │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                         │
│ Alice Silva                                                │
│ Bob Jones                                                  │
│ Carol White                                                │
│ David Brown                                                │
│                                                            │
│ Partidos                                                   │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                         │
│ Partido 1   18/12/2025 15:30      ⭐ NUEVO                │
│   Alice Silva / Bob Jones          [  ]                   │
│   Carol White / David Brown        [  ]                   │
│                                                            │
│ Partido 2   18/12/2025 16:45      ⭐ NUEVO                │
│   Alice Silva / Carol White        [  ]                   │
│   Bob Jones / David Brown          [  ]                   │
│                                                            │
│ Partido 3                                                  │
│   Alice Silva / David Brown        [  ]                   │
│   Bob Jones / Carol White          [  ]                   │
└────────────────────────────────────────────────────────────┘
```

**Implementación**:

**Archivos modificados**:
- `src/components/tournaments/americano-social/americano-match-card.tsx`:
  - Cambio de `scheduledAt` a `scheduledFor` (nombre correcto del campo)
  - Prop `poolCourt` para mostrar cancha del pool
  - Visualización de fecha/hora y cancha

- `src/components/tournaments/americano-social/pool-card.tsx`:
  - State para `matchToSchedule` y `matchToStart`
  - Dialog `AmericanoMatchScheduleDialog`
  - AlertDialog para confirmación de inicio
  - PDF generation con cancha y fecha/hora

- `src/components/tournaments/americano-social/americano-social-detail.tsx`:
  - PDF generation para "Imprimir todas las planillas"
  - Incluye cancha y fecha/hora en cada página

- `src/components/tournaments/americano-social/americano-match-schedule-dialog.tsx`:
  - Props opcionales `poolName` y `tournamentName`
  - Fallback a `match.pool?.name` y `match.tournament?.name`

**Características Técnicas**:
- **Client-side PDF**: jsPDF con dynamic imports
- **Date formatting**: date-fns con locale español
- **State management**: React useState para dialogs
- **Spacing dinámico**: Layout se ajusta si hay cancha o no

**Validaciones**:
- ✅ Solo usuarios autorizados pueden programar (ADMIN, CLUB_ADMIN, REFEREE, Organizer)
- ✅ Solo partidos en estado SCHEDULED pueden iniciarse
- ✅ Fecha/hora se valida en el frontend (campo requerido)
- ✅ Confirmación antes de cambiar estado del partido

**User Experience**:
- ✅ Programación desde pool view (no navegar a match individual)
- ✅ Información visible en tarjetas
- ✅ PDFs listos para imprimir y usar en cancha
- ✅ Confirmaciones previenen errores accidentales

**Tab de Partidos (organizado por ronda)**:
```
Ronda 1
  6 partidos en 2 pools
  ├─ R1 - Pool A
  │   ├─ Partido 1: AB vs CD
  │   ├─ Partido 2: AC vs BD
  │   └─ Partido 3: AD vs BC
  └─ R1 - Pool B
      └─ ...

Ronda 2
  6 partidos en 2 pools (nuevos emparejamientos)
  └─ ...
```

**Servicio Actualizado**:
```typescript
// Método principal ahora acepta número de rondas
AmericanoSocialService.generateAmericanoSocialPools(
  tournamentId: string,
  categoryId: string,
  players: Player[],
  numberOfRounds: number = 1  // 🆕 Nuevo parámetro
)

// Métodos privados para algoritmo
private static generateFirstRound() // Aleatorio
private static generateSubsequentRound() // Minimiza repeticiones
private static updatePairHistory() // Tracking de interacciones
```

**API Response con Múltiples Rondas**:
```json
{
  "success": true,
  "message": "6 pools generados exitosamente (2 pools x 3 ronda(s))",
  "data": {
    "totalPools": 6,
    "poolsPerRound": 2,
    "numberOfRounds": 3,
    "numPlayers": 8
  }
}
```

**Validaciones Adicionales**:
- ✅ Rondas debe estar entre 1-10
- ✅ Número de jugadores sigue siendo múltiplo de 4
- ✅ Mensaje informativo si se excede máximo recomendado
- ✅ Regeneración elimina todas las rondas previas

**Beneficios del Sistema**:
- ✅ **Maximiza variedad**: Jugadores conocen más personas
- ✅ **Minimiza repeticiones**: Algoritmo greedy las reduce al mínimo
- ✅ **Flexible**: 1-10 rondas configurables según necesidad
- ✅ **Informativo**: Cálculo automático de rondas óptimas
- ✅ **Justo**: Más partidos = mejor estadística y ranking
- ✅ **UX clara**: Tabs organizados por ronda, fácil navegación

**Limitaciones Conocidas**:
- ⚠️ Más allá del máximo calculado, algunas repeticiones son inevitables matemáticamente
- ⚠️ Torneo más largo (3 rondas = 3x tiempo de juego)
- ⚠️ Requiere que todos los jugadores estén disponibles para todas las rondas
- ⚠️ Algoritmo greedy no garantiza distribución perfecta, solo minimiza

**Casos de Uso Ideales**:
- ✅ Torneos sociales de fin de semana (2-3 rondas)
- ✅ Clínicas de práctica con rotación
- ✅ Eventos corporativos/team building
- ✅ Desarrollo de jugadores (más partidos = más experiencia)

---

## Formatos Pendientes

### ⏳ Sistema Suizo

**Estado**: No implementado

**Descripción**:
Sistema de emparejamiento dinámico donde en cada ronda se enfrentan equipos con récords similares. No hay eliminación - todos juegan un número fijo de rondas.

**Características Propuestas**:
- Número fijo de rondas (típicamente log₂(N) redondeado)
- Emparejamiento por puntos similares
- No se repiten enfrentamientos
- Evita eliminar equipos
- Ranking final por puntos acumulados

**Estructura Propuesta**:
```
Ronda 1: Emparejamiento aleatorio o por seed
1 vs 9, 2 vs 10, 3 vs 11, 4 vs 12, 5 vs 13, 6 vs 14, 7 vs 15, 8 vs 16

Ronda 2: Emparejar equipos con mismo récord
Winners (1-0): 1 vs 2, 3 vs 4, 5 vs 6, 7 vs 8
Losers (0-1): 9 vs 10, 11 vs 12, 13 vs 14, 15 vs 16

Ronda 3: Emparejar equipos con mismo récord
(2-0): Winner(1vs2) vs Winner(3vs4), Winner(5vs6) vs Winner(7vs8)
(1-1): Loser(1vs2) vs Winner(9vs10), Loser(3vs4) vs Winner(11vs12), etc.
(0-2): Loser(9vs10) vs Loser(11vs12), Loser(13vs14) vs Loser(15vs16)

... continúa por N rondas

Tabla Final (después de 4 rondas con 16 equipos):
Pos  Equipo  Récord  Buchholz  Pts
1    Team A  4-0     12        8
2    Team B  4-0     11        8
3    Team C  3-1     10        6
...
```

**Número de Partidos**:
- Con N equipos en R rondas: `(N / 2) × R` partidos
- 16 equipos × 4 rondas = 32 partidos
- 32 equipos × 5 rondas = 80 partidos

**Ventajas**:
- Partidos competitivos (equipos de nivel similar)
- Todos juegan el mismo número de partidos
- No hay eliminación: todos participan hasta el final
- Eficiente en número de partidos vs round robin

**Desventajas**:
- Complejo de emparejar (software necesario)
- Puede no haber un claro ganador al final
- Tie-breaking puede ser complicado (Buchholz, Sonneborn-Berger)

**Casos de Uso Propuestos**:
- Torneos ajedrecísticos de pádel
- Clubes con muchos socios (20-50 equipos)
- Ligas regulares donde todos quieren jugar

**Sistema Buchholz** (Tie-breaking):
Suma de puntos de todos los oponentes que enfrentaste. Favorece a quien jugó contra rivales más fuertes.

**Implementación Pendiente**:
- `generateSwissBracket()`
- `pairSwissRound()` - Algoritmo de emparejamiento
- `calculateBuchholz()` - Tie-breaking
- Tabla de standings con Buchholz

---


---

### ⏳ Mixto (Grupos + Round Robin Final)

**Estado**: No implementado

**Descripción**:
Similar a fase de grupos + eliminación, pero en lugar de playoffs de eliminación directa, los clasificados juegan un round robin final para determinar las posiciones finales.

**Características Propuestas**:
- Fase 1: Grupos con round robin
- Fase 2: Round robin entre clasificados (4-8 equipos)
- Todos los clasificados aseguran jugar varios partidos más
- Ranking final más justo que eliminación directa

**Estructura Propuesta**:
```
FASE DE GRUPOS (ejemplo: 16 equipos)
═══════════════════════════════════════════
Grupo A (4 equipos) → Top 2 clasifican
Grupo B (4 equipos) → Top 2 clasifican
Grupo C (4 equipos) → Top 2 clasifican
Grupo D (4 equipos) → Top 2 clasifican

Total clasificados: 8 equipos

FASE FINAL - Round Robin (8 equipos)
═══════════════════════════════════════════
Los 8 clasificados juegan todos contra todos

Cada equipo juega 7 partidos en fase final
Total partidos fase final: 8 × 7 / 2 = 28 partidos

Tabla Final:
Pos  Equipo  PJ  PG  PP  Sets    Pts
1    1A      7   7   0   14-0    14
2    2B      7   6   1   12-2    12
3    1C      7   5   2   10-4    10
4    2D      7   4   3   8-6     8
5    1B      7   3   4   6-8     6
6    2A      7   2   5   4-10    4
7    1D      7   1   6   2-12    2
8    2C      7   0   7   0-14    0
```

**Número de Partidos**:
- Fase grupos: igual que formato grupos + eliminación
- Fase final con C clasificados: `C × (C - 1) / 2`
- Ejemplo 16 equipos (8 clasifican):
  - Fase grupos: 24 partidos
  - Fase final: 28 partidos
  - **Total: 52 partidos**

**Ventajas**:
- Más justo que eliminación directa
- Los mejores equipos se enfrentan varias veces
- Ranking final muy preciso (1-8)
- Garantiza muchos partidos de alto nivel

**Desventajas**:
- Muchos partidos (casi como round robin completo)
- Requiere mucho tiempo
- Fase final puede tener partidos sin importancia

**Casos de Uso Propuestos**:
- Torneos de élite con pocos equipos
- Cuando importa el ranking completo (1-8)
- Torneos de varios días/semanas
- Ligas profesionales

**Implementación Pendiente**:
- `generateGroupStageRoundRobinBracket()`
- Lógica de clasificación a fase final
- Cálculo de ranking final completo

---

## 🔧 Detalles de Implementación

### Base de Datos

**Modelo `Match`**:
```prisma
model Match {
  roundNumber      Int?    // Identifica la ronda/fase
  matchNumber      Int?    // Número del partido en la ronda
  phaseType        PhaseType
  team1FromMatchId String? // Para progresión automática
  team2FromMatchId String? // Para progresión automática
  winnerTeamId     String? // Se asigna al cargar resultado

  // Relaciones para progresión
  nextMatchesTeam1 Match[] @relation("Team1FromMatch")
  nextMatchesTeam2 Match[] @relation("Team2FromMatch")
}

enum PhaseType {
  GROUP_STAGE
  ROUND_OF_32
  ROUND_OF_16
  QUARTERFINALS
  SEMIFINALS
  THIRD_PLACE
  FINAL
}
```

**Modelo `TournamentZone`** (para grupos):
```prisma
model TournamentZone {
  id           String
  tournamentId String
  categoryId   String
  name         String      // "Grupo A", "Grupo B"
  phaseType    PhaseType   // GROUP_STAGE
  teams        ZoneTeam[]
  matches      Match[]
}

model ZoneTeam {
  zoneId   String
  teamId   String
  position Int?  // Calculado por standings (1, 2, 3, 4...)
}
```

### Sistema de Numeración de Rondas

```typescript
// ELIMINACIÓN SIMPLE
roundNumber: 1, 2, 3, ... N
Final = última ronda

// DOBLE ELIMINACIÓN
Upper Bracket: roundNumber: 1, 2, 3, ... N
Lower Bracket: roundNumber: 101, 102, 103, ... 10N
Gran Final: roundNumber: 200

// FASE DE GRUPOS + ELIMINACIÓN
Fase de Grupos: roundNumber: 1
Fase Eliminatoria: roundNumber: 10, 11, 12, ... 1N
```

### Progresión Automática

Cuando se carga un resultado de partido:
1. Se actualiza el `winnerTeamId` del match
2. Se llama a `BracketService.progressWinner(matchId, winnerTeamId, loserTeamId?)`
3. El sistema busca matches que tengan `team1FromMatchId` o `team2FromMatchId` apuntando a este match
4. Asigna el ganador al slot correspondiente (`team1Id` o `team2Id`)
5. En doble eliminación, también asigna el perdedor al lower bracket

**Código**:
```typescript
// En match result endpoint
const loserTeamId = validatedData.winnerTeamId === match.team1Id
  ? match.team2Id
  : match.team1Id

await BracketService.progressWinner(
  matchId,
  validatedData.winnerTeamId,
  loserTeamId || undefined
)
```

---

## 📊 Comparación de Formatos

| Formato | Equipos/Jugadores Ideal | Partidos (16) | Duración | Justicia | Complejidad | Emoción | Estado |
|---------|------------------------|---------------|----------|----------|-------------|---------|--------|
| **Eliminación Simple** | 8-32 equipos | 15 | 1 día | ⭐⭐ | ⭐ | ⭐⭐⭐⭐⭐ | ✅ |
| **Round Robin** | 4-10 equipos | 120 | Varios días | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐ | ✅ |
| **Doble Eliminación** | 8-16 equipos | 30 | 2-3 días | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ |
| **Grupos + Eliminación** | 12-32 equipos | 31 | 2-3 días | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ |
| **Americano** | 4-12 equipos | 28 | 1-2 días | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ✅ |
| **Americano Social** | 8-20 jugadores | 12 | 2-4 horas | ⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐ | ✅ |
| **Sistema Suizo** | 16-64 equipos | 64 | 2-4 días | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⏳ |
| **Grupos + RR Final** | 16-24 equipos | 52 | 3-5 días | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⏳ |

---

## 🎯 Recomendaciones de Uso

### Para Torneos Rápidos (1 día, 4-6 horas)
- **8-16 equipos**: Eliminación Simple
- **4-6 equipos**: Round Robin

### Para Torneos de Fin de Semana (2-3 días)
- **12-24 equipos**: Fase de Grupos + Eliminación ⭐ **MÁS USADO**
- **8-16 equipos**: Doble Eliminación

### Para Ligas/Torneos Largos (semanas/meses)
- **4-10 equipos**: Round Robin
- **16-32 equipos**: Sistema Suizo (pendiente)

### Para Eventos Sociales
- **8-20 jugadores individuales**: Americano Social ⭐ **IDEAL PARA INTEGRACIÓN**
- **4-12 equipos fijos**: Americano ⭐ **IDEAL PARA LIGA**
- **4-8 equipos**: Round Robin

---

## 🔑 Campos Clave en la Base de Datos

### Tournament
```typescript
{
  id: string
  format: "SINGLE_ELIMINATION" | "ROUND_ROBIN" | "DOUBLE_ELIMINATION" | "GROUP_STAGE_ELIMINATION" | "AMERICANO" | "SWISS"
  metadata: {
    groupConfig_<categoryId>: {
      numGroups: number
      groupSizes: number[]
      qualifiedPerGroup: number
      bestThirdPlace: number
      totalClassified: number
    }
  }
}
```

### Match
```typescript
{
  roundNumber: number      // Identifica la fase
  matchNumber: number      // Número secuencial
  phaseType: PhaseType     // QUARTERFINALS, SEMIFINALS, etc.
  team1FromMatchId: string // Progresión automática
  team2FromMatchId: string // Progresión automática
  zoneId: string?          // Link a grupo (si es fase de grupos)
}
```

### TournamentZone
```typescript
{
  id: string
  name: string             // "Grupo A", "Grupo B"
  phaseType: "GROUP_STAGE"
  teams: ZoneTeam[]        // Equipos en este grupo
}
```

### ZoneTeam
```typescript
{
  zoneId: string
  teamId: string
  position: number?        // Posición en la tabla (1, 2, 3...)
}
```

---

## 🚀 Flujo de Trabajo

### Crear Torneo con Fase de Grupos + Eliminación

1. **Crear Torneo**
   ```
   POST /api/tournaments
   { format: "GROUP_STAGE_ELIMINATION", ... }
   ```

2. **Agregar Categorías**
   ```
   Desde el dashboard: Gestionar Categorías
   ```

3. **Inscribir Equipos**
   ```
   Los equipos se inscriben vía formulario público
   Admin aprueba inscripciones
   ```

4. **Generar Bracket**
   ```
   Dashboard → Gestionar Brackets → Seleccionar Categoría → Generar Bracket

   Backend:
   - Calcula configuración óptima (calculateOptimalGroupConfiguration)
   - Crea grupos con distribución serpiente
   - Genera partidos round robin por grupo
   - Genera estructura de playoffs vacía
   - Guarda configuración en tournament.metadata
   ```

5. **Jugar Fase de Grupos**
   ```
   Admin/Árbitro carga resultados:
   POST /api/matches/[id]/result

   Después de cada partido:
   - Se actualiza automáticamente la tabla de posiciones
   - Se recalculan las posiciones (position en ZoneTeam)
   ```

6. **Ver Tabla de Posiciones**
   ```
   GET /api/tournaments/[id]/groups?categoryId=xxx

   Muestra:
   - Todos los grupos con sus tablas
   - Indica top 2 (o top 3) que clasifican
   - Destaca mejores terceros si aplica
   ```

7. **Clasificar a Eliminatorias**
   ```
   Cuando todos los partidos de grupos terminan:
   POST /api/tournaments/[id]/classify

   Backend:
   - Obtiene top N de cada grupo
   - Calcula mejores terceros si es necesario
   - Ordena por criterios de desempate
   - Asigna equipos a playoffs con seeding estándar
   ```

8. **Jugar Fase Eliminatoria**
   ```
   Admin/Árbitro carga resultados:
   POST /api/matches/[id]/result

   Backend:
   - Actualiza resultado
   - Progresa ganador automáticamente al siguiente match
   - Actualiza visualización del bracket
   ```

9. **Finalizar Torneo**
   ```
   Cuando se carga resultado de la Final:
   - Se determina el campeón
   - Se actualizan puntos de ranking
   - Se genera reporte final
   ```

---

## 📈 Tabla de Configuraciones Automáticas

### Fase de Grupos + Eliminación (Máximo 4 equipos por grupo)

| Equipos | Grupos | Config | Top/Grupo | Mejores 2dos | Total Clasif. | Primera Ronda |
|---------|--------|--------|-----------|--------------|---------------|---------------|
| 8       | 2      | 4-4    | 2         | -            | 4             | Semifinales   |
| 9       | 3      | 3-3-3  | 1         | 1            | 4             | Semifinales   |
| 10      | 3      | 4-3-3  | 1         | 1            | 4             | Semifinales   |
| 11      | 3      | 4-4-3  | 1         | 1            | 4             | Semifinales   |
| 12      | 4      | 3-3-3-3| 2         | -            | 8             | Cuartos       |
| 13      | 4      | 4-3-3-3| 2         | -            | 8             | Cuartos       |
| 14      | 4      | 4-4-3-3| 2         | -            | 8             | Cuartos       |
| 15      | 4      | 4-4-4-3| 2         | -            | 8             | Cuartos       |
| 16      | 4      | 4-4-4-4| 2         | -            | 8             | Cuartos       |
| 17      | 5      | 4-4-3-3-3| 1       | 3            | 8             | Cuartos       |
| 18      | 5      | 4-4-4-3-3| 1       | 3            | 8             | Cuartos       |
| 19      | 5      | 4-4-4-4-3| 1       | 3            | 8             | Cuartos       |
| 20      | 5      | 4-4-4-4-4| 1       | 3            | 8             | Cuartos       |
| 21      | 6      | 4-4-3-3-3-3| 1     | 2            | 8             | Cuartos       |
| 22      | 6      | 4-4-4-3-3-3| 1     | 2            | 8             | Cuartos       |
| 23      | 6      | 4-4-4-4-3-3| 1     | 2            | 8             | Cuartos       |
| 24      | 6      | 4-4-4-4-4-4| 1     | 2            | 8             | Cuartos       |
| 25      | 8      | 4-4-3-3-3-3-3-3 | 2 | -          | 16            | Octavos       |
| 28      | 8      | 4-4-4-4-3-3-3-3 | 2 | -          | 16            | Octavos       |
| 32      | 8      | 4-4-4-4-4-4-4-4 | 2 | -          | 16            | Octavos       |
| 40      | 10     | 4×10   | 1         | 6            | 16            | Octavos       |
| 48      | 12     | 4×12   | 1         | 4            | 16            | Octavos       |
| 64      | 16     | 4×16   | 2         | -            | 32            | Dieciseisavos |

**Leyenda**:
- **Config**: Tamaño de cada grupo (máximo 4 equipos)
- **Top/Grupo**: Cuántos clasifican directamente por grupo
- **Mejores 2dos**: Cuántos mejores segundos clasifican (si aplica)
- **Total Clasif.**: Total de equipos que pasan a playoffs (siempre potencia de 2)

---

## 🎮 Ejemplos Prácticos

### Ejemplo 1: Torneo de Club (14 equipos)

**Formato Recomendado**: Fase de Grupos + Eliminación

**Configuración Automática (Máximo 4 por grupo)**:
- 4 grupos: A(4), B(4), C(3), D(3)
- Top 2 por grupo = 8 clasificados
- Cuartos de Final → Semifinales → Final

**Timeline**:
- **Sábado AM**: Fase de grupos - Jornada 1 (14 partidos)
- **Sábado PM**: Fase de grupos - Jornada 2-3 (10 partidos)
- **Domingo AM**: Cuartos de Final (4 partidos)
- **Domingo PM**: Semifinales (2) + Final (1)

**Total**: 31 partidos en 2 días
**Grupos**: Ningún grupo supera los 4 equipos ✅

---

### Ejemplo 2: Torneo Relámpago (8 equipos)

**Formato Recomendado**: Eliminación Simple

**Configuración**:
- Direct knockout
- Cuartos → Semifinales → Final

**Timeline**:
- **Mañana**: Cuartos (4 partidos)
- **Tarde**: Semifinales (2 partidos)
- **Final**: Final (1 partido)

**Total**: 7 partidos en 1 día

---

### Ejemplo 3: Liga de Club (6 equipos)

**Formato Recomendado**: Round Robin

**Configuración**:
- Todos contra todos
- 5 jornadas

**Timeline**:
- **5 semanas**: 1 jornada por semana (3 partidos por jornada)

**Total**: 15 partidos

---

### Ejemplo 4: Torneo Grande (24 equipos)

**Formato Recomendado**: Fase de Grupos + Eliminación

**Configuración Automática (Máximo 4 por grupo)**:
- 6 grupos de 4 equipos cada uno
- Clasifican: Top 1 de cada grupo (6) + 2 mejores segundos = 8 clasificados
- Cuartos → Semifinales → Final

**Timeline**:
- **Viernes**: Fase de grupos completa (36 partidos, 6 partidos por grupo)
- **Sábado AM**: Cuartos de Final (4 partidos)
- **Sábado PM**: Semifinales (2 partidos)
- **Domingo**: Final (1 partido)

**Total**: 43 partidos en 3 días
**Grupos**: Máximo 4 equipos por grupo ✅

---

## 🔒 RBAC y Permisos

### Generar Bracket
- **Permiso**: `Action.UPDATE` sobre `Resource.TOURNAMENT`
- **Roles**: ADMIN, CLUB_ADMIN
- **Validación**: Solo el organizador del torneo o un admin

### Ver Bracket
- **Permiso**: Requiere autenticación
- **Roles**: Todos los usuarios autenticados

### Cargar Resultados
- **Permiso**: `Action.UPDATE` sobre `Resource.TOURNAMENT`
- **Roles**: ADMIN, CLUB_ADMIN, REFEREE

### Clasificar a Eliminatorias
- **Permiso**: `Action.UPDATE` sobre `Resource.TOURNAMENT`
- **Roles**: ADMIN, CLUB_ADMIN

---

## 🐛 Validaciones

### Antes de Generar Bracket

```typescript
BracketService.validateBracketGeneration(tournamentId, categoryId)
```

Verifica:
- ✅ Torneo existe y está activo
- ✅ Categoría existe en el torneo
- ✅ Hay equipos inscritos suficientes
- ✅ No existe bracket generado previamente (o confirmación para regenerar)
- ✅ Formato de torneo es válido

### Antes de Clasificar

Verifica:
- ✅ Todos los grupos existen
- ✅ Todos los equipos tienen posición calculada
- ✅ Todos los partidos de grupos están completados
- ✅ Configuración de grupos existe en metadata

---

## 📝 Auditoría

Todas las operaciones de brackets se registran:

```typescript
await AuditLogger.log(session, {
  action: Action.UPDATE,
  resource: Resource.TOURNAMENT,
  resourceId: tournamentId,
  description: "Equipos clasificados a fase eliminatoria - categoría ...",
  metadata: {
    categoryId,
    phase: "GROUP_TO_ELIMINATION",
    totalClassified: 16
  }
}, request)
```

**Eventos auditados**:
- `BRACKET_GENERATED`: Cuando se genera un bracket
- `BRACKET_REGENERATED`: Cuando se regenera (elimina el anterior)
- `MATCH_WINNER_PROGRESSED`: Cuando un ganador avanza automáticamente

---

## 🔮 Roadmap de Formatos

### ✅ Implementados (6/7 - 86%)
- ✅ Eliminación Simple
- ✅ Round Robin
- ✅ Doble Eliminación
- ✅ Fase de Grupos + Eliminación
- ✅ Americano (equipos fijos)
- ✅ Americano Social (jugadores individuales, pools)

### ⏳ Pendientes (1/7 - 14%)
- ⏳ Sistema Suizo (para torneos grandes)

### Prioridad Baja (Formatos adicionales no planeados)
- ⏳ Grupos + Round Robin Final (nicho específico)
- ⏳ Triple Eliminación (muy poco usado)
- ⏳ King of the Court (formato recreativo)

---

## 📚 Referencias de Código

### Servicios
- **Servicio Principal**: `src/lib/services/bracket-service.ts`
  - Eliminación Simple: líneas 130-265
  - Round Robin: líneas 267-351
  - Doble Eliminación: líneas 376-479
  - Grupos + Eliminación: líneas 481-680
  - Americano: líneas 1432-1531
  - Progresión: líneas 795-1008
  - Clasificación: líneas 1218-1411

### APIs
- Generar: `src/app/api/tournaments/[id]/generate-bracket/route.ts`
- Ver bracket: `src/app/api/tournaments/[id]/bracket/route.ts`
- Ver grupos: `src/app/api/tournaments/[id]/groups/route.ts`
- Clasificar: `src/app/api/tournaments/[id]/classify/route.ts`
- Resultado: `src/app/api/matches/[id]/result/route.ts`

### Componentes UI
- Generador: `src/components/brackets/bracket-generator.tsx`
- Visualización: `src/components/brackets/bracket-visualization.tsx`
- Tablas: `src/components/brackets/group-standings.tsx`

### Dashboard
- Página principal: `src/app/dashboard/tournaments/[id]/brackets/page.tsx`

---

## ❓ FAQ

### ¿Puedo cambiar el formato después de generar el bracket?
No. El bracket se genera una sola vez. Si necesitas cambiar, debes regenerar (se eliminan todos los resultados).

### ¿Qué pasa si hay empate en la tabla de grupos?
**Sistema de puntuación**:
- 2 puntos por victoria
- 1 punto por derrota (partido jugado)
- 0 puntos por derrota por walkover

**Criterios de desempate** (en orden):
1. Puntos totales
2. Diferencia de sets
3. Diferencia de juegos
4. Sets ganados totales

### ¿Puedo editar manualmente los emparejamientos?
Actualmente no. Los emparejamientos se generan automáticamente según el formato. Esta característica está en el roadmap.

### ¿Qué pasa si un equipo se retira?
Opción 1: Dar victoria a sus oponentes restantes (walkover)
Opción 2: Eliminar equipo y ajustar tabla

### ¿Cómo se manejan los partidos en cancha?
Cada partido puede tener asignada una cancha (`courtId`) y horario (`scheduledFor`). Esto se maneja en el módulo de gestión de partidos.

---

**Última actualización**: 2025-10-13
**Versión**: 1.2.0
