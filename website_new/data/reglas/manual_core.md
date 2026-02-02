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

### Otros Valores
* **Defensa (DEF):** Reduce el daño recibido. Depende de tu **Armadura** y talentos. Es diferente a las **Resistencias** (que reducen daño específico).
* **Cordura:** Resistencia mental. `2 + Nivel + INT`. Si llega a 0, el personaje sufre una **Locura**. Se recupera en un **Descanso Largo**.

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

## El Combate
El combate se desarrolla en **Rondas** de 6 segundos. En cada ronda, todos los participantes tienen un turno.

### Acciones por Turno
En tu turno, puedes moverte hasta tu velocidad y realizar **una** de las siguientes acciones:

1.  **Acción Estándar:**
    * **Atacar:** Realizar un ataque cuerpo a cuerpo o a distancia.
    * **Lanzar Hechizo:** Usar una habilidad mágica mayor.
    * **Habilidad de Rango:** Usar una técnica especial (ej: <i>Golpe Penetrante</i>).

2.  **Acción de Movimiento:**
    * Puedes gastar tu acción estándar para moverte de nuevo (correr).

3.  **Acción Bonus:**
    * Solo disponible si una habilidad específica lo indica (ej: <i>Paso Rápido</i> del Estilo Duelista).

---

## Efectos de Estado
Ciertas habilidades imponen condiciones que afectan al combate:

* **Aturdido:** La criatura no puede tomar acciones ni reacciones. No puede defenderse y falla automáticamente los tiros de Fuerza y Destreza.
* **Tropezado:** La criatura está en el suelo. Los ataques cuerpo a cuerpo contra ella tienen <i>Ventaja</i>. Levantarse cuesta una Acción.
* **Agarrado:** La velocidad de la criatura es 0.
* **Cegado:** Los ataques fallan automáticamente si requieren visión. Los ataques contra la criatura tienen <i>Ventaja</i>.

> **Consejo:** Usa el entorno. Empujar a un enemigo <i>Cegado</i> por un barranco es a menudo más letal que tu espada.