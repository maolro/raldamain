#import "../theme.typ": *

El Rango de Reflejos convierte el instante entre el ataque y el impacto en el espacio de trabajo del practicante. Donde otros reaccionan al peligro, quien domina los Reflejos ya ha terminado de responder. Esta disciplina entrena el cuerpo para moverse antes de que la mente consciente registre la amenaza, creando esquivas que parecen predecir el futuro y contraataques que llegan antes de que el ataque original alcance su objetivo. En sus niveles superiores, los Reflejos permiten evadir proyectiles a distancias que desafían la física.

#tip-box[
  *Reserva de Chi:* Incrementa por Rango x 2.
  *Gran Agilidad:* Sumas tu Rango a todos los tiros de Esquiva.
  *Absolutamente innato:* Habilidades físicas naturales que no pueden ser suprimidas ni contrarrestadas.
]

==== Rango I — Iniciado

#ability-card(
  name: "Velocidad Superior",
  tags: ("Innata", "Pasiva"),
  desc: "Obtienes +1 acción por turno. Sumas tu Rango a la Iniciativa.",
  empower: "Realizas una acción fuera de turno (pagando su coste).",
)

#ability-card(
  name: "Instinto de Supervivencia",
  tags: ("Innata", "Reacción"),
  desc: "Repites un tiro de DES (ataque, defensa o tiro de salvación) y te quedas con el mejor resultado. Usos por combate: Rango + 2.",
  empower: "Recuperas un uso de esta habilidad.",
)

==== Rango II — Adepto

#ability-card(
  name: "Esquiva Asombrosa",
  tags: ("Innata", "Pasiva"),
  desc: "Puedes usar Esquiva contra ataques sorpresa o imposibles de esquivar. En ese caso, el tiro de Esquiva se realiza con Desventaja.",
)

#ability-card(
  name: "Evasión",
  tags: ("Innata", "Defensiva"),
  cost: "1 chi",
  desc: "Al fallar una Esquiva, reduces el daño a la mitad, evitas los efectos de estado asociados y puedes desenganchar como acción bonus.",
)

==== Rango III — Profesional

#ability-card(
  name: "Giro Defensivo",
  tags: ("Innata", "Pasiva"),
  desc: "Reduces todo el daño recibido en (Rango + 1) antes de aplicar la DEF. Solo se aplica si te queda al menos 1 Reacción disponible.",
  empower: "Recuperas 1 Reacción gastada.",
)

#ability-card(
  name: "Gran Acróbata",
  tags: ("Innata", "Pasiva"),
  desc: "Obtienes Inmunidad a Terreno Difícil y al estado Ralentizado. Obtienes Velocidad de Escalada 1 y Resistencia a daño de Caídas.",
  empower: "Te levantas inmediatamente del estado Ralentizado.",
)

==== Rango IV — Experto

#ability-card(
  name: "Sexto Sentido",
  tags: ("Innata", "Pasiva"),
  range: "Medio",
  desc: "Obtienes vista ciega a alcance medio. Puedes esquivar ataques rápidos y balas sin penalizador. Obtienes Resistencia a Ilusiones y efectos Visuales.",
)

#ability-card(
  name: "Punto Ciego",
  tags: ("Innata", "Reacción"),
  cost: "2 chi",
  desc: "Puedes usar Esquiva para defenderte de tiros de salvación que te apunten directamente (por ejemplo, hechizos mentales dirigidos). [AVISO AUTOR: No queda claro si reemplaza el tiro de salvación o si es un tiro adicional.]",
)

==== Rango V — Maestro

#ability-card(
  name: "Libertad de Movimiento",
  tags: ("Innata", "Pasiva"),
  desc: "Obtienes Resistencia a Agarres y Ventaja en tiros para escapar de ellos. Puedes desenganchar como acción bonus.",
  empower: "Te liberas inmediatamente de un Agarre.",
)

#ability-card(
  name: "Reflejos Supremos",
  tags: ("Innata", "Pasiva"),
  desc: "Obtienes un turno adicional completo con 3 acciones, a -10 de Iniciativa.",
)
