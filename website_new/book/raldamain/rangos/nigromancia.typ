#import "../theme.typ": *

La muerte no es el fin: es una transición. La Nigromancia domina ese umbral, manipulando la energía que queda en los cuerpos y el plano que habitan las almas que se niegan a cruzar. Los nigromantes levantan ejércitos de no-muertos que obedecen sin cuestionamientos, drenan la vitalidad de los vivos y transmiten enfermedades a través del espacio. Es la magia más temida y más prohibida del continente, y con razón: un nigromante sin escrúpulos puede acumular un ejército de los caídos de sus propios enemigos.

#tip-box[
  *Reserva de Chi:* Incrementa por Rango x 2.
  *Estadística principal:* Carisma + Rango (Deducido por fórmulas de daño).
  *Energía Negativa:* Tus hechizos suelen reducir la Vitalidad y PV máximos, impidiendo la sanación.
  *No-muertos:* Puedes levantar y controlar cadáveres para que luchen por ti o usarlos como conductos para tus hechizos.
]

==== Rango I — Rango I

#ability-card(
  name: "Toque Necrótico",
  tags: ("Nigromancia", "Toque", "Aflicción", "Necrótico"),
  cost: "1 acción",
  range: "Cuerpo a cuerpo",
  duration: "Instantáneo",
  crit: "El objetivo queda con Fatigado-2 hasta que se recupere.",
  desc: "Realizas un ataque de toque. El objetivo debe superar un tiro de salvación de CON o sufre 1d6 + Rango daño Necrótico. Además, reduce su Vitalidad y PV máximos (Aflicción nivel 1).",
  empower: "Aumenta el alcance a medio.",
)

#ability-card(
  name: "Descarga de Energía Negativa",
  tags: ("Nigromancia", "Ataque", "A Distancia", "Necrótico"),
  cost: "1 acción",
  range: "Medio",
  duration: "Instantáneo",
  crit: "El afectado queda con Fatigado-2 hasta que se recupere.",
  desc: "Lanzas un rayo de energía negativa a distancia. Inflige 1d6 + Rango daño Necrótico y reduce la Vitalidad y PV máximos del objetivo (Aflicción nivel 1).",
  empower: "Afecta a una criatura adicional a distancia media.",
)

#ability-card(
  name: "Bendición de la Muerte",
  tags: ("Nigromancia", "Pasiva"),
  desc: "Obtienes Resistencia a Aflicciones y efectos Necróticos, pero adquieres Vulnerabilidad a daño Radiante. Los no-muertos no son hostiles hacia ti. Si ya eres un no-muerto, pierdes la Vulnerabilidad a Radiante y en su lugar obtienes Resistencia a efectos Arcanos y Divinos.",
)

==== Rango II — Rango II

#ability-card(
  name: "Vínculo Parasítico",
  tags: ("Nigromancia", "Toque", "Maldición", "Duradera"),
  cost: "3 acciones, 1 chi",
  range: "Cuerpo a cuerpo",
  duration: "Concentración",
  desc: "Ligas tu vida a otra criatura (tiro de salvación de CON contra tu Nigromancia). Transfieres la mitad del daño que recibes a la criatura vinculada. Además, puedes lanzar hechizos de Toque a través del vínculo.",
  empower: "Transfieres Herido (permanente) o efecto negativo propio a la criatura vinculada.",
)

#ability-card(
  name: "Animar No-muerto",
  tags: ("Nigromancia", "Invocación"),
  cost: "3 acciones, 1 chi",
  range: "Medio",
  duration: "Permanente",
  desc: "Levantas un cadáver como Zombi o Esqueleto bajo tu control. Puedes controlar un máximo de Rango x 3 no-muertos simultáneamente. Puedes lanzar hechizos de Toque desde la posición de un no-muerto controlado o sacrificarlo para evitar daño que recibirías.",
  empower: "Animas dos no-muertos adicionales.",
)

#ability-card(
  name: "Maldición Vampírica",
  tags: ("Nigromancia", "Toque", "Maldición"),
  cost: "1 acción, 1 chi",
  range: "Toque",
  duration: "Hasta que sea eliminada",
  desc: "Marcas a un enemigo con una maldición vampírica (tiro de salvación de CON contra tu Nigromancia). Mientras la maldición persista, recuperas Vitalidad igual a la mitad del daño Necrótico que le inflijas.",
  empower: "Afecta a un objetivo adicional o reduce el nivel de Herido (permanente) o aflicción propia cada vez que lo hieres.",
)

==== Rango III — Rango III

_Pasiva: Todos tus hechizos de Nigromancia sustituyen sus dados de daño por d8._

#ability-card(
  name: "Aspecto de No-muerto",
  tags: ("Nigromancia", "Pasiva"),
  desc: "Adoptas rasgos de un tipo de no-muerto a tu elección. Ejemplos: veneno de Gul, toque de Momia, sugestión de Vampiro o defensas de Esqueleto o Zombi.",
)

#ability-card(
  name: "Tormenta de Energía Negativa",
  tags: ("Nigromancia", "Ataque", "Área", "Necrótico"),
  cost: "2 acciones, 2 chi",
  area: "Radio corto",
  duration: "Instantáneo",
  crit: "Los afectados quedan con Fatigado-2 hasta que se recuperen.",
  desc: "Liberas una explosión de energía negativa que inflige 2d8 + CAR daño Necrótico (mitad en caso de éxito en el tiro de salvación). Reduce la Vitalidad y PV máximos de los afectados. Los no-muertos aliados en el área se curan Rango + 2 Vitalidad en lugar de recibir daño.",
  empower: "Aumenta el área a radio medio.",
)

#ability-card(
  name: "Aura de Muerte",
  tags: ("Nigromancia", "Ambiental", "Duradera"),
  cost: "2 acciones, 2 chi",
  area: "Radio medio",
  duration: "Concentración",
  desc: "Generas un aura de energía negativa. Obtienes Ventaja en tiros de Nigromancia dentro del área. Los enemigos no pueden recibir sanación mientras permanezcan en ella. Cuenta como Tierra Consagrada para no-muertos.",
  empower: "Tu siguiente hechizo de Nigromancia cuesta -1 acción.",
)

==== Rango IV — Rango IV

#ability-card(
  name: "Crear no-muerto Superior",
  tags: ("Nigromancia", "Invocación"),
  cost: "3 acciones, 2 chi",
  range: "Medio",
  duration: "Permanente",
  desc: "Creas un no-muerto inteligente y poderoso con un Nivel máximo igual a Rango x 2. Puedes controlar un máximo de 1 no-muerto superior por Rango.",
  empower: "Animas un cadáver adicional como no-muerto superior.",
)

#ability-card(
  name: "Cadenas de la Muerte",
  tags: ("Nigromancia", "Duradera"),
  cost: "2 acciones, 2 chi",
  range: "Medio",
  duration: "Concentración",
  desc: "Estableces un vínculo con hasta 4 no-muertos bajo tu control. Puedes distribuir el daño que recibas entre los no-muertos vinculados.",
  empower: "Vinculas un no-muerto adicional.",
)

#ability-card(
  name: "Enervación",
  tags: ("Nigromancia", "Maldición", "Mejora"),
  cost: "2 chi",
  duration: "Hasta que sea eliminada",
  crit: "Aumenta el nivel del efecto un paso.",
  desc: "Al impactar con daño Necrótico, puedes maldecir al objetivo con Enervación. La maldición impide toda sanación y convierte los intentos de curación en daño. El efecto empeora con el paso de los días o al recibir daño adicional: Fatigado-1, Fatigado-3, Confundido-4 y finalmente Muerte (el cadáver se levanta como Zombi).",
  empower: "N/A",
)

==== Rango V — Rango V

_Pasiva: Todos tus hechizos de Nigromancia sustituyen sus dados de daño por d10._

#ability-card(
  name: "Toque de la Muerte",
  tags: ("Nigromancia", "Necrótico", "Toque"),
  cost: "1 acción, 3 chi",
  range: "Toque",
  duration: "Instantáneo",
  desc: "Corrompes el alma del objetivo (tiro de salvación de CON contra tu Nigromancia). Inflige 3d10 + CAR daño Necrótico y aplica Enervación. Si reduces al objetivo a 0 PV, se transforma instantáneamente en un no-muerto bajo tu control.",
  empower: "Afectas a una criatura adicional.",
)

#ability-card(
  name: "Alma Corrompida",
  tags: ("Nigromancia", "Pasiva"),
  desc: "Obtienes Inmunidad a daño Necrótico. El daño Necrótico que recibirías te cura en su lugar. Cuando caes a 0 PV o menos, sigues luchando hasta que tus PV negativos superen tu CAR.",
  empower: "N/A",
)

#ability-card(
  name: "Nube de Aniquilación",
  tags: ("Nigromancia", "Necrótico", "Gaseosa", "Duradera"),
  cost: "2 acciones, 3 chi",
  range: "Medio",
  area: "Esfera mediana",
  duration: "Concentración",
  crit: "Los afectados aumentan el nivel de Enervación un paso.",
  desc: "Creas una nube de energía negativa que otorga ocultamiento. Cada criatura que entre o empiece su turno dentro sufre 1d10 + CAR daño Necrótico y Enervación. Las criaturas que mueran dentro de la nube se levantan como no-muertos bajo tu control.",
  empower: "Aumenta el tamaño de la nube un paso o el daño a 2d10 + CAR.",
)

==== Rango VI — Rango VI

#ability-card(
  name: "Apocalipsis de la No-muerte",
  tags: ("Nigromancia", "Ambiental", "Ataque", "Área", "Duradera", "Necrótico"),
  cost: "3 acciones, 5 chi",
  area: "Radio grande",
  duration: "Siete rondas",
  crit: "Los afectados sufren maldición de Enervación.",
  desc: "Desatas un apocalipsis necrótico. El ataque inicial inflige 3d10 + CAR daño Necrótico (las criaturas reducidas a 0 PV se levantan como Zombis). Durante la sobrecarga: obtienes Ventaja en tiros de Nigromancia, los no-muertos aliados regeneran y obtienen mejoras, las criaturas que mueran reviven como Zombis al instante y los vivos sufren 1d10 + CAR daño Necrótico al inicio de cada turno.",
  empower: "N/A",
)
