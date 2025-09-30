# Formatos de Torneos - Documentación Técnica

Este documento describe todos los formatos de torneo implementados y pendientes en el sistema de gestión de torneos de pádel.

---

## 📋 Índice

- [Formatos Implementados](#formatos-implementados)
  - [Eliminación Simple](#eliminación-simple)
  - [Round Robin (Todos contra Todos)](#round-robin-todos-contra-todos)
  - [Doble Eliminación](#doble-eliminación)
  - [Fase de Grupos + Eliminación](#fase-de-grupos--eliminación)
- [Formatos Pendientes](#formatos-pendientes)
  - [Sistema Suizo](#sistema-suizo)
  - [Americano](#americano)
  - [Mixto (Grupos + Round Robin Final)](#mixto-grupos--round-robin-final)

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

**Configuración Automática**:

| Equipos | Grupos | Tamaño Grupos | Clasifican | Mejores 3ros | Fase Final |
|---------|--------|---------------|------------|--------------|------------|
| 8-11    | 2      | 4-5-6         | Top 2      | -            | Semifinales (4) |
| 12-15   | 4      | 3-4           | Top 2      | -            | Cuartos (8) |
| 16-19   | 4      | 4-5           | Top 4      | -            | Octavos (16) |
| 20-23   | 4      | 5-6           | Top 3      | 4 mejores    | Octavos (16) |
| 24-31   | 8      | 3-4           | Top 2      | -            | Octavos (16) |
| 32+     | 8      | 4+            | Top 4      | -            | Dieciseisavos (32) |

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

**Ejemplo Detallado: Torneo de 20 Equipos**

```
DISTRIBUCIÓN INICIAL (Serpiente)
═══════════════════════════════════════════
Grupo A: Equipos 1, 8, 9, 16, 17
Grupo B: Equipos 2, 7, 10, 15, 18
Grupo C: Equipos 3, 6, 11, 14, 19
Grupo D: Equipos 4, 5, 12, 13, 20

Cada grupo: 5 equipos × 4 partidos = 10 partidos por grupo
Total fase de grupos: 40 partidos

TABLA GRUPO A (ejemplo)
Pos  Equipo    PJ  PG  PP  Sets   Juegos  Pts
1    Team 1    4   4   0   8-0    48-20   8  ← Clasificado
2    Team 8    4   3   1   6-2    42-28   6  ← Clasificado
3    Team 9    4   2   2   4-4    35-35   4  ← Candidato mejor 3ro
4    Team 16   4   1   3   2-6    28-40   2
5    Team 17   4   0   4   0-8    18-48   0

CLASIFICACIÓN A OCTAVOS
═══════════════════════════════════════════
Clasificados directos: Top 2 de cada grupo = 8 equipos
- 1A, 2A (Grupo A)
- 1B, 2B (Grupo B)
- 1C, 2C (Grupo C)
- 1D, 2D (Grupo D)

Mejores terceros: 4 mejores terceros = 4 equipos
- Ordenados por: Puntos → Diff Sets → Diff Juegos → Sets Ganados
- Supongamos: 3A (4pts), 3B (4pts), 3C (3pts), 3D (3pts)
- Clasifican: 3A, 3B, 3C, 3D

Total clasificados: 12 equipos
⚠️ PROBLEMA: 12 no es potencia de 2

SOLUCIÓN: Configuración cambia automáticamente
Con 20 equipos → 4 grupos × Top 3 + 4 mejores 3ros = 16 equipos

OCTAVOS DE FINAL (16 equipos con seeding estándar)
═══════════════════════════════════════════
OF1: Seed 1  vs Seed 16 ─┐
OF2: Seed 8  vs Seed 9  ─┼─ QF1 ─┐
OF3: Seed 4  vs Seed 13 ─┤       │
OF4: Seed 5  vs Seed 12 ─┘       ├─ SF1 ─┐
                                 │       │
OF5: Seed 2  vs Seed 15 ─┐       │       │
OF6: Seed 7  vs Seed 10 ─┼─ QF2 ─┘       ├─ FINAL
OF7: Seed 3  vs Seed 14 ─┤               │
OF8: Seed 6  vs Seed 11 ─┘               │
                                         │
                         (continúa...)   │
                                         │
                                    (CAMPEÓN)

Seeding:
- Seeds 1-4: Primeros de grupo
- Seeds 5-8: Segundos de grupo
- Seeds 9-12: Terceros de grupo
- Seeds 13-16: Mejores terceros
```

**Número de Partidos**:

Fase de Grupos (N equipos en grupos de G):
- Partidos por grupo con g equipos: `g × (g - 1) / 2`
- Total: suma de todos los grupos

Fase Eliminatoria (C clasificados):
- `C - 1` partidos

**Ejemplos**:
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

- 20 equipos (4 grupos de 5):
  - Fase grupos: 10 × 4 = 40 partidos
  - Octavos: 8 partidos
  - Cuartos: 4 partidos
  - Semifinales: 2 partidos
  - Final: 1 partido
  - **Total: 55 partidos**

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

**Sistema de Mejores Terceros**:

Cuando se necesitan más clasificados, se usa el sistema de mejores terceros:

```
Criterios de desempate entre terceros de diferentes grupos:
1. Puntos totales
2. Diferencia de sets
3. Diferencia de juegos
4. Sets ganados totales

Ejemplo:
Grupo A - 3ro: 4pts, +2 sets, +8 juegos
Grupo B - 3ro: 4pts, +2 sets, +5 juegos
Grupo C - 3ro: 4pts, +1 sets, +10 juegos
Grupo D - 3ro: 3pts, +3 sets, +12 juegos

Ranking de terceros:
1. Grupo A (4pts, +2, +8)
2. Grupo B (4pts, +2, +5)
3. Grupo C (4pts, +1, +10)
4. Grupo D (3pts, +3, +12)

Si clasifican 4 mejores terceros → Todos clasifican
Si clasifican 2 mejores terceros → Solo Grupos A y B
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

### ⏳ Americano

**Estado**: No implementado

**Descripción**:
Formato social donde las parejas cambian constantemente. Cada jugador juega con diferentes compañeros a lo largo del torneo. El ganador es el jugador individual con más puntos.

**Características Propuestas**:
- Ranking individual (no por parejas)
- Parejas rotativas cada partido
- Todos juegan contra todos
- Duración fija por partido (ej: 20 minutos)
- Puntos por juegos ganados (no por partidos)
- Sistema de rotación: cada jugador juega con todos los demás como pareja

**Estructura Propuesta**:
```
8 Jugadores: A, B, C, D, E, F, G, H

Ronda 1:
Pista 1: A+B vs C+D  →  Resultado: 6-3 (A: +6, B: +6, C: +3, D: +3)
Pista 2: E+F vs G+H  →  Resultado: 5-4 (E: +5, F: +5, G: +4, H: +4)

Ronda 2 (rotación de parejas):
Pista 1: A+C vs B+D  →  Resultado: 7-2 (A: +7, C: +7, B: +2, D: +2)
Pista 2: E+G vs F+H  →  Resultado: 6-3 (E: +6, G: +6, F: +3, H: +3)

... continúa hasta que cada jugador haya jugado con todos los demás

Ranking Final (Individual):
Pos  Jugador  Partidos  Juegos Ganados  Juegos Perdidos  Diff
1    A        7         52              28               +24
2    E        7         48              31               +17
3    C        7         45              34               +11
4    B        7         42              37               +5
...
```

**Número de Partidos por Jugador**:
- Con N jugadores: cada uno juega `(N - 1)` partidos
- Parejas totales posibles: `N × (N - 1) / 2`
- 8 jugadores = 7 partidos por jugador = 28 parejas diferentes

**Algoritmo de Rotación**:
```
Round Robin de parejas (no de equipos)

Con 8 jugadores (A-H):
Ronda 1: AB vs CD, EF vs GH
Ronda 2: AC vs BD, EG vs FH
Ronda 3: AD vs BC, EH vs FG
Ronda 4: AE vs BF, CG vs DH
Ronda 5: AF vs BE, CH vs DG
Ronda 6: AG vs BH, CE vs DF
Ronda 7: AH vs BG, CF vs DE
```

**Ventajas**:
- Muy social: conoces a todos los jugadores
- No hay eliminación: todos juegan todo el tiempo
- Justo: minimiza impacto de tener mal compañero
- Divertido: variedad de parejas

**Desventajas**:
- Solo funciona con número par de jugadores
- Complejo de organizar manualmente
- Requiere muchas pistas simultáneas
- Puntuación individual puede ser confusa

**Casos de Uso Propuestos**:
- Torneos sociales de club
- Clínicas y eventos recreativos
- Ideal para 8-16 jugadores
- Formato de "mixer" o "round robin social"

**Implementación Pendiente**:
- `generateAmericanoBracket()` - Genera rotación de parejas
- `calculateAmericanoRanking()` - Ranking individual
- Sistema de rotación de parejas
- Tabla individual de puntos
- UI específica para formato americano

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

| Formato | Equipos Ideal | Partidos (16 equipos) | Duración | Justicia | Complejidad | Emoción |
|---------|---------------|----------------------|----------|----------|-------------|---------|
| **Eliminación Simple** | 8-32 | 15 | 1 día | ⭐⭐ | ⭐ | ⭐⭐⭐⭐⭐ |
| **Round Robin** | 4-10 | 120 | Varios días | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐ |
| **Doble Eliminación** | 8-16 | 30 | 2-3 días | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Grupos + Eliminación** | 12-32 | 31 | 2-3 días | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Sistema Suizo** ⏳ | 16-64 | 64 | 2-4 días | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Americano** ⏳ | 8-16 | 56 | 1 día | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Grupos + RR Final** ⏳ | 16-24 | 52 | 3-5 días | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |

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
- **8-16 jugadores**: Americano (pendiente)
- **4-8 equipos**: Round Robin

---

## 🔑 Campos Clave en la Base de Datos

### Tournament
```typescript
{
  id: string
  format: "SINGLE_ELIMINATION" | "ROUND_ROBIN" | "DOUBLE_ELIMINATION" | "GROUP_STAGE_ELIMINATION"
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

### Fase de Grupos + Eliminación

| Equipos | Grupos | Config | Top/Grupo | 3ros | Total Clasif. | Primera Ronda |
|---------|--------|--------|-----------|------|---------------|---------------|
| 8       | 2      | 4-4    | 2         | -    | 4             | Semifinales   |
| 9       | 2      | 5-4    | 2         | -    | 4             | Semifinales   |
| 10      | 2      | 5-5    | 2         | -    | 4             | Semifinales   |
| 11      | 2      | 6-5    | 2         | -    | 4             | Semifinales   |
| 12      | 4      | 3-3-3-3| 2         | -    | 8             | Cuartos       |
| 13      | 4      | 4-3-3-3| 2         | -    | 8             | Cuartos       |
| 14      | 4      | 4-4-3-3| 2         | -    | 8             | Cuartos       |
| 15      | 4      | 4-4-4-3| 2         | -    | 8             | Cuartos       |
| 16      | 4      | 4-4-4-4| 4         | -    | 16            | Octavos       |
| 17      | 4      | 5-4-4-4| 4         | -    | 16            | Octavos       |
| 18      | 4      | 5-5-4-4| 4         | -    | 16            | Octavos       |
| 19      | 4      | 5-5-5-4| 4         | -    | 16            | Octavos       |
| 20      | 4      | 5-5-5-5| 3         | 4    | 16            | Octavos       |
| 21      | 4      | 6-5-5-5| 3         | 4    | 16            | Octavos       |
| 22      | 4      | 6-6-5-5| 3         | 4    | 16            | Octavos       |
| 23      | 4      | 6-6-6-5| 3         | 4    | 16            | Octavos       |
| 24      | 8      | 3×8    | 2         | -    | 16            | Octavos       |
| 28      | 8      | 4-4-4-4-3-3-3-3 | 2  | -    | 16            | Octavos       |
| 32      | 8      | 4×8    | 4         | -    | 32            | Dieciseisavos |

**Leyenda**:
- **Config**: Tamaño de cada grupo
- **Top/Grupo**: Cuántos clasifican directamente por grupo
- **3ros**: Cuántos mejores terceros clasifican
- **Total Clasif.**: Total de equipos que pasan a playoffs (siempre potencia de 2)

---

## 🎮 Ejemplos Prácticos

### Ejemplo 1: Torneo de Club (14 equipos)

**Formato Recomendado**: Fase de Grupos + Eliminación

**Configuración Automática**:
- 4 grupos: A(4), B(4), C(3), D(3)
- Top 2 por grupo = 8 clasificados
- Cuartos de Final → Semifinales → Final

**Timeline**:
- **Sábado AM**: Jornada 1 de grupos (14 partidos)
- **Sábado PM**: Jornada 2-3 de grupos (14 partidos)
- **Domingo AM**: Cuartos de Final (4 partidos)
- **Domingo PM**: Semifinales (2) + Final (1)

**Total**: 31 partidos en 2 días

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

**Configuración Automática**:
- 8 grupos de 3 equipos
- Top 2 por grupo = 16 clasificados
- Octavos → Cuartos → Semifinales → Final

**Timeline**:
- **Viernes**: Fase de grupos (24 partidos)
- **Sábado AM**: Octavos de Final (8 partidos)
- **Sábado PM**: Cuartos de Final (4 partidos)
- **Domingo**: Semifinales (2) + Final (1)

**Total**: 39 partidos en 3 días

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

### Prioridad Alta
- ✅ Eliminación Simple
- ✅ Round Robin
- ✅ Doble Eliminación
- ✅ Fase de Grupos + Eliminación

### Prioridad Media
- ⏳ Sistema Suizo (para torneos grandes)
- ⏳ Americano (para eventos sociales)

### Prioridad Baja
- ⏳ Grupos + Round Robin Final (nicho específico)
- ⏳ Triple Eliminación (muy poco usado)
- ⏳ King of the Court (formato recreativo)

---

## 📚 Referencias de Código

### Servicios
- **Servicio Principal**: `src/lib/services/bracket-service.ts`
  - Generación: líneas 130-680
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

**Última actualización**: 2025-09-30
**Versión**: 1.0.0
