#import "../theme.typ": *

Los dioses no solo bendicen a sus sacerdotes: también empuñan su poder a través de guerreros, héroes y cruzados que llevan su voluntad a los rincones más oscuros del mundo. El Guerrero Divino no reza: actúa. Su fe se manifiesta en acero, en milagros menores que doblan el curso de las batallas y en una presencia que infunde esperanza en sus aliados y terror en sus enemigos. Con el tiempo, el poder divino impregna cada aspecto de su combate hasta convertirlo en un santo viviente: una extensión de la voluntad de su dios en el mundo mortal.

#tip-box[
  *Reserva de Chi:* Incrementa por Rango x 2.
  *Estadística principal:* Tu modificador de Guerrero Divino será igual a la suma de tu estadística de Carisma y tu rango en esta habilidad.
  *Conocimiento de los dioses:* Canalizas una pequeña porción de los poderes de tu dios. Cada dios tiene magias relacionadas que podrás aprender a rangos superiores.
]

==== Rango I — Rango I

#ability-card(
  name: "Azote Divino",
  tags: ("Divina", "Mejora"),
  cost: "1 chi",
  duration: "Una ronda",
  desc: "Empoderas tu siguiente ataque físico con energía divina. Al impactar, inflige 1d6 daño adicional (tipo según tu dios). El daño aumenta a 2d6 a Rango III y a 3d6 a Rango VI. Alternativamente, puedes infundir un ataque con un hechizo que conozcas como acción bonus.",
  empower: "Extiende el efecto una ronda adicional, permitiéndote repetirlo en tu siguiente impacto sin coste.",
)

#ability-card(
  name: "Sentido Divino",
  tags: ("Divina", "Pasiva"),
  desc: "Detectas la posición de no-muertos, criaturas extraplanarias y presencias mágicas o divinas a distancia media. Identificas su fuerza aproximada y tipo.",
)

#ability-card(
  name: "Canalizar Divinidad",
  tags: ("Divina", "Pasiva"),
  desc: "Aprendes dos hechizos de Rango I de una rama vinculada a tu dios. Usas tu bonificador de Guerrero Divino y CAR para lanzarlos y puedes pagar su coste con chi.",
)

==== Rango II — Rango II

#ability-card(
  name: "Guerrero de la Fe",
  tags: ("Divina", "Pasiva"),
  duration: "6 Rondas",
  desc: "Obtienes Ventaja en tiros de ataque y defensa con armas y hechizos relacionados con tu dios, y Resistencia a efectos de Miedo y Mentales. Al terminar, pierdes chi igual al número de rondas activas (si no puedes pagar, quedas con Fatigado-3 o Inconsciente).",
)

#ability-card(
  name: "Plegaria de Batalla",
  tags: ("Divina", "Ritual"),
  desc: "Durante un descanso corto, rezas junto a tus aliados. Los participantes obtienen 3 usos de Milagro Menor que persisten hasta ser gastados o hasta que pase un día.",
)

#ability-card(
  name: "Impacto Desacralizador",
  tags: ("Divina", "Mejora"),
  cost: "1 chi",
  crit: "Eliminas todos los hechizos Arcanos y Divinos activos del objetivo.",
  desc: "Al impactar, puedes intentar eliminar un efecto Arcano o Divino activo del objetivo (tiro enfrentado). También puedes anular una habilidad pasiva del objetivo durante una ronda.",
  empower: "Eliminas un hechizo adicional o la anulación de habilidad pasiva dura una ronda más.",
)

==== Rango III — Rango III

_Pasiva: Aprendes dos hechizos de Rango II de tu dios (puedes usar chi)._

#ability-card(
  name: "Presencia Divina",
  tags: ("Divina", "Duradera", "Moral", "Miedo", "Visual"),
  cost: "2 acciones, 2 chi",
  area: "Radio medio",
  duration: "Concentración",
  desc: "Irradias una presencia sobrecogedora. Los enemigos a distancia media deben superar un tiro de Voluntad o Intimidar o sufren Miedo. Los aliados en el área obtienen Resistencia a efectos de Miedo y Mentales.",
  empower: "Un aliado recupera Vitalidad igual a Rango + 2 o cancelas un efecto de Moral enemiga sobre él.",
)

#ability-card(
  name: "Aura Protectora",
  tags: ("Divina", "Pasiva"),
  desc: "Obtienes Resistencia a efectos Arcanos y Divinos. Puedes gastar chi (igual al coste del hechizo del lanzador) para convertir un fallo en un tiro de salvación contra un hechizo en éxito.",
)

==== Rango IV — Rango IV

#ability-card(
  name: "Hueste Divina",
  tags: ("Divina", "Mejora", "Duradera"),
  cost: "2 acciones, 2 chi",
  area: "Radio medio",
  duration: "Concentración",
  desc: "Los aliados en el área obtienen Ventaja en tiros de ataque y defensa con armas y hechizos relacionados con tu dios.",
  empower: "Un aliado recupera Vitalidad igual a tu Rango + 2 (una vez por persona por ronda).",
)

#ability-card(
  name: "Aliento de Vida",
  tags: ("Divina", "Resurrección"),
  cost: "1 acción, 2 chi",
  range: "Toque",
  duration: "Instantáneo",
  desc: "Resucitas a una criatura que haya muerto hace máximo 1 ronda. Vuelve a la vida con 1 PV y consciente, conservando su Herido (permanente) (Herido-4 pasa a ser Herido-3).",
  empower: "Puedes usarlo como acción bonus sobre ti mismo al caer a menos de 1 PV.",
)

#ability-card(
  name: "Golpe Exiliante",
  tags: ("Divina", "Mejora"),
  cost: "2 chi",
  duration: "Una ronda",
  desc: "Al impactar a una criatura extraplanaria, intentas enviarla de vuelta a su plano de origen (Dificultad: Nivel + 3). No afecta a criaturas míticas.",
  empower: "N/A",
)

==== Rango V — Rango V

_Pasiva: Aprendes dos hechizos de Rango III de tu dios (puedes usar chi)._

#ability-card(
  name: "Azote Ejecutor",
  tags: ("Divina", "Mejora"),
  cost: "3 chi",
  duration: "Una ronda",
  crit: "El objetivo queda con Aturdido-2 durante una ronda.",
  desc: "Tu siguiente impacto inflige 2d10 + CAR daño adicional. Si reduces al objetivo a 0 PV, muere instantáneamente y no puede ser resucitado.",
  empower: "Extiende el efecto una ronda adicional.",
)

#ability-card(
  name: "Explosión Divina",
  tags: ("Divina", "Ataque", "Área"),
  cost: "2 acciones, 3 chi",
  area: "Radio medio",
  duration: "Instantáneo",
  crit: "Los afectados quedan con Aturdido-2 durante una ronda.",
  desc: "Desatas una explosión de energía divina que inflige 3d10 + CAR daño en el área. Las criaturas que superen el tiro de salvación sufren mitad de daño. Las criaturas adyacentes a ti fallan automáticamente.",
  empower: "Puedes lanzarlo como acción bonus tras atacar con un arma.",
)

==== Rango VI — Rango VI

#ability-card(
  name: "Avatar Divino",
  tags: ("Divina", "Duradera", "Mejora"),
  cost: "3 acciones, 5 chi",
  duration: "Seis rondas",
  desc: "Te transformas en un avatar de tu dios. Obtienes +40 Vitalidad temporal, tus estadísticas físicas suben a 12 y tu DEF sube a 20. Obtienes Resistencias múltiples e Inmunidad a Aflicciones y efectos de Toque. Ganas Vuelo 1 y 6 contadores de escudo. Los hechizos que lances cuestan solo acciones (sin chi).",
  empower: "N/A",
)
