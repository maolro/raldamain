#import "../theme.typ": *

Una voz del más allá conoce tu nombre y te ofrece un trato sin precio visible. La Ascendencia Infernal no es solo poder: es una transformación fundamental de lo que eres, reescribiendo tu cuerpo con la esencia de los señores de la Sima. Tu piel endurece, tus ojos arden, y adquieres una presencia que fascina y aterra a partes iguales. A medida que progresas, la línea entre tú y la entidad que te otorgó el poder se vuelve cada vez más difusa. Los que dominan esta ascendencia pueden desatar ejércitos infernales, pagando cada vez más de su humanidad.

#tip-box[
  *Poder innato:* Tu rango mejora las reservas de chi en Rango x 2. Se acumula con otras habilidades.
  *Estadística principal:* Inteligencia o Carisma + Rango.
  *Hechizos Innatos:* Los hechizos aprendidos son Innatos y pueden usar tu modificador de Ascendencia Infernal y estadística (INT/CAR) para daño y efectos.
]

==== Rango I — Rango I

#ability-card(
  name: "Resistencias Infernales",
  tags: ("Innata", "Pasiva"),
  desc: "El poder infernal muta tu cuerpo. Obtienes Resistencia a efectos Mentales, Aflicciones, daño de Fuego y de Frío. Las criaturas infernales son amistosas hacia ti.",
)

#ability-card(
  name: "Pacto del Diablo",
  tags: ("Innata", "Pasiva"),
  desc: "Estableces un pacto con fuerzas infernales. Aprendes dos hechizos de Rango I (Arcana, Elemental u Ocultismo) relacionados con tu patrón. Usan chi y tu bonificador de CAR + Rango. [AVISO AUTOR: La descripción original dice 'Usan chi en lugar de chi', lo cual es redundante. Verificar si debería decir 'usan chi en lugar de otra reserva'.]",
)

==== Rango II — Rango II

_Pasiva: Aumenta tu estadística de CAR y su limitador por 1._

#ability-card(
  name: "Arma Profana",
  tags: ("Innata", "Mejora", "Maldición"),
  cost: "1 chi",
  duration: "Una ronda",
  desc: "Tu siguiente impacto causa una herida infernal: reduce la Vitalidad y PV máximos del objetivo en una cantidad igual al daño infligido y aplica Herido-1 (permanente). Solo puede curarse con Magia de Vida potente.",
  empower: "N/A",
)

#ability-card(
  name: "Visión Infernal",
  tags: ("Innata", "Pasiva"),
  desc: "Puedes ver con normalidad en oscuridad mágica y no mágica. Detectas seres inteligentes a distancia media. Tus hechizos Mentales tratan las resistencias enemigas como un paso inferior.",
)

==== Rango III — Rango III

_Pasiva: Aprendes dos hechizos de Rango II o menos relacionados con tu patrón (puedes usar chi)._

#ability-card(
  name: "Alas Demoníacas",
  tags: ("Innata", "Pasiva"),
  desc: "Manifiestas alas de murciélago. Obtienes Vuelo 2 y Ventaja en tiros de Esquiva. Como acción bonus, puedes hacer aparecer o desaparecer las alas. Si pierdes la concentración, las alas se desvanecen durante 1 ronda.",
  empower: "N/A",
)

#ability-card(
  name: "Siervos del Contrato",
  tags: ("Innata", "Invocación"),
  cost: "3 acciones, 2 chi",
  duration: "Una hora",
  desc: "Invocas una criatura infernal con un Nivel máximo igual a Rango x 2. Puedes tener hasta 4 invocaciones simultáneas.",
  empower: "La criatura invocada recupera la mitad de su Vitalidad.",
)

==== Rango IV — Rango IV

_Pasiva: Aumenta tu estadística de INT y su limitador por 1._

#ability-card(
  name: "Presencia Majestuosa",
  tags: ("Innata", "Miedo", "Duradera"),
  cost: "1 acción, 2 chi",
  duration: "Concentración",
  desc: "Obtienes Ventaja en todos los tiros de Carisma. Tus hechizos Mentales son indetectables e ignoran las resistencias de criaturas que no sean hostiles hacia ti.",
  empower: "N/A",
)

#ability-card(
  name: "Cadenas del Contrato",
  tags: ("Innata", "Mejora"),
  cost: "3 acciones, 2 chi",
  desc: "Estableces un vínculo vital voluntario con hasta 2 criaturas. Cualquier cantidad de daño recibido por un vinculado puede transferirse a otro vinculado.",
)

==== Rango V — Rango V

_Pasiva: Aprendes dos hechizos de Rango III o menos relacionados con tu patrón (puedes usar chi)._

#ability-card(
  name: "Corrupción Demoníaca",
  tags: ("Innata", "Pasiva"),
  desc: "Obtienes Resistencia a efectos Arcanos y Divinos. Obtienes Resistencia Superior a efectos Mentales, Aflicciones, daño de Fuego, Hielo y efectos de Miedo. Puedes comunicarte con criaturas infernales (las menores te obedecen).",
  empower: "N/A",
)

#ability-card(
  name: "Puertas del Infierno",
  tags: ("Innata", "Divina", "Ambiental", "Espacial"),
  cost: "3 acciones, 3 chi",
  area: "Radio grande",
  duration: "6 rondas",
  desc: "Abres un portal al infierno que crea Tierra Consagrada Infernal en el área. Impide la sanación enemiga dentro del área. Los enemigos deben superar un tiro de salvación de Voluntad cada ronda o aumentan su nivel de Miedo. Puedes usar Siervos del Contrato como acción bonus (máximo 10 invocaciones simultáneas).",
)

==== Rango VI — Rango VI

_Pasiva: Incrementa tu CON por 1._

#ability-card(
  name: "Señor de la Sima",
  tags: ("Innata", "Mejora"),
  cost: "3 acciones, 5 chi",
  duration: "Seis rondas",
  desc: "Te transformas en un Señor de la Sima. Obtienes +20 Vitalidad temporal, FUE/CON/CAR suben a 12 y DEF sube a 20. Obtienes Inmunidad a efectos Mentales, Aflicciones, de Miedo y de Toque. Tus ataques aplican el efecto de Arma Profana. Obtienes Vuelo 2, 6 contadores de escudo, los hechizos de Ascendencia no cuestan chi y Presencia Majestuosa se activa automáticamente.",
)
