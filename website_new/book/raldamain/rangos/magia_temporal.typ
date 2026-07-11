#import "../theme.typ": *

El tiempo no es un río: es un tejido, y la Magia Temporal tira de sus hilos con manos expertas. Los practicantes de este rango aprenden primero a percibir el tiempo de manera diferente: ven fracciones de segundo que otros ignoran y anticipan movimientos antes de que ocurran. Con experiencia, pueden revertir daños menores, acelerar aliados o ralentizar enemigos. En sus expresiones más poderosas, la Magia Temporal puede detener el tiempo o reescribir eventos enteros de una batalla. Es el rango más raro y difícil de dominar, y sus usuarios son considerados algunos de los practicantes más peligrosos del continente.

#tip-box[
  *Reserva de Chi:* Incrementa por Rango x 2.
  *Estadística principal:* Inteligencia + Rango.
]

==== Rango I — Rango I

#ability-card(
  name: "Premonición",
  tags: ("Temporal", "Arcana", "Pasiva"),
  desc: "Puedes repetir un tiro (ataque, defensa, salvación o habilidad) y elegir el mejor resultado. Tienes Rango + 2 usos diarios.",
  empower: "Recuperas un uso gastado de Premonición.",
)

#ability-card(
  name: "Alteración Temporal",
  tags: ("Temporal", "Arcana", "Toque"),
  cost: "2 acciones",
  range: "Cuerpo a cuerpo",
  duration: "Instantáneo",
  desc: "Reviertes daño reciente (de la ronda pasada). Puedes reparar un objeto (elimina estado Roto) o sanar a un aliado por Rango + 2 de Vitalidad.",
  empower: "Afecta un área pequeña o reduces Herido (permanente) o aflicción un paso.",
)

#ability-card(
  name: "Robar el Tiempo",
  tags: ("Temporal", "Arcana", "Aflicción", "Toque", "Fuerza"),
  cost: "1 acción",
  range: "Cuerpo a cuerpo",
  crit: "Objetivo con Fatigado-1 durante una ronda.",
  desc: "Envejeces al objetivo (tiro de salvación de CON contra tu Magia Temporal). Inflige 1d6 + Rango de daño de Fuerza que traspasa la defensa. Rompe objetos no mágicos o reduce la duración de hechizos en -2 rondas.",
  empower: "Aumenta el alcance a medio o afecta a un objetivo adicional.",
)

==== Rango II — Rango II

#ability-card(
  name: "Acelerar",
  tags: ("Temporal", "Arcano", "Mejora", "Duradero"),
  cost: "2 acciones, 1 chi",
  range: "Medio",
  duration: "Concentración",
  desc: "El objetivo obtiene una acción adicional por turno y Ventaja en tiros de DES.",
  empower: "Afecta a un objetivo adicional.",
)

#ability-card(
  name: "Ralentizar",
  tags: ("Temporal", "Arcano", "Duradero"),
  cost: "2 acciones, 1 chi",
  range: "Medio",
  area: "Radio pequeño",
  duration: "Concentración",
  desc: "Creas una zona de tiempo ralentizado. Los enemigos en su interior deben superar un tiro de salvación de Salud contra tu Magia Temporal o quedan Ralentizados. Puedes mover la zona como acción bonus.",
  empower: "Ralentizas el tiempo a tu alrededor, imponiendo Desventaja en ataques enemigos durante 1 ronda.",
)

#ability-card(
  name: "Desplazamiento",
  tags: ("Temporal", "Arcana", "Defensiva", "Reacción"),
  cost: "1 chi",
  duration: "Instantánea",
  desc: "Como reacción, reduces el daño de un impacto a 0 y evitas todos los efectos de estado directos. No funciona contra efectos Mentales, de Miedo ni Maldiciones.",
  empower: "N/A",
)

==== Rango III — Rango III

_Pasiva: Tus hechizos Temporales convierten sus dados de daño a d8._

#ability-card(
  name: "Visión",
  tags: ("Temporal", "Arcana", "Ritual"),
  desc: "Mediante un ritual, recibes una visión del pasado, presente o futuro relacionada con un objeto, lugar o persona presente durante el ritual.",
)

#ability-card(
  name: "Predecir Movimiento",
  tags: ("Temporal", "Reacción", "Arcana"),
  cost: "2 chi",
  duration: "Instantánea",
  desc: "Como reacción, obtienes éxito automático en un tiro defensivo o de habilidad. No funciona contra efectos de Aflicción, Mentales, de Miedo, Maldición ni Agarre.",
  empower: "Puedes volver a usar este hechizo una vez más esta ronda.",
)

#ability-card(
  name: "Dobles Temporales",
  tags: ("Temporal", "Sostenida", "Arcana", "Defensiva"),
  cost: "2 acciones, 2 chi",
  duration: "Concentración",
  desc: "Creas copias temporales de ti mismo (cantidad igual a tu Rango). Como reacción, puedes sacrificar un doble para absorber un impacto o anular tu propia acción más reciente (recuperando los costes gastados).",
  empower: "Restauras la mitad de tus dobles temporales.",
)

==== Rango IV — Rango IV

#ability-card(
  name: "Revertir el Tiempo",
  tags: ("Temporal", "Arcana", "Sostenida"),
  cost: "2 acciones, 2 chi",
  duration: "Cuatro rondas",
  desc: "Guardas tu estado actual (Vitalidad, PV, estados y posición). En cualquier momento durante la duración, puedes volver a ese estado como acción bonus (o automáticamente al morir). No restaura chi gastado ni duraciones de hechizos.",
  empower: "Lanzas el hechizo sobre otro personaje (tiro de salvación de CON contra tu Magia Temporal si es hostil).",
)

#ability-card(
  name: "Estasis",
  tags: ("Temporal", "Arcana", "Aturdido"),
  cost: "1 acción, 2 chi",
  range: "Medio",
  duration: "Concentración",
  crit: "Objetivo no puede intentar liberarse la primera ronda.",
  desc: "Congelas al objetivo en el tiempo (tiro de salvación de CON contra tu Magia Temporal). El objetivo queda con Aturdido-4 hasta que reciba daño o pierdas la concentración. Si falla el tiro de salvación 3 veces, queda congelado durante 1 día.",
  empower: "Afecta a un objetivo adicional.",
)

#ability-card(
  name: "Ataque Retardado",
  tags: ("Temporal", "Arcana", "Mejora"),
  cost: "2 chi",
  duration: "Instantáneo",
  desc: "Lanzas un ataque o hechizo que impacta en el futuro (mínimo 1 ronda de retraso). Al impactar, el ataque se beneficia de acción bonus, efecto crítico y cuenta como ataque sorpresa.",
  empower: "N/A",
)

==== Rango V — Rango V

_Pasiva: Tus hechizos Temporales convierten sus dados de daño a d10._

#ability-card(
  name: "Parar el Tiempo",
  tags: ("Temporal", "Arcana", "Área", "Aturdido"),
  cost: "3 acciones, 3 chi",
  area: "Esfera grande",
  duration: "Una ronda",
  desc: "Todas las criaturas en el área deben superar un tiro de salvación de CON contra tu Magia Temporal o quedan con Aturdido-4. Obtienes un turno extra inmediato. El efecto termina si atacas a un afectado.",
  empower: "Extiendes el efecto una ronda adicional al final de tu turno sin coste.",
)

#ability-card(
  name: "Visión Futura",
  tags: ("Temporal", "Mejora", "Arcana"),
  cost: "3 chi",
  duration: "Seis rondas",
  desc: "Obtienes Ventaja en todos los tiros (ataque, defensa y habilidad) e inmunidad a sorpresa. Recuperas 1 uso de Premonición por turno y puedes usar Premonición para activar Predecir Movimiento.",
  empower: "Otorgas el efecto a un aliado.",
)

#ability-card(
  name: "Brecha Temporal",
  tags: ("Temporal", "Ambiental", "Arcana"),
  cost: "3 acciones, 3 chi",
  area: "Esfera grande",
  duration: "Concentración",
  desc: "Controlas el flujo del tiempo en la zona. Eliges el orden de iniciativa de las criaturas dentro. Tus hechizos temporales cuestan -1 acción (mínimo 0, que se convierte en acción bonus).",
  empower: "Lanzas un hechizo temporal de 1 acción como acción bonus.",
)

==== Rango VI — Rango VI

_Pasiva: Hechizos Temporales Rango IV reducen coste -1 acción._

#ability-card(
  name: "Retroceso en Masa",
  tags: ("Temporal", "Arcana", "Ambiental"),
  cost: "3 acciones, 5 chi",
  area: "Esfera grande",
  duration: "Cinco rondas",
  desc: "Guardas el estado completo del campo de batalla. En cualquier momento durante la duración, puedes activar el retroceso para revertir todo al estado guardado (estadísticas, posiciones y estados). Elimina todos los efectos duraderos aplicados después del momento guardado.",
  empower: "N/A",
)
