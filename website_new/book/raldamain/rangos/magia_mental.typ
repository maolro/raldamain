#import "../theme.typ": *

La mente es el último bastión de la autonomía individual, y la Magia Mental es la llave que abre esa fortaleza desde fuera. Los practicantes de este rango no necesitan espadas ni hechizos destructivos: tienen acceso directo a los miedos, los recuerdos y la voluntad de quienes los rodean. Pueden convertir a un enemigo en aliado, extraer secretos sin tortura o sembrar la paranoia dentro de un ejército entero. El precio es la proximidad constante al abismo psíquico: quien con frecuencia entra en mentes ajenas corre el riesgo de perderse en ellas.

#tip-box[
  *Reserva de Chi:* Incrementa por Rango x 2.
  *Estadística principal:* Inteligencia + Rango.
]

==== Rango I — Iniciado

#ability-card(
  name: "Asalto Mental",
  tags: ("Mental", "Cordura"),
  cost: "1 acción",
  range: "Medio",
  crit: "Objetivo queda con Aturdido-2 durante 1 ronda.",
  desc: "Atacas la cordura del objetivo, infligiendo Rango + 1 de daño a Cordura e interrumpiendo su concentración. El objetivo resiste con Concentración o Averiguar Intenciones. Si su Cordura llega a 0, cae Inconsciente.",
  empower: "Afecta a un objetivo adicional.",
)

#ability-card(
  name: "Leer Pensamientos",
  tags: ("Mental", "Duradera"),
  cost: "2 acciones, 1 chi",
  area: "Esfera grande",
  duration: "Concentración",
  desc: "Detectas la presencia de criaturas en el área y lees sus pensamientos superficiales. Como acción, puedes leer un pensamiento profundo (el objetivo resiste con Concentración o Averiguar Intenciones).",
  empower: "Como reacción, previenes la acción de un enemigo detectado (Ventaja en tu tiro defensivo).",
)

#ability-card(
  name: "Escudo Mental",
  tags: ("Mental", "Duradera"),
  cost: "2 acciones",
  duration: "Concentración",
  desc: "Usas Magia Mental para defenderte de efectos Mentales. Tu Cordura aumenta en una cantidad igual a tu Rango. Bloquea intentos de detección de pensamientos.",
  empower: "Otorgas el beneficio a un aliado al tacto.",
)

==== Rango II — Adepto

#ability-card(
  name: "Sugestión",
  tags: ("Mental", "Duradero"),
  cost: "1 acción, 1 chi",
  range: "Medio",
  desc: "Implantas una orden o comportamiento lógico en la mente del objetivo. En combate, fuerzas al objetivo a realizar 1 acción específica.",
  empower: "Puedes reusar como acción bonus sin coste de chi.",
)

#ability-card(
  name: "Sanación Mental",
  tags: ("Mental", "Toque"),
  cost: "2 acciones, 1 chi",
  range: "Toque",
  desc: "Restauras Rango + 1 de Cordura al objetivo. Además, eliminas un hechizo Mental ajeno que lo afecte (mediante tiro enfrentado).",
  empower: "Eliminas un efecto Mental adicional.",
)

#ability-card(
  name: "Alterar Emociones",
  tags: ("Mental", "Duradero"),
  cost: "1 acción, 1 chi",
  range: "Medio",
  desc: "Induces un estado emocional en el objetivo: Cansancio, Ira, Miedo, Calma o Valentía. El efecto persiste hasta que el objetivo se recupere o termine el combate.",
  empower: "Afecta a un objetivo adicional.",
)

==== Rango III — Profesional

_Pasiva: Hechizos Mentales de Rango I cuestan -1 acción._

#ability-card(
  name: "Sobrecarga Mental",
  tags: ("Mental", "Cordura"),
  cost: "1 acción, 2 chi",
  range: "Medio",
  area: "Esfera pequeña",
  crit: "Daño a Cordura adicional igual a Rango + 1.",
  desc: "Ataque de área que inflige Rango + 1 de daño a Cordura a todas las criaturas en la zona y las deja con Confundido-1.",
  empower: "Lanzas el hechizo como acción bonus en otra área.",
)

#ability-card(
  name: "Geas",
  tags: ("Mental",),
  cost: "1 acción, 2 chi",
  range: "Medio",
  duration: "1 día",
  crit: "Reduce la Cordura del objetivo en Rango + 1.",
  desc: "Implantas una orden latente de cumplimiento forzoso en el objetivo. Puedes activar la orden para controlar al objetivo durante 1 ronda.",
  empower: "Afecta a un objetivo adicional.",
)

#ability-card(
  name: "Telepatía",
  tags: ("Mental", "Pasiva"),
  desc: "Estableces comunicación mental con criaturas que hayas detectado. Puedes lanzar hechizos mentales sin línea de visión contra objetivos detectados.",
)

==== Rango IV — Experto

_Pasiva: Hechizos Mentales de Rango II cuestan -1 acción._

#ability-card(
  name: "Sugestión en Masa",
  tags: ("Mental", "Área", "Duradera"),
  cost: "2 acciones, 2 chi",
  area: "Esfera media",
  duration: "Concentración",
  desc: "Controlas el comportamiento de un grupo de criaturas en el área. Los afectados pueden repetir el tiro de salvación al inicio de cada turno.",
  empower: "Fuerzas a un afectado a obedecer una orden inmediata (como el efecto de Geas).",
)

#ability-card(
  name: "Modificar Recuerdos",
  tags: ("Mental", "Duradera"),
  cost: "2 acciones, 2 chi",
  range: "Medio",
  duration: "Permanente",
  desc: "Reescribes hasta 10 minutos de los recuerdos del objetivo. Si el objetivo tiene 0 de Cordura, puedes borrar habilidades o rangos de su memoria.",
  empower: "Afecta a un objetivo adicional.",
)

#ability-card(
  name: "Aura Emocional",
  tags: ("Mental", "Duradera"),
  cost: "2 acciones, 2 chi",
  area: "Esfera media",
  duration: "Concentración",
  desc: "Creas un aura que aplica el efecto de Alterar Emociones a toda criatura que entre en el área.",
  empower: "Cancelas todos los efectos Mentales y de Moral en el área.",
)

==== Rango V — Maestro

_Pasiva: Hechizos Mentales de Rango III cuestan -1 acción._

#ability-card(
  name: "Esclavizar",
  tags: ("Mental", "Duradera"),
  cost: "1 acción, 3 chi",
  range: "Medio",
  duration: "Concentración",
  desc: "Tomas control total del objetivo. Obedece todas tus órdenes, salvo las suicidas (a menos que tenga 0 de Cordura).",
  empower: "Afecta a un objetivo adicional.",
)

#ability-card(
  name: "Mente en Blanco",
  tags: ("Mental", "Mejora", "Toque"),
  cost: "1 acción, 3 chi",
  range: "Toque",
  desc: "El objetivo se vuelve inmune a efectos Mentales y a detección. El efecto termina si la Cordura del objetivo cae demasiado.",
  empower: "Como reacción, reflejas un hechizo mental recibido hacia el atacante.",
)

#ability-card(
  name: "Destrozar Mente",
  tags: ("Mental", "Cordura"),
  cost: "1 acción, 3 chi",
  range: "Medio",
  crit: "Objetivo cae Inconsciente.",
  desc: "Infliges 1d10 + INT de daño a la Cordura del objetivo y lo dejas con Aturdido-2. Si su Cordura llega a 0, sufre daño permanente.",
  empower: "Afecta a un objetivo adicional.",
)

==== Rango VI — Ascendido

_Pasiva: Hechizos Mentales de Rango IV cuestan -1 acción._

#ability-card(
  name: "Ráfaga Mental",
  tags: ("Mental", "Área", "Cordura"),
  cost: "3 acciones, 5 chi",
  area: "Esfera media",
  duration: "Concentración",
  crit: "Los afectados fallan automáticamente su siguiente tiro de salvación contra el hechizo.",
  desc: "Infliges 1d10 + INT de daño a la Cordura de todas las criaturas en el área y aplicas un hechizo Mental de Rango III o inferior gratis. El efecto se repite cada turno. Las criaturas dentro del área no pueden mantener la concentración.",
)
