---
title: Ejércitos Navales
---

Estas reglas permiten resolver batallas entre embarcaciones de forma táctica, dinámica y emocionante, integrando factores como el viento, las maniobras de los capitanes, el fuego cruzado y los abordajes. Ya sea una escaramuza entre piratas o un asalto a gran escala entre flotas, este sistema ofrece las herramientas necesarias para resolver cualquier combate naval de manera estratégica y dinámica. 

# Elementos de un barco

## Coste base

Representa el coste total del barco dentro del sistema de creación de flotas. El Director de Juego (DJ) asignará un presupuesto base a cada bando en función de la escala del conflicto (normalmente entre 50 y 200 puntos).

## Capitán

Cada barco debe tener un capitán, ya sea un personaje jugador o un PNJ destacado. El capitán tirará 1d6 para dirigirlo (lo cual se llama **Tiro de Dirección**) por cada nivel de talento que tenga en Percepción si es jugador o en base a su habilidad. Un buen capitán añade un coste adicional al barco y en los bloques de estadísticas la habilidad del capitán se especifica en la sección de Tiro de Dirección. Si el capitán muere entonces el barco no se moverá o se moverá siguiendo las corrientes.

## Tiro de Combate

Este valor determina la potencia ofensiva del barco a distancia. Depende del armamento embarcado y puede incrementarse pagando un coste adicional por artillería mejorada. También se indica el alcance del ataque en casillas.

## Tiro de Abordaje

Representa la capacidad de la tripulación para resistir o ejecutar abordajes. Parte de un valor base (marineros o soldados comunes) que puede mejorarse contratando una tripulación de élite.

## Tamaño

Indica la cantidad de casillas que ocupa el barco en el mapa. Cada casilla equivale a 5x5 casillas de escala jugador o a un radio corto. 

## Cohesión

Equivale a los puntos de resistencia estructural del barco. Al perder toda su cohesión la nave se hundirá de inmediato. Si hay personajes importantes a bordo tienen un 50% de probabilidad de morir (o ser capturados si fue durante un abordaje).

## Movimiento

Indica cuántas casillas puede moverse el barco en su etapa de movimiento. Un barco se moverá de base en la dirección hacia la que apunta. 

# Combate entre barcos

Un combate entre barcos es impredecible y depende tanto de la naturaleza como de la suerte y las habilidades de los pilotos. Cada ronda de combate se compone de las siguientes fases:

## Preparación

El enfrentamiento se desarrolla sobre un mapa de 15 x 15 casillas (75 x 75 a escala jugador). Un bando se define como atacante y otro como defensor. El defensor inicia en el centro del mapa mientras que el atacante se despliega a al menos 4 casillas de distancia. La orientación inicial de cada barco es libre elección. La dirección del viento se determina al azar mediante un tiro de 1d5 tras la colocación inicial.

## Fases del combate

### Iniciativa

Al inicio de la ronda cada capitán hará un tiro de dirección para determinar quién será el primero. Se cogerá el número más alto de ambos tiros y ganará quien obtenga el mejor resultado (lo cual se conoce como tiros enfrentados). En caso de empate se escoge el segundo más alto y así progresivamente. En caso de empate se repetirá el tiro hasta que haya ganador.

### Movimiento

Tras calcular la iniciativa se pasará a la fase de movimiento. Un barco se moverá de base una cantidad de casillas iguales a su velocidad en la dirección hacia la que apunta. El capitán podrá tomar una de las siguientes maniobras para moverse. Todas ellas se harán contra un tiro de enfrentado de 2d6.

- **Aceleración:** El barco avanza a toda velocidad. En caso de éxito se mueve a una casilla que tenga en frente o en diagonal y si fracasa solo se moverá una casilla hacia delante. 
- **Giro:** El barco gira mientras avanza. En caso de éxito gira 90 grados en cualquier momento de su avance y en caso de fracaso no girará pero puede moverse diagonalmente una vez. Al girar un barco de vela en una dirección de vientos poco favorables se aumentará el tiro de dificultad por 1d6.
- **Freno:** El barco frena su movimiento. En caso de éxito podrá reducir el movimiento por una casilla y detener el barco por completo. Si el tiro resulta un fracaso el barco no frenará y se moverá con normalidad.
- **Marcha atrás:** El barco hace un giro completo y se mueve en dirección contraria. En caso de éxito el barco gira 180 grados y se mueve una casilla hacia delante. En caso de fracaso solo girará 90 grados en una dirección al final de su trayectoria. 

### Ataque

Una vez se resuelve la ronda de movimiento se harán los tiros de ataque. Cada barco tendrá un tiro de ataque específico especificado en la sección Tiro de Combate. Si un barco intenta atacar a un enemigo que tenga delante o detrás recibirá un penalizador 1d6 al tiro de ataque. 

El defensor puede escoger entre esquivar un ataque o contratacar. Si escoge esquivar hará un tiro de dirección con penalizador 1d6 por cada casilla que ocupe el barco en el mapa. Si escoge contratacar tirará el valor de ataque que tenga en la dirección relativa al atacante y recibirá también un penalizador 1d6 si tiene al enemigo delante o detrás. 

Una vez determinados los tiros base ambos combatientes harán un tiro. Se cogerá el valor más alto de ambos bandos y el perdedor reducirá su cohesión por 1. En caso de un empate no habrá pérdida de cohesión. 

Cada vez que un barco pierda cohesión corre el riesgo que una parte importante de él sufra daños. Por ello, cada vez que ocurra un impacto se hará un tiro para determinar la parte afectada del barco en base a la siguiente tabla:

| Resultado | Parte dañada   | Efecto                                                       |
| --------- | -------------- | ------------------------------------------------------------ |
| 1         | Sala de mandos | Recibe -1d6 en tiros para dirigir el barco (permanente). Si esto lo reduciría a 0 entonces morirá el capitán. |
| 2-3       | Tripulación    | Aumenta la dificultad de todos los tiros de dirección por 1d6. |
| 4-8       | Casco          | No hay efecto                                                |
| 9-10      | Propulsión     | Reduce su movimiento por 1                                   |

# Reglas Especiales

## Abordaje

Cuando dos barcos estén adyacentes uno a otro puede llegar a ocurrir un abordaje. Para ello el capitán deberá hacer un tiro de dirección contra el capitán enemigo. Cuando esto ocurra ambos barcos estarán agarrados uno a otro, haciendo así que dejen de moverse e impidiendo que puedan atacarse entre ellos. 

Al inicio de cada ronda nueva el capitán de un barco agarrado puede intentar un tiro para separarse. Este tiro recibirá una penalización de 1d6 por cada vez que fracase (incluyendo la primera) y en caso de éxito podrá liberarse y moverse con normalidad. 

Cuando un enfrentamiento pase a un abordaje ambos barcos emplearán su tiro de ataque de abordaje para resolver enfrentamientos, el cual representa la fuerza de sus tripulaciones. Este tiro aumentará por 1d6 si el barco tiene presente a un héroe y el ganador de cada enfrentamiento reducirá la cohesión del perdedor por 1, ocasionando así los mismos efectos que un ataque. 

## Choques

En algunas circunstancias dos barcos pueden acabar chocando entre ellos, provocándose graves daños. Esto ocurrirá cuando un barco se mueva directamente a la posición de otro. Ambos capitanes harán un tiro y en caso de éxito ambos barcos chocarán, provocando que el barco atacado reduzca su cohesión por 2 además que el atacante reducirá su cohesión por 1. 

Una vez realizado el choque ninguno de los dos será capaz de moverse. Cabe recalcar que un barco que fracase en su maniobra de choque se moverá a una posición adyacente al barco con el que intentó chocar.

## Efectos Ambientales

Las condiciones del campo de batalla pueden significar la victoria o la derrota en un enfrentamiento. Aquí se especifican los efectos ocasionados por determinadas situaciones medioambientales o de una batalla. Su aplicación queda a discreción del máster.

- **Emboscada:** Cuando ocurra una emboscada la flota atacante tendrá automáticamente la iniciativa y recibirá +1d6 en todos sus tiros de ataque.
- **Baja visibilidad:** En situaciones de visibilidad reducida como niebla o lluvias intensas se reducirá el alcance de ataques a 2 y aumentará la dificultad de todas las maniobras por 1d6.
- **Tormenta:** Todas las maniobras aumentan su dificultad por 1d6 y cada vez que una maniobra resulte en fracaso por una diferencia de 2 o más el barco reducirá su cohesión por 1. 
- **Ataques mágicos:** Si un personaje emplea ataques de área con tamaño mediano o superior puede llegar a dañar otros barcos. Podrá tirar en ese caso 1d6 por cada rango que tenga en la habilidad empleada contra el tiro de Evasión del barco enemigo. En caso de éxito reducirá la cohesión del barco enemigo por 1 si es mediano o por la diferencia entre resultados si es grande. 

# Tipos básicos de barco

## Bote de Remos

- **Coste base:** 3
- **Tiro Dirección:** 3d6
- **Tiro de Combate:** 0
- **Tiro de Abordaje:** 1d6
- **Tamaño:** 1
- **Cohesión:** 1
- **Movimiento:** 1

## Barco de Transporte

- **Coste base:** 6
- **Tiro Dirección:** 3d6
- **Tiro de Combate:** 1d6, alcance 2
- **Tiro de Abordaje:** 3d6
- **Tamaño:** 2
- **Cohesión:** 3
- **Movimiento:** 1

## Galera

- **Coste base:** 6
- **Tiro Dirección:** 3d6
- **Tiro de Combate:** 2d6, alcance 2 
- **Tiro de Abordaje:** 2d6
- **Tamaño:** 2
- **Cohesión:** 3
- **Movimiento:** 2

## Barco de Vela

- **Coste base:** 8
- **Tiro Dirección:** 3d6
- **Tiro de Combate:** 2d6, alcance 2  
- **Tiro de Abordaje:** 2d6
- **Tamaño:** 2
- **Cohesión:** 4
- **Movimiento:** 2
- **Habilidades Especiales:** Velas

## Buque de Guerra

- **Coste base:** 10
- **Tiro Dirección:** 3d6
- **Tiro de Combate:** 3d6, alcance 2  
- **Tiro de Abordaje:** 2d6
- **Tamaño:** 3
- **Cohesión:** 4
- **Movimiento:** 2
- **Habilidades Especiales:** Velas, Coraza

## Galeón

- **Coste base:** 12
- **Tiro Dirección:** 3d6
- **Tiro de Combate:** 3d6, alcance 2  
- **Tiro de Abordaje:** 2d6
- **Tamaño:** 3
- **Cohesión:** 4
- **Movimiento:** 3
- **Habilidades Especiales:** Velas, Línea de Cañones, Coraza

# Habilidades Especiales

## Cañones Mejoradados (+2)

Aumenta su alcance por 1 y su tiro de combate por 1d6.

## Capitán de Élite (+1 o +2)

Añade 1d6 adicional al tiro de Dirección (+2d6 si aumenta el coste por 2). 

## Coraza (+1)

Reduce toda la pérdida de cohesión que reciba por 1 hasta un mínimo de 1. 

## Embestida (+1)

El casco del barco está reforzado para que sea capaz de dañar otras embarcaciones con las que choque. Al hacer una carga contra otro barco provocará daño igual a la diferencia del tiro entre ambos en lugar de un valor fijo además que no sufrirá daño obligatorio por realizar embestidas.

## Fuego Griego (+1)

Pierde su penalizador al atacar de frente a enemigos adyacentes y podrá provocarle daño igual a la diferencia entre resultados. 

## Línea de Cañones (+1)

Al atacar a un enemigo que se encuentre de lado podrá provocarle daño igual a la diferencia entre resultados. 

## Escuadrón de Magos (+3)

La tripulación cuenta con un escuadrón de magos capaz de atacar barcos enemigos por el aire. Los magos son una unidad adicional con 3 cohesión y tiro de ataque y defensa 3d6. Sus ataques funcionan de la misma manera que un cañón y pueden ser atacados por otros barcos. 

## Tripulación de Élite (+X)

Añade Xd6 adicional al tiro de Abordaje hasta un máximo de 5d6. 

## Velas (+1)

El barco se propulsa principalmente mediante grandes velas, aprovechando así la fuerza del viento para moverse. Cada ronda el DJ hará un tiro de 1d4 para determinar la dirección del viento (1: Norte, 2: Sur, 3: Este, 4: Oeste). Aquellos barcos que naveguen en dirección del viento verán su movimiento aumentado por 1 mientras que aquellos que naveguen en dirección contraria reducirán su movimiento por 1. Aquellos que no vayan ni a favor ni en contra no verán su movimiento afectado de ninguna manera. 