#import "../theme.typ": *

El frío no mata de golpe: inmoviliza primero y mata después. La Magia de Hielo ha sido perfeccionada por maestros que entendieron que la congelación del movimiento es más valiosa que el daño directo. Este rango crea armas de hielo en tiempo real, erige muros que cortan el campo de batalla y desata ventiscas que reducen la visión y la velocidad del enemigo a cero. En sus expresiones más avanzadas, el practicante puede crear un invierno localizado que convierte el terreno en su dominio exclusivo.

#tip-box[
  *Reserva de Chi:* Incrementa por Rango x 2.
  *Estadística principal:* Sabiduría + Rango.
  *Parada mágica:* Usas Magia de Hielo para tiros de parada y salvaciones contra Fuego, Agua, Frío, Naturaleza y Ácido.
]

==== Rango I — Rango I

#ability-card(
  name: "Espina de Hielo",
  tags: ("Hielo", "Ataque", "A distancia", "Físico"),
  cost: "1 acción",
  range: "Medio",
  duration: "Instantáneo",
  desc: "Ataca con un arma de hielo que provoca 1d6 + SAB daño Perforante, Cortante o Contundente. Puedes aplicar técnicas de combate a este ataque.",
  empower: "Haz un ataque contra un objetivo adicional o haz un segundo ataque contra el mismo objetivo contra el cual deberá emplear su mismo resultado defensivo.",
)

#ability-card(
  name: "Rayo Gélido",
  tags: ("Hielo", "Ataque", "A distancia", "Frío"),
  cost: "1 acción",
  range: "Medio",
  duration: "Instantáneo",
  crit: "El objetivo queda ralentizado una ronda.",
  desc: "Infilge 1d6 + SAB daño Frío a un objetivo que alcance. Este ataque apagará los fuegos a su paso y congelará el agua.",
  empower: "Aumenta el tamaño a un radio corto y el daño por un dado. Si vuelve a empoderar, mejorará el tamaño a un radio medio y el daño por otro dado.",
)

#ability-card(
  name: "Adaptación al Frío",
  tags: ("Hielo", "Pasiva"),
  desc: "Recibes Resistencia al daño Frío y Necrótico e Inmunidad a los efectos por el frío extremo. Puedes ver a través de neblinas naturales y mágicas sin dificultades.",
)

==== Rango II — Rango II

_Pasiva: Aumenta tu estadística de Constitución por 1._

#ability-card(
  name: "Muro de Hielo",
  tags: ("Hielo", "Defensiva", "Duradera"),
  cost: "1 Acción/Reacción, 1 chi",
  range: "Medio",
  area: "Esfera pequeña o línea mediana",
  duration: "Instantánea",
  desc: "Crea una barrera sólida con PV iguales a tu Rango x 4. Este muro es Inmune a daño Frío pero Vulnerable a daño Contundente y Fuego. Si se emplea como reacción defensiva, reduce el daño de un ataque que recibas por un valor igual a sus PV. Puedes también emplear esta habilidad para anular inmediatamente un efecto de Agua de tamaño igual o menor que el muro.",
  empower: "Recupera todos los puntos de vida perdidos.",
)

#ability-card(
  name: "Neblina Polar",
  tags: ("Hielo", "Gaseosa", "Duradera"),
  cost: "2 acciones, 1 chi",
  area: "Esfera mediana",
  duration: "Concentración",
  crit: "Los afectados quedan con Aturdido-4 durante una ronda.",
  desc: "Crea una niebla fría que ciega y otorga ocultamiento. Todas las criaturas en su área de efecto deben tener éxito en un tiro de Voluntad o sufren 1d6 + SAB daño Frío y quedan ralentizadas durante una ronda. Puedes repetir este efecto en cada turno que esta habilidad permanezca activa empleando una acción.",
  empower: "Aumenta el área de efecto por un paso y el daño Frío por un dado.",
)

#ability-card(
  name: "Infusión de Hielo",
  tags: ("Hielo", "Pasiva"),
  desc: "Tus ataques físicos cuentan como mágicos además de contar como Hielo para los propósitos de Vulnerabilidades y mejoras mágicas. Además, puedes emplear tu modificador de Magia de Hielo para todos tus tiros de ataque, defensa y técnicas de combate relacionados con ellos.",
)

==== Rango III — Rango III

_Pasiva: Todos tus hechizos de Hielo sustituyen sus dados de daño por d8._

#ability-card(
  name: "Tormenta de Nieve",
  tags: ("Hielo", "Ataque", "Área", "Físico", "Frío"),
  cost: "2 acciones, 2 chi",
  area: "Cono mediano",
  duration: "Instantáneo",
  crit: "Los afectados quedarán con Aturdido-4 durante una ronda.",
  desc: "Crea una tormenta de granizo y hielo que inflige 3d8 + SAB daño Cortante y Frío. Este ataque llenará el área afectada de terreno difícil y disipará efectos Gaseosos a su paso.",
  empower: "Lanza de nuevo este hechizo contra el mismo área o contra una zona diferente, o aumenta su área de efecto por un paso y su daño por un dado.",
)

#ability-card(
  name: "Congelación Rápida",
  tags: ("Hielo", "Mejora", "Agarre", "Frío"),
  cost: "2 chi",
  duration: "Hasta que el afectado escape",
  crit: "Los afectados quedarán afectados por Hipotermia.",
  desc: "Al impactar con un hechizo de Hielo, todos los afectados deben tener éxito en un tiro de salvación Físico o quedarán con Aturdido-4 además de sufrir hipotermia. Pueden liberarse si entran en calor, repiten el tiro y tienen éxito o sufren un ataque.",
)

#ability-card(
  name: "Llamada del Invierno",
  tags: ("Hielo", "Duradera", "Mejora"),
  cost: "2 Acciones, 2 chi",
  area: "Radio grande",
  duration: "Concentración",
  desc: "Amplificas tu control sobre la Magia de Hielo, bajando así las temperaturas en el área afectada. Mientras este efecto permanezca activo, recibes Ventaja en todos tus tiros relacionados con Magia de Hielo (afecta también a tus hechizos de Magia de Agua, Aire y Sangre) y un dado de daño adicional en todos tus ataques. Puedes también caminar sobre el agua congelándola a tu paso.",
  empower: "Reduce el coste en acciones de un hechizo de Hielo por 1.",
)

==== Rango IV — Rango IV

_Pasiva: Aumenta tu estadística de Sabiduría por 1._

#ability-card(
  name: "Armadura de Hielo",
  tags: ("Hielo", "Defensiva", "Duradera"),
  cost: "2 acciones, 2 chi",
  duration: "Concentración",
  desc: "Obtienes contadores de escudo iguales a tu Rango y Resistencia a daño Fuego además de a efectos de Agua y Naturaleza. Cada vez que gastes un contador de escudo, puedes provocar 2d8 daño Cortante a tu atacante si te ha atacado cuerpo a cuerpo (máximo 6d8).",
  empower: "Recuperas la mitad de tus contadores de escudo (redondeando hacia abajo).",
)

#ability-card(
  name: "Caminante del Viento",
  cost: "1 Acción, 2 chi",
  duration: "Concentración",
  desc: "Recibes velocidad de vuelo igual a tu velocidad base además de Ventaja a tus tiros de Esquiva. Esta habilidad solo puede emplearse si te encuentras en un entorno frío.",
  empower: "Suma +10 a un tiro de Esquiva o salvación Físico, y vuela un paso en cualquier dirección.",
)

#ability-card(
  name: "Esfera Gélida",
  cost: "2 Acciones, 2 chi",
  area: "Esfera media",
  duration: "Instantáneo",
  crit: "Los afectados quedan con Aturdido-4 durante una ronda",
  desc: "Haz un ataque contra todos los objetivos que alcances que inflige 3d8 + SAB daño Frío, hipotermia y ralentiza durante una ronda. Este ataque reducirá las temperaturas y congelará el agua a su paso.",
  empower: "Aumenta el área de efecto de este hechizo por un paso y el daño por un dado adicional, o ataca de nuevo a todas las criaturas en el área afectada.",
)

#ability-card(
  name: "",
  desc: "",
)

==== Rango V — Rango V

_Pasiva: Todos tus hechizos de Hielo sustituyen sus dados de daño por d10._

#ability-card(
  name: "Medianoche Polar",
  tags: ("Hielo", "Ambiental"),
  cost: "2 acciones, 3 chi",
  area: "Radio grande",
  duration: "Concentración",
  desc: "Bajas masivamente las temperaduras en el área afectada, congelando toda el agua ahí y eliminando todos los efectos de Fuego, Naturaleza y Agua no-míticos activos. Aquellas criaturas que se encuentren en el agua cuando lances este hechizo deberán tener éxito en un tiro de salvación Físico o quedarán con Aturdido-4 hasta que se liberen o tengan éxito en el tiro (cuenta como si estuvieran rodeadas por un Muro de Hielo). 

Mientras este hechizo permanezca activo, tus hechizos de Magia de Hielo aumentan su alcance a toda el área y además que todos los objetivos estarán bajo los efectos de hipotermia hasta que entren en calor. El terreno también contará como frío extremo para los propósitos de tus hechizos y el agua se congelará de inmediato salvo que tú lo decidas.",
)

#ability-card(
  name: "Alud",
  tags: ("Hielo", "Ataque", "Área", "Físico", "Frío", "Agarre"),
  cost: "2 acciones, 3 chi",
  area: "Cono grande",
  duration: "Instantáneo",
  desc: "Desata una avalancha que inflige 4d10 + SAB daño Contundente y Frío al impactar además de empujar dos pasos y enredar. Este ataque derrumba las estructuras a su paso y crea terreno difícil. Todas las criaturas que sean impactadas deberán además tener éxito en un tiro de salvación Físico o quedan agarradas y afectadas por hipotermia.",
  empower: "Vuelve a atacar a la misma zona afectada con este hechizo.",
)

#ability-card(
  name: "Congelar la Sangre",
  tags: ("Hielo", "Aflicción", "Frío"),
  cost: "1 acción, 3 chi",
  range: "Medio",
  duration: "Instantáneo",
  crit: "El objetivo sufre Herido-4 (Herida Crítica Incurable).",
  desc: "Un objetivo afectado por hipotermia debe tener éxito en un tiro de Voluntad o sufre 4d10 + SAB daño Frío, Herido-3 y queda con Aturdido-4. Se podrá liberar si entra en calor, repite el tiro con éxito o es liberado por otro.",
  empower: "Afecta a un objetivo adicional.",
)

==== Rango VI — Rango VI

_Pasiva: Aumenta tu estadística de Destreza por 1._

#ability-card(
  name: "Forma Elemental",
  tags: ("Hielo", "Mejora", "Duradera"),
  cost: "1 acción, 5 chi",
  duration: "Seis Rondas",
  desc: "Obtienes +20 Vitalidad temporal. Tus estadísticas físicas y tu SAB pasan a 12, tu Defensa base pasa a ser 20 y añades +1 dado de daño a tus hechizos. Obtienes Inmunidad a Aflicciones y efectos de Toque además que estás bajo los efectos de Armadura de Hielo y Ola de Frío, recibiendo así contadores de escudo iguales a tu Rango y el área a tu alrededor es Frío Extremo. Tus hechizos de Magia de Hielo de Rango III o menos no te costarán chi para ser lanzados.",
)
