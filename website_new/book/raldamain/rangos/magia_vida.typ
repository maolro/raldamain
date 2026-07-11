#import "../theme.typ": *

La vida no es simplemente ausencia de muerte: es una fuerza activa que fluye a través de todo ser viviente y puede ser canalizada, amplificada y dirigida por quienes aprenden a escucharla. La Magia de Vida domina la sanación en todas sus formas, desde cerrar heridas hasta purgar venenos y revertir daños imposibles para la medicina ordinaria. Pero la vida también puede ser un arma: la misma energía que cura puede quemar a los no-muertos y castigar a quienes pervierten la fuerza natural. Los maestros de este rango son los guardianes más preciados de cualquier grupo.

#tip-box[
  *Reserva de Chi:* Incrementa por Rango x 2.
  *Estadística principal:* Sabiduría + Rango.
  *Fuerza vital:* La potencia depende del entorno (Ventaja/Desventaja según flujo de energía).
  *Defensa vital:* Usas Magia de Vida para tiros defensivos y salvaciones contra Vida, Sombría, Muerte y Fuego.
]

==== Rango I — Iniciado

#ability-card(
  name: "Toque Sanador",
  tags: ("Vida", "Sanación", "Toque"),
  cost: "1 acción",
  range: "Toque",
  duration: "Instantánea",
  desc: "Tocas a un aliado y le sanas Vitalidad igual a Rango + 2. Alternativamente, puedes reducir el nivel de una Aflicción un paso en lugar de curar Vitalidad.",
  empower: "Cura Herido-1 (permanente) o una Aflicción en fase 1.",
)

#ability-card(
  name: "Rayo de Luz",
  tags: ("Vida", "Ataque", "A Distancia", "Radiante"),
  cost: "1 acción",
  range: "Medio",
  duration: "Instantánea",
  crit: "El objetivo queda con Confundido-1 durante una ronda.",
  desc: "Lanzas un rayo de luz que inflige 1d6 + Rango daño Radiante. A distancia corta, el ataque no puede ser esquivado.",
  empower: "Realizas un ataque adicional contra un objetivo distinto.",
)

#ability-card(
  name: "Halo Cegador",
  tags: ("Vida", "Visual", "Área", "Radiante"),
  cost: "2 acciones, 1 chi",
  area: "Radio corto",
  duration: "Instantánea",
  crit: "Los objetivos quedan con Confundido-2 hasta que reciban sanación.",
  desc: "Emites una explosión de luz cegadora. Los enemigos en el área deben superar un tiro de salvación de CON o sufren 1d6 + Rango daño Radiante y quedan con Confundido-1 durante 1 ronda. Disipa hechizos Sombríos activos en el área.",
  empower: "El brillo persiste 1 ronda, lo que otorga Desventaja en tiros de ataque contra ti y ciega a quien se acerque.",
)

==== Rango II — Adepto

#ability-card(
  name: "Vínculo Vital",
  tags: ("Vida", "Sanación", "Toque", "Duradero"),
  cost: "3 acciones, 1 chi",
  range: "Toque",
  duration: "Concentración",
  desc: "Creas un enlace vital con un aliado. Como reacción, puedes absorber la mitad del daño que reciba el aliado vinculado. Además, puedes lanzarle hechizos de sanación a distancia mientras el vínculo persista.",
  empower: "Lanzas Toque Sanador al aliado vinculado como acción bonus.",
)

#ability-card(
  name: "Barrera Luminosa",
  tags: ("Vida", "Defensiva", "Duradera", "Radiante"),
  cost: "1 acción, 1 chi",
  range: "Medio",
  area: "Esfera pequeña o línea media",
  duration: "Concentración",
  crit: "Los objetivos quedan con Confundido-2 hasta recibir curación.",
  desc: "Creas un muro de luz sólida que bloquea ataques a distancia. Las criaturas que intenten cruzarlo sufren 1d6 + Rango daño Radiante y quedan con Confundido-1. Puede desplegarse como reacción para uso defensivo.",
  empower: "La barrera daña a las criaturas cercanas como si intentaran cruzarla.",
)

#ability-card(
  name: "Arma Solar",
  tags: ("Vida", "Ataque", "Radiante", "Duradera"),
  cost: "2 acciones, 1 chi",
  area: "Línea mediana",
  duration: "Concentración",
  crit: "El objetivo queda con Confundido-1 durante una ronda.",
  desc: "Creas un arma de luz pura con un ataque inicial en línea que inflige 1d6 + CAR daño Radiante. Mientras el hechizo persista, puedes atacar como acción (1d6 + CAR daño Radiante a distancia media).",
  empower: "Realizas un ataque adicional contra un objetivo diferente.",
)

==== Rango III — Profesional

_Pasiva: Todos los dados de daño de Vida pasan a ser d8._

#ability-card(
  name: "Luz Viviente",
  tags: ("Vida", "Defensiva", "Duradera"),
  cost: "2 acciones, 2 chi",
  duration: "Concentración",
  desc: "Tu cuerpo irradia luz viviente. Tu Velocidad aumenta en +1 y puedes usar una Reacción defensiva adicional por ronda. Obtienes Ventaja en tiros de Esquiva usando Magia de Vida.",
  empower: "Evasión: reduces el daño recibido a la mitad, desenganchas y te mueves 1 paso.",
)

#ability-card(
  name: "Sanación Superior",
  tags: ("Vida", "Curación", "Toque"),
  cost: "1 acción, 2 chi",
  range: "Cuerpo a cuerpo",
  duration: "Instantáneo",
  desc: "Curas Vitalidad y PV iguales a Rango + 2. Además, puedes reducir Herido (permanente) 2 pasos o eliminar completamente una Aflicción o Maldición.",
  empower: "Puedes lanzarlo como acción bonus sobre ti mismo o afectar a un objetivo adicional.",
)

#ability-card(
  name: "Telaraña de Vida",
  tags: ("Vida", "Curación", "Ambiental"),
  cost: "2 acciones, 2 chi",
  area: "Radio medio",
  duration: "Concentración",
  desc: "Generas una red de energía vital en el área. Obtienes Ventaja en tiros de Vida y vista ciega para detectar criaturas vivas. Tus hechizos de sanación curan +2 adicional y su alcance aumenta a corto.",
  empower: "Lanzas un hechizo de Sanación como acción bonus.",
)

==== Rango IV — Experto

#ability-card(
  name: "Espadas de Justicia",
  tags: ("Vida", "Defensiva", "Duradera"),
  cost: "2 acciones, 2 chi",
  duration: "Concentración",
  desc: "Invocas espadas de luz que te protegen. Obtienes contadores de escudo iguales a tu Rango. Mientras el hechizo persista, puedes lanzar Rayo de Luz o Toque Sanador como acción bonus a distancia media.",
  empower: "Repones un contador de escudo perdido.",
)

#ability-card(
  name: "Transferencia Vital",
  tags: ("Vida", "Curación", "Toque", "Duradera"),
  cost: "3 acciones, 2 chi",
  range: "Toque",
  duration: "Una hora",
  desc: "Vinculas a 2 aliados contigo. El daño recibido por cualquiera de los vinculados se reparte entre todos (ignora resistencias). La sanación recibida puede compartirse a voluntad entre los vinculados.",
  empower: "Tu siguiente sanación afecta a todos los vinculados.",
)

#ability-card(
  name: "Castigo Celestial",
  tags: ("Vida", "Ataque", "Área", "Radiante"),
  cost: "1 acción, 2 chi",
  area: "Línea Mediana",
  duration: "Instantáneo",
  crit: "El objetivo sufre quemadura media y queda con Confundido-1 durante 1 ronda.",
  desc: "Desatas un rayo devastador de luz que inflige 2d8 + CAR daño Radiante e inflige quemadura leve. A distancia corta, el ataque no puede ser esquivado.",
  empower: "Realizas un segundo ataque en una dirección diferente.",
)

==== Rango V — Maestro

_Pasiva: Todos los dados de daño de Vida pasan a ser d10._

#ability-card(
  name: "Explosión Solar",
  tags: ("Vida", "Ataque", "Área", "Sanación", "Visual"),
  cost: "2 acciones, 3 chi",
  area: "Esfera mediana",
  duration: "Instantáneo",
  crit: "Los objetivos sufren quemadura media y quedan con Confundido-1 durante 1 ronda.",
  desc: "Liberas una explosión de energía solar que inflige 2d10 + CAR daño Radiante e inflige quemadura media a los enemigos. Los aliados vinculados en el área se curan Rango + 2 Vitalidad y reducen su Herido (permanente) un nivel.",
  empower: "Aumenta el radio un paso y permite seleccionar objetivos individuales para daño o curación.",
)

#ability-card(
  name: "Milagro de Sanación",
  tags: ("Vida", "Sanación", "Toque"),
  cost: "1 acción, 3 chi",
  range: "Toque",
  duration: "Instantáneo",
  desc: "Restauras toda la Vitalidad del objetivo y Rango + 2 PV. Eliminas todo el Herido (permanente) y aflicciones. Puede resucitar a una criatura muerta hace menos de 1 hora.",
  empower: "Puedes lanzarlo sobre ti mismo como acción bonus.",
)

#ability-card(
  name: "Sello de Regeneración",
  tags: ("Vida", "Curación", "Toque", "Duradero"),
  cost: "2 acciones, 3 chi",
  range: "Toque",
  duration: "Seis rondas",
  desc: "Colocas un sello de regeneración sobre el objetivo. Al inicio de cada turno, el objetivo recupera Rango + 2 Vitalidad y reduce Herido (permanente) o aflicción un paso.",
  empower: "El objetivo regenera el doble esta ronda.",
)

==== Rango VI — Ascendido

_Pasiva: Hechizos de Vida de Rango IV cuestan -1 acción._

#ability-card(
  name: "Fuente de toda la vida",
  tags: ("Vida", "Ambiental", "Ataque", "Área", "Sostenida", "Radiante"),
  cost: "3 acciones, 5 chi",
  area: "Radio grande",
  duration: "Siete rondas",
  crit: "Los objetivos quedan con Confundido-1 durante una ronda.",
  desc: "Desatas una fuente de energía vital pura. El ataque inicial inflige 3d10 + CAR daño Radiante. Durante la sobrecarga: obtienes Ventaja en tiros de Vida, las criaturas vivas aliadas recuperan Rango + 2 Vitalidad al inicio de cada turno, las criaturas que mueran resucitan inmediatamente a 1 PV (una vez) y los no-muertos y criaturas malignas sufren daño continuo.",
  empower: "N/A",
)
