#import "theme.typ": *

= Bestiario

El bestiario recoge las fichas de criaturas que pueden aparecer como enemigos, aliados o habitantes del mundo. Cada ficha incluye todo lo necesario para usar la criatura en una sesión de juego.

== Cómo leer una ficha de criatura

#tip-box[
  Las criaturas no tienen hojas de personaje completas. Sus estadísticas son una abstracción del poder relativo: modificadores de ataque, umbrales de daño y capacidades especiales calibradas para ser desafiantes sin requerir cálculo exhaustivo.
]

=== Golpes

En lugar de Puntos de Vida, las criaturas tienen *Golpes*: el número de veces que pueden sobrevivir a un impacto significativo antes de ser derrotadas. Un impacto que supera el *Umbral de Daño* (UD) cuenta como un Golpe.

=== Umbral de Daño (UD)

Cada impacto que no supere el umbral no cuenta como un Golpe. Si el daño supera el umbral, la criatura pierde 1 Golpe y puede sufrir un efecto especial según la habilidad usada.

=== Modificador de ataque / defensa

El modificador unificado `+X+Yd6` indica el bonificador total (estadística + rango o equivalente) más los dados de ventaja que suma la criatura a cada tiro ofensivo o defensivo.

---

#creature-stat(
  name: "Elemental de Aire",
  tier: "Esbirro Élite II",
  c-type: "Espíritu",
  c-size: "Grande",
  level: 5,
  hits: 2,
  speed: "Vuelo 10",
  saves: "FÍS +7+1d6  ·  VOL +7+1d6  ·  MEN +4",
  immune: "Efectos físicos no mágicos, Veneno, Necrótico, Efectos mentales, Miedo, Terreno difícil",
  lore: "Los elementales de aire son remolinos conscientes de viento y tormenta. Se mueven a velocidades difíciles de seguir y atacan donde menos se espera. Su cuerpo es prácticamente invisible, delatado tan solo por una tenue distorsión del ambiente y el rugido del viento que los rodea.",
)[
  #grid(
    columns: (1fr, 1fr, 1fr),
    gutter: 4pt,
    [*Umbral de daño:* 8 (General)],
    [*Acciones:* 1],
    [*Reacciones:* 1],
  )

  #stat-divider()

  *_Cuerpo de Aire (Pasiva):_* Puede colarse por cualquier abertura. Cuenta siempre como invisible. No obstante, un elementalista de Aire puede manipularlo forzosamente (equivale a un Exorcismo).

  #stat-section("Acciones")

  #ability-card(
    name: "Viento Cortante",
    tags: ("Aire", "Ataque"),
    cost: "1 acción",
    range: "8 casillas",
    desc: "Dos ataques a +7+2d6. Cada impacto inflige 3d6 + 5 daño Cortante y se mueve 5 casillas. Este ataque ignora ocultamiento, vientos fuertes y Resistencias a ataques a distancia.",
  )

  #ability-card(
    name: "Vendaval",
    tags: ("Aire", "Ataque", "Área"),
    cost: "2 acciones",
    area: "Cono 8 casillas",
    desc: "Ataque a +7+2d6. Inflige 4d6 + 5 daño Contundente. Elimina efectos Gaseosos a su paso. Los impactados deben superar una salvación Físico o son empujados 8 casillas y caen con Ralentizado-1 (4 casillas si tienen éxito). Los objetivos voladores que fallen caen del cielo.",
  )

  #ability-card(
    name: "Torbellino Viviente",
    tags: ("Aire", "Maniobra"),
    cost: "1 acción",
    range: "2 casillas",
    desc: "El objetivo es arrastrado hasta la posición del elemental y debe superar una salvación Físico o queda Agarrado (Enredado si tiene éxito). Mientras permanezca agarrado se moverá con el elemental y sufrirá daño de los ataques que lo alcancen. Daño de impacto: 3d6 + 5 Cortante.",
  )

  #stat-section("Reacciones")

  #ability-card(
    name: "Parada / Esquiva",
    desc: "Modificador +7+2d6. Se mueve 5 casillas como parte de la reacción.",
  )

  #ability-card(
    name: "Evasión",
    tags: ("Reflejos",),
    cost: "1 reacción",
    desc: "Obtiene +10 a un tiro de Esquiva o de salvación Físico.",
  )

  #ability-card(
    name: "Muro de Aire",
    tags: ("Aire",),
    cost: "1 reacción",
    desc: "Aumenta todos sus umbrales de daño en 5 hasta el inicio de su siguiente turno. Los atacantes cuerpo a cuerpo sufren 4d8 daño Cortante.",
  )
]

---

#creature-stat(
  name: "Elemental de Fuego Primigenio",
  tier: "Teniente",
  c-type: "Espíritu",
  c-size: "Gigante",
  level: 11,
  hits: 4,
  speed: "Normal 6, Vuelo 4",
  saves: "FÍS +10+2d6  ·  VOL +10+2d6  ·  MEN +7",
  immune: "Fuego, Efectos físicos no mágicos, Veneno, Miedo",
  lore: "Un elemental de fuego que ha acumulado siglos de existencia en los planos elementales. Su forma no es ya la de una simple criatura de llamas sino la de un ser soberano, capaz de modelar el calor y la luz a voluntad.",
)[
  #grid(
    columns: (1fr, 1fr, 1fr),
    gutter: 4pt,
    [*Umbral de daño:* 14 (Magia), 8 (Otros)],
    [*Acciones:* 2],
    [*Reacciones:* 2],
  )

  #stat-divider()

  *_Forma Ígnea (Pasiva):_* Cualquier criatura que impacte al elemental con un ataque de cuerpo a cuerpo recibe 2d6 daño de Fuego. El área a 2 casillas del elemental cuenta como calor extremo.

  #stat-section("Acciones")

  #ability-card(
    name: "Golpe Abrasador",
    tags: ("Fuego", "Ataque"),
    cost: "1 acción",
    range: "Cercano",
    desc: "Ataque a +10+2d6. Inflige 4d8 + 8 daño de Fuego. El objetivo sufre quemadura media. Puede realizar este ataque dos veces por acción.",
    crit: "El objetivo sufre quemadura grave y 6 daño de Fuego adicional al inicio de cada uno de sus turnos durante 3 rondas.",
  )

  #ability-card(
    name: "Erupción",
    tags: ("Fuego", "Ataque", "Área"),
    cost: "2 acciones",
    area: "Esfera mediana centrada en el elemental",
    desc: "El elemental explota en llamaradas. Ataque a +10+2d6 contra todos los objetivos en el área. Inflige 5d10 + 8 daño de Fuego. Crea terreno de Fuego en el área durante 3 rondas.",
    empower: "Aumenta el daño en 2d10 y empuja a todos los afectados 4 casillas.",
  )

  #stat-section("Reacciones")

  #ability-card(
    name: "Parada Ígnea",
    cost: "1 reacción",
    desc: "Modificador +10+2d6. Si supera el ataque, el atacante recibe 2d6 daño de Fuego adicional.",
  )

  #ability-card(
    name: "Renacer",
    tags: ("Fuego",),
    cost: "1 reacción",
    desc: "Al recibir un Golpe, el elemental recupera 1 Golpe gastando esta reacción. Solo puede usarse una vez por encuentro.",
  )
]
