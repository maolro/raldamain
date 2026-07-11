#import "../theme.typ": *

La Evocación es el arte de convertir chi en destrucción pura. Sin necesitar un elemento específico, el evocador moldea la energía mágica en formas que queman, fragmentan y aplanan en ráfagas que no discriminan entre objetivo y entorno. Es el rango mágico más directo y más peligroso: en manos expertas, un solo hechizo de Evocación puede terminar una batalla. Requiere también la mayor concentración de todos los rangos arcanos, pues la energía liberada no distingue amigo de enemigo si la mente que la dirige vacila.

#tip-box[
  *Reserva de Chi:* Incrementa por Rango x 2.
  *Estadística principal:* Inteligencia + Rango.
  *Equilibrio elemental:* Tus hechizos elementales se ven afectados por el entorno igual que su rama base.
  *Parada mágica:* Usas Magia de Evocación para tiros de parada y salvaciones contra Fuego, Frío, Radiante, Madera, Tierra o Agua.
]

==== Rango I — Rango I

#ability-card(
  name: "Rayo Arcano",
  tags: ("Evocación", "Arcano", "Ataque", "A distancia"),
  cost: "1 acción",
  range: "Medio",
  duration: "Instantáneo",
  crit: "Objetivo sufre Herido-1 (permanente).",
  desc: "Lanzas un rayo de energía que inflige 1d6 + Rango Arcano de daño. No es esquivable a distancia corta.",
  empower: "Ataca a un objetivo adicional.",
)

#ability-card(
  name: "Especialidad Arcana",
  tags: ("Evocación", "Pasiva"),
  desc: "Eliges una especialidad (Flujo, Energía, Antienergía, Materia o Electromagnetismo). La especialidad otorga resistencias elementales específicas y acceso a aprender hechizos de esas ramas a mayor rango.",
)

#ability-card(
  name: "Descarga de Energía",
  tags: ("Evocación", "Arcano", "Ataque", "Área"),
  cost: "2 acciones, 1 chi",
  area: "Cono pequeño",
  duration: "Instantáneo",
  crit: "Afectados sufren Herido-1 (permanente).",
  desc: "Proyectas un cono de energía que inflige 1d6 + INT Arcano de daño. Las criaturas que eviten el ataque reciben la mitad de daño.",
  empower: "Aumenta el tamaño a cono mediano.",
)

==== Rango II — Rango II

_Pasiva: Aprendes dos hechizos de Rango I de tu Especialidad Arcana._

#ability-card(
  name: "Muro de Energía",
  tags: ("Evocación", "Arcano", "Defensivo", "Duradero"),
  cost: "1 acción, 1 chi",
  range: "Medio",
  area: "Línea mediana o esfera pequeña",
  duration: "Concentración",
  desc: "Creas una barrera con PV iguales a Rango x 3. Es inmune a daño físico no mágico y bloquea ataques a distancia y de área. Cruzar la barrera inflige 1d6 + INT de daño. Puedes crearla como reacción para uso defensivo.",
  empower: "Recuperas todos los PV del muro (solo si tiene al menos 1 PV restante).",
)

#ability-card(
  name: "Infundir Arma",
  tags: ("Evocación", "Arcano", "Mejora", "Toque", "Duradero"),
  cost: "3 acciones, 1 chi",
  range: "Cuerpo a cuerpo",
  duration: "Una hora",
  desc: "El arma tocada cuenta como Arcana y otorga +1 chi a su portador. Como acción bonus, el portador puede infundir un ataque con un hechizo conocido, pagando su coste +1 chi adicional.",
  empower: "Aumenta la reserva del portador en 1 chi adicional.",
)

==== Rango III — Rango III

_Pasiva: Tus hechizos de Evocación convierten daño a d8. Rango I cuesta -1 acción. Aprendes dos hechizos de Rango II de tu Especialidad._

#ability-card(
  name: "Meteoros de Chi",
  tags: ("Evocación", "Arcano", "Duradero", "Defensivo"),
  cost: "2 acciones, 2 chi",
  duration: "Concentración",
  desc: "Obtienes contadores de escudo iguales a tu Rango. Mientras dure, puedes lanzar Rayo Arcano como acción bonus una vez por ronda.",
  empower: "Recuperas la mitad de tus contadores de escudo (solo si te queda al menos uno).",
)

#ability-card(
  name: "Combinar Hechizos",
  tags: ("Pasiva", "Evocación", "Arcano", "Mejora"),
  cost: "2 chi",
  desc: "Fusionas dos hechizos en un solo lanzamiento. Lanzas el segundo como acción bonus tras el primero, pagando ambos costes. Si ambos son ataques, sus daños y efectos se combinan en un solo impacto.",
  empower: "N/A",
)

==== Rango IV — Rango IV

_Pasiva: Hechizos Rango II cuestan -1 acción. Aprendes dos hechizos de Rango III de tu Especialidad._

#ability-card(
  name: "Rayo Desintegrador",
  tags: ("Evocación", "Arcano", "Ataque", "A distancia"),
  cost: "2 acciones, 2 chi",
  range: "Medio",
  duration: "Instantáneo",
  crit: "Objetivo sufre Herido-2 (permanente).",
  desc: "Inflige 2d8 + INT Arcano de daño y Herido-1. Destruye 1 contador de escudo y rompe la armadura del objetivo. Si el objetivo es reducido a 0 PV, queda desintegrado (muerte instantánea).",
  empower: "Ataca a un objetivo adicional.",
)

#ability-card(
  name: "Irradiación de Chi",
  tags: ("Evocación", "Arcano", "Ambiental"),
  cost: "2 acciones, 2 chi",
  area: "Radio grande",
  duration: "Seis rondas",
  desc: "Obtienes Ventaja en Arcana y +1d6 de daño Arcano adicional. Los hechizos y objetos arcanos de otros tienen un 25% de probabilidad de fallar (o deben pagar +1 chi para evitarlo).",
  empower: "La probabilidad de fallo aumenta a 50% esta ronda.",
)

==== Rango V — Rango V

_Pasiva: Tus hechizos de Evocación convierten daño a d10. Rango III cuesta -1 acción. Aprendes dos hechizos de Rango IV de tu Especialidad._

#ability-card(
  name: "Cañón de Chi",
  tags: ("Evocación", "Arcano", "Ataque", "Área"),
  cost: "2 acciones, 3 chi",
  range: "Medio",
  area: "Radio medio",
  duration: "Instantáneo",
  crit: "Afectados sufren Herido-2 (permanente).",
  desc: "Explosión masiva que inflige 2d10 + INT Arcano de daño y Herido-1. Ignora barreras mágicas, destruye 1 contador de escudo y rompe objetos no artefactos.",
  empower: "Aumenta el radio a grande o realiza otro ataque en un lugar diferente.",
)

#ability-card(
  name: "Maestro Elemental",
  tags: ("Evocación", "Pasiva"),
  desc: "Aprendes 2 Especialidades arcanas adicionales. Tras un descanso largo, puedes intercambiar hechizos conocidos por otros de una rama elemental diferente.",
  empower: "N/A",
)

==== Rango VI — Rango VI

_Pasiva: Aprendes dos hechizos de Rango V de cualquier magia elemental._

#ability-card(
  name: "Aniquilación Mágica",
  tags: ("Evocación", "Arcano", "Ataque", "Área"),
  cost: "3 acciones, 5 chi",
  area: "Radio grande",
  duration: "Instantáneo",
  crit: "Muerte instantánea (sin Resistencia Arcana) o Herido-3.",
  desc: "Inflige 4d10 + INT Arcano de daño y Herido-2. Destruye todas las barreras, contadores de escudo y objetos no mágicos en el área. Rompe objetos mágicos. Al resolverse, deja una zona de Irradiación de Chi.",
  empower: "N/A",
)
