#import "../theme.typ": *

La tormenta no es un elemento: es una colaboración entre el aire, el agua y la electricidad, y quien domina la Magia de Tormenta domina su sinergia. Este rango explota la conductividad del entorno para multiplicar el alcance de sus ataques, convirtiendo superficies mojadas y estructuras metálicas en extensiones de su voluntad. Sus practicantes se mueven con la velocidad del relámpago y hablan con la voz del trueno. En su cúspide, un maestro de tormenta puede invocar un apocalipsis climático localizado que disuelve formaciones enteras de enemigos.

#tip-box[
  *Reserva de Chi:* Incrementa por Rango x 2.
  *Estadística principal:* Sabiduría/Carisma + Rango.
  *Parada mágica:* Usas Magia de Tormenta para tiros de parada y salvaciones contra Tormenta, Fuego, Radiante, Tierra y Naturaleza.
]

==== Rango I — Rango I

#ability-card(
  name: "Toque Chispeante",
  tags: ("Tormenta", "Ataque", "Eléctrico", "Toque"),
  cost: "1 acción",
  range: "Cuerpo a cuerpo",
  duration: "Instantáneo",
  crit: "El objetivo queda con Aturdido-2 durante una ronda.",
  desc: "Canaliza una descarga eléctrica a través del contacto directo que inflige 1d6 + SAB/CAR daño Eléctrico al objetivo. Los enemigos que lleven armadura metálica tienen Desventaja en sus tiros defensivos contra este ataque.",
  empower: "Haz un ataque contra un objetivo adicional o realiza un segundo ataque contra el mismo objetivo, que deberá emplear su mismo resultado defensivo.",
)

#ability-card(
  name: "Onda Trueno",
  tags: ("Tormenta", "Ataque", "Área", "Sónico"),
  cost: "2 acciones, 1 chi",
  area: "Radio cercano",
  duration: "Instantáneo",
  crit: "Los afectados quedan ensordecidos durante una ronda.",
  desc: "Emites un estallido de energía sónica que inflige 2d6 + SAB/CAR daño Sónico a todos los que se encuentren en el área y los empuja un paso. Los afectados deben superar un tiro de salvación de Voluntad o quedan ensordecidos una ronda. Este ataque destruye objetos frágiles e interrupe efectos Auditivos.",
  empower: "Aumenta el radio un paso y el daño un dado adicional.",
)

#ability-card(
  name: "Alma de la Tormenta",
  tags: ("Tormenta", "Innata", "Pasiva"),
  desc: "Obtienes Resistencia al daño Eléctrico y Sónico, además de Inmunidad a los efectos del rayo y el trueno. Puedes sentir la presencia de todo aquello que conduzca la corriente eléctrica a distancia media, incluyendo criaturas con armaduras metálicas, masas de agua y superficies conductoras.",
)

==== Rango II — Rango II

_Pasiva: Aumenta tu estadística de Destreza por 1._

#ability-card(
  name: "Barrera Eléctrica",
  tags: ("Tormenta", "Defensivo", "Duradera"),
  cost: "1 Acción/Reacción, 1 chi",
  range: "Medio",
  area: "Esfera pequeña o línea mediana",
  duration: "Concentración",
  crit: "Los afectados quedan ensordecidos durante una ronda.",
  desc: "Crea una barrera de energía eléctrica con PV iguales a tu Rango x 3. Cualquier criatura que intente cruzarla sufre 1d6 + CAR daño Eléctrico y si lleva armadura metálica sufre un dado de daño adicional. Puede emplearse como reacción para reducir el daño de un ataque recibido en la cantidad de PV restantes de la barrera.",
  empower: "La barrera recupera todos sus puntos de vida.",
)

#ability-card(
  name: "Relámpago",
  tags: ("Tormenta", "Ataque", "Eléctrico"),
  cost: "1+ acciones, 1 chi",
  area: "Línea grande",
  duration: "Instantáneo",
  crit: "Los afectados quedan con Aturdido-2 durante una ronda.",
  desc: "Lanza una descarga eléctrica en línea recta que inflige 2d6 + CAR daño Eléctrico a todos los que alcance. Los objetivos con armadura metálica tienen Desventaja en sus tiros defensivos. Puedes cargar con acciones adicionales, aumentando el daño en 1d6 por carga (máximo 2 cargas). Si hay puntos conductores en el trayecto, el rayo puede saltar entre ellos e infligir daño a los que se encuentren cerca.",
  empower: "Lanza un relámpago adicional en otra dirección desde el punto de impacto con la misma cantidad de cargas.",
)

#ability-card(
  name: "Ataques Infundidos",
  tags: ("Tormenta", "Pasiva"),
  desc: "Impregnas tus golpes con energía eléctrica y vibración sónica. Tus ataques físicos cuentan como mágicos y como Eléctricos o Sónicos para los propósitos de Vulnerabilidades y mejoras mágicas. Puedes emplear tu modificador de Magia de Tormenta para todos tus tiros de ataque, defensa y técnicas relacionados con ellos.",
)

==== Rango III — Rango III

_Pasiva: Todos tus hechizos de Tormenta sustituyen sus dados de daño por d8._

#ability-card(
  name: "Llamar la Tormenta",
  tags: ("Tormenta", "Ambiental", "Duradera", "Mejora"),
  cost: "2 Acciones, 2 chi",
  area: "Radio grande",
  duration: "Concentración",
  desc: "Cargas el aire a tu alrededor de electricidad estática, desatando una tormenta contenida. Mientras este efecto permanezca activo, obtienes Ventaja en todos tus tiros relacionados con Magia de Tormenta y recibes un dado de daño adicional en tus ataques. Puedes lanzar hechizos de Tormenta contra cualquier punto dentro del área afectada, haciendo así que los rayos caigan directamente del cielo y no pueden ser bloqueados por barreras o muros.",
  empower: "Reduce el coste en acciones del siguiente hechizo de Tormenta en 1 (mínimo 1).",
)

#ability-card(
  name: "Velocidad del Rayo",
  tags: ("Tormenta", "Reacción", "Eléctrico"),
  cost: "1 Reacción, 1 chi",
  duration: "Instantáneo",
  desc: "Conviertes tu cuerpo en electricidad por un instante, evitando automáticamente un ataque y teletransportándote a cualquier punto a distancia media que puedas ver. Si te encuentras en una zona de tormenta o en un entorno que conduzca electricidad, la distancia aumenta a grande.",
  empower: "Al reaparecer, realizas un ataque de Toque Chispeante gratuito contra un objetivo adyacente.",
)

#ability-card(
  name: "Desatar la Tormenta",
  tags: ("Tormenta", "Ataque", "Área"),
  cost: "1 Acción, 2 chi",
  area: "Esfera pequeña",
  duration: "Instantáneo",
  crit: "Los afectados quedan con Aturdido-2 durante una ronda.",
  desc: "Crea una explosión centrada en ti que inflige 3d8 + CAR daño Eléctrico y Sónico al impactar y ensordece durante una ronda.Todos los objetivos con armadura metálica solo podrán defenderse con un tiro de Voluntad.",
  empower: "Aumenta el área de efecto de este hechizo por un paso y el daño por un dado adicional, o ataca de nuevo a todas las criaturas en el área afectada.",
)

==== Rango IV — Rango IV

_Pasiva: Aumenta tu estadística de Carisma por 1._

#ability-card(
  name: "Electroshock",
  tags: ("Tormenta", "Reacción", "Sanación"),
  cost: "1 Acción/Reacción, 1 chi",
  duration: "Instantáneo",
  desc: "Canaliza una descarga eléctrica a través de tu propio cuerpo para reiniciarte. Recuperas Vitalidad igual a tu Rango x 2 y eliminas un efecto de estado negativo. Esta habilidad solo puede emplearse si te encuentras en una zona de tormenta o al recibir un ataque de daño Eléctrico, cuyo daño se anula de inmediato.",
  empower: "Recuperas Vitalidad adicional igual a tu Rango y reduces el nivel de Herido (permanente) por un paso.",
)

#ability-card(
  name: "Esferas del Relámpago",
  tags: ("Tormenta", "Defensivo", "Duradera"),
  cost: "2 acciones, 2 chi",
  duration: "Concentración",
  desc: "Rodeas tu cuerpo de esferas de energía eléctrica que absorben los golpes y fulminan a tus atacantes. Obtienes contadores de escudo iguales a tu Rango. Cada vez que gastes un contador de escudo por un ataque cuerpo a cuerpo, puedes infligir 1d8 daño Eléctrico al atacante (máximo 6d8). Si el atacante lleva objetos metálicos, recibe 2d8 en su lugar.",
  empower: "Recuperas la mitad de tus contadores de escudo (redondeando hacia abajo).",
)

#ability-card(
  name: "Torbellino Eléctrico",
  tags: ("Tormenta", "Ataque", "Área", "Duradera"),
  cost: "2 acciones, 2 chi",
  area: "Cilindro pequeño",
  duration: "Concentración",
  crit: "Los afectados quedan con Aturdido-2 durante una ronda.",
  desc: "Crea un torbellino de electricidad y viento que inflige 3d8 + CAR daño Eléctrico a todos los que alcance y los ralentiza una ronda. El torbellino puede moverse como acción. Las criaturas con armadura metálica tienen Desventaja para resistir sus efectos.",
  empower: "Crea un torbellino adicional o aumenta el daño del existente en 1d8 y su alcance un paso durante una ronda.",
)

==== Rango V — Rango V

_Pasiva: Todos tus hechizos de Tormenta sustituyen sus dados de daño por d10._

#ability-card(
  name: "Descenso Relampagueante",
  tags: ("Tormenta", "Ataque", "Área", "Eléctrico"),
  cost: "2 acciones, 3 chi",
  area: "Línea grande",
  duration: "Instantáneo",
  crit: "Los afectados quedan con Aturdido-2 automáticamente sin tiro de salvación.",
  desc: "Invoca un rayo devastador que desciende desde las nubes sobre el área afectada, infligiendo 4d10 + CAR daño Eléctrico a todos los que alcance y ralentizándolos. Los afectados deben superar un tiro de salvación de Voluntad o quedan con Aturdido-2 durante una ronda. Si se emplea desde una tormenta activa, cae directamente del cielo y no puede ser bloqueado por barreras ni muros.",
  empower: "Invoca un segundo rayo sobre el mismo área o uno diferente.",
)

#ability-card(
  name: "Relámpago Viviente",
  tags: ("Tormenta", "Reacción", "Duradera"),
  cost: "1 Acción/Reacción, 2 chi",
  duration: "Concentración",
  desc: "Te disuelves en electricidad pura, obteniendo así Inmunidad a efectos Físicos no mágicos, Agarres, Mentales y Aflicciones, pero pierdes toda tu Defensa y recibes Vulnerabilidad a efectos de Tierra. Solo puedes emplear Magia de Tormenta mientras estés en esta forma. Esta habilidad puede emplearse como reacción para evitar automáticamente un efecto.",
  empower: "Al convertirte, emites una descarga que inflige 3d10 + CAR daño Eléctrico a todos los enemigos en distancia media.",
)

#ability-card(
  name: "Voltio Cruel",
  tags: ("Tormenta", "Ataque", "Eléctrico", "Toque"),
  cost: "1 acción, 3 chi",
  range: "Cuerpo a cuerpo",
  duration: "Instantáneo",
  crit: "El objetivo sufre Herido-4 (Herida Crítica Incurable).",
  desc: "Desatas toda la electricidad acumulada en tu cuerpo a través del contacto directo. Inflige 5d10 + CAR daño Eléctrico, Herido-3 y deja al objetivo con Aturdido-2. Los objetivos con armadura metálica no pueden defenderse de este ataque.",
  empower: "Afecta a un objetivo adicional adyacente al primero.",
)

==== Rango VI — Rango VI

_Pasiva: Aumenta tu estadística de Inteligencia por 1._

#ability-card(
  name: "Forma Elemental",
  tags: ("Tormenta", "Mejora", "Duradera"),
  cost: "1 acción, 5 chi",
  duration: "Seis rondas",
  desc: "Obtienes +20 Vitalidad temporal. Tus estadísticas físicas y CAR pasan a 12, tu Defensa base pasa a ser 20 y añades +1 dado de daño a tus hechizos. Obtienes Inmunidad a Aflicciones y efectos de Toque, y tienes activos los hechizos Llamar la Tormenta Esferas del Relámpago, recibiendo así Ventaja en Magia de Tormenta y contadores de escudo iguales a tu Rango (el dado de daño ya está incluido). Tus hechizos de Magia de Tormenta de Rango III o menos no te costarán chi para ser lanzados.",
)
