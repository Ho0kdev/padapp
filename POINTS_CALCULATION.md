# 📊 SISTEMA DE CÁLCULO DE PUNTOS - GUÍA COMPLETA

*Última actualización: Octubre 6, 2025*

## ✅ SISTEMA DE CÁLCULO AUTOMÁTICO DE PUNTOS COMPLETADO!

### 🎯 RESUMEN EJECUTIVO

El sistema otorga puntos basándose en **4 factores principales**:

1. **Participación** - Puntos base por jugar
2. **Posición final** - Puntos por clasificación (proporcionales a rankingPoints del torneo)
3. **Rendimiento** - Puntos por victorias y sets ganados (proporcionales a rankingPoints)
4. **Multiplicadores** - Bonificaciones por tipo de torneo y número de participantes

## 🆕 NOVEDAD: Puntos Base Configurables por Torneo

A partir del 30 de septiembre de 2024, **cada torneo puede tener su propio valor base de puntos de ranking** (`rankingPoints`), lo que permite diferenciar torneos por nivel:

- **Torneo Premium/Nacional**: 1000-1500 pts
- **Torneo Regional Alto**: 600-900 pts
- **Torneo Regional**: 400-600 pts
- **Torneo Local/Club**: 100-300 pts

### ¿Cómo funciona?

**Antes:** Todos los torneos otorgaban 1000 pts al campeón (fijo)

**Ahora:** El campeón recibe el **100% del `rankingPoints`** configurado en el torneo:
- Torneo Premium (1000 pts) → Campeón recibe 1000 pts
- Torneo Regional (500 pts) → Campeón recibe 500 pts
- Torneo Local (250 pts) → Campeón recibe 250 pts

**Todo el sistema escala proporcionalmente** basándose en este valor.

---

## 📋 TABLA COMPLETA DE PUNTOS

### 1. PUNTOS BASE POR PARTICIPACIÓN

| Concepto | Puntos |
|----------|--------|
| Participar en cualquier torneo | 50 pts |

Solo por inscribirse y jugar, ya obtienes puntos base (independiente del rankingPoints del torneo).

---

### 2. PUNTOS POR POSICIÓN FINAL (Sistema Proporcional)

Los puntos por posición son **porcentajes del `rankingPoints` del torneo**:

| Posición | Porcentaje | Ejemplo (1000 pts) | Ejemplo (500 pts) | Ejemplo (250 pts) |
|----------|------------|-------------------|------------------|------------------|
| 🥇 1er Lugar | 100% | 1,000 pts | 500 pts | 250 pts |
| 🥈 2do Lugar | 70% | 700 pts | 350 pts | 175 pts |
| 🥉 3er Lugar | 50% | 500 pts | 250 pts | 125 pts |
| 4to Lugar | 40% | 400 pts | 200 pts | 100 pts |
| 5to-8vo Lugar | 30% | 300 pts | 150 pts | 75 pts |
| 9no-16vo Lugar | 20% | 200 pts | 100 pts | 50 pts |
| 17+ Lugar | 10% | 100 pts | 50 pts | 25 pts |

**Mientras mejor termines y más importante sea el torneo, más puntos obtienes.**

---

### 3. PUNTOS POR RENDIMIENTO (Proporcionales)

Los bonus también son proporcionales al `rankingPoints` del torneo:

| Concepto | Fórmula | Ejemplo (1000 pts) | Ejemplo (500 pts) | Ejemplo (250 pts) |
|----------|---------|-------------------|------------------|------------------|
| Partida ganada | (rankingPoints / 1000) × 25 | 25 pts | 12.5 pts | 6.25 pts |
| Set ganado | (rankingPoints / 1000) × 5 | 5 pts | 2.5 pts | 1.25 pts |

**Ejemplos prácticos:**
- **Torneo 1000 pts**: 3 victorias + 8 sets = (3×25) + (8×5) = 115 pts
- **Torneo 500 pts**: 3 victorias + 8 sets = (3×12.5) + (8×2.5) = 57.5 pts
- **Torneo 250 pts**: 3 victorias + 8 sets = (3×6.25) + (8×1.25) = 28.75 pts

---

### 4. MULTIPLICADORES POR TIPO DE TORNEO

| Tipo de Torneo | Multiplicador | Razón |
|----------------|---------------|-------|
| Eliminación Doble | ×1.3 | Más complejo, das segundas oportunidades |
| Eliminación Simple | ×1.2 | Formato estándar competitivo |
| Fase de Grupos + Eliminación | ×1.4 | Más partidas, más exigente |
| Round Robin | ×1.1 | Todos juegan contra todos |
| Suizo | ×1.1 | Emparejamientos balanceados |
| Americano | ×1.0 | Formato básico |

---

### 5. MULTIPLICADORES POR PARTICIPANTES

| Número de Jugadores | Multiplicador | Razón |
|---------------------|---------------|-------|
| 32+ jugadores | ×1.5 | Torneo muy grande, más competitivo |
| 16-31 jugadores | ×1.3 | Torneo grande |
| 8-15 jugadores | ×1.1 | Torneo mediano |
| Menos de 8 | ×1.0 | Torneo pequeño |

---

## 🧮 FÓRMULA COMPLETA DE CÁLCULO

```
PUNTOS FINALES = [
    (PARTICIPACIÓN + POSICIÓN_PROPORCIONAL + VICTORIAS_PROPORCIONALES + SETS_PROPORCIONALES)
    × MULTIPLICADOR_TORNEO
    × MULTIPLICADOR_PARTICIPANTES
] redondeado
```

**Donde:**
- `PARTICIPACIÓN` = 50 pts (fijo)
- `POSICIÓN_PROPORCIONAL` = porcentaje × rankingPoints del torneo
- `VICTORIAS_PROPORCIONALES` = partidas_ganadas × (rankingPoints / 1000) × 25
- `SETS_PROPORCIONALES` = sets_ganados × (rankingPoints / 1000) × 5

---

## 📈 EJEMPLOS PRÁCTICOS DETALLADOS

### EJEMPLO 1: Campeón de Torneo Premium (1000 pts)

**Jugador:** Juan Pérez
**Torneo:** Eliminación Simple, 24 jugadores, **rankingPoints: 1000**
**Resultado:** 1er lugar, 5 victorias, 10 sets ganados

**Cálculo paso a paso:**
1. Participación: 50 pts
2. Posición (1° = 100%): 1000 × 1.0 = 1,000 pts
3. Victorias: 5 × (1000/1000) × 25 = 5 × 25 = 125 pts
4. Sets: 10 × (1000/1000) × 5 = 10 × 5 = 50 pts
5. **Subtotal**: 50 + 1,000 + 125 + 50 = **1,225 pts**

**Multiplicadores:**
6. Eliminación Simple: ×1.2
7. 16-31 jugadores: ×1.3
8. **Multiplicador total**: 1.2 × 1.3 = 1.56

**PUNTOS FINALES:** 1,225 × 1.56 = **1,911 pts**

---

### EJEMPLO 2: Campeón de Torneo Regional (500 pts)

**Jugador:** María García
**Torneo:** Eliminación Simple, 24 jugadores, **rankingPoints: 500**
**Resultado:** 1er lugar, 5 victorias, 10 sets ganados

**Cálculo paso a paso:**
1. Participación: 50 pts
2. Posición (1° = 100%): 500 × 1.0 = 500 pts
3. Victorias: 5 × (500/1000) × 25 = 5 × 12.5 = 62.5 pts
4. Sets: 10 × (500/1000) × 5 = 10 × 2.5 = 25 pts
5. **Subtotal**: 50 + 500 + 62.5 + 25 = **637.5 pts**

**Multiplicadores:**
6. Eliminación Simple: ×1.2
7. 16-31 jugadores: ×1.3
8. **Multiplicador total**: 1.2 × 1.3 = 1.56

**PUNTOS FINALES:** 637.5 × 1.56 = **995 pts**

---

### EJEMPLO 3: Campeón de Torneo Local (250 pts)

**Jugador:** Carlos López
**Torneo:** Americano, 12 jugadores, **rankingPoints: 250**
**Resultado:** 1er lugar, 3 victorias, 6 sets ganados

**Cálculo paso a paso:**
1. Participación: 50 pts
2. Posición (1° = 100%): 250 × 1.0 = 250 pts
3. Victorias: 3 × (250/1000) × 25 = 3 × 6.25 = 18.75 pts
4. Sets: 6 × (250/1000) × 5 = 6 × 1.25 = 7.5 pts
5. **Subtotal**: 50 + 250 + 18.75 + 7.5 = **326.25 pts**

**Multiplicadores:**
6. Americano: ×1.0
7. 8-15 jugadores: ×1.1
8. **Multiplicador total**: 1.0 × 1.1 = 1.1

**PUNTOS FINALES:** 326.25 × 1.1 = **359 pts**

---

### EJEMPLO 4: Semifinalista de Torneo Regional (500 pts)

**Jugador:** Ana Martínez
**Torneo:** Round Robin, 16 jugadores, **rankingPoints: 500**
**Resultado:** 4to lugar, 3 victorias, 7 sets ganados

**Cálculo paso a paso:**
1. Participación: 50 pts
2. Posición (4° = 40%): 500 × 0.4 = 200 pts
3. Victorias: 3 × (500/1000) × 25 = 3 × 12.5 = 37.5 pts
4. Sets: 7 × (500/1000) × 5 = 7 × 2.5 = 17.5 pts
5. **Subtotal**: 50 + 200 + 37.5 + 17.5 = **305 pts**

**Multiplicadores:**
6. Round Robin: ×1.1
7. 16-31 jugadores: ×1.3
8. **Multiplicador total**: 1.1 × 1.3 = 1.43

**PUNTOS FINALES:** 305 × 1.43 = **436 pts**

---

## 🏆 SISTEMA DE RANKINGS ANUAL

### ¿Cómo se acumulan los puntos?

- Los puntos se **suman por categoría** durante toda la temporada (año calendario)
- Cada torneo completado aporta puntos a tu ranking de esa categoría específica
- **No hay límite** en el número de torneos que puedes jugar
- Puedes jugar torneos de diferentes niveles (Premium, Regional, Local)

### ¿Qué determina mi posición en el ranking?

- **Total de puntos acumulados** en la categoría durante el año
- Los rankings se actualizan **automáticamente** después de cada torneo
- Se ordenan de **mayor a menor** puntuación

### Estrategia de Puntos

Puedes combinar torneos de diferentes niveles para maximizar puntos:
- **Torneos Premium (1000 pts)**: Mayor recompensa, más competitivo
- **Torneos Regionales (500 pts)**: Balance entre competencia y accesibilidad
- **Torneos Locales (250 pts)**: Más accesibles, buenos para sumar constante

---

## 🎯 ESTRATEGIAS PARA MAXIMIZAR PUNTOS

### Para Jugadores Competitivos:

1. **Prioriza torneos grandes** (32+ jugadores = ×1.5)
2. **Elige torneos Premium** (rankingPoints: 1000+)
3. **Prefiere eliminación doble** (×1.3 + más oportunidades)
4. **Enfócate en ganar sets** (puntos adicionales constantes)

### Para Jugadores Recreativos:

1. **Participa regularmente** (50 pts seguros por torneo)
2. **Comienza con torneos locales** (menos presión, más accesible)
3. **Juega en tu categoría** (mejores posibilidades de avanzar)
4. **Cada set cuenta** (puntos proporcionales garantizados)

### Para Clubes/Organizadores:

1. **Torneos Premium (1000 pts)**: Atrae jugadores de nivel alto
2. **Torneos Regionales (500-750 pts)**: Balance ideal para mayoría de jugadores
3. **Torneos Locales (250 pts)**: Fomenta participación local constante

---

## ⚖️ PRINCIPIOS DEL SISTEMA

### Justo:
- Todos obtienen puntos por participar
- Más puntos por mejor rendimiento
- Ajustado por dificultad del torneo
- **Proporcional al nivel del torneo**

### Transparente:
- Fórmula pública y clara
- Cálculos automáticos y auditables
- Sin intervención manual
- **rankingPoints visible en cada torneo**

### Motivador:
- Recompensa participación constante
- Incentiva mejorar rendimiento
- Valora torneos más exigentes
- **Permite estrategias personalizadas**

### Flexible:
- Cada torneo define su nivel de importancia
- Organizadores controlan el valor de sus torneos
- Jugadores eligen qué torneos jugar según objetivos

---

## 🔧 FUNCIONALIDADES IMPLEMENTADAS

### 1. Sistema de Puntos Inteligente:
- ✅ Puntos base por participación: 50 puntos (fijo)
- ✅ **Puntos por posición proporcionales a rankingPoints del torneo**
- ✅ **Bonus por victorias proporcionales (rankingPoints / 1000) × 25**
- ✅ **Bonus por sets proporcionales (rankingPoints / 1000) × 5**
- ✅ Multiplicadores dinámicos por tipo y participantes

### 2. Configuración por Torneo:
- ✅ Campo `rankingPoints` en modelo Tournament (default: 1000)
- ✅ Rango: 100 - 5,000 puntos
- ✅ Formulario de creación/edición actualizado
- ✅ Validaciones Zod en frontend y backend

### 3. Proceso Automático Completo:
- ✅ Cálculo por torneo usando rankingPoints específico
- ✅ Actualización de rankings: Suma todos los puntos del año
- ✅ Proceso transparente: Logs detallados de cada paso

### 4. API Endpoint:
- ✅ `POST /api/tournaments/{id}/calculate-points`
- ✅ Solo admins pueden ejecutarlo
- ✅ Valida que el torneo esté completado
- ✅ Retorna resumen detallado de puntos otorgados

---

## 🚀 ¿CÓMO USAR EL SISTEMA?

### Para Organizadores:

1. **Crear torneo** con campo "Puntos de Ranking"
   - Premium/Nacional: 1000-1500 pts
   - Regional: 400-900 pts
   - Local: 100-300 pts

2. **Inscribir equipos** normalmente

3. **Completar torneo** con estadísticas en TournamentStats

4. **Ejecutar cálculo**: `POST /api/tournaments/{id}/calculate-points`

5. **Verificar**: Rankings actualizados automáticamente

### Para Jugadores:

1. **Ver torneos disponibles** con sus rankingPoints
2. **Elegir torneos** según objetivos (Premium, Regional, Local)
3. **Jugar y competir**
4. **Ver puntos acumulados** en `/dashboard/rankings`

---

## 📊 TABLA RESUMEN RÁPIDA

| Concepto | Valor | Nota |
|----------|-------|------|
| Base por participar | 50 pts | Automático (fijo) |
| Campeón | 100% rankingPoints | Proporcional al torneo |
| Subcampeón | 70% rankingPoints | Proporcional al torneo |
| Por partida ganada | (rankingPoints/1000) × 25 | Proporcional |
| Por set ganado | (rankingPoints/1000) × 5 | Proporcional |
| Torneo grande (32+) | ×1.5 | Muy competitivo |
| Eliminación doble | ×1.3 | Más oportunidades |
| **Torneo Premium** | **1000 pts** | **Nivel más alto** |
| **Torneo Regional** | **500 pts** | **Nivel medio** |
| **Torneo Local** | **250 pts** | **Nivel club** |

---

## 📝 CHANGELOG

### Octubre 6, 2025
- ✅ Fecha de documentación actualizada
- ✅ Sistema validado en producción con múltiples torneos
- ✅ Integración completa con sistema de logs y auditoría

### Septiembre 30, 2024 - Sistema de Puntos Configurables
- ✅ Agregado campo `rankingPoints` al modelo Tournament
- ✅ Sistema de porcentajes para posiciones (proporcionales a rankingPoints)
- ✅ Bonus de victorias y sets proporcionales
- ✅ Formulario actualizado con campo "Puntos de Ranking"
- ✅ Validaciones: rango 100-5,000 puntos
- ✅ Seeds actualizados con torneos de diferentes niveles
- ✅ Documentación completa actualizada

---

**¡El sistema de puntos automático con configuración flexible está 100% funcional y listo para producción!** 🎯
