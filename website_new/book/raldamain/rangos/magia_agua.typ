#import "../theme.typ": *

El agua no destruye con la violencia del fuego ni la contundencia de la tierra: erosiona, envuelve y aplasta con paciencia infinita. Los maestros del agua comprenden que la verdadera fortaleza no es la rigidez sino la adaptabilidad: fluir alrededor de los obstáculos y encontrar siempre el camino hacia abajo. Este rango ofrece desde tentáculos que aprisionan hasta olas devastadoras, desde lluvias curativas hasta corrientes capaces de arrastrar fortalezas. El agua en todas sus formas obedece a quien ha aprendido a escucharla.

#tip-box[
  *Reserva de Chi:* Incrementa por Rango x 2.
  *Estadística principal:* Sabiduría + Rango.
  *Parada mágica:* Usas Magia de Agua para tiros de parada y salvaciones contra Agua, Fuego, Tierra, Aire o Ácido.
  *Componentes Materialesi:* Para lanzar cualquier hechizo necesitas una cantidad adecuada de agua para manipular.
]

==== Rango I — Rango I

#ability-card(
  name: "Torrente",
  tags: ("Agua", "Ataque", "A distancia", "Físico"),
  cost: "1 Acción",
  range: "Medio",
  duration: "Instantáneo",
  crit: "el objetivo cae con Ralentizado-1",
  desc: "Disparas un chorro a presión que provoca 1d6 + SAB daño Contundente además que empuja un paso al objetivo. Este ataque puede herir a seres incorpóreos y apagará todos los fuegos a su paso.",
  empower: "Haz un ataque contra un objetivo adicional o haz un segundo ataque contra el mismo objetivo contra el cual deberá emplear su mismo resultado defensivo.",
)

#ability-card(
  name: "Aguas de la Vida",
  tags: ("Agua", "Toque", "Sanación"),
  cost: "1 Acción/Reacción, 1 chi",
  range: "Toque",
  duration: "Instantáneo",
  desc: "Una criatura que toques se cura Rango + 2 Vitalidad y se cura de un efecto de estado negativo o reduce el nivel de Herido (permanente) por un paso. 
Si empleas esta habilidad contra un no-muerto, haz un tiro de ataque contra él que provoca 2d6 + SAB daño Radiante al impactar y lo ralentiza durante una ronda.",
  empower: "Aumenta el área de este efecto a un radio corto (medio si empoderas por segunda vez). No obstante, solo podrás afectar a criaturas que estén en contacto con el agua.",
)

#ability-card(
  name: "Adaptación Acuática",
  tags: ("Agua", "Innata", "Pasiva"),
  desc: "Obtienes velocidad de natación igual a tu velocidad base y puedes respirar bajo el agua hasta un máximo de diez minutos. Además, si te encuentras en el agua recibes vista a ciegas a distancia media y puedes emplear tu tiro de Magia de Agua para todos tus tiros de Esquiva y de salvación Físicos.",
)

==== Rango II — Rango II

_Pasiva: Aumenta tu estadística de Constitución 1._

#ability-card(
  name: "Muro de Agua",
  tags: ("Agua", "Defensivo", "Duradero"),
  cost: "1 Acción/Reacción, 1 chi",
  range: "Medio",
  area: "Esfera pequeña o línea mediana",
  duration: "Concentración",
  desc: "Crea una barrera de agua con PV iguales a tu Rango x 3, la cual protegerá a todos detrás de ella. Reduce el daño del ataque recibido por esa cantidad y detendrá automáticamente un efecto Gaseoso o de Fuego. Si se emplea contra un enemigo que ataque cuerpo a cuerpo, deberá tener éxito en un tiro de salvación Físico o será empujado hacia atrás (aquellos Incorpóreos fracasarán automáticamente).",
  empower: "Recupera todos los PV del muro (requiere agua cercana).",
)

#ability-card(
  name: "Ola Chocante",
  tags: ("Agua", "Ataque", "Área", "Físico", "Duradero"),
  cost: "2 Acciones, 1 chi",
  range: "Corto",
  area: "Línea mediana",
  duration: "Concentración",
  crit: "Los objetivos quedan con Ralentizado-1",
  desc: "Crea una ola que ataca a todas las criaturas en su área, infligiendo 2d6 + SAB daño Contundente además de empujar un paso y tropezar (hace falta un tiro de salvación Físico para resistir). Si mantienes la concentración, puedes mover la ola un paso cada ronda gastando una Acción, pudiendo así atacar a todo objetivo en su paso.",
  empower: "Creas una segunda ola en dirección diferente. Cuando gastes una acción para controlar una ola, puedes mover a ambas y atacar a cada objetivo a su paso.",
)

#ability-card(
  name: "Infusión de Agua",
  tags: ("Agua", "Pasiva"),
  desc: "Tus ataques físicos cuentan como mágicos y aumentan su alance por un paso además de contar como Agua para los propósitos de Vulnerabilidades y habilidades mágicas. Además, puedes emplear tu modificador de Magia de Agua para todos tus tiros de ataque, defensa y técnicas de combate relacionados con ellos.",
)

==== Rango III — Rango III

_Pasiva: Todos tus hechizos de Agua sustituyen sus dados de daño por d8._

#ability-card(
  name: "Prisión Acuosa",
  tags: ("Agua", "Mejora", "Agarre", "Duradera"),
  cost: "2 chi",
  range: "Medio",
  duration: "Concentración",
  crit: "Objetivo con Fatigado-1 y se ahoga un paso adicional.",
  desc: "Al impactar con un ataque de agua, puedes forzar al afectado a tener éxito en un tiro de salvación Físico o queda agarrado. Mientras permanezca agarrado, estará también ahogado hasta que escape o el efecto sea eliminado.",
  empower: "Afecta a un objetivo adicional impactado.",
)

#ability-card(
  name: "Controlar el Agua",
  tags: ("Agua", "Ambiental", "Duradera"),
  cost: "2 acciones, 2 chi",
  area: "Radio grande",
  duration: "Concentración",
  desc: "Amplificas tu control elemental sobre el agua en el área afectada, pudiendo subir o bajar su nivel como desees y moverte por ella sin dificultades. Recibes Ventaja en todos tus tiros relacionados con Magia de Agua y tus hechizos de Agua reciben un dado de daño adicional (esto afecta también a Magia de Hielo, Ácido, Tormenta y Sangre). Además, el alcance de todos tus efectos aumenta al área afectada y el agua es terreno difícil para criaturas que puedan nadar salvo que tú lo decidas.",
  empower: "El siguiente hechizo de Agua que lances cuesta -1 acción (mínimo 1)",
)

#ability-card(
  name: "Columna de Agua",
  tags: ("Agua", "Duradera", "Mejora"),
  cost: "1 Acción, 2 chi",
  duration: "Concentración",
  desc: "Creas una columna de agua a tus pies que te otorga velocidad de vuelo igual a tu movimiento base y Ventaja en tus tiros de Esquiva. No puedes volar excesivamente alto y debes estar rodeado de agua para poder volar.",
  empower: "Suma +10 a un tiro de Esquiva o salvación Físico, y vuela un paso en cualquier dirección.",
)

#ability-card(
  name: "",
  desc: "",
)

==== Rango IV — Rango IV

_Pasiva: Aumenta tu estadística de Sabiduría por 1._

#ability-card(
  name: "Vórtice",
  tags: ("Agua", "Ataque", "Área", "Duradera", "Agarre"),
  cost: "2 acciones, 2 chi",
  range: "Medio",
  area: "Radio medio",
  duration: "Concentración",
  crit: "Fallo automático para evitar agarre.",
  desc: "Crea un remolino que inflige 3d8 + SAB daño Contundente en su área afectada que arrastra y enreda. Aquellos que fallen el tiro deberán tener éxito en un tiro de salvación Físico o quedarán agarrados y ahogados. Este efecto permanecerá hasta que pierdas la concentración y puedes reactivarlo gastando una acción.",
  empower: "Aumenta el radio por un paso y el daño por un dado adicional.",
)

#ability-card(
  name: "Aguas Protectoras",
  tags: ("Agua", "Duradera", "Mejora"),
  cost: "1 Acción, 2 chi",
  duration: "Concentración",
  desc: "Te rodeas de aguas protectoras que te otorgan contadores de escudo iguales a tu Rango. Mientras este efecto permanezca activo, todo el espacio a distancia cercana cuenta como si estuviera rodeado por agua. Puedes emplear tus contadores de escudo para lanzar el hechizo Aguas de la Vida sin la necesidad de pagar chi o para empoderarlo.",
  empower: "Recupera la mitad de tus contadores de escudo.",
)

#ability-card(
  name: "Taladro Hidráulico",
  tags: ("Agua", "Ataque", "Área"),
  cost: "1 acción, 2 chi",
  area: "Línea mediana",
  duration: "Instantáneo",
  crit: "Herido-2, con Ralentizado-1 y pierde un contador de escudo adicional.",
  desc: "Dispara un chorro de agua a presión que inflige 4d8 + SAB daño Contundente, empuja y Herido-1 al impactar. Este ataque ignora los muros a su paso además que romperá la armadura y eliminará un contador de escudo que tenga.",
  empower: "Haz un segundo ataque contra objetivos diferentes o los mismos, quienes deberán defenderse con el mismo resultado.",
)

==== Rango V — Rango V

_Pasiva: Todos tus hechizos de Agua sustituyen sus dados de daño por d10._

#ability-card(
  name: "Tsunami",
  tags: ("Agua", "Ataque", "Área", "Agarre", "Duradera"),
  cost: "2 acciones, 3 chi",
  range: "Medio",
  area: "Línea grande",
  duration: "Concentración",
  crit: "Fallo automático para evitar el agarre.",
  desc: "Invocas una Ola colosal que inflige 4d10 + SAB daño Contundente al impactar y enreda. Además, los objetivos impactados deben tener éxito en un tiro de salvación Físico o quedan agarrados y se empiezan a ahogar. 

Puedes mover el Tsunami un paso cada ronda como acción, atacando de nuevo a cada criatura a su paso. Si esto le haría chocar contra un obstáculo, el tsunami provocará 6d10 daño Contundente de manera automática a todos los objetivos agarrados y termina de inmediato.",
  empower: "Crea una ola adicional con este hechizo, la cual puede atacar a los mismos objetivos o a otros diferentes.",
)

#ability-card(
  name: "Vapor Hirviente",
  tags: ("Agua", "Gaseosa", "Área", "Duradera"),
  cost: "2 acciones, 3 chi",
  range: "Medio",
  area: "Esfera mediana",
  duration: "Concentración",
  crit: "Quemadura media.",
  desc: "Crea una nube de vapor hirviente que otorga ocultamiento y ciega a todos en ella. Cada objetivo que se encuentre ahí debe tener éxito en un tiro de Voluntad o sufre 3d10 + SAB daño Fuego y una quemadura (este daño ignora Resistencias). Este efecto permanecerá hasta que pierdas la concentración y puedes reactivarlo gastando una acción.",
  empower: "Aumenta el tamaño un paso y el daño por un dado.",
)

#ability-card(
  name: "Forma Fluida",
  tags: ("Agua", "Reacción"),
  cost: "1 Acción/Reacción, 2 chi",
  duration: "Concentración/Una ronda",
  desc: "Te transformas en líquido, recibiendo Inmunidad al daño Físico no-mágico además de Aflicciones, Efectos Mentales, Ácido y Miedo, pero recibes Vulnerabilidad al daño Frío y a efectos de Agua (quienes podrán herirte con normalidad).

Este efecto permanecerá activo hasta que pierdas la concentración o pase una ronda. Hasta que eso ocurra, contarás como incorpóreo y podrás pasar a través de ranuras pequeñas además de ser Invisible si estás en el agua, pero solo podrás emplear hechizos de Magia de Agua.",
  empower: "Extiende este efecto durante una ronda adicional.",
)

==== Rango VI — Rango VI

_Pasiva: Aumenta tu estadística de Destreza por 1._

#ability-card(
  name: "Forma Elemental",
  tags: ("Agua", "Ambiental"),
  cost: "1 Acción, 5 chi",
  duration: "Seis rondas",
  desc: "Obtienes +20 Vitalidad temporal. Tus estadísticas físicas y tu SAB pasan a 12, tu Defensa base pasa a ser 20 y añades +1 dado de daño a tus hechizos. Obtienes Inmunidad a Aflicciones y efectos de Toque además que estás bajo los efectos de Aguas Protectoras y Columna de Agua, recibiendo así vuelo si estás sobre el agua y contadores de escudo iguales a tu Rango. Tus hechizos de Magia de Agua de Rango III o menos no te costarán chi para ser lanzados.",
)
