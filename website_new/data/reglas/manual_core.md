## Estadísticas Principales
Todo personaje en Raldamain se define por seis atributos que representan su potencial físico y mental. Estos valores se suman a tus tiradas de dados (d20) para determinar el éxito de tus acciones.

### Distribución Inicial
A **Nivel 1**, dispones de los siguientes valores para asignar a tus seis estadísticas como prefieras:

> **Array Inicial:** 3, 2, 2, 2, 1, 1

**Regla de Ajuste:** Al crear el personaje, puedes reducir una estadística asignada en **-1** para aumentar otra en **+1**.
* <i>**Mínimo:**</i> -1
* <i>**Máximo inicial:**</i> 3

### Progresión y Límites
Cada vez que subes de nivel, puedes aumentar una estadística en **+1**. Sin embargo, tu potencial está limitado por tu nivel actual:

| Franja de Nivel | Valor Máximo de Estadística |
| :--- | :--- |
| **Nivel 1** | 3 |
| **Nivel 2-5** | 4 |
| **Nivel 6-8** | 5 |
| **Nivel 9-11** | 6 |
| **Nivel 12-14** | 7 |
| **Nivel 15-17** | 8 |
| **Nivel 18+** | 9 |

### Descripción de Estadísticas

| Estadística | Abreviatura | Uso Principal |
| :--- | :--- | :--- |
| **Fuerza** | **FUE** | Ataque y daño cuerpo a cuerpo, atletismo, capacidad de carga. |
| **Destreza** | **DES** | Ataque a distancia/ligero, iniciativa, sigilo, esquiva. |
| **Constitución** | **CON** | Puntos de Vida, Vitalidad, resistir venenos/enfermedades. |
| **Inteligencia** | **INT** | Magia arcana/ocultismo, conocimientos, investigar. |
| **Sabiduría** | **SAB** | Magia divina, percepción, voluntad, primeros auxilios. |
| **Carisma** | **CAR** | Magia elemental, persuasión, engaño, resistir miedo. |

---

## Valores Defensivos
Estos valores derivados determinan tu capacidad de supervivencia. Se calculan automáticamente basándose en tus estadísticas y nivel.

### Vitalidad (Aguante)
Es tu primera línea de defensa; representa el aguante físico, la energía y la suerte antes de recibir daño real.
* **Fórmula:** `2 + CON + Nivel`
* **Recuperación:** Se restaura completamente con un **Descanso Corto** o **Largo**.
* **Funcionamiento:** Todo daño va primero a la Vitalidad. Si llega a 0, el daño restante pasa a los PV.

### Puntos de Vida (Salud)
Representan tu integridad física real.
* **Fórmula (Nivel 1):** `3 + CON`
* **Progresión:** Aumenta en **+1** cada 3 niveles (Niveles 4, 7, 10, 13...).
* **Recuperación:** Solo se restaura con un **Descanso Largo** o magia de sanación potente.

### Sistema de Heridas y Muerte
Cuando pierdes PV (daño letal), sufres consecuencias inmediatas:

1.  **Heridas:** Perder PV causa una <i>**Herida Permanente Leve**</i>. Si ya tienes una, pasa a Media, y luego a Grave.
2.  **Inconsciencia:** Si tus PV llegan a **0**, caes <i>**Inconsciente**</i> y sufres una <i>**Herida Permanente Grave**</i>. Quedas <i>**Moribundo**</i>.
3.  **Moribundo:** Pierdes 1 PV por turno.
4.  **Muerte Definitiva:** Mueres si tus PV negativos igualan a tu CON negativa (ej: si tienes CON 2, mueres al llegar a -2 PV).

### Defensa (DEF)
Reduce el daño recibido de cada impacto. Depende de tu **Armadura** y talentos. Es diferente a las **Resistencias** (que reducen tipos de daño específicos).

### Cordura
Resistencia mental. `2 + Nivel + INT`. Si llega a 0, el personaje sufre una **Locura**. Se recupera en un **Descanso Largo**.

### Resistencias e Inmunidades

Las Resistencias reducen el daño de un tipo específico (Fuego, Frío, Necrótico, etc.).

| Nivel | Efecto sobre el daño | Condición |
| :--- | :--- | :--- |
| **Resistencia** | Reduce el daño a la **mitad** (÷2) | Una fuente que otorgue Resistencia a ese tipo |
| **Resistencia Superior** | Reduce el daño a **un cuarto** (÷4) | Dos fuentes distintas de Resistencia al mismo tipo |
| **Inmunidad** | Reduce el daño a **0** | Otorgada explícitamente por habilidades o criaturas |

* Las Resistencias se aplican **después** de restar la DEF.
* Resistencia **no se acumula** más allá de Resistencia Superior. Tener tres o más fuentes sigue siendo ÷4.
* Inmunidad anula tanto el daño como los efectos de estado asociados a ese tipo, salvo que se indique lo contrario.

### Contadores de Escudo

Varias habilidades otorgan **contadores de escudo** (ver: *Maestría de Estilo* del Coloso, *Meteoros de Chi* de Evocación, *Fortaleza* de Fortitud, entre otros).

* Cada contador puede gastarse para **reducir el daño de un impacto en 10**.
* Puedes gastar **tantos contadores como desees** en un mismo impacto.
* Los contadores se gastan **después** de restar la DEF pero **antes** de aplicar Resistencias.
* Máximo de contadores acumulados = **Nivel / 2** (redondeando arriba), salvo que una habilidad indique lo contrario.
* Los contadores **no se recuperan** automáticamente; solo se reponen con las habilidades que los otorgan o su efecto Empoderar.

---

## Talentos y Habilidades
Los talentos representan el entrenamiento específico de tu personaje (sigilo, medicina, atletismo). Son independientes de los Rangos de combate.

### Niveles de Talento
Tu soltura en una habilidad se mide del 0 al 5.
* **Creación (Nivel 1):** Recibes **4 puntos** para distribuir.
* **Subida de Nivel:** Recibes **+2 puntos** cada nivel.

**Límites de Talento por Nivel:**
| Nivel del Personaje | Talento Máximo |
| :--- | :--- |
| **1 - 4** | 2 |
| **5 - 7** | 3 |
| **8 - 10** | 4 |
| **11+** | 5 |

### Realizar Tiros
Cuando el DJ pide una prueba, la fórmula es:

> **Resultado = 1d20 + Estadística + Nivel de Talento**

* **Dificultad (CD):** Oscila entre 10 (Fácil) y 30 (Imposible).
* **Asistir:** Un aliado con al menos 1 nivel en el mismo talento puede ayudarte, otorgándote un **+2** al tiro.

### Lista de Talentos
| Talento | Stat | Descripción |
| :--- | :--- | :--- |
| **Acrobacias** | DES | Equilibrio, saltos, caídas, escapar de agarres. |
| **Actuación** | CAR | Arte, música, distracción, disfraces. |
| **Arcanismo** | INT | Teoría mágica, identificar hechizos, rituales. |
| **Atletismo** | FUE | Correr, nadar, trepar, proezas físicas. |
| **Averiguar Intenciones** | SAB | Detectar mentiras, predecir movimientos, leer emociones. |
| **Concentración** | INT | Mantener hechizos, resistir efectos mentales, tareas largas. |
| **Destrozar** | FUE | Romper objetos, puertas, identificar puntos débiles estructurales. |
| **Engaño** | CAR | Mentir, fintar en combate, manipulación. |
| **Estudio** | INT | Conocimiento general, idiomas, investigación. |
| **Heroísmo** | FUE | Maniobras de combate (empujar/agarrar), valor físico. |
| **Intimidar** | FUE/CAR | Amenazar, asustar, demostraciones de fuerza. |
| **Juego de Manos** | DES | Robar, trucos, abrir cerraduras. |
| **Percepción** | SAB | Detectar enemigos, buscar pistas, notar detalles. |
| **Persuasión** | CAR | Diplomacia, convencer, calmar situaciones. |
| **Primeros Auxilios** | SAB | Estabilizar moribundos, tratar venenos, medicina. |
| **Salud** | CON | Resistencia física, aguantar la respiración, resistir enfermedades. |
| **Sigilo** | DES | Ocultarse, moverse en silencio. |
| **Supervivencia** | SAB | Rastrear, orientación, encontrar comida/agua. |
| **Trastear** | INT | Mecánica, artesanía, reparar objetos complejos. |
| **Voluntad** | CAR | Coraje, moral, resistir miedo o desesperación. |

---

## Sistema de Rangos

Los Rangos representan los poderes de combate de tu personaje. Cada personaje tiene acceso a **múltiples Rangos** simultáneamente, creando combinaciones únicas.

### Progresión de Rangos

| Nivel del Personaje | Rangos disponibles | Rango máximo desbloqueado |
| :--- | :--- | :--- |
| **1** | 2 | I |
| **2-3** | 3-4 | I |
| **4-6** | 5-7 | II |
| **7-9** | 8-10 | III |
| **10-12** | 11-13 | IV |
| **13-15** | 14-16 | V |
| **16+** | 17+ | VI |

* Empiezas con **2 Rangos** a Nivel 1 y ganas **+1 Rango** cada vez que subes de nivel.
* Los Rangos se distribuyen entre tus diferentes disciplinas (normalmente 4, máximo 5).
* Subir un Rango a II, III, etc. requiere alcanzar el nivel mínimo indicado.

### Tiros de Rango

Cuando una habilidad de Rango requiere un tiro (de ataque o enfrentado), la fórmula es:

> **Resultado = 1d20 + Estadística principal del Rango + nivel de Rango**

*Ejemplo:* Un personaje con Magia de Fuego III y CAR 5 tira `1d20 + 5 + 3 = 1d20 + 8`.

### Recursos: Chi y Vigor

Las habilidades de Rango consumen **Chi** (para magias y habilidades mentales/ágiles) o **Vigor** (para técnicas físicas y marciales). Tu reserva máxima depende de los Rangos que tengas:

| Tipo de Rango | Chi por Rango | Vigor por Rango |
| :--- | :--- | :--- |
| Magias elementales (Fuego, Hielo, Agua, Aire, Tierra, Tormenta, Vida) | Rango + 2 | — |
| Magias arcanas (Evocación, Protectora, Temporal, Espacial) | Rango + 2 | — |
| Magias ocultistas (Gravitatoria, Ilusoria, Mental, Sombría, Nigromancia) | Rango + 2 | — |
| Marciales ágiles (Estilo Asesino) | Rango + 2 | — |
| Marciales de combate (Reflejos, Mente Desencadenada) | Rango + 2 | — |
| Marciales físicos (Estilo Coloso, Estilo Duelista) | — | Rango + 2 |
| Combate general (Fortitud, Ira, Rastrear) | — | Rango + 2 |
| Magia Divina, Guerrero Divino | Rango | Rango |
| Ascendencias (Abisal, Celestial, Primigenia) | Rango x 2 | — |
| Ascendencias (Akhasica, Infernal) | Rango | Rango |

* Chi y Vigor se suman de **todos** tus Rangos.
* Se recuperan completamente con un **Descanso Largo**. Un **Descanso Corto** recupera la mitad.

### Categorías de Rango

| Categoría | Rangos | Estadística |
| :--- | :--- | :--- |
| **Marcial** | Estilo Asesino, Estilo Coloso, Estilo Duelista | FUE/DES |
| **Combate** | Fortitud, Ira, Reflejos, Mente Desencadenada, Rastrear | FUE/DES/INT |
| **Elementalismo** | Fuego, Hielo, Agua, Aire, Tierra, Tormenta, Vida | CAR/SAB |
| **Arcana** | Evocación, Protectora, Temporal, Espacial | INT |
| **Ocultismo** | Gravitatoria, Ilusoria, Mental, Sombría, Nigromancia | INT/CAR |
| **Religión** | Guerrero Divino, Magia Divina | SAB/CAR |
| **Ascendencias** | Abisal, Akhasica, Celestial, Infernal, Primigenia | Varía |

### Clasificación de Fuentes

Las habilidades se clasifican en tipos de fuente, lo cual determina cómo interactúan con antimagia y supresión:

* **Innato:** No puede ser suprimido ni contrarrestado. Funciona en zonas sin magia. *(Ej: Fortitud, Ira, Reflejos)*
* **Arcano:** Afectado por *Campo Antimágico*, *Disyunción*, *Contrahechizo* y efectos anti-arcanos. *(Ej: Evocación, Protectora, Ilusoria)*
* **Divino:** Afectado por efectos anti-divinos, pero **no** por antimagia arcana. *(Ej: Magia Divina, Guerrero Divino)*
* **Elemental / Ocultista:** Generalmente clasificado como Arcano a efectos de supresión, salvo que la habilidad indique lo contrario.

---

## El Combate
El combate se desarrolla en **Rondas** de 6 segundos. En cada ronda, todos los participantes tienen un turno, actuando por orden de **Iniciativa** (1d20 + DES).

### Acciones por Turno
Cada personaje dispone de **3 acciones** y **2 reacciones** por ronda.

#### Acciones (3 por turno)
Las acciones se gastan **durante tu turno**. Puedes repartirlas como desees entre:

| Tipo | Coste | Ejemplo |
| :--- | :--- | :--- |
| **Atacar** | 1 acción | Ataque cuerpo a cuerpo o a distancia |
| **Lanzar habilidad** | Variable (1-3 acciones) | Según el coste indicado en la habilidad |
| **Moverse** | 1 acción | Avanzar 1 paso (ver tabla de distancias) |
| **Interactuar** | 1 acción | Abrir una puerta, sacar un objeto, beber una poción |
| **Acción bonus** | 0 acciones | Solo cuando una habilidad otorga explícitamente una acción bonus |

* **Acciones de habilidades:** Cada habilidad de Rango indica su coste en acciones (ej: *Bola de Fuego* cuesta 2 acciones y 1 chi). Puedes combinar varias habilidades en un mismo turno siempre que te alcancen las acciones.
* **Acción bonus:** Algunas habilidades permiten hacer cosas adicionales como "acción bonus". Las acciones bonus **no consumen** tus 3 acciones base; son extras que se activan por condiciones específicas.

#### Reacciones (2 por ronda)
Las reacciones se gastan **fuera de tu turno** (o durante él, como respuesta a un estímulo). Se recuperan al inicio de tu siguiente turno.

| Uso | Coste | Cuándo |
| :--- | :--- | :--- |
| **Parada** | 1 reacción | Al ser atacado |
| **Apertura** | 1 reacción | Un enemigo falla un ataque o se mueve fuera de tu alcance |
| **Muro / Barrera** | 1 reacción | Usar habilidades defensivas como *Muro de Fuego*, *Salto Espacial*, *Desplazamiento*, etc. |
| **Habilidad reactiva** | 1 reacción | Habilidades que indican "Reacción" en su coste (ej: *Contrahechizo*) |

* Si no te quedan reacciones, **no puedes defenderte activamente** de ataques. Solo te queda tu DEF pasiva, Resistencias y Escudos.
* Algunas habilidades otorgan **reacciones adicionales** por ronda (ej: *Luz Viviente* de Magia de Vida, *Protección Divina* de Magia Divina).

### Parada y Esquiva

Cuando un ataque es dirigido hacia ti, puedes emplear una de estas habilidades para defenderte activamente. Ninguna de estas consume reacciones:

**Parada:**
> **Tiro = 1d20 + FUE o DES + Rango de arma/habilidad**
* Requiere **arma o escudo** equipado.
* Si tu resultado iguala o supera el tiro de ataque, bloqueas completamente el impacto.
* Ciertos rangos permiten parar con su estadística principal (ej: *Magia Protectora* usa INT).

**Esquiva:**
> **Tiro = 1d20 + DES + Rango relevante**
* No requiere equipo.
* Si tu resultado iguala o supera el tiro de ataque, evitas completamente el daño.
* Funciona contra la mayoría de ataques, incluyendo algunos de Área.
* Ciertos rangos usan otra estadística para Esquivar (ej: *Magia Gravitatoria* usa INT contra efectos gravitatorios).

### Aperturas (Ataques de Oportunidad)

Las **Aperturas** representan los momentos de vulnerabilidad que un combatiente puede explotar. Son clave para el combate dinámico: cada acción tiene riesgo.

**Condiciones que provocan una Apertura:**
1. **Fallo de ataque:** Cuando una criatura **falla un ataque** cuerpo a cuerpo contra un enemigo, ese enemigo puede explotar la apertura.
2. **Movimiento:** Cuando una criatura se **aleja del alcance cuerpo a cuerpo**, ese enemigo puede explotar la apertura.

**Explotar una Apertura:**
* Cuesta **1 reacción**.
* Permite realizar una habilidad de coste 1 o inferior contra la criatura que provocó la apertura.
* Los ataques de apertura **no provocan nuevas aperturas** aunque fallen.

**Evitar Aperturas:**
* Ciertas habilidades (ej: *Paso Ligero*, *Salto Espacial*) permiten moverse sin provocar aperturas.

### Ventaja y Desventaja

Muchas habilidades otorgan **Ventaja** o **Desventaja** en tiros.

**Ventaja:** Suma **+1d6** al resultado del tiro.
* No puedes acumular más de 4 Ventajas en un único tiro.

**Desventaja:** Resta **-1d6** al resultado del tiro.
* No puedes acumular más de 4 Desventajas en un único tiro.

**Cancelación:** Una Ventaja cancela una Desventaja. Si tienes 2 Ventajas y 1 Desventaja, te queda 1 Ventaja (+1d6).

### Concentración

Muchas habilidades duraderas requieren **Concentración** para mantenerse activas. A diferencia de otros sistemas, en Raldamain **puedes mantener múltiples efectos de Concentración simultáneamente**.

**Reglas:**
* No hay límite al número de efectos de Concentración activos a la vez.
* Si pierdes la concentración, **pierdes TODOS** los efectos de Concentración simultáneamente.

**Pierdes la concentración si:**
1. Sufres una **Herida Permanente** (Leve, Media o Grave).
2. Quedas **Agarrado**, **Aturdido** o **Inconsciente**.
3. Caes a **0 PV**.
4. Fallas un tiro de **Concentración** al recibir daño: `CD = 10 + daño recibido a Vitalidad/PV`.

> **Nota:** La Ira de Combate prohíbe mantener tu propia concentración. Sin embargo, los efectos de concentración que aliados mantengan sobre ti siguen funcionando normalmente.

### Empoderar

La mayoría de habilidades de Rango incluyen un efecto de **Empoderar**: un beneficio adicional que se activa al gastar recursos extra.

**Reglas:**
* Al usar una habilidad, puedes gastar **1 chi adicional** para activar su efecto Empoderar.
* Empoderar **no cuesta acciones adicionales**, solo el recurso extra.
* El efecto Empoderar está descrito en cada habilidad individual.

### Críticos

Un **golpe crítico** se activa cuando sacas un **20 natural** en el d20.

* Si se trata de un ataque puedes tirar el doble de dados de daño en tu ataque.
* Los críticos activan el efecto especial descrito en el campo "crit" de cada habilidad.

---

## Distancias y Áreas de Efecto

### Tabla de Distancias

El sistema usa distancias abstractas para facilitar el juego tanto en tablero como en teatro de la mente.

| Nombre | Distancia Aproximada | Casillas (grid 1.5m) |
| :--- | :--- | :--- |
| **Adyacente / Toque** | 1.5m | 1 casilla |
| **Cercano** | 3m | 2 casillas |
| **Corto** | 6m | 4 casillas |
| **Medio** | 12m | 8 casillas |
| **Largo** | 24m | 16 casillas |
| **Lejano** | 48m+ | 32+ casillas |

* **Velocidad base:** La mayoría de personajes se mueven **1 paso** (3m) por acción de movimiento.
* Algunas habilidades o efectos aumentan la velocidad (ej: *Velocidad Superior* de Reflejos, *Burlar la Gravedad* de Gravitatoria).

### Áreas de Efecto

Las habilidades de área afectan a todas las criaturas dentro de una zona. Los tamaños de área son:

| Área | Radio / Longitud | Casillas |
| :--- | :--- | :--- |
| **Esfera pequeña** | Radio 3m | 2 casillas |
| **Esfera mediana** | Radio 6m | 4 casillas |
| **Esfera grande** | Radio 12m | 8 casillas |
| **Radio corto** | 3m desde origen | 2 casillas |
| **Radio medio** | 6m desde origen | 4 casillas |
| **Radio grande** | 12m desde origen | 8 casillas |
| **Línea corta** | 12m de largo, 1.5m ancho | 8 x 1 casillas |
| **Línea mediana** | 24m de largo, 3m ancho | 16 x 2 casillas |
| **Línea larga** | 48m de largo, 6m ancho | 32 x 4 casillas |
| **Cono corto** | 6m de largo | 4 casillas (ensanchándose) |
| **Cono medio** | 12m de largo | 8 casillas (ensanchándose) |
| **Cono grande** | 24m de largo | 16 casillas (ensanchándose) |

* Los **Conos** se ensanchan desde el origen: a distancia máxima, el ancho iguala la longitud.
* Las **Esferas** se centran en un punto elegido dentro del alcance de la habilidad.
* Las **Líneas** parten del lanzador en línea recta.

---

## Efectos de Estado
Ciertas habilidades imponen condiciones que afectan al combate. Los efectos de estado se acumulan si son de tipos diferentes, pero un mismo efecto **no se aplica dos veces** (ej: no puedes estar Tropezado dos veces).

### Estados Básicos

* **Aturdido:** No puede tomar acciones ni reacciones. No puede defenderse y falla automáticamente los tiros de Fuerza y Destreza.
* **Tropezado (Derribado):** Está en el suelo, teniendo así Desventaja en sus tiros defensivos. Levantarse cuesta 1 acción.
* **Agarrado:** No puede tomar acciones ni reacciones que requieran movimientos de su cuerpo. No puede alejarse. Pierde la Concentración. Liberarse requiere gastar 1 acción y superar un tiro de salvación Físico contra el personaje o efecto que agarra.
* **Cegado:** Tiene Desventaja en todos sus tiros de ataque y defensa además que no puede hacer ataques a distancia. No puede explotar Aperturas visuales.
* **Enredado:** No puede moverse y recibe Desventaja en sus tiros de ataque y defensa. Liberarse requiere gastar 1 acción y superar un tiro de salvación Físico contra el personaje o efecto que enreda.
* **Confundido:** Al inicio de su turno, tira 1d6: 1-2 actúa normalmente, 3-4 no actúa, 5-6 ataca al aliado más cercano.
* **Fatigado:** Desventaja en todos los tiros relacionados con estadísticas físicas.
* **Exhausto:** Desventaja en todos sus tiros y es incapaz de mantener la concentración en efectos.
* **Náuseas:** Recibe Desventaja en todos sus tiros y todas sus habilidades le cuestan una acción adicional para emplear.

### Estados de Miedo

El miedo es progresivo. Si recibes miedo mientras ya estás afectado, el nivel **aumenta** un paso:

| Nivel | Estado | Efecto |
| :--- | :--- | :--- |
| 1 | **Espantado** | Desventaja en tiros de ataque. |
| 2 | **Asustado** | Los efectos de Espantado y no puede acercarse voluntariamente a la fuente del miedo. |
| 3 | **Parálisis** | No puede tomar acciones ni reacciones. |
| 4 | **Shock** | Cae inconsciente al instante. |

### Estados de Aflicción

Las aflicciones representan maldiciones, venenos o efectos degenerativos. Son progresivas y se eliminan con habilidades de sanación o de Rango específicas (ej: *Toque Sanador*, *Sanación Superior*).

| Nivel | Efecto |
| :--- | :--- |
| 1 | Vitalidad máxima reducida (varía según fuente). |
| 2 | PV máximos reducidos. Desventaja en tiros de CON. |
| 3 | Exhausto permanente hasta curar y los efectos de los dos estados anteriores. |
| 4 | Inconsciente / Moribundo (o efecto terminal según la fuente). |

### Otros Estados

* **Invisible:** No puede ser visto. Ataques contra el invisible tienen Desventaja salvo detección especial. El invisible tiene Ventaja en ataques (primer ataque es sorpresa).
* **Oculto / Ocultamiento:** Parcialmente escondido (niebla, oscuridad parcial). Desventaja en ataques contra el oculto.
* **Moribundo:** A 0 PV. Pierde 1 PV por turno. Queda Inconsciente.
* **Maldito:** Efecto variable según la maldición. Generalmente impide sanación o causa degeneración. Solo removible con habilidades específicas (ej: *Sanación Superior*, *Eliminar Magia*).

---

## Tipos de Daño

Los ataques y habilidades infligen distintos tipos de daño. El tipo importa para Resistencias, Inmunidades y ciertas interacciones.

### Daño Físico

| Tipo | Fuentes típicas | Notas |
| :--- | :--- | :--- |
| **Cortante** | Espadas, hachas, garras, cuchillas de viento | Causa sangrado en heridas |
| **Contundente** | Mazas, martillos, puños, caídas, agua a presión | Causa Tropezado en críticos |
| **Perforante** | Lanzas, flechas, dagas, colmillos | Ignora parcialmente armaduras pesadas |

### Daño Elemental

| Tipo | Fuentes típicas | Interacciones |
| :--- | :--- | :--- |
| **Fuego** | Magia de Fuego, Ascendencia Infernal | Quemaduras. Se opone a Hielo |
| **Frío** | Magia de Hielo, Magia Sombría | Ralentiza. Se opone a Fuego |
| **Eléctrico** | Magia de Tormenta, Arco Eléctrico | Aturdimiento. Conductivo en agua/metal |
| **Ácido** | Algunos hechizos de Evocación | Corroe armaduras y objetos |
| **Sónico** | Trueno, ciertas habilidades de Aire | Ignora armaduras. Aturde |

### Daño Mágico y Especial

| Tipo | Fuentes típicas | Interacciones |
| :--- | :--- | :--- |
| **Radiante** | Magia de Vida, Ascendencia Celestial | Ceguera. Muy eficaz contra no-muertos y demonios |
| **Necrótico** | Nigromancia, Magia Sombría | Reduce Vitalidad/PV máximos. Sana no-muertos |
| **Arcano** | Magia de Evocación, Rayo Arcano | Daño de energía pura. Destruye barreras mágicas |
| **Fuerza** | Magia Gravitatoria, Magia Protectora | No puede ser resistido salvo con habilidades específicas |
| **Profano** | Ascendencia Infernal, maldiciones | Impide sanación. Eficaz contra celestiales |

---

## Glosario de Términos

| Término | Definición |
| :--- | :--- |
| **Acción** | Unidad de acción durante tu turno. Tienes 3 por turno. |
| **Acción bonus** | Acción gratuita que no consume tus 3 acciones. Solo disponible si una habilidad la otorga. |
| **Aflicción** | Estado degenerativo progresivo (niveles 1-4). Se elimina con sanación. |
| **Agarre** | Maniobra que reduce la velocidad del objetivo a 0. Rompe Concentración. |
| **Ambiental** | Habilidad que altera el campo de batalla (terreno, clima, zona). |
| **Apertura** | Ataque de oportunidad provocado por fallo o movimiento. Cuesta 1 reacción. |
| **Chi** | Recurso usado para habilidades. |
| **Concentración** | Requisito de mantenimiento para efectos duraderos. Se pierden todos a la vez si fallas. |
| **Contador de escudo** | Token que reduce el daño de un impacto en 10. Gastable a voluntad. |
| **Crítico** | Superar la defensa del enemigo por 5+ o sacar 20 natural. |
| **DEF (Defensa)** | Valor pasivo que reduce daño de cada impacto. |
| **Desventaja** | Penalización de -1d6 a un tiro. No se acumula. |
| **Duradera / Duradero** | Habilidad que persiste más allá del instante (con o sin Concentración). |
| **Empoderar** | Gastar 1 recurso extra al usar una habilidad para activar su efecto bonus. Máx. 1/turno. |
| **Enredado** | Estado: Velocidad = 0, Desventaja en ataques y Esquiva. |
| **Esquiva** | Tiro defensivo con DES. No requiere equipo. Cuesta 1 reacción. |
| **Gaseoso** | Habilidad con forma de nube o gas. Bloqueada por viento fuerte e inmunidad a Gaseosos. |
| **Herida Permanente** | Daño duradero (Leve → Media → Grave). Causa penalizadores y rompe Concentración. |
| **Inmunidad** | Ignora completamente el daño y efectos de un tipo. |
| **Maldición** | Efecto persistente que solo se elimina con habilidades específicas. |
| **Mejora** | Habilidad que potencia otras habilidades o ataques. |
| **Mental** | Habilidad que afecta la mente. Bloqueada por Inmunidad Mental. |
| **Muro** | Barrera mágica o física. Usarla defensivamente cuesta 1 reacción. |
| **Parada** | Tiro defensivo con FUE/DES + Rango. Requiere arma/escudo. Cuesta 1 reacción. |
| **PV (Puntos de Vida)** | Salud real. Perderlos causa heridas y eventualmente la muerte. |
| **Rango** | Nivel de maestría en una disciplina (I a VI). |
| **Reacción** | Respuesta fuera de turno. Tienes 2 por ronda. |
| **Resistencia** | Reduce daño de un tipo a la mitad. |
| **Resistencia Superior** | Dos fuentes de Resistencia. Reduce daño a ÷4. |
| **Toque** | Habilidad que requiere contacto físico. Bloqueada por Inmunidad a Toque. |
| **Ventaja** | Bonificación de +1d6 a un tiro. No se acumula. |
| **Vigor** | Recurso usado para habilidades físicas y marciales. |
| **Visual** | Habilidad que requiere línea de visión. Bloqueada por Ceguera. |
| **Vitalidad** | Aguante. Primera barrera de daño antes de PV. |
