#import "../theme.typ": *

Fortitud no es glamoroso: es el rango que convierte a un guerrero en algo imparable. Donde otros fallan por el dolor, el cansancio o las heridas, el practicante de Fortitud simplemente continúa. Esta disciplina desarrolla la resistencia física hasta límites sobrehumanos, haciendo que el cuerpo ignore señales de alarma que paralizarían a cualquier mortal corriente. En el campo de batalla, la Fortitud no se traduce en golpes más poderosos, sino en que el practicante sigue siendo una amenaza cuando el resto del grupo ya no puede pelear.

#tip-box[
  *Reserva de Chi:* Incrementa por Rango x 2.
  *Constitución superior:* Bonificador de (Rango + 1) en tiros defensivos de CON.
  *Absolutamente innato:* No puede ser suprimido o contrarrestado.
]

==== Rango I — Iniciado

#ability-card(
  name: "Armadura Natural",
  tags: ("Innata", "Pasiva"),
  desc: "Tus PV máximos y tu DEF aumentan por un valor igual a tu Rango + 1. Este bonificador se acumula con armaduras.",
)

#ability-card(
  name: "Segundo Aliento",
  tags: ("Innata", "Sanación", "Reacción"),
  cost: "1 Reacción, 1 chi",
  desc: "Recuperas Rango + 2 Vitalidad y reduce los penalizadores de Herido (permanente), tratándola  así como de un nivel menor hasta que termine el combate.",
)

==== Rango II — Adepto

#ability-card(
  name: "Duro de Pelar",
  tags: ("Innata", "Pasiva"),
  desc: "Obtienes Resistencia a daño Sónico, Aturdido y Maniobras. Inmune a efectos críticos de Aturdido y Ralentizado.",
)

#ability-card(
  name: "Resiliencia",
  tags: ("Innata", "Defensiva"),
  cost: "1 Reacción, 1 chi",
  desc: "Reduces el daño de un ataque a la mitad después de aplicar DEF y Resistencias.",
)

==== Rango III — Profesional

#ability-card(
  name: "Hasta la Muerte",
  tags: ("Innata", "Pasiva"),
  desc: "Puedes seguir luchando a 0 PV o menos, realizando tiros de muerte. Tu Herido (permanente) se reduce un nivel.",
)

#ability-card(
  name: "Constitución Férrea",
  tags: ("Innata", "Pasiva"),
  desc: "Obtienes Resistencia a Aflicciones y daño Necrótico. Inmune a efectos críticos de Enfermado.",
)

==== Rango IV — Experto

#ability-card(
  name: "Muro Viviente",
  tags: ("Innata", "Defensiva", "Duradera"),
  cost: "2 acciones, 2 chi",
  range: "Propio",
  duration: "Concentración",
  desc: "Obtienes una cantidad de Escudos igual a tu Rango.",
  empower: "Recuperas Escudos iguales a (Rango / 2).",
)

#ability-card(
  name: "Aguantar los Elementos",
  tags: ("Innata", "Pasiva"),
  desc: "Obtienes Resistencia a daño de Frío, Fuego, Ácido y Eléctrico. Inmune a efectos críticos de Quemadura y Aturdido.",
)

==== Rango V — Maestro

#ability-card(
  name: "Sanación Rápida",
  tags: ("Innata", "Pasiva", "Sanación"),
  desc: "Al inicio de tu turno, recuperas (Rango + 2) de Vitalidad. Si tienes Herido (permanente), en su lugar reduces su nivel en un paso.",
  empower: "Reduce el nivel de Herido (permanente) (no crítica) en un paso.",
)

#ability-card(
  name: "Una Última Resistencia",
  tags: ("Innata", "Sanación"),
  cost: "3 chi",
  desc: "Al caer a 0 PV, recuperas toda tu Vitalidad y la mitad de tus PV máximos. Usos por descanso largo: 1.",
)
