#import "../theme.typ": *

Antes de que los dioses dieran forma al mundo, la naturaleza ya existía: vasta, impredecible y completamente indiferente a los asuntos mortales. La Ascendencia Primigenia te conecta con esas fuerzas anteriores a toda civilización, haciendo de ti un eslabón entre el mundo material y el espiritual. Con el tiempo aprendes a adoptar formas bestiales, invocar espíritus y sanar heridas con energía vital pura. Los druidas, chamanes y guardianes de los bosques prohibidos son quienes más frecuentemente despiertan este poder.

#tip-box[
  *Poder innato:* Incrementa tu reserva de Chi por un valor igual a tu Rango x 2.
  *Estadística principal:* Sabiduría/Constitución + Rango.
]

==== Rango I — Rango I

#ability-card(
  name: "Forma de la Bestia",
  tags: ("Innata", "Mejora"),
  cost: "1 acción",
  duration: "Concentración",
  desc: "Adoptas una forma híbrida entre hombre y bestia. Mientras mantengas esta forma, obtienes Ventaja en todos los tiros relacionados con estadísticas físicas (FUE, DES, CON) y tu DEF aumenta en un valor igual a tu Rango + 1. Al final de cada ronda en forma híbrida, reduces tu Cordura en 1. Si tu Cordura llega a 0, pierdes el control de tu personaje hasta que otro aliado te calme o quedes inconsciente.",
)

#ability-card(
  name: "Aspecto Primigenio",
  tags: ("Innata", "Pasiva"),
  desc: "Obtienes visión nocturna y olfato agudo a distancia media. Los animales salvajes no son hostiles hacia ti a menos que los provoques.",
)

==== Rango II — Rango II

#ability-card(
  name: "Infusión Espiritual",
  tags: ("Innata", "Mejora"),
  cost: "1 chi",
  desc: "Cuando realizas un ataque físico, puedes imbuirlo con un hechizo que conozcas. Debes declarar el hechizo antes de realizar el tiro de ataque y pagar su coste de chi por separado. Si el ataque impacta, ambos efectos se activan simultáneamente. Para el hechizo imbuido, usa tu tiro de ataque y tu Rango de Ascendencia Primigenia como modificador en lugar de los del hechizo original.",
)

#ability-card(
  name: "Comunión con la Naturaleza",
  tags: ("Innata", "Pasiva"),
  range: "Medio",
  desc: "Detectas la presencia de magia y de seres espirituales a distancia media. Aprendes 2 hechizos de Rango I o menos relacionados con tu patrón espiritual (usan chi). A Rango IV aprendes 2 hechizos adicionales de Rango II o menos, y a Rango VI aprendes 2 hechizos adicionales de Rango III o menos.",
)

==== Rango III — Rango III

#ability-card(
  name: "Transformación Animal",
  tags: ("Innata", "Transmutación"),
  cost: "1 acción, 2 chi",
  duration: "1 hora",
  desc: "Te transformas en un animal, recibiendo así dos mejoras entre Vuelo, Coraza, Tamaño Superior o Resistencia Elemental (u otras permitidas por el DJ) además que de tus estadísticas físicas pasan a ser 7 (si eran más bajas). Durará hasta una hora. 
Como alternativa, puedes convertirte en un animal normal de nivel máximo 4, el cual aumenta en 2 cada rango. Recibirás las estadísticas, acciones, habilidades pasivas y reacciones del animal. Si los PV y Vitalidad del animal son superirores a los tuyos, recibirás PV y Vitalidad temporal igual a la diferencia.",
)

#ability-card(
  name: "Llamar a los Espíritus",
  tags: ("Divina", "Invocación"),
  cost: "3 acciones, 2 chi",
  duration: "1 hora",
  desc: "Invocas un espíritu o animal con un Nivel igual o inferior a tu Rango x 2 (máximo 4 invocaciones simultáneas). La criatura invocada actúa en tu turno y obedece tus órdenes.",
  empower: "Invocas una criatura adicional con esta habilidad. Empoderar así te costará 2 chi.",
)

==== Rango IV — Rango IV

#ability-card(
  name: "Vínculo Primigenio",
  tags: ("Innata", "Pasiva"),
  desc: "Obtienes Resistencia a daño de Fuego, Frío, Eléctrico, Sónico y Radiante.",
)

#ability-card(
  name: "Sanación Espiritual",
  tags: ("Innata", "Sanación"),
  cost: "1 chi",
  desc: "Recuperas una cantidad de Vitalidad igual a tu Rango o reduces el nivel de Herido (permanente) en 1. Este efecto se anula durante 1 ronda si recibes daño de Hierro Frío.",
  empower: "En lugar del efecto normal, te recuperas de un efecto de estado o maldición. Si empoderas esta habilidad, no puedes usar el efecto base en el mismo turno.",
)

==== Rango V — Rango V

#ability-card(
  name: "Aura Primigenia",
  tags: ("Innata", "Pasiva"),
  desc: "Obtienes Ventaja en tiros de salvación contra efectos Arcanos. Los objetos mágicos y glifos enemigos cercanos a ti tienen un 50% de probabilidad de fallar al activarse.",
  empower: "Anulas un efecto Arcano de Rango II o menos lanzado a distancia cercana a ti. Este efecto no consume Reacciones.",
)

#ability-card(
  name: "Paso Espiritual",
  tags: ("Innata", "Espacial"),
  cost: "1 acción",
  desc: "Entras o sales del plano espiritual. Puedes llevar contigo a otras criaturas voluntarias o inconscientes que estén en contacto contigo.",
  empower: "Entras al plano espiritual para esquivar un ataque dirigido a ti. Esto consumirá una Reccción.",
)

==== Rango VI — Rango VI

#ability-card(
  name: "Despertar la Bestia",
  tags: ("Innata", "Transformación"),
  cost: "1 acción, 5 chi",
  duration: "6 rondas",
  desc: "Te transformas en un avatar primigenio de poder devastador. Obtienes +20 Vitalidad temporal y 6 contadores de escudo. Tus estadísticas físicas (FUE, DES, CON) suben a 12 y tu DEF sube a 20. Obtienes Inmunidad a efectos Mentales, de Miedo, Aflicciones y de Toque. Tu tamaño aumenta en un paso, tus ataques naturales infligen 1d10 de daño adicional y cuentan como material superior III. Obtienes también Velocidad de Vuelo 1 u otra característica similar. Mientras dure la transformación, las habilidades de Rango III o menos de un rango de tu elección no cuestan chi (salvo para empoderar).",
)
