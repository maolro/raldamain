#import "../theme.typ": *

La Magia Divina no es técnica ni estudio: es relación. El clérigo que domina este rango ha forjado un vínculo con su dios lo suficientemente profundo como para canalizar milagros en el mundo mortal. Sus oraciones tienen respuesta en forma de bendiciones que doblan el curso de las batallas, maldiciones que consumen a los infieles y consagraciones que hacen la tierra santa. A medida que la fe crece, el dominio específico del dios elegido se manifiesta en habilidades únicas que ningún otro rango puede replicar.

#tip-box[
  *Reserva de Chi:* Incrementa por Rango x 2.
  *Estadística principal:* Sabiduría + Rango.
  *Conocimiento de los dioses:* Acceso a 3-5 magias relacionadas con tu dios a rangos superiores.
  *Protección divina:* Usas Magia Divina para defenderte de efectos Divinos o relacionados con tu dios.
]

==== Rango I — Rango I

#ability-card(
  name: "Milagro menor",
  tags: ("Divina", "Pasiva"),
  desc: "Como acción bonus, puedes hacer que una criatura a distancia media repita un tiro y se quede con el mejor o peor resultado (a tu elección). Usos diarios: Rango + 2.",
  empower: "Recuperas un uso gastado de esta habilidad.",
)

#ability-card(
  name: "Enviado de los dioses",
  tags: ("Divina", "Pasiva"),
  desc: "Conoces el idioma de tu dios y las criaturas relacionadas con tu divinidad son amistosas hacia ti. Detectas criaturas extraplanarias y magia (Arcana o Divina) a distancia media.",
  empower: "Tu dios te otorga una pequeña ayuda no relacionada con el combate.",
)

#ability-card(
  name: "Oración",
  tags: ("Divina", "Ritual"),
  desc: "Tras 10 minutos de rezo, puedes hacer hasta 4 preguntas a tu dios. Las respuestas son sinceras pero pueden ser crípticas. Los usos sucesivos en el mismo día reducen el número de preguntas disponibles.",
)

==== Rango II — Rango II

_Pasiva: Aprendes dos hechizos de Rango I de una magia relacionada con tu dios (ganan categoría Divina)._

#ability-card(
  name: "Manifestación Divina",
  tags: ("Divina", "Maldición"),
  cost: "1 acción, 1 chi",
  range: "Medio",
  duration: "Instantáneo o hasta eliminado",
  desc: "Canalizas el poder de tu dios para producir un efecto variable según tu divinidad: curar un estado negativo, eliminar una maldición o efecto mágico (tiro enfrentado), causar un estado negativo (Ceguera, Sangrado, etc.) o reducir una Resistencia del objetivo.",
  empower: "Afectas a un objetivo adicional.",
)

#ability-card(
  name: "Consagrar la Tierra",
  tags: ("Divina", "Ambiental"),
  cost: "3 acciones, 1 chi",
  area: "Radio grande",
  duration: "10 minutos",
  desc: "Consagras el área en nombre de tu dios. Los creyentes dentro obtienen Ventaja en todos sus tiros. Las invocaciones enemigas son impedidas y se activa Guerrero de la Fe de forma gratuita. Puedes realizar un ritual de 1 hora para hacer la consagración permanente.",
  empower: "Reduce el coste de un hechizo Divino en -1 acción.",
)

==== Rango III — Rango III

_Pasiva: Aprendes dos hechizos de Rango II de una magia relacionada con tu dios._

#ability-card(
  name: "Adivinación",
  tags: ("Divina", "Ritual"),
  desc: "Una vez al día, recibes visiones del pasado, presente o futuro. Las visiones son más claras y detalladas si posees un objeto o te encuentras en un lugar relacionado con la consulta.",
)

#ability-card(
  name: "Protección Divina",
  tags: ("Divina", "Sostenida", "Defensiva"),
  cost: "2 acciones, 2 chi",
  duration: "Concentración",
  desc: "Canalizas protección divina para defenderte. Obtienes 1 Reacción defensiva adicional por ronda usando Magia Divina. Como reacción al ser impactado, puedes lanzar un hechizo Divino como acción bonus contra el atacante.",
  empower: "Reduces el daño de un ataque recibido en Rango x 2 antes de aplicar defensas.",
)

==== Rango IV — Rango IV

_Pasiva: Aprendes dos hechizos de Rango III de tu dios. Daño Divino pasa a d8. Hechizos Rango I cuestan -1 acción._

#ability-card(
  name: "Castigo Divino",
  tags: ("Divina", "Maldición"),
  cost: "1 acción, 2 chi",
  range: "Medio",
  duration: "Hasta que sea eliminada",
  desc: "Maldices al objetivo con un castigo específico de tu dios (ejemplos: Marca de Ley, Bestia Interior, Llamas Eternas o Dolor). La maldición es difícil de eliminar: si el objetivo falla 3 intentos de liberarse, se vuelve permanente.",
  empower: "Afectas a un objetivo adicional.",
)

#ability-card(
  name: "Llamar a los Dioses",
  tags: ("Divina", "Ambiental"),
  cost: "3 acciones, 2 chi",
  duration: "Seis rondas",
  desc: "Funciona como Tierra Consagrada. Tras la ronda 2, activa un efecto ambiental propio de tu dios (Rango III o inferior). No requiere concentración.",
  empower: "Cambias el efecto ambiental activo sin coste adicional.",
)

==== Rango V — Rango V

_Pasiva: Aprendes dos hechizos de Rango IV de tu dios._

#ability-card(
  name: "Palabra Divina",
  tags: ("Divina", "Área", "Auditiva", "Sónica"),
  cost: "2 acciones, 3 chi",
  area: "Esfera mediana",
  crit: "Los afectados quedan con Aturdido-2 durante 1 ronda.",
  desc: "Pronuncias una palabra de poder divino. Los enemigos de fe opuesta deben superar un tiro de salvación de CON o sufren 2d10 + SAB daño Sónico y quedan sordos. Mata invocaciones enemigas instantáneamente.",
  empower: "Aumenta el área a esfera grande.",
)

#ability-card(
  name: "Exaltado",
  tags: ("Divina", "Mejora", "Duradero"),
  cost: "2 acciones, 3 chi",
  duration: "Seis rondas",
  desc: "Te inviste con poder divino. Obtienes +30 Vitalidad temporal, Resistencia a efectos Arcanos y Divinos y 3 estadísticas a tu elección suben a 12. Además, recibes los beneficios de Protección Divina sin requerir concentración.",
  empower: "Una vez por ronda: éxito automático en un tiro o resucitas a 1 PV al caer.",
)

==== Rango VI — Rango VI

_Pasiva: Aprendes dos hechizos de Rango V de tu dios. Daño Divino pasa a d10. Hechizos Rango III cuestan -1 acción._

#ability-card(
  name: "Ira de Dios",
  tags: ("Divina", "Ataque", "Área"),
  cost: "3 acciones, 5 chi",
  area: "Esfera grande",
  duration: "Instantáneo",
  crit: "Los afectados fallan automáticamente su defensa contra Manifestación Divina.",
  desc: "Desatas la furia de tu dios. Inflige 4d10 + SAB daño Divino y aplica la maldición de Manifestación Divina a todos los afectados. Destruye estructuras, barreras mágicas y tierra consagrada enemiga. Mata invocaciones menores instantáneamente.",
  empower: "N/A",
)
