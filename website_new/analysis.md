# Análisis del Sistema de Rangos - Raldamain

> Análisis exhaustivo del sistema de rangos, combos, interacciones problemáticas, reglas ambiguas y propuestas de solución. El objetivo es mantener el estilo DnD/Pathfinder con más personalización, combates dinámicos y sabor shonen, sin sacrificar el balance.

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Combos Game-Breaking](#combos-game-breaking)
3. [Interacciones Problemáticas](#interacciones-problemáticas)
4. [Reglas No Definidas o Ambiguas](#reglas-no-definidas-o-ambiguas)
5. [Problemas de Balance por Categoría](#problemas-de-balance-por-categoría)
6. [Análisis de Economía de Acciones](#análisis-de-economía-de-acciones)
7. [Análisis de Economía de Recursos](#análisis-de-economía-de-recursos)
8. [Análisis de Invocaciones](#análisis-de-invocaciones)
9. [Builds Problemáticos de Ejemplo](#builds-problemáticos-de-ejemplo)
10. [Soluciones Propuestas (Resumen Global)](#soluciones-propuestas)
11. [Recomendaciones para el Manual](#recomendaciones-para-el-manual)

---

## Resumen Ejecutivo

Tras analizar los **31 rangos** del sistema y las reglas core, se han identificado:

| Categoría | Cantidad |
|---|---|
| Combos game-breaking (CRÍTICO) | 2 |
| Combos de alto impacto (ALTO) | 6 |
| Combos de impacto medio (MEDIO) | 5 |
| Interacciones ambiguas | 8 |
| Reglas sin definir | 11 |

Los problemas principales se concentran en tres áreas:
1. **Economía de acciones**: Varias fuentes de acciones adicionales que se acumulan sin límite
2. **Defensas apilables**: Combinaciones que hacen personajes virtualmente inmortales
3. **Reglas no escritas**: Mecánicas fundamentales (Posición Defensiva, Escudos, Empower, Ventaja) que muchas habilidades referencian pero que no están definidas en el manual

---

## Combos Game-Breaking

### CRÍTICO #1: Economía de Acciones Infinita

**Rangos:** Reflejos V + Mente Desencadenada V
**Nivel mínimo:** 15

**El Problema:**
- Base: 3 acciones/turno
- Velocidad Superior (Reflejos I): +1 acción = 4
- Reflejos Supremos (Reflejos V): turno completo adicional = 7
- División Mental (Mente Desencadenada V): turno completo adicional = **10 acciones/ronda**

Con 10 acciones por ronda, un personaje puede lanzar 5 ataques completos con mejoras o buffear, atacar, moverse, reposicionarse, etc. Todo en la misma ronda. Ningún enemigo puede competir con esto.

**Agravante:** Si añadimos Acelerar (Magia Temporal II) sobre este personaje, sube a 11 acciones.

**Solución Propuesta:**
- **Regla de Turno Adicional Único:** Un personaje solo puede beneficiarse de **1 turno adicional por ronda**, independientemente de la fuente. Si tiene acceso a múltiples, elige cuál usar.
- **Acciones bonus no apilan con turnos extra:** Velocidad Superior da +1 acción en tu turno principal, pero no se aplica a los turnos adicionales.
- **Cap de acciones:** Máximo 6 acciones por ronda bajo cualquier circunstancia.

---

### CRÍTICO #2: Tanque Inmortal

**Rangos:** Ira V + Fortitud V
**Nivel mínimo:** 15

**El Problema:**
Las capas defensivas son redundantes y cada una por sí sola ya es muy potente:

| Capa | Efecto |
|---|---|
| Resistencia Salvaje (Ira II) | Reduce TODO el daño recibido por Rango (5 a Rango V) |
| Resiliencia (Fortitud II) | Reduce daño de un ataque a la mitad, 1/ronda |
| Hasta la Muerte (Fortitud III) | Luchar a 0 PV con tiros de muerte |
| Furia Invulnerable (Ira V) | Luchar a PV negativos sin penalizadores ni tiros de muerte |
| Una Última Resistencia (Fortitud V) | Al caer a 0 PV: recuperar toda Vitalidad + mitad PV |
| Sanación Rápida (Fortitud V) | Recuperar Rango+2 Vitalidad/turno |
| Superar los Límites (Ira V) | Stats a 12, DEF +5, +20 Vitalidad temporal |

**Cálculo de supervivencia (nivel 15, CON 8):**
- Vitalidad: 25 + 20 (temporal) = 45
- PV: 15 + 6 (Fortitud) = 21
- DEF: base + armadura + 6 (Fortitud) + 5 (Superar) = ~20+
- Daño reducido en 5 por impacto (Resistencia Salvaje)
- 1/ronda reducir daño a la mitad (Resiliencia)
- Regen 7 Vitalidad/turno
- Al caer a 0 PV: vuelve con ~45 Vitalidad y 10 PV
- Después de eso, sigue luchando hasta PV = -8

**Para matar a este personaje necesitas infligir ~130+ daño efectivo**, asumiendo que no hace nada más que recibir golpes. Es prácticamente imposible en un combate normal.

**Solución Propuesta:**
- **Hasta la Muerte y Furia Invulnerable no apilan.** Si tienes ambas, Furia Invulnerable reemplaza (pero solo funciona durante Ira activa).
- **Una Última Resistencia:** Cambiar a recuperar Rango + 2 Vitalidad (no toda) y la mitad de PV. Impone estado Exhausto al usarse. 1 uso por descanso largo.
- **Resistencia Salvaje:** Reducir a la mitad del Rango (redondeando arriba) o limitar a daño físico no-mágico.
- **Sanación Rápida:** No funciona simultáneamente con Ira activa (la Ira es destructiva, no regenerativa).

---

## Combos de Alto Impacto

### ALTO #1: Espiral de Muerte por Nigromancia

**Rangos:** Nigromancia IV+
**El Problema:**
- Enervación (IV): Impide TODA sanación. Empeora cada día: Fatiga → Exhausto → Control Mental → Muerte/Zombi
- Maldición Vampírica (II): Curas Vitalidad = mitad del daño Necrótico que inflijas al maldito
- Alma Corrompida (V): Inmunidad Necrótico, el daño Necrótico te cura

**Resultado:** El nigromante se cura constantemente mientras la víctima no puede curarse en absoluto. Es una espiral de muerte sin escape posible a menos que tengas Sanación Superior.

**Solución:**
- Enervación requiere **impactar con daño Necrótico** para avanzar de nivel (no solo tiempo)
- Sanación Superior (Vida III) y hechizos equivalentes pueden **eliminar Enervación**
- Maldición Vampírica: la curación máxima por ronda = tu Rango + CAR (no ilimitada)
- Enervación tiene un máximo de 3 objetivos simultáneos

---

### ALTO #2: Ejército de Invocaciones

**Rangos:** Nigromancia + cualquier Ascendencia con invocación
**El Problema:**

| Fuente | Máximo |
|---|---|
| Animar No-muerto (Nigro II) | Rango x 3 = **15 zombis** |
| Crear No-muerto Superior (Nigro IV) | 1/Rango = **5 superiores** |
| Siervos del Contrato (Infernal III) | **4 demonios** |
| Elemental (Magia elemental III) | **1 elemental** |
| **TOTAL** | **25 criaturas** |

25 criaturas en el tablero ralentizan el combate a niveles inaceptables y hacen que la economía de acciones del invocador sea aplastante.

**Solución:**
- **Límite global de invocaciones:** Máximo = Nivel / 2 (redondeando arriba), cap de 8
- Todas las fuentes de invocación comparten el mismo límite
- Los zombis básicos cuentan como 1/3 de invocación (así Rango x 3 zombis = Rango slots de invocación)
- Alternativa: cada invocación activa reduce tu Chi/Vigor máximo por 1

---

### ALTO #3: Acechar + Asesino = Asesinato Garantizado

**Rangos:** Rastrear + Estilo Asesino (ambos IV+)

**El Problema:**
- Analizar Enemigo (Rastrear I): Ventaja permanente vs objetivo
- Enemigo Juramentado (Rastrear V): Ventaja total + 1d6 + efecto crítico cada impacto
- Furia Asesina (Asesino IV): 3 ataques, 1 sola defensa enemiga
- Maestría de Arma (Asesino IV): Ventaja + dado extra + herida por impacto

**Resultado:** 3 ataques contra una defensa, cada uno con Ventaja total, dados de daño adicionales y heridas automáticas. El primer round prácticamente garantiza la muerte de cualquier objetivo único.

**Solución:**
- Enemigo Juramentado **reemplaza** a Analizar Enemigo (no se acumulan)
- Furia Asesina y Maestría de Arma requieren concentración → no pueden estar activos simultáneamente
- Heridas de combate: máximo **1 herida infligida por turno** (la más grave aplicada)
- Furia Asesina: la defensa enemiga se repite contra cada ataque (no 1 tiro para los 3)

---

### ALTO #4: Magia Temporal = Dios

**Rangos:** Magia Temporal V

**El Problema:** Un mago temporal a Rango V tiene:
- **Premonición** (I): Repetir tiros, Rango+2 usos/día = 7 usos
- **Desplazamiento** (II): Reducir daño a 0, reacción
- **Predecir Movimiento** (III): Éxito automático en defensa, reacción
- **Dobles Temporales** (III): Sacrificar dobles para absorber impactos
- **Revertir el Tiempo** (IV): Guardar estado, volver si mueres
- **Visión Futura** (V): Ventaja en TODOS los tiros, 6 rondas, recupera 1 Premonición/turno
- **Parar el Tiempo** (V): Paralizar a todos + turno extra

No tiene contrapartida real. Puede evitar daño (Desplazamiento, Predecir), anular muertes (Revertir), tener ventaja siempre (Visión Futura) y parar el tiempo.

**Solución:**
- **Visión Futura:** Requiere concentración. Si recibes una herida, se pierde.
- **Predecir Movimiento:** Máximo 2 usos por **combate** (no por ronda)
- **Revertir el Tiempo:** 1 uso por **descanso largo** (no por combate). Coste aumenta a 3 chi.
- **Parar el Tiempo:** Si atacas a alguien, el efecto termina para TODOS (ya lo dice, pero enfatizar). Duración: solo 1 ronda, no extensible.
- **Premoniciones:** Máximo 1 por ronda (no acumulables).

---

### ALTO #5: Berserker Nuclear (Ira + Reflejos)

**Rangos:** Ira IV + Reflejos I+

**El Problema:**
- Ira I: Ventaja en ataques + 1d6 daño
- Golpe de Adrenalina (Ira IV): +1 acción/turno
- Velocidad Superior (Reflejos I): +1 acción/turno
- Total: 5 acciones con Ventaja y +1d6 daño en cada ataque

**Solución:**
- Las acciones extra de diferentes fuentes **no se acumulan para ataques**. Solo 1 acción extra de ataque por turno. Las acciones adicionales pueden usarse para movimiento, defensa o mejoras, pero no para atacar.
- Alternativa: cap de 2 ataques por turno (salvo habilidades que digan lo contrario como Furia Asesina).

---

### ALTO #6: Transformación Abisal VI = Todas las Técnicas

**Rangos:** Ascendencia Abisal VI

**El Problema:**
Transformación Abisal dice: *"Conoces todas las técnicas marciales (Rango III gratis)"*. Esto otorga instantáneamente acceso a CADA habilidad de Rango I-III de: Asesino, Coloso, Duelista, Ira, Fortitud, Reflejos. Eso son ~40 habilidades adicionales durante la transformación, combinado con stats a 12 y DEF 20.

**Solución:**
- Cambiar a: *"Elige 2 estilos marciales. Conoces sus habilidades hasta Rango II durante la transformación."*
- Alternativa: solo técnicas de Rango I de todos los estilos (limitando a las habilidades básicas).

---

## Combos de Impacto Medio

### MEDIO #1: Guerrero Divino como Buffer de Grupo

Hueste Divina (IV) da Ventaja a TODOS los aliados en ataque y defensa. En un grupo de 4-5, esto es un multiplicador de fuerza enorme.

**Solución:** Cambiar a +2 en tiros (no Ventaja completa) o limitar a 2 aliados.

### MEDIO #2: Cadenas del Contrato + Invocaciones

Transferir TODO el daño a criaturas invocadas desechables.

**Solución:** Máximo 50% del daño transferido. No funciona con invocaciones propias.

### MEDIO #3: Portal Espiritual (+3 acciones en otro plano)

**Solución:** Acciones en el plano espiritual solo para buffs/preparación, no ataques. Cambio de plano cuesta 1 acción completa.

### MEDIO #4: Invertir Chi (Magia Protectora V)

Daño = reserva total de chi del objetivo. Un mago con 25 chi recibe 28 daño.

**Solución:** Daño = chi AÑADIDO (3-5), no reserva total. O permitir gastar chi 1:1 para reducir.

### MEDIO #5: Doble Maldición (Shade + Enervación)

Dos maldiciones que impiden sanación, ambas requieren eliminación independiente.

**Solución:** Solo 1 maldición que impide sanación puede estar activa. La más reciente reemplaza.

---

## Interacciones Problemáticas

### 1. ¿Se acumulan las Ventajas?

Múltiples fuentes dan "Ventaja":
- Ira de Combate
- Analizar Enemigo
- Visión Futura
- Hueste Divina
- Maestría de Arma/Estilo
- Y muchas más

**Problema:** Si cada Ventaja = +1d6 y se acumulan, un personaje con 3 fuentes tira +3d6. Esto desequilibra completamente las tiradas.

**Solución recomendada:**
- **Ventaja no se acumula.** Múltiples fuentes de Ventaja siguen siendo +1d6.
- Si quieres recompensar la sinergia: cada fuente adicional de Ventaja da +1 fijo (no dado) al tiro, máximo +3.
- Documentar esto explícitamente en el manual.

### 2. ¿Se pueden tener múltiples "estados" activos?

Los "estados" del sistema son:
- Ira de Combate
- Mente Desencadenada
- Furia Abisal
- Canalización Celestial
- Forma de la Bestia
- Guerrero de la Fe

**Problema:** Si se pueden activar múltiples estados simultáneamente, las Ventajas, resistencias y bonuses se acumulan de forma exponencial.

**Solución recomendada:**
- **Solo 1 estado de combate activo a la vez.** Activar uno nuevo reemplaza al anterior.
- Los "estados" son: Ira, Mente Desencadenada, Furia Abisal, Canalización Celestial, Forma de la Bestia, Guerrero de la Fe.
- Las Ascendencias y los estados base (Ira, Mente Desencadenada) no son compatibles entre sí.

### 3. Ira prohíbe concentración, pero...

Ira dice: *"No puedes concentrarte ni usar Posición Defensiva."*

Pero muchas habilidades que complementan a Ira requieren concentración:
- Muro Viviente (Fortitud IV)
- Cualquier buff mágico aliado

**¿La prohibición aplica solo a TUS propios efectos de concentración, o también a los que aliados mantienen sobre ti?**

**Solución:** Clarificar que Ira prohíbe mantener TU propia concentración. Efectos de concentración ajenos siguen funcionando pero tú no puedes usar habilidades que requieran concentración.

### 4. "Innato" vs "Mágico" vs "Divino"

Fortitud y Reflejos dicen: *"Absolutamente innato: No puede ser suprimido o contrarrestado"*. Ira dice *"Completamente innato"*. Mente Desencadenada NO dice esto.

**Problema:**
- ¿Campo Antimágico (Protectora IV) suprime Reflejos? (No debería, es innato)
- ¿Suprime Mente Desencadenada? (Probablemente sí, no es innato)
- ¿Disyunción (Protectora V) afecta a habilidades innatas? (No debería)

**Solución:** Añadir al manual una clasificación clara:
- **Innato:** No puede ser suprimido por antimagia. Funciona en zonas sin magia.
- **Mágico/Arcano:** Afectado por antimagia, Disyunción, Contrahechizo.
- **Divino:** Afectado por efectos anti-divinos pero no antimagia arcana.

### 5. Inflación de Pools de Recursos

Un personaje con 4 rangos acumula recursos de TODOS:

**Ejemplo: Guerrero Divino III + Ascendencia Infernal III + Magia Fuego III + Estilo Coloso III (Nivel 12)**
- Guerrero Divino: +3 Chi, +3 Vigor
- Ascendencia Infernal: +3 Chi, +3 Vigor
- Magia Fuego: +5 Chi
- Estilo Coloso: +5 Vigor
- **Total: 11 Chi, 11 Vigor = 22 recursos**

Esto es una cantidad enorme que permite usar habilidades costosas repetidamente sin preocupación.

**Solución:**
- Cada personaje tiene un **pool unificado** = mayor de (Chi total, Vigor total) + menor / 2
- O: los pools no se suman directamente. Cada rango da acceso a su pool individual y solo puedes usar esos recursos para habilidades de ESE rango (excepto Guerrero Divino y Ascendencias que son flexibles).

### 6. "Cuenta como mágico" redundante

Varias habilidades hacen que ataques "cuenten como mágicos":
- Proyección de Chi (Asesino V y Coloso V)
- Infusión de Fuego (Magia Fuego II)
- Golpe Trascendente (Celestial II)
- Fuerza Salvaje (Primigenia II)

**Problema menor:** Estas habilidades son redundantes entre sí. Si ya tienes una, las demás no añaden nada.

**Solución:** No requiere cambio mecánico, pero documentar que "mágico" no se acumula.

### 7. Aperturas (Opportunity Attacks) y el sistema de 3 acciones

El usuario describe que "cuando un personaje falla un ataque o se mueve, provoca una apertura". Con 3 acciones por turno, esto significa:
- Cada movimiento genera una apertura
- Cada ataque fallado genera una apertura
- Un personaje con 10 acciones puede generar 10 aperturas por ronda

**Problema:** ¿Cuántas aperturas puede explotar un personaje por ronda? Con 2 reacciones base, máximo 2. Pero algunas habilidades dan reacciones adicionales.

**Solución:** Documentar claramente que:
- Máximo 1 apertura por movimiento/fallo del mismo enemigo por turno
- Explotar una apertura cuesta 1 reacción
- Máximo de reacciones defensivas/ofensivas por ronda claramente definido

### 8. Interacción Magia de Fuego + Magia de Hielo

¿Puede un personaje tener ambas? Son "opuestas" temáticamente pero mecánicamente no hay restricción. Algunas habilidades de fuego eliminan efectos de hielo y viceversa.

**Solución:** No restringir mecánicamente (permite builds creativos), pero documentar que tus propios efectos se contrarrestan: tu Muro de Fuego derrite tu Muro de Hielo, etc.

---

## Reglas No Definidas o Ambiguas

Estas son mecánicas que muchas habilidades referencian pero que **no están escritas en el manual core**. Son CRÍTICAS de definir para que el sistema funcione.

### 1. Posición Defensiva (~20 referencias)

**Se usa en:** Contrataque (Duelista IV), Salto Espacial (Espacial I), Giro Defensivo (Reflejos III), Cambio de Posición (Espacial IV), y muchas más.

**Propuesta de definición:**
> **Posición Defensiva:** Un personaje puede entrar en Posición Defensiva gastando 1 acción. Mientras esté en esta posición:
> - Recibe +2 a todos los tiros defensivos
> - Puede usar reacciones defensivas especiales que requieran Posición Defensiva
> - Pierde la Posición Defensiva si ataca, se mueve más de 1 paso, o es empujado/tropezado

### 2. Contadores de Escudo (~15 referencias)

**Se usa en:** Muro Viviente (Fortitud IV), Maestría de Estilo (Coloso IV), Meteoros de Chi (Evocación III), Espadas de Justicia (Vida IV), y muchas más.

**Propuesta de definición:**
> **Contadores de Escudo:** Cada contador absorbe completamente 1 impacto (ataque o hechizo) que te afecte, anulando todo su daño y efectos. Se consumen automáticamente antes de que aplique tu defensa. Un personaje puede tener un máximo de contadores de escudo igual a su nivel / 2.

### 3. Empower (~50+ referencias)

Presente en la mayoría de habilidades como efecto adicional opcional.

**Propuesta de definición:**
> **Empower:** Al usar una habilidad, puedes gastar 1 recurso adicional (chi o vigor, según la habilidad) para activar su efecto Empower. Solo puedes empoderar 1 habilidad por turno. Empoderar no cuesta acción adicional.

### 4. Ventaja y Desventaja (~40 referencias)

**Propuesta de definición:**
> **Ventaja:** Añade +1d6 al tiro. Múltiples fuentes de Ventaja **no se acumulan** (siguen siendo +1d6). Cada fuente adicional da +1 al tiro (máximo +3 bonus de apilamiento).
>
> **Desventaja:** Resta -1d6 al tiro. No se acumula.
>
> **Cancelación:** Una Ventaja cancela una Desventaja. El excedente aplica.

### 5. Sistema de 3 Acciones + 2 Reacciones

El manual dice "una acción estándar" pero todo el sistema de rangos asume 3 acciones y 2 reacciones.

**Propuesta:** Actualizar el manual:
> **Acciones por turno:** Cada personaje tiene **3 acciones** y **2 reacciones** por ronda. Puedes gastar acciones en:
> - Atacar (1 acción base, mejoras pueden costar más)
> - Lanzar hechizo (1-3 acciones según el hechizo)
> - Moverte 1 paso (1 acción)
> - Habilidad de rango (coste indicado)
> - Posición Defensiva (1 acción)

### 6. Parada vs Esquiva

**Propuesta de definición:**
> **Parada:** Tiro defensivo usando FUE o DES + Rango de arma. Requiere arma o escudo. Bloquea completamente el daño si superas el tiro de ataque. No funciona contra ataques de área.
>
> **Esquiva:** Tiro defensivo usando DES + Rango relevante. No requiere equipo. Si superas, evitas completamente el ataque. Funciona contra la mayoría de ataques, incluidos algunos de área.
>
> Ambas cuestan 1 reacción. Puedes elegir cuál usar al ser atacado.

### 7. Concentración

**Propuesta de definición:**
> **Concentración:** Solo puedes mantener **1 efecto de concentración** a la vez. Activar uno nuevo termina el anterior. Pierdes la concentración si:
> - Recibes una herida permanente
> - Quedas aturdido o inconsciente
> - Fallas un tiro de Concentración al recibir daño (CD = 10 + daño recibido)
> - Usas otra habilidad que requiera concentración

### 8. Resistencia / Resistencia Superior / Inmunidad

**Propuesta de definición:**
> - **Resistencia:** Reduce el daño de ese tipo a la **mitad** (después de DEF). Los efectos de estado asociados tienen -2 a la CD.
> - **Resistencia Superior:** Reduce el daño a **un cuarto**. Los efectos de estado asociados se resisten con Ventaja.
> - **Inmunidad:** Ignora completamente el daño y efectos de ese tipo.

### 9. Sistema de Distancias

**Propuesta de definición:**

| Nombre | Distancia | Casillas (si usas grid) |
|---|---|---|
| Adyacente/Toque | 1.5m | 1 casilla |
| 1 Paso | 3m | 2 casillas |
| Cercano | 6m | 4 casillas |
| Corto | 9m | 6 casillas |
| Medio | 15m | 10 casillas |
| Largo | 30m | 20 casillas |
| Lejano | 60m+ | 40+ casillas |

### 10. Efectos Críticos

**Propuesta de definición:**
> **Crítico:** Se activa cuando tu tiro de ataque supera la defensa del objetivo por **5 o más**, o cuando sacas un **20 natural** en el d20. Activa el efecto descrito en el campo "crit" de la habilidad.

### 11. Aperturas

**Propuesta de definición:**
> **Apertura:** Cuando una criatura falla un ataque o se mueve fuera del alcance cuerpo a cuerpo de un enemigo, ese enemigo puede gastar 1 reacción para realizar un ataque de oportunidad. Máximo 1 apertura explotada por el mismo enemigo por turno.

---

## Problemas de Balance por Categoría

### Marciales (Asesino, Coloso, Duelista)

**Balance general:** Bien equilibrados entre sí. Cada uno tiene un nicho claro.

| Aspecto | Asesino | Coloso | Duelista |
|---|---|---|---|
| Nicho | Daño single-target | Daño AoE + control | Duelo 1v1 + parry |
| Recurso | Chi | Vigor | Vigor |
| Fortaleza | Nova damage | Crowd control | Versatilidad defensiva |
| Debilidad | Frágil | Lento, sin defensa | Menos daño bruto |

**Problemas menores:**
- **Asesino IV (Furia Asesina):** 3 ataques con 1 defensa enemiga es demasiado. Debería ser 2 ataques o el enemigo tira defensa por cada uno.
- **Coloso IV (Golpe por Golpe):** Impacto automático a cambio de recibir daño es muy buena acción-economía para tanques. Debería requerir un tiro (con Ventaja).
- **Duelista V (Cortes en Cadena):** Potencialmente infinito. Limitar a Rango ataques máximos.

### Combate General (Fortitud, Ira, Reflejos, Mente Desencadenada, Rastrear)

**Fortitud:** Posiblemente la rama más sólida y bien diseñada. Cada rango es útil sin ser overpowered individualmente. El problema solo surge al combinar con Ira.

**Ira:** Potente pero con contrapartida clara (no concentración, coste de vigor al terminar). El problema es Rango V donde la contrapartida desaparece (Superar los Límites + Furia Invulnerable).

**Reflejos:** Rango V (Reflejos Supremos) es demasiado potente. Un turno completo adicional debería ser el efecto más raro y costoso del juego, no una pasiva.

**Mente Desencadenada:** Interesante diseño con cordura como contrapartida. Rango V tiene el mismo problema que Reflejos V.

**Rastrear:** Bien balanceado en general. Enemigo Juramentado (V) es muy potente pero con scope limitado (1 objetivo).

### Magias Elementales

**Balance general:** Razonablemente equilibradas. La progresión de dados (d6 → d8 → d10) a Rango III y V es elegante.

**Problemas:**
- **Magia de Fuego** tiene demasiadas opciones ofensivas para pocos costes. Lluvia de Brasas (V) = 4 explosiones de 4d10 es potencialmente el hechizo más dañino del juego.
- **Magia de Hielo** depende demasiado del entorno frío. En entornos cálidos es significativamente más débil que Fuego.
- **Magia de Agua** es versátil (sanación + control + daño) lo cual la hace ligeramente mejor que las demás.

### Magias Arcanas (Temporal, Espacial, Evocación, Protectora)

**Temporal:** Demasiado potente en TODOS los rangos. Ver sección de combos.

**Espacial:** Bien diseñada. El teletransporte defensivo tiene contrapeso con el requisito de Posición Defensiva.

**Evocación:** Progresión sólida. La Especialidad Arcana da buena personalización. Combinar Hechizos (III) es potente pero con buen coste.

**Protectora:** Nicho defensivo muy fuerte. Invertir Chi (V) necesita rebalanceo (ver combos).

### Magias Ocultistas (Gravitatoria, Ilusoria, Mental, Sombría, Nigromancia)

**Gravitatoria:** Excelente diseño de control de campo. Balance razonable.

**Ilusoria:** Depende mucho de la interpretación del DJ. Muerte Fantasmal (V) es problemática si las ilusiones causan daño real sin recurso defensivo claro.

**Mental:** Muy potente en PvP. Esclavizar (V) es control total sin contrapartida clara. Necesita: tiros de salvación cada ronda, máximo 1 objetivo, se rompe al recibir daño el controlador.

**Sombría:** Bien diseñada con la dependencia de oscuridad como limitador natural.

**Nigromancia:** Ver sección de combos. El problema principal es la espiral de Enervación.

### Ascendencias

**Todas las transformaciones de Rango VI tienen el mismo template:**
- +40 Vitalidad temporal
- Stats a 12
- DEF 20
- Inmunidades varias
- Tamaño +1, Vuelo, etc.

Esto está bien como "ultimate" pero el problema es que algunas dan mucho más que otras:
- **Abisal:** +todas las técnicas marciales Rango III (MUCHO más que las demás)
- **Akhasica:** +6 hechizos nuevos + Ventaja Mental + hechizos gratis (muy potente)
- **Celestial:** +1d10 Radiante en ataques + hechizos de Vida dobles (equilibrado)
- **Infernal:** +Arma Profana en todos los ataques + Presencia Majestuosa (equilibrado)
- **Primigenia:** +ataques naturales 1d10 + estilo marcial Rango III (equilibrado)

**Solución:** Nerfear Abisal a 1-2 estilos marciales. Akhasica a 3 hechizos nuevos (no 6).

---

## Análisis de Economía de Acciones

### Tabla de Acciones por Build

| Build | Nivel | Acciones/ronda | Fuentes |
|---|---|---|---|
| Base | Cualquiera | 3 | Sistema base |
| +Reflejos I | 1+ | 4 | Velocidad Superior |
| +Ira IV | 10+ | 5 | Golpe de Adrenalina |
| +Reflejos V | 13+ | 7 | Reflejos Supremos (turno extra) |
| +Mente V | 13+ | 10 | División Mental (otro turno extra) |
| +Acelerar (aliado) | 4+ | 11 | Magia Temporal II |

**Comparación con DnD 5e:**
- DnD: 1 acción + 1 bonus + 1 reacción = ~2-3 "cosas" por ronda
- Raldamain base: 3 acciones + 2 reacciones = 5 "cosas"
- Raldamain optimizado: 10+ acciones + 2 reacciones = 12+ "cosas"

**El rango aceptable para combate dinámico shonen es 3-6 acciones por ronda.** Más que eso ralentiza el juego y desequilibra. Recomendación: cap duro de 6 acciones.

---

## Análisis de Economía de Recursos

### Fórmula de Recursos por Rango

| Tipo de Rango | Chi/rango | Vigor/rango |
|---|---|---|
| Magia elemental | Rango + 2 | 0 |
| Magia arcana/ocultismo | Rango + 2 | 0 |
| Marcial (Asesino) | Rango + 2 | 0 |
| Marcial (Coloso/Duelista) | 0 | Rango + 2 |
| Combate (Fortitud/Ira/Rastrear) | 0 | Rango + 2 |
| Combate (Reflejos/Mente) | Rango + 2 | 0 |
| Guerrero Divino | Rango | Rango |
| Ascendencia Abisal/Celestial/Primigenia | Rango x 2 | 0 |
| Ascendencia Akhasica/Infernal | Rango | Rango |

### Pools Típicos a Nivel 12

| Build | Chi | Vigor | Total |
|---|---|---|---|
| Mago puro (4 magias a Rango III) | 20 | 0 | 20 |
| Guerrero puro (4 marciales a Rango III) | 5 | 15 | 20 |
| Híbrido (2 magias + 2 marciales) | 10 | 10 | 20 |
| Ascendencia + Magia + Guerrero | 12 | 8 | 20 |

**Observación:** Los pools tienden a equilibrarse a ~20 total a nivel 12, lo cual es razonable. El problema no es el tamaño del pool sino la eficiencia de gasto (algunas habilidades son mucho más eficientes que otras por punto de recurso gastado).

---

## Análisis de Invocaciones

### Capacidad Total de Invocación por Fuente

| Fuente | Tipo | Máximo | Nivel de criatura |
|---|---|---|---|
| Animar No-muerto (Nigro II) | Zombis/Esqueletos | Rango x 3 | Bajo |
| Crear No-muerto Superior (Nigro IV) | No-muerto inteligente | 1 por Rango | Rango x 2 |
| Invocación Abisal (Abisal III) | Criatura abisal | 4 | Rango x 2 |
| Siervos del Contrato (Infernal III) | Criatura infernal | 4 | Rango x 2 |
| Ángel Protector (Celestial III) | Celestial | 4 | Rango x 2 |
| Llamar a los Espíritus (Primigenia III) | Espíritu | 4 | Rango x 2 |
| Elemental de X (Elemental III) | Elemental | 1 | 6 + 2/Rango |
| Dobles Temporales (Temporal III) | Copias | Rango | N/A |
| Clones Sombríos (Sombría IV) | Clones | Rango | Mitad nivel |
| Monstruo Ilusorio (Ilusoria V) | Ilusión | 4 | 12 |

**Peor caso:** Un nigromante-infernal con invocaciones máximas tiene 24+ criaturas.

**Límite global recomendado:** Máximo = Nivel / 2 (cap 8). Los zombis básicos cuentan como 1/3.

---

## Builds Problemáticos de Ejemplo

### Build 1: "El Inmortal" (Nivel 15)
```
Ira V, Fortitud V, Guerrero Divino III, Estilo Coloso II
Stats: FUE 8, DES 2, CON 7, INT 1, SAB 2, CAR 4
```
**Problema:** ~130+ daño efectivo para matar. Se cura, reduce daño, lucha en negativo.

### Build 2: "10 Acciones" (Nivel 15)
```
Reflejos V, Mente Desencadenada V, Estilo Asesino III, Rastrear I
Stats: FUE 3, DES 8, CON 3, INT 6, SAB 1, CAR 1
```
**Problema:** 10 acciones/ronda. Puede hacer 5 ataques completos con mejoras.

### Build 3: "El Nigromante" (Nivel 15)
```
Nigromancia V, Ascendencia Infernal IV, Magia Sombría III, Magia Mental II
Stats: FUE 1, DES 2, CON 4, INT 5, SAB 2, CAR 8
```
**Problema:** 20+ criaturas en campo. Enervación + Maldición Vampírica = espiral de muerte.

### Build 4: "El Mago del Tiempo" (Nivel 15)
```
Magia Temporal V, Magia Evocación IV, Magia Protectora III, Reflejos II
Stats: FUE 1, DES 3, CON 4, INT 8, SAB 3, CAR 3
```
**Problema:** Virtualmente invencible. Ventaja en todo, éxito automático defensivo, revertir muerte.

Puedes evaluar estos builds con la herramienta:
```bash
python tools/rank_evaluator.py --example speedster_letal
python tools/rank_evaluator.py --example necromancer_infernal
python tools/rank_evaluator.py --example archimago_temporal
```

---

## Soluciones Propuestas

### Cambios Fundamentales (Prioridad Alta)

1. **Cap de acciones:** Máximo 6 acciones por ronda. Solo 1 turno adicional de cualquier fuente.
2. **Solo 1 estado de combate activo:** Ira, Mente Desencadenada, Furia Abisal, etc. son mutuamente excluyentes.
3. **Ventaja no se acumula:** Siempre +1d6. Fuentes adicionales dan +1 fijo (max +3).
4. **Límite global de invocaciones:** Nivel / 2, máximo 8.
5. **1 concentración máximo:** Documentar explícitamente.
6. **Heridas máximas por turno:** 1 herida infligida por turno por atacante.

### Cambios de Habilidades Específicas (Prioridad Alta)

| Habilidad | Cambio |
|---|---|
| Reflejos Supremos | Cambiar de pasiva a activada (3 chi, 1/combate) |
| División Mental | Cambiar de pasiva a activada (3 chi + 2 cordura, 1/combate) |
| Furia Invulnerable | Solo durante Ira activa. No apila con Hasta la Muerte |
| Una Última Resistencia | Recupera Rango+2 Vitalidad (no toda). Impone Exhausto |
| Enervación | Requiere daño necrótico para avanzar. Eliminable con Sanación Superior |
| Furia Asesina | El enemigo tira defensa por cada ataque (no 1 para los 3) |
| Visión Futura | Requiere concentración |
| Transformación Abisal | Limitar a 2 estilos marciales elegidos, Rango II |
| Hueste Divina | +2 en tiros (no Ventaja) o máximo 2 aliados |
| Invertir Chi | Daño = chi añadido, no reserva total |

### Documentación Necesaria (Prioridad Máxima)

Estas mecánicas DEBEN añadirse al manual antes de cualquier playtesting:

1. **Posición Defensiva** - Coste, beneficios, cómo se pierde
2. **Contadores de Escudo** - Cuánto absorben, máximo
3. **Empower** - Coste, limitaciones por turno
4. **Ventaja/Desventaja** - Definición formal, apilamiento
5. **3 acciones + 2 reacciones** - Actualizar el manual
6. **Parada vs Esquiva** - Cuándo usar cada una
7. **Concentración** - Reglas completas
8. **Resistencia/Inmunidad** - Valores numéricos
9. **Distancias** - Tabla de conversión
10. **Críticos** - Cuándo se activan
11. **Aperturas** - Reglas completas

---

## Recomendaciones para el Manual

### Estructura sugerida del manual actualizado

1. **Creación de Personaje** (actual, está bien)
2. **Estadísticas y Progresión** (actual, está bien)
3. **EL COMBATE** (necesita reescritura completa):
   - 3 acciones + 2 reacciones
   - Tipos de acción (ataque, hechizo, movimiento, defensa, bonus)
   - Parada vs Esquiva (definiciones)
   - Posición Defensiva (definición)
   - Aperturas (definición)
   - Ventaja/Desventaja
   - Contadores de Escudo
   - Concentración
   - Empower
4. **Valores Defensivos** (actual + Resistencia/Inmunidad definidas)
5. **Efectos de Estado** (actual + ampliar)
6. **Distancias y Áreas** (NUEVO)
7. **Tipos de Daño** (NUEVO)
8. **Glosario de Términos** (NUEVO)

### Filosofía de diseño recomendada

Para mantener el estilo **DnD/Pathfinder con más personalización, combate dinámico y sabor shonen**:

- **3 acciones** es perfecto para combate dinámico. Los jugadores tienen opciones cada turno.
- **Aperturas** son excelentes para combate cinemático. Evitan que los turnos sean aislados.
- **2 reacciones** permiten defensa activa estilo anime (parar, esquivar, contraatacar).
- **Los estados** (Ira, Mente Desencadenada) dan momentos shonen de "power up". Pero deben ser **mutuamente excluyentes** para que cada uno sea una decisión significativa.
- **Las transformaciones de Ascendencia** son la "forma final" shonen. Deben ser raras y durar poco (6 rondas es perfecto).
- **El sistema de heridas** añade stakes reales. Mantenerlo pero limitar el apilamiento.

El sistema tiene una base excelente. Los problemas identificados son todos solucionables con las propuestas de este documento, y la mayoría se resuelven con **documentar reglas que ya se asumen** + **caps numéricos** a las acumulaciones más abusivas.

---

## Herramienta de Evaluación

Se incluye una herramienta en `tools/rank_evaluator.py` que permite:

```bash
# Listar todos los rangos
python tools/rank_evaluator.py --list

# Ver detalles de un rango específico
python tools/rank_evaluator.py --rank magia_fuego

# Ver todos los combos problemáticos
python tools/rank_evaluator.py --combos

# Ver reglas no definidas
python tools/rank_evaluator.py --rules

# Evaluar un build predefinido
python tools/rank_evaluator.py --example speedster_letal
python tools/rank_evaluator.py --example berserker_divino
python tools/rank_evaluator.py --example archimago_temporal
python tools/rank_evaluator.py --example necromancer_infernal

# Evaluar un build personalizado desde JSON
python tools/rank_evaluator.py --build mi_build.json

# Modo interactivo
python tools/rank_evaluator.py --interactive
```

### Formato de archivo build.json
```json
{
    "name": "Mi Personaje",
    "level": 10,
    "stats": {"FUE": 5, "DES": 3, "CON": 4, "INT": 2, "SAB": 3, "CAR": 3},
    "ranks": {
        "estilo_asesino": "III",
        "reflejos": "II",
        "magia_fuego": "III",
        "rastrear": "II"
    }
}
```
