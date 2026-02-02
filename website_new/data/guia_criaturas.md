## Guía para Crear Criaturas

Esta guía te ayudará a diseñar criaturas equilibradas para tus partidas de Raldamain.

### Paso 1: Concepto Básico

Define el concepto de tu criatura antes de asignar estadísticas:

- **Nombre**: Un nombre evocador que refleje su naturaleza
- **Tipo**: Humanoide, Bestia, No-muerto, Elemental, Dragón, Demonio, Aberración, Constructo
- **Tamaño**: Diminuto, Pequeño, Mediano, Grande, Enorme, Colosal
- **Alineamiento**: Legal/Neutral/Caótico + Bueno/Neutral/Maligno

### Paso 2: Nivel y Estadísticas de Combate

El **Nivel** determina la dificultad general. Usa esta tabla como referencia:

| Nivel | Vitalidad | Defensa | Bonus Ataque | Daño por Ronda |
|-------|-----------|---------|--------------|----------------|
| 1-3   | 10-30     | 12-14   | +3 a +5      | 4-10           |
| 4-6   | 40-70     | 14-16   | +5 a +7      | 12-25          |
| 7-10  | 80-120    | 16-18   | +7 a +9      | 30-50          |
| 11-15 | 130-200   | 18-20   | +9 a +12     | 55-80          |
| 16-20 | 220-350   | 20-23   | +12 a +15    | 90-150         |

### Paso 3: Atributos

Asigna valores a los seis atributos (FUE, DES, CON, INT, SAB, CAR):

- **Valores típicos**: 8-18 para criaturas normales
- **Valores excepcionales**: 20-30 para criaturas legendarias
- **Modificador**: (Atributo - 10) / 2, redondeado hacia abajo

| Rol de la Criatura | Atributos Principales |
|--------------------|----------------------|
| Bruto/Tanque       | FUE alto, CON alto   |
| Asesino/Ágil       | DES alto, FUE medio  |
| Mago/Lanzador      | INT o CAR alto       |
| Bestia Salvaje     | FUE y CON altos, INT bajo |
| Apoyo/Sanador      | SAB alto, CAR medio  |

### Paso 4: Defensas

Define las defensas especiales de tu criatura:

- **Resistencias**: Reciben la mitad de daño de este tipo
- **Inmunidades**: No reciben daño de este tipo
- **Vulnerabilidades**: Reciben el doble de daño

> **Consejo**: Las criaturas no-muertas suelen ser inmunes a veneno y efectos mentales. Los elementales son inmunes a su elemento y vulnerables al opuesto.

### Paso 5: Rasgos Especiales

Los rasgos definen la identidad única de la criatura. Ejemplos comunes:

| Rasgo | Efecto |
|-------|--------|
| **Regeneración** | Recupera X PV al inicio de su turno |
| **Resistencia Mágica** | Ventaja en tiradas contra magia |
| **Aura de Daño** | Daño automático a enemigos cercanos |
| **Sentidos Especiales** | Visión en la oscuridad, vista ciega, etc. |
| **Forma Incorpórea** | Puede atravesar objetos sólidos |
| **Presencia Aterradora** | Enemigos cercanos deben superar SAB o quedan asustados |

### Paso 6: Acciones

Cada criatura necesita al menos una acción de ataque:

**Tipos de Acciones:**
- **Ataques cuerpo a cuerpo**: Para combatientes frontales
- **Ataques a distancia**: Para enemigos que mantienen distancia
- **Habilidades especiales**: Alientos, auras, invocaciones
- **Multiataque**: Para criaturas de nivel alto (2-3 ataques por turno)

**Fórmula de Daño Recomendada:**
- Nivel 1-4: 1d6 a 1d10 + modificador
- Nivel 5-10: 2d6 a 2d10 + modificador
- Nivel 11-15: 3d6 a 3d10 + modificador
- Nivel 16+: 4d6+ o habilidades devastadoras

### Paso 7: Acciones Legendarias (Opcional)

Solo para jefes de nivel 10+. Permiten actuar fuera de turno:

- **3 puntos por ronda** es el estándar
- Las acciones simples cuestan **1 punto**
- Las acciones poderosas cuestan **2-3 puntos**
- Se recuperan al inicio del turno del jefe

**Ejemplos de Acciones Legendarias:**
- Detectar (1): Realiza una tirada de Percepción
- Ataque de Cola (1): Un ataque adicional con cola
- Ataque de Alas (2): Ataque en área que puede derribar

### Paso 8: Recompensas

Define la experiencia y el botín:

| Nivel | XP Base | Tesoro Sugerido |
|-------|---------|-----------------|
| 1-3   | 25-100  | Objetos mundanos, pocas monedas |
| 4-6   | 200-700 | Objetos poco comunes, componentes |
| 7-10  | 1000-2500 | Objetos raros, gemas |
| 11-15 | 3000-7000 | Objetos muy raros, artefactos menores |
| 16-20 | 8000-20000 | Objetos legendarios |

### Equilibrio Final

Prueba tu criatura contra un grupo de 4 personajes del mismo nivel:

- **Encuentro Fácil**: Nivel de la criatura = Nivel del grupo - 2
- **Encuentro Normal**: Nivel de la criatura = Nivel del grupo
- **Encuentro Difícil**: Nivel de la criatura = Nivel del grupo + 2
- **Encuentro Mortal**: Nivel de la criatura = Nivel del grupo + 4

> **Nota**: Una criatura legendaria (con acciones legendarias) cuenta como si fuera 2-3 niveles superior para calcular la dificultad del encuentro.

### Ejemplo Rápido: Gólem de Piedra (Nivel 8)

```
Tipo: Constructo | Tamaño: Grande | Alineamiento: Neutral

FUE 20 (+5) | DES 8 (-1) | CON 18 (+4)
INT 3 (-4)  | SAB 10 (+0) | CAR 1 (-5)

Vitalidad: 95 | Defensa: 17 | Velocidad: 6m

Inmunidades: Veneno, Psíquico, Efectos mentales
Resistencias: Físico no-mágico

Rasgos:
- Forma Inmutable: Inmune a efectos que alteren su forma
- Resistencia Mágica: Ventaja en tiradas contra magia

Acciones:
- Multiataque: Dos ataques de Puño
- Puño: +8 para impactar, 2d10+5 contundente
- Lentificar (Recarga 5-6): Criaturas en 3m deben superar
  SAB CD 15 o quedan ralentizadas por 1 minuto

XP: 1800
```
