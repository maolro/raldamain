#import "../theme.typ": *

La Ira no es una emoción negativa para el guerrero berserker: es una herramienta. Canalizando la furia como combustible, el practicante quiebra los límites físicos del cuerpo humano, moviéndose más rápido, golpeando más fuerte y resistiendo daño que detendría a cualquier otro. El precio es el control: en el trance de Ira, el mundo se reduce a objetivos y obstáculos. Los practicantes aprenden a surfear ese límite entre la eficacia devastadora y la pérdida total de control, encontrando en ese equilibrio precario su mayor fortaleza.

#tip-box[
  *Reserva de Chi:* Incrementa por Rango x 2.
  *Voluntad para luchar:* Requiere estar en combate y tener motivación. Si pierdes la voluntad, pierdes los beneficios.
  *Completamente innato:* Habilidades físicas naturales que no pueden ser suprimidas ni contrarrestadas.
]

==== Rango I — Iniciado

#ability-card(
  name: "Ira de Combate",
  tags: ("Ira", "Innata", "Pasiva"),
  duration: "Max 6 rondas",
  desc: "Entras en un estado de furia. Obtienes Ventaja en tiros de ataque y tiros de salvación físicos, y +1d6 al daño. No puedes concentrarte mientras dure. Al terminar, pierdes Chi igual a las rondas usadas (con riesgo de inconsciencia).",
)

#ability-card(
  name: "Frenesí de Batalla",
  tags: ("Innata", "Pasiva"),
  duration: "1 Ronda",
  desc: "Obtienes Ventaja en todos los tiros de ataque con arma y artes marciales, pero sufres Desventaja en tiros defensivos.",
)

==== Rango II — Adepto

#ability-card(
  name: "Demostración Terrorífica",
  tags: ("Ira", "Miedo"),
  cost: "1 chi",
  area: "Radio medio",
  crit: "Aumenta nivel de Miedo un paso extra.",
  desc: "Los enemigos en el área deben superar un tiro de salvación de Voluntad (o enfrentado de Intimidar) o aumentan su nivel de Miedo en un paso.",
)

#ability-card(
  name: "Resistencia Salvaje",
  tags: ("Ira", "Pasiva"),
  desc: "Mientras dure la Ira, reduces todo el daño recibido en una cantidad igual a tu Rango. Ignoras los efectos de Herido-1 y Herido-2 (permanentes), y obtienes Resistencia a Aflicciones.",
)

==== Rango III — Profesional

#ability-card(
  name: "Ira Temeraria",
  tags: ("Ira", "Pasiva"),
  desc: "Mientras dure la Ira, obtienes Inmunidad a Miedo y efectos Mentales. Al entrar en Ira, suprimes cualquier efecto activo de estos tipos.",
)

#ability-card(
  name: "Hasta el Límite",
  tags: ("Pasiva", "Innata"),
  desc: "Puedes reducir tu Vitalidad máxima en 2 o tus PV máximos en 1 para recuperar 1 punto de Chi. Usos por ronda: 3. La reducción se recupera con un descanso largo.",
)

==== Rango IV — Experto

#ability-card(
  name: "Golpe de Adrenalina",
  tags: ("Ira", "Pasiva"),
  desc: "Mientras dure la Ira, obtienes 1 acción adicional por turno y 1 Reacción adicional por ronda. Además, no puedes ser sorprendido.",
)

#ability-card(
  name: "Furia Imparable",
  tags: ("Ira", "Reacción"),
  cost: "2 chi",
  desc: "Cuando un enemigo detiene o reduce tu ataque (mediante magia, escudos o esquiva), cancelas su defensa y aplicas el daño normalmente. El defensor puede evitarlo pagando 2 recursos adicionales o sacrificando escudos. [AVISO AUTOR: No está claro qué cuenta como 'recursos extra' ni cuántos escudos hay que sacrificar.]",
)

==== Rango V — Maestro

#ability-card(
  name: "Superar los Límites",
  tags: ("Ira", "Mejora"),
  cost: "3 chi",
  duration: "5 Rondas",
  desc: "Obtienes 20 de Vitalidad Temporal. Tus puntuaciones de FUE, DES y CON aumentan a 12. Tu DEF aumenta en +5. Cada ronda, reduces el coste de chi de una técnica en 1. El efecto termina si pierdes toda la Vitalidad Temporal.",
)

#ability-card(
  name: "Furia Invulnerable",
  tags: ("Ira", "Pasiva"),
  desc: "Mientras dure la Ira, puedes luchar a 0 PV o menos sin penalizadores ni tiros de muerte. Ignoras Herido-1, Herido-2 y Herido-3 (permanentes). Al terminar la Ira, si tus PV son inferiores a -CON, mueres instantáneamente.",
)
