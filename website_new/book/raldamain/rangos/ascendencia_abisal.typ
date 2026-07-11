#import "../theme.typ": *

La sangre abisal despierta en ti como un hambre que no puede saciarse. Canalizas el poder de entidades olvidadas que habitaron el mundo antes que los dioses actuales, transformando tu cuerpo y mente en algo que ya no es completamente humano. A medida que tu poder crece, tu apariencia cambia: cuernos, piel endurecida, ojos sin iris. El precio es tu cordura y humanidad, que se erosionan con cada uso del poder. Quienes dominan la Ascendencia Abisal son seres temidos por igual por sus enemigos y sus aliados.

#tip-box[
  *Poder innato:* Incrementa tu reserva de Chi por un valor igual a tu Rango x 2.
  *Modificador:* Carisma o Constitución + Rango.
  *Naturaleza Caótica:* Tus poderes provienen del abismo, lo que puede provocar locura o pérdida de control si se abusa de ellos.
]

==== Rango I — Iniciado

#ability-card(
  name: "Tocado por la Locura",
  tags: ("Innata", "Pasiva"),
  desc: "Obtienes Resistencia a efectos Mentales y Necróticos. Las criaturas abisales te reconocen como aliado. Adquieres una locura permanente.",
)

#ability-card(
  name: "Furia Abisal",
  tags: ("Innata", "Mejora"),
  duration: "6 Rondas",
  desc: "Entras en un estado de furia que te otorga Ventaja en tiros de ataque, defensa y magia. Dura hasta 6 rondas. Al terminar, sufres daño a la cordura igual al número de rondas transcurridas. Si tu cordura llega a 0, pierdes el control del personaje.",
)

==== Rango II — Adepto

_Pasiva: Incrementa tu estadística de FUE y su limitador máximo en 1._

#ability-card(
  name: "Mutación",
  tags: ("Innata", "Mejora"),
  cost: "1 chi",
  duration: "1 Ronda",
  desc: "Modificas tu cuerpo para obtener un beneficio a tu elección: Resistencia elemental, Anfibio, Vuelo, Arma Natural (1d6 daño, mejora con Rango), Toxina o Infusión mágica en ataques.",
)

#ability-card(
  name: "Poder Antinatural",
  tags: ("Innata", "Pasiva"),
  range: "Medio",
  desc: "Obtienes vista ciega y detectas magia a distancia media. Aprendes 2 hechizos abisales de Rango I que puedes lanzar gastando chi.",
)

==== Rango III — Profesional

#ability-card(
  name: "Abrazar la Locura",
  tags: ("Innata", "Pasiva"),
  desc: "Mientras estés en Furia Abisal, puedes reducir tu Cordura en 2 para recuperar 1 punto de chi. Puedes hacerlo un máximo de 3 veces por ronda.",
)

#ability-card(
  name: "Invocación Abisal",
  tags: ("Innata", "Invocación"),
  cost: "3 acciones, 2 chi",
  duration: "1 Hora",
  desc: "Invocas una criatura abisal con un Nivel máximo igual a Rango x 2. Puedes tener hasta 4 criaturas invocadas simultáneamente.",
  empower: "La criatura invocada recupera el 50% de su Vitalidad.",
)

==== Rango IV — Experto

_Pasiva: Incrementa tu estadística de CON y su limitador en +1. Aprendes 2 hechizos abisales de Rango II._

#ability-card(
  name: "Rasgo Monstruoso Superior",
  tags: ("Innata", "Pasiva"),
  desc: "Una de tus Mutaciones se vuelve permanente y no requiere coste para activarla.",
  empower: "Durante el combate, puedes cambiar tu mutación permanente por otra diferente (coste: 2 chi).",
)

#ability-card(
  name: "Paso Abisal",
  tags: ("Innata", "Espacial"),
  cost: "1 acción, 2 chi",
  duration: "Instantánea",
  desc: "Te teletransportas a través del vacío a cualquier punto del campo de batalla o a otro plano. Puedes usarlo como reacción (cuesta 1 Reacción) para evitar un ataque.",
)

==== Rango V — Maestro

#ability-card(
  name: "Aura del Caos",
  tags: ("Innata", "Pasiva"),
  range: "Corto",
  desc: "Obtienes Resistencia a efectos Arcanos y Divinos. Los objetos mágicos y glifos cercanos tienen un 50% de probabilidad de fallo.",
  empower: "Éxito automático en un tiro de salvación contra magia o contrarrestas un hechizo (pagando su coste en chi).",
)

#ability-card(
  name: "Corrupción Absoluta",
  tags: ("Innata", "Pasiva"),
  desc: "Obtienes Inmunidad a Miedo, Ilusiones y daño a la Cordura. Obtienes Resistencia a Aflicciones y Maldiciones. Las criaturas abisales menores te obedecen. Adquieres otra locura permanente.",
)

==== Rango VI — Ascendido

_Pasiva: Incrementa tu estadística de DES y su limitador en +1. Aprendes 2 hechizos abisales de Rango III._

#ability-card(
  name: "Transformación Abisal",
  tags: ("Innata", "Transformación"),
  duration: "6 Rondas",
  desc: "Te conviertes en un avatar del caos. Obtienes +20 Vitalidad temporal, tus estadísticas físicas suben a 12 y tu DEF sube a 20. Obtienes Inmunidad a efectos Mentales, de Miedo y Aflicciones. Tu tamaño aumenta en +1 y tus armas naturales infligen 1d10 daño. Conoces todas las técnicas marciales (Rango III gratis). La primera vez que lanzas un hechizo cada ronda no cuesta chi.",
)
