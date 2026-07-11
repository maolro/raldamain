#import "../theme.typ": *

El poder de la Hueste Celestial desciende sobre ti como luz que no puede ser sofocada. No eres un dios, pero eres su eco en el mundo mortal: un faro de curación y destrucción en igual medida. Tu cuerpo se transforma con el paso del tiempo, desarrollando rasgos angélicos mientras tu presencia irradia una autoridad que hace retroceder a los no-muertos. Con la Ascendencia Celestial aprendes que la gracia y la furia son la misma moneda: las criaturas del mal se deshacen ante ti como cera ante la llama.

#tip-box[
  *Poder innato:* Incrementa tu reserva de Chi por un valor igual a tu Rango x 2.
  *Modificador:* Sabiduría o Carisma + Rango.
  *Precio de Ascensión:* Muchas habilidades en este rango reducirán tu Vitalidad máxima. Esto significa que tu valor de Vitalidad máximo bajará por dicha cantidad pero NO te hará daño ni repercutirá en tu Vitalidad actual. Todas las reducciones se recuperarán tras un descanso largo y no pueden eliminarse con otros efectos.
]

==== Rango I — Iniciado

#ability-card(
  name: "Nacido del cielo",
  tags: ("Innata", "Pasiva"),
  desc: "Obtienes Resistencia a efectos Radiantes. Las criaturas celestiales te reconocen como aliado.",
)

#ability-card(
  name: "Canalización Celestial",
  tags: ("Innata", "Mejora"),
  cost: "1 acción",
  duration: "Hasta 6 Rondas",
  desc: "Obtienes Ventaja en tiros de ataque, defensa, habilidad y salvación. El efecto dura hasta 6 rondas. Al terminar, tu Vitalidad máxima se reduce en 2 por cada ronda activa. Si esta reducción te llevaría a menos de 0 Vitalidad, caes inconsciente.",
)

==== Rango II — Adepto

_Pasiva: Incrementa tu estadística de CAR y su limitador máximo en +1._

#ability-card(
  name: "Golpe Trascendente",
  tags: ("Innata", "Mejora"),
  cost: "1 chi",
  duration: "1 Ronda",
  desc: "Durante esta ronda, tus ataques físicos cuentan como mágicos. Además, al impactar puedes reducir tu chi en 2 para aumentar el daño en un valor igual a tu Rango + 1 (máximo una vez por ataque).",
)

#ability-card(
  name: "Sentido Vital",
  tags: ("Innata", "Pasiva"),
  desc: "Obtienes vista ciega a distancia media y puedes identificar la magia lanzada a esa misma distancia.",
)

#ability-card(
  name: "Cuerpo Puro",
  tags: ("Innata", "Pasiva"),
  desc: "Al activar Canalización Celestial, obtienes PV temporales iguales a Rango x 5 y tu Defensa aumenta en un valor igual a Rango + 1.",
  empower: "Repites un tiro de muerte y te quedas con el mejor resultado.",
)

==== Rango III — Profesional

#ability-card(
  name: "Ángel Protector",
  tags: ("Innata", "Invocación"),
  cost: "3 acciones, 2 chi",
  duration: "1 Hora",
  desc: "Invocas un celestial con un Nivel máximo igual a Rango x 2. Puedes tener hasta 4 criaturas invocadas simultáneamente.",
  empower: "La criatura invocada recupera el 50% de su Vitalidad.",
)

#ability-card(
  name: "Alma Indomable",
  tags: ("Innata", "Defensiva"),
  cost: "1 chi",
  desc: "Como reacción, obtienes éxito automático en un tiro de salvación contra un efecto de cualquier tipo. Tu Vitalidad máxima se reduce en 2. No funciona contra habilidades míticas.",
)

==== Rango IV — Experto

_Pasiva: Incrementa tu estadística de CON y su limitador en +1._

#ability-card(
  name: "Alas Angelicales",
  tags: ("Innata", "Pasiva"),
  desc: "Mientras Canalización Celestial esté activa, obtienes velocidad de vuelo 2 y Ventaja en tiros de Esquiva.",
)

#ability-card(
  name: "Visión Verdadera",
  tags: ("Innata", "Pasiva"),
  desc: "Obtienes Inmunidad a Ilusiones, lo que te permite percibir a seres invisibles y las formas verdaderas de seres cambiaformas. También obtienes Resistencia a efectos Mentales y Ventaja en tiros de Averiguar Intenciones.",
)

==== Rango V — Maestro

_Pasiva: Aprendes los hechizos 'Sanación superior' y 'Luz viviente' (usan Chi)._

#ability-card(
  name: "Regeneración Celestial",
  tags: ("Innata", "Pasiva"),
  desc: "Al inicio de tu turno, recuperas Rango + 2 Vitalidad y reduces Herido (permanente) o aflicción un paso. Este efecto se anula durante 1 ronda si recibes daño de material anti-celestial.",
  empower: "Reduces el nivel de Herido (permanente) o aflicción adicional.",
)

#ability-card(
  name: "Alma Ascendida",
  tags: ("Innata", "Pasiva"),
  desc: "Obtienes Resistencia a efectos Arcanos y Divinos. Obtienes Resistencia Superior a Aflicciones, daño Necrótico, Radiante y efectos de Miedo. Puedes comunicarte con cualquier celestial.",
)

==== Rango VI — Ascendido

_Pasiva: Incrementa tu estadística de SAB y su limitador en +1._

#ability-card(
  name: "Ángel Vengador",
  tags: ("Innata", "Transformación"),
  cost: "3 acciones, 5 chi",
  duration: "6 Rondas",
  desc: "Te transformas en un avatar celestial vengador. Obtienes +20 Vitalidad temporal, FUE/CON/CAR suben a 12 y DEF sube a 20. Obtienes Inmunidad a efectos Mentales, de Miedo, Aflicciones y de Toque. Tu tamaño aumenta en un paso, recibes Velocidad de Vuelo 2. Tus habilidades de Sanación curan el doble y tus ataques físicos y mágicos reciben un dado de daño adicional.",
)
