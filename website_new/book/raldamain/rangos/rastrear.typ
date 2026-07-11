#import "../theme.typ": *

El rastreador entiende que el campo de batalla no es solo el espacio entre dos ejércitos: es el terreno, el clima, la oscuridad y las mil pequeñas ventajas que el entorno ofrece a quien sabe leerlas. Este rango perfecciona el arte de la observación, el movimiento silencioso y la emboscada, convirtiendo al practicante en una amenaza que el enemigo nunca ve venir. Más allá del combate, el Rastreador es invaluable en exploración y supervivencia, capaz de seguir rastros imposibles, curar heridas en campo y guiar a un grupo a través de terrenos que matarían a cualquier otro.

#tip-box[
  *Reserva de Chi:* Incrementa por Rango x 2.
  *Conocimiento del Terreno:* Habilidades potenciadas en entornos familiares.
]

==== Rango I — Iniciado

#ability-card(
  name: "Analizar Enemigo",
  tags: ("Innata", "Duradera"),
  cost: "1 chi",
  duration: "Indefinido",
  desc: "Tras observar a un enemigo durante 1 ronda, obtienes Ventaja en tiros de ataque y defensa contra él. El efecto se pierde al cambiar de objetivo.",
)

#ability-card(
  name: "Sanador Instintivo",
  tags: ("Innata", "Sanación", "Toque"),
  cost: "1 acción, 1 chi",
  desc: "Curas Rango + 2 Vitalidad y reduces la gravedad de Herido (permanente) o aflicción un paso. Requiere materiales de sanación.",
)

==== Rango II — Adepto

#ability-card(
  name: "Acechar",
  tags: ("Innata", "Duradera"),
  cost: "1 chi",
  desc: "Te vuelves invisible mientras no seas detectado. El efecto termina al atacar o salir de tu escondite.",
)

#ability-card(
  name: "Maestro del Terreno",
  tags: ("Innata", "Pasiva"),
  desc: "Eliges un entorno predilecto (Bosque, Ciudad, Subterráneo, etc.). Obtienes Ventaja en tiros de Sigilo y Percepción en ese entorno, además de beneficios pasivos (ejemplos: vista ciega en subterráneo, inmunidad climática, etc.).",
)

==== Rango III — Profesional

#ability-card(
  name: "Lo he visto Antes",
  tags: ("Innata", "Pasiva"),
  desc: "Cuando te defiendes de un ataque o habilidad que el mismo enemigo ya haya usado contra ti anteriormente, puedes repetir el tiro defensivo y quedarte con el mejor resultado.",
)

#ability-card(
  name: "Inescrutable",
  tags: ("Innata", "Pasiva"),
  desc: "Obtienes Resistencia a efectos Mentales y de Miedo. Eres inmune a lectura de mente y predicción de movimientos.",
)

==== Rango IV — Experto

#ability-card(
  name: "Vista de Lince",
  tags: ("Innata", "Pasiva"),
  range: "Medio",
  desc: "Obtienes Resistencia a Ilusiones. Como reacción, puedes intentar identificar una ilusión.",
  empower: "Éxito automático para identificar o resistir una ilusión.",
)

#ability-card(
  name: "Cambio Repentino",
  tags: ("Innata", "Reacción"),
  cost: "2 chi",
  desc: "Como reacción, después de tirar un ataque pero antes de aplicar daño, puedes cambiar tu ataque por otro de coste igual o menor. El enemigo pierde su defensa previa contra el nuevo ataque.",
)

==== Rango V — Maestro

#ability-card(
  name: "Enemigo Juramentado",
  tags: ("Innata", "Pasiva"),
  cost: "3 chi",
  duration: "Permanente (hasta muerte)",
  desc: "Marcas a un enemigo como tu objetivo juramentado. Obtienes Ventaja total en todos los tiros contra él, +1d6 daño adicional y aplicas el efecto crítico de tu ataque en cada impacto.",
)

#ability-card(
  name: "Coto de Caza",
  tags: ("Innata", "Mental", "Duradera"),
  cost: "1 acción, 3 chi",
  range: "Medio",
  duration: "Concentración",
  desc: "Mientras estés en tu terreno predilecto, una vez por ronda puedes obligar a un enemigo a realizar una acción de tu elección. El objetivo puede resistirse con un tiro de Averiguar contra tu Sigilo.",
  empower: "Puedes usarlo una vez adicional por ronda.",
)
