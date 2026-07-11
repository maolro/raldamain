#import "../theme.typ": *

El Akhasa es la memoria cósmica del universo: el registro inmutable de todo cuanto ha ocurrido y todo cuanto puede ocurrir. Al conectarte con él, tu mente se expande más allá de los límites físicos, accediendo a fragmentos de conocimiento prohibido. Ves el pasado de quienes te rodean, anticipas los golpes antes de que ocurran y mueves los hilos del destino con sutileza quirúrgica. Sin embargo, ninguna mente mortal fue diseñada para soportar el peso de todo lo que es y ha sido: la cordura es el primer sacrificio.

#tip-box[
  *Poder innato:* Incrementa tu reserva de Chi por un valor igual a tu Rango x 2.
  *Estadística principal:* Inteligencia + Rango.
]

==== Rango I — Iniciado

#ability-card(
  name: "Vínculo Akhásico",
  tags: ("Innata", "Pasiva"),
  desc: "Puedes repetir un tiro (ataque, defensa o salvación) y quedarte con el mejor resultado. Usos diarios: Rango + 2.",
  empower: "Recuperas un uso gastado de esta habilidad.",
)

#ability-card(
  name: "Hipercognición",
  tags: ("Innata", "Pasiva"),
  desc: "Obtienes Resistencia a efectos Mentales. Aprendes cualquier idioma en 1 mes. Aprendes 2 hechizos (Mentales o Arcanos) de Rango I que usan INT y chi.",
)

==== Rango II — Adepto

_Pasiva: Incrementa tu estadística de INT y su limitador máximo en +1._

#ability-card(
  name: "Meditación Iluminada",
  tags: ("Innata", "Duradera"),
  cost: "3 acciones, 1 chi",
  duration: "Concentración",
  desc: "Entras en un estado de trance meditativo. Obtienes Ventaja en todos los tiros de INT e Inmunidad a ataques sorpresa.",
)

#ability-card(
  name: "Sentido Mágico",
  tags: ("Innata", "Pasiva"),
  range: "Medio",
  desc: "Detectas la posición y fuerza de criaturas y auras mágicas a distancia media. Al interactuar con un objeto o lugar mágico, identificas sus propiedades.",
)

==== Rango III — Profesional

_Pasiva: Aprendes 2 hechizos (Mentales o Arcanos) adicionales de Rango II o menos (usan Chi)._

#ability-card(
  name: "Forma Astral",
  tags: ("Innata", "Duradera"),
  cost: "3 acciones, 2 chi",
  range: "100m",
  duration: "Concentración",
  desc: "Proyectas un cuerpo astral incorpóreo con Vuelo 1 e Inmunidad a daño Físico y Elemental. Tu cuerpo físico queda inconsciente mientras mantengas la proyección. A Rango V, permite viajar a otros planos.",
)

#ability-card(
  name: "Psicomagia",
  tags: ("Innata", "Pasiva"),
  desc: "Puedes lanzar hechizos sin componentes verbales ni somáticos. Además, puedes reducir tu Cordura en 2 para recuperar 1 chi (máximo 3 veces por ronda).",
)

==== Rango IV — Experto

_Pasiva: Incrementa tu estadística de SAB y su limitador en +1._

#ability-card(
  name: "Abrir el Tercer Ojo",
  tags: ("Innata", "Pasiva"),
  desc: "Obtienes Inmunidad a Ilusiones, lo que te permite percibir seres invisibles y las formas verdaderas de cambiaformas. Obtienes Ventaja en tiros de Averiguar Intenciones.",
)

#ability-card(
  name: "Fortaleza del Pensamiento",
  tags: ("Innata", "Defensiva"),
  cost: "2 acciones, 2 chi",
  duration: "Indefinida",
  desc: "Obtienes contadores de escudo iguales a tu Rango y Resistencia a efectos Mentales y Arcanos. El efecto dura hasta que pierdas la concentración o todos los contadores de escudo.",
  empower: "Recuperas la mitad de tus contadores de escudo perdidos.",
)

==== Rango V — Maestro

_Pasiva: Aprendes 2 hechizos (Mentales o Arcanos) adicionales de Rango III o menos (usan Chi)._

#ability-card(
  name: "Palacio de la Mente",
  tags: ("Innata", "Pasiva"),
  desc: "Creas un demiplano mental impenetrable donde 1 minuto subjetivo equivale a 1 segundo en el mundo real. Esto te permite realizar acciones mentales extensas de forma prácticamente instantánea.",
)

#ability-card(
  name: "Mente Iluminada",
  tags: ("Innata", "Pasiva"),
  desc: "Obtienes Inmunidad a efectos Mentales y Omniglotismo (comprendes todos los idiomas). Usas tu mejor bonificador de magia para cualquier tiro de magia, independientemente de la escuela.",
)

==== Rango VI — Ascendido

_Pasiva: Incrementa tu estadística de CAR y su limitador en +1._

#ability-card(
  name: "Árbitro del Destino",
  tags: ("Innata", "Transformación"),
  cost: "3 acciones, 5 chi",
  duration: "6 Rondas",
  desc: "Te transformas en un avatar del destino. Obtienes +20 Vitalidad temporal, tus estadísticas mentales suben a 12 y tu DEF sube a 20. Se activa Fortaleza del Pensamiento automáticamente. Obtienes Ventaja en tiros Mentales y +1d6 daño Arcano a tus ataques. Los hechizos de Ascendencia no cuestan chi. Aprendes 6 hechizos nuevos de Rango IV o inferior.",
)
