#import "../theme.typ": *

La Mente Desencadenada persigue la pregunta más antigua de la filosofía: ¿qué sería una mente sin las limitaciones que le impone el cuerpo? Los practicantes de este rango aprenden a desvincularse del mundo físico hasta niveles que la mayoría consideraría peligrosos, alcanzando una claridad cognitiva que permite resolver cualquier problema con velocidad sobrehumana. El precio es la cordura: cada escalón hacia la claridad perfecta es un escalón alejándose de la experiencia ordinaria de ser humano. Los practicantes suelen parecer perturbadores incluso en los rangos iniciales.

#tip-box[
  *Reserva de Chi:* Incrementa por Rango x 2.
  *Poder de la mente:* Usas (INT + Rango) para las habilidades de esta rama.
]

==== Rango I — Iniciado

#ability-card(
  name: "Mente Desencadenada",
  tags: ("Mente desencadenada", "Mental", "Pasiva"),
  duration: "Max 6 rondas",
  desc: "Entras en un estado de trance. Obtienes Ventaja en tiros de ataque, defensa y talentos Mentales, y provocas un dado de daño adicional con tus hechizos y ataques mágicos. Al terminar, sufres daño a Cordura igual a las rondas pasadas en Mente Desencadenada.",
)

#ability-card(
  name: "Agilidad Mental",
  tags: ("Innata", "Pasiva"),
  desc: "Obtienes (Rango + 2) niveles de talento adicionales para mejorar tus habilidades.",
)

==== Rango II — Adepto

#ability-card(
  name: "Poder del Dolor",
  tags: ("Mente desencadenada", "Mental", "Pasiva"),
  desc: "Mientras dure el estado Mente Desencadenada, ignoras los efectos de Herido-1 y Herido-2 (permanentes). Obtienes Resistencia a Aflicciones y Aturdido.",
)

#ability-card(
  name: "Conocimiento Arcano",
  tags: ("Mente desencadenada", "Innata", "Pasiva"),
  desc: "Mientras dure el estado Mente Desencadenada, puedes lanzar 2 hechizos de Rango I (Arcano u Ocultismo) usando INT + Rango. Aprendes 1 hechizo nuevo cada vez que subes de rango.",
)

==== Rango III — Profesional

#ability-card(
  name: "Concentración Superior",
  tags: ("Mente desencadenada", "Innata", "Pasiva"),
  desc: "No pierdes la concentración al recibir daño o efectos negativos, salvo por Herido-3 o superior, o incapacitación.",
)

#ability-card(
  name: "Poder de la Locura",
  tags: ("Mente desencadenada", "Innata", "Pasiva"),
  desc: "Mientras dure el estado Mente Desencadenada, puedes reducir tu Cordura en 2 para recuperar 1 punto de Chi. Usos por ronda: 3.",
)

==== Rango IV — Experto

#ability-card(
  name: "Sentido Arcano",
  tags: ("Mente desencadenada", "Innata", "Pasiva"),
  range: "Medio",
  desc: "Puedes identificar las propiedades de hechizos y objetos mágicos. Obtienes vista ciega a alcance medio.",
  empower: "Suprimes las propiedades de un objeto mágico o hechizo activo. Coste: 1 chi o 2 de Cordura.",
)

#ability-card(
  name: "Psique Retorcida",
  tags: ("Mente desencadenada", "Innata", "Pasiva"),
  desc: "Obtienes Inmunidad a Miedo y efectos Mentales. Reacción: Cuando recibes un ataque mental, lo reflejas al atacante, obligándole a defenderse de su propio efecto.",
)

==== Rango V — Maestro

#ability-card(
  name: "División Mental",
  tags: ("Mente desencadenada", "Innata", "Pasiva"),
  desc: "Mientras dure el estado Mente Desencadenada, obtienes un turno adicional completo con 3 acciones, a -10 de Iniciativa.",
)

#ability-card(
  name: "Mente sobre Cuerpo",
  tags: ("Mente desencadenada", "Innata", "Pasiva"),
  desc: "Puedes luchar a 0 PV o menos sin penalizadores. Ignoras Herido-1, Herido-2 y Herido-3 (permanentes). Al terminar el estado, si tus PV son inferiores a -CON, mueres instantáneamente. Además, pierdes Cordura igual al daño recibido durante el estado. [AVISO AUTOR: No queda claro si la pérdida de Cordura se refiere al daño total acumulado o solo al daño del último turno.]",
)
