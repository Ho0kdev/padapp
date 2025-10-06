# Formatos de Torneos - Documentación Técnica

Este documento describe todos los formatos de torneo implementados y pendientes en el sistema de gestión de torneos de pádel.

---

## 📋 Índice

- [Formatos Implementados](#formatos-implementados)
  - [Eliminación Simple](#eliminación-simple)
  - [Round Robin (Todos contra Todos)](#round-robin-todos-contra-todos)
  - [Doble Eliminación](#doble-eliminación)
  - [Fase de Grupos + Eliminación](#fase-de-grupos--eliminación)
  - [Americano](#americano)
- [Formatos Pendientes](#formatos-pendientes)
  - [Sistema Suizo](#sistema-suizo)

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
- Sistema de puntos: 2 puntos por victoria
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

**Implementación**:
- Función principal: `generateGroupStageEliminationBracket()` en `bracket-service.ts:481`
- Configuración óptima: `calculateOptimalGroupConfiguration()` en `bracket-service.ts:353`
- Cálculo de tablas: `calculateGroupStandings()` en `bracket-service.ts:1062`
- Clasificación: `classifyTeamsToEliminationPhase()` en `bracket-service.ts:1218`
- Asignación playoffs: `assignClassifiedTeamsToPlayoffs()` en `bracket-service.ts:1360`
- Distribución serpiente: Líneas 521-548 en `generateGroupStageEliminationBracket()`

**Componentes UI**:
- Generador: `src/components/brackets/bracket-generator.tsx`
- Visualización: `src/components/brackets/bracket-visualization.tsx`
- Tablas de grupos: `src/components/brackets/group-standings.tsx`
- Página dashboard: `src/app/dashboard/tournaments/[id]/brackets/page.tsx`

**APIs**:
- Generar bracket: `POST /api/tournaments/[id]/generate-bracket`
- Ver bracket: `GET /api/tournaments/[id]/bracket?categoryId=xxx`
- Ver grupos: `GET /api/tournaments/[id]/groups?categoryId=xxx`
- Clasificar: `POST /api/tournaments/[id]/classify`
- Cargar resultado: `POST /api/matches/[id]/result`

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

| Formato | Equipos Ideal | Partidos (16 equipos) | Duración | Justicia | Complejidad | Emoción | Estado |
|---------|---------------|----------------------|----------|----------|-------------|---------|--------|
| **Eliminación Simple** | 8-32 | 15 | 1 día | ⭐⭐ | ⭐ | ⭐⭐⭐⭐⭐ | ✅ |
| **Round Robin** | 4-10 | 120 | Varios días | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐ | ✅ |
| **Doble Eliminación** | 8-16 | 30 | 2-3 días | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ |
| **Grupos + Eliminación** | 12-32 | 31 | 2-3 días | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ |
| **Americano** | 4-12 | 28 | 1-2 días | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ✅ |
| **Sistema Suizo** | 16-64 | 64 | 2-4 días | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⏳ |
| **Grupos + RR Final** | 16-24 | 52 | 3-5 días | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⏳ |

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
- **4-12 equipos**: Americano ⭐ **IDEAL PARA LIGA**
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

### ✅ Implementados (5/6 - 83%)
- ✅ Eliminación Simple
- ✅ Round Robin
- ✅ Doble Eliminación
- ✅ Fase de Grupos + Eliminación
- ✅ Americano

### ⏳ Pendientes (1/6 - 17%)
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
Se aplican criterios de desempate en orden:
1. Puntos
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

**Última actualización**: 2025-10-01
**Versión**: 1.0.0
