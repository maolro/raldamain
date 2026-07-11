#import "../theme.typ": *

El aire es el elemento más libre y el más ignorado hasta que desaparece. Los manipuladores del aire comprenden que el viento no es solo movimiento: es presión, temperatura, corriente y el espacio entre todas las cosas. Este rango domina la movilidad y el control del campo de batalla por encima de todo, convirtiendo al practicante en una presencia que el enemigo no puede encuadrar ni predecir. En sus formas más avanzadas, la Magia de Aire convoca huracanes, asfixia ejércitos y puede manipular el clima de una región entera.

#tip-box[
  *Reserva de Chi:* Incrementa por Rango x 2.
  *Estadística principal:* Sabiduría/Carisma + Rango.
  *Parada mágica:* Usas Magia de Aire para tiros de parada y salvaciones contra Naturaleza, Gravitatoria, Agua y Telekinesia.
]

==== Rango I — Rango I

#ability-card(
  name: "Vendaval",
  tags: ("Aire", "Maniobra", "Físico", "Área"),
  cost: "2 Acciones, 1 chi",
  area: "Cono Medio",
  duration: "Instantánea",
  crit: "Los objetivos sufren Herido-1 (permanente).",
  desc: "Todos loos objetivos en el área afectada deben tener éxito en un tiro de salvación Físico o son empujados dos pasos y caen con Ralentizado-1. Este ataque disipará todos los efectos gaseosos a su paso y las criaturas voladoras afectadas caen al suelo. Además, si el objetivo empujado choca con una superficie física sufrirá entonces 3d6 + SAB/CAR daño Contundente (lo mismo ocurre con las caídas).",
  empower: "Vuelve a emplear este hechizo en la misma zona sin la necesidad de gastar acciones adicionales.",
)

#ability-card(
  name: "Tajo de los Vientos",
  tags: ("Aire", "Ataque", "A distancia", "Físico"),
  cost: "1+ Acciones",
  range: "Medio",
  duration: "Instantánea",
  crit: "El objetivo sufre Herido-1 (permanente).",
  desc: "Ataca con un tajo de aire comprimido que inflige 1d6 + SAB/CAR daño Cortante. Este ataque ignora ocultamiento y resistencias a ataques a distancia. 
Puedes gastar una acción adicional para incrementar el daño base de este ataque por 1d6 (máximo 2 acciones).",
  empower: "Haz un ataque contra un objetivo adicional o haz un segundo ataque contra el mismo objetivo contra el cual deberá emplear su mismo resultado defensivo.",
)

#ability-card(
  name: "Agilidad del Aire",
  tags: ("Aire", "Pasiva"),
  desc: "Aumenta todas tus velocidades por un paso y obtienes velocidad de Salto igual a tu velocidad base. Además, puedes emplear tu modificador de Magia de Aire para todos tus tiros de Esquiva o de salvación Físicos.",
)

==== Rango II — Rango II

_Pasiva: Aumenta estadística de Destreza por 1_

#ability-card(
  name: "Muro de los Vientos",
  tags: ("Aire", "Defensiva", "Duradera"),
  cost: "1 reacción, 1 chi",
  range: "Medio",
  area: "Esfera pequeña o línea mediana",
  duration: "Concentración",
  desc: "Crea una barrera con PV iguales a tu Rango x 3, la cual protegerá a todos detrás de ella. Reduce el daño del ataque recibido por esa cantidad y detendrá automáticamente un ataque a distancia o efecto Gaseoso. Si se emplea contra un enemigo que ataque cuerpo a cuerpo, deberá tener éxito en un tiro de salvación Físico o será empujado hacia atrás.",
  empower: "Recupera todos los PV del muro.",
)

#ability-card(
  name: "Esfera de Viento",
  tags: ("Aire", "Ataque", "Cuerpo a cuerpo", "Duradera"),
  cost: "1 acción, 1 chi",
  range: "Cuerpo a cuerpo",
  duration: "Instantáneo",
  crit: "Herido-1 (permanente) y fallo automático en defensa.",
  desc: "Haz un ataque con una esfera de vientos que provoca 3d6 + SAB/CAR daño Cortante al impactar. Además, el objetivo será empujado un pasos y cae con Ralentizado-1 (puede resistirse con un tiro de salvación Físico).",
  empower: "La esfera permanece en tu mano para lanzarla gratis hasta el final del siguiente turno.",
)

#ability-card(
  name: "Infusión de Viento",
  tags: ("Pasiva", "Aire"),
  desc: "Tus ataques físicos cuentan como mágicos y aumentan su alance por un paso. Además, puedes emplear tu modificador de Magia de Aire para todos tus tiros de ataque, defensa y técnicas de combate relacionados con ellos.",
)

==== Rango III — Rango III

_Pasiva: Todos tus hechizos de Aire sustituyen sus dados de daño por d8._

#ability-card(
  name: "Agarre del Aire",
  tags: ("Aire", "Agarre", "Físico", "Duradera"),
  cost: "2 chi",
  range: "Medio",
  duration: "Concentración",
  crit: "Objetivo con Fatigado-1.",
  desc: "Un objetivo que logres empujar o derribar con un efecto de Aire debe tener éxito en un tiro de salvación Físico o queda agarrado. Este agarre durará hasta que reciba un impacto o se libere, además que puedes emplear una acción para moverlo un paso en cualquier dirección.",
  empower: "Afecta a una criatura adicional con este hechizo.",
)

#ability-card(
  name: "Controlar Vientos",
  tags: ("Aire", "Ambiental", "Duradera"),
  cost: "2 acciones, 2 chi",
  area: "Esfera grande",
  duration: "Concentración",
  desc: "Generas vientos fuertes que crean terreno difícil para vuelo y disipan efectos gaseosos. Mientras este efecto permanezca activo, recibes Ventaja en todos tus tiros de Magia de Aire y provocas un dado de daño adicional con ellos (si tienes también Magia de Tormenta, esta habilidad le dará las mismas mejoras). Además, todos los ataques A Distancia recibirán Desventaja salvo que tú lo decidas.",
  empower: "El siguiente hechizo de Aire cuesta -1 acción (mínimo 1)",
)

#ability-card(
  name: "Viajero de los Cielos",
  tags: ("Aire", "Duradera"),
  cost: "1 acción, 2 chi",
  duration: "Concentración",
  desc: "Obtienes Velocidad de Vuelo 2 y Ventaja en todos tus tiros de Esquiva. Este hechizo solo puede lanzarse en entornos con vientos fuertes.",
  empower: "Suma +10 a un tiro de Esquiva o salvación Físico, y vuela un paso en cualquier dirección.",
)

==== Rango IV — Rango IV

_Pasiva: Aumenta estadística de Sabiduría por 1_

#ability-card(
  name: "Tornado",
  tags: ("Aire", "Ataque", "Área", "Agarre", "Físico", "Duradero"),
  cost: "2 acciones, 2 chi",
  area: "Cilindro pequeño",
  duration: "Concentración",
  crit: "Fallo automático en agarre o no puede escapar.",
  desc: "Todos los objetivos en el área afectada sufren 3d8 + SAB/CAR daño Contundente y quedan enredados (deben tener éxito en un tiro de salvación físico para escapar). Mientras estén enredados, quedarán suspendidos en el aire y se moverán con el tornado además que con cada intento fracasado sufrirán 2d8 + SAB/CAR daño Contundente. 
Mientras el tornado permanezca activo, puedes moverlo un paso como acción, atacando con él a cada criatura que se encuentre en su camino,",
  empower: "Crea un tornado adicional o aumenta el tamaño un paso y su daño por un dado.",
)

#ability-card(
  name: "Vientos Protectores",
  tags: ("Aire", "Defensivo", "Duradero"),
  cost: "1 acción, 2 chi",
  duration: "Concentración",
  desc: "Obtienes Resistencia a ataques a distancia e Inmunidad a efectos Gaseosos además de contadores de escudo iguales a tu Rango. Puedes gastar un contador de escudo para emplear la habilidad de Empoderar de Viajero de los Cielos.",
  empower: "Recupera 1 contador de escudo (+1 adicional si hay vientos fuertes).",
)

#ability-card(
  name: "Viento Cortante",
  tags: ("Aire", "Ataque", "Área", "Físico"),
  cost: "1 acción, 2 chi",
  area: "Cono mediano",
  duration: "Instantáneo",
  crit: "Inflige Herido-2 (permanente) a todos los afectados.",
  desc: "Haz un ataque contra todos los objetivos el el área afectada que inflige 4d8 + SAB/CAR daño Cortante al impactar y Herido-1 (permanente). Los afectados tienen Desventaja en tiros de Esquiva y perderán un contador de escudo.",
  empower: "El siguiente uso este turno de este hechizo no cuesta chi o aumenta el daño por un dado y el área afectada por un paso.",
)

==== Rango V — Rango V

_Pasiva: Todos tus hechizos de Aire sustituyen sus dados de daño por d10._

#ability-card(
  name: "Huracán",
  tags: ("Aire", "Ataque", "Área", "Físico"),
  cost: "2 acciones, 3 chi",
  area: "Cono grande",
  duration: "Instantáneo",
  crit: "Los afectados sufren Herido-1 (permanente).",
  desc: "Haz un ataque contra todos los objetivos en el área afectada que provoca 4d10 + SAB/CAR daño Contundente además de empujar dos pasos y tropezar. Este ataque destruirá todas las estructuras frágiles y las criaturas voladoras tienen Desventaja defendiéndose y caerán al suelo al fallar.

Hasta el principio de tu siguiente turno, el aire será terreno difícil para voladores y forzando a toda criatura que intente alzar el vuelo a superar un tiro de salvación Físico.",
  empower: "Lanza de nuevo este ataque contra la misma zona afectada.",
)

#ability-card(
  name: "Esfera de Vacío",
  tags: ("Aire", "Aflicción", "Área", "Duradero", "Físico"),
  cost: "2 acciones, 3 chi",
  area: "Esfera pequeña",
  duration: "Concentración",
  crit: "Los afectados quedan con Fatigado-3.",
  desc: "Drenas todo el aire de la zona afectada, forzando a tus objetivos a tener éxito en un tiro de salvación Físico o quedan con Fatigado-1 y sufren 3d10 + SAB/CAR daño Necrótico. La esfera permanecerá hasta que pierdas la conecntración y quienes permanezcan en ella al final de su turno o se muevan ahí sufrirán de nuevo sus efectos.",
  empower: "Recuperas 5 Vitalidad por cada fallo enemigo.",
)

#ability-card(
  name: "Uno con el Viento",
  tags: ("Aire", "Ataque", "Físico"),
  cost: "1 reacción, 2 chi",
  duration: "Concentración/Una ronda",
  desc: "Te transformas en aire viviente, recibiendo así Inmunidad a efectos Físicos, Aflicciones, Mentales, Miedo y Agarres a costa de Vulnerabilidad a efectos de Aire (quienes podrán agarrarte con normalidad).

Este efecto permanecerá activo hasta que pierdas la concentración o pase una ronda. Hasta que eso ocurra, contarás como incorpóreo y serás invisible, pero solo podrás emplear hechizos de Magia de Aire.",
  empower: "Extiende el efecto durante una ronda adicional.",
)

==== Rango VI — Rango VI

_Pasiva: Aumenta estadística de Carisma por 1_

#ability-card(
  name: "Forma Elemental",
  tags: ("Aire", "Duradera"),
  cost: "1 acción, 5 chi",
  duration: "Seis rondas",
  desc: "Obtienes +20 Vitalidad temporal. Tus estadísticas de DES, CON, SAB y CAR pasan a 12, tu Defensa base pasa a ser 20 y añades +1 dado de daño a tus hechizos. Obtienes Inmunidad a Aflicciones y efectos de Toque además que estás bajo los efectos de Viajero de los Cielos y Vientos Protectores, recibiendo así vuelo y contadores de escudo iguales a tu Rango. Tus hechizos de Magia de Aire de Rango III o menos no te costarán chi para ser lanzados.",
)
