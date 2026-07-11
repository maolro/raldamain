#import "../theme.typ": *

El metal está en todas partes donde hay civilización: en las armas, en las armaduras, en los cimientos de las ciudades y en las monedas que mueven el mundo. La Magia de Metal convierte esa omnipresencia en una ventaja táctica sin igual. No es el elemento más destructivo ni el más versátil, pero ninguno es más preciso: el practicante puede arrancar espadas de manos, guiar proyectiles metálicos con exactitud mortal y desatar tormentas de fragmentos que barren toda protección. A los rangos superiores, el metal obedece como una extensión del cuerpo del practicante.

#tip-box[
  *Reserva de Chi:* Incrementa por Rango x 2.
  *Estadística principal:* Sabiduría/Carisma + Rango.
  *Parada mágica:* Usas Magia de Metal para tiros de parada y salvaciones contra Metal, Tierra, Físico, Cortante y Tormenta.
]

==== Rango I — Rango I

#ability-card(
  name: "Manipulación Metálica",
  tags: ("Metal", "Ataque", "A distancia", "Físico"),
  cost: "1 acción",
  range: "Medio",
  duration: "Instantáneo",
  crit: "El objetivo queda desarmado automáticamente.",
  desc: "Tomas control de un objeto metálico cercano. Puedes intentar desarmar a un objetivo, que debe superar un tiro de salvación Físico para evitarlo, o atacarlo directamente con el objeto, infligiendo 2d6 + SAB/CAR daño Cortante, Perforante o Contundente.",
  empower: "Haz un ataque adicional contra un objetivo diferente o haz un segundo ataque contra el mismo objetivo contra el cual deberá emplear su mismo resultado defensivo.",
)

#ability-card(
  name: "Redirigir Ataque",
  tags: ("Metal", "Reacción"),
  cost: "1 chi",
  duration: "Instantáneo",
  desc: "En respuesta a que falle un ataque con un proyectil metálico puedes redirigirlo contra cualquier objetivo que puedas ver en distancia media. Si eras tú quien atacó y fallaste, puedes repetir el ataque contra el mismo objetivo o lanzarlo contra uno diferente.",
  empower: "El ataque redirigido recibe un dado de daño adicional.",
)

#ability-card(
  name: "Sentido del Metal",
  tags: ("Metal", "Innata", "Pasiva"),
  desc: "Desarrollas una percepción innata de todo el metal que te rodea. Puedes sentir la presencia, composición y posición de todo objeto metálico a distancia media, incluso a través de paredes y obstáculos. Obtienes Resistencia contra Maniobras de Desarme y no puedes ser sorprendido por ataques que empleen proyectiles o armas metálicas.",
)

==== Rango II — Rango II

_Pasiva: Aumenta tu estadística de Destreza por 1._

#ability-card(
  name: "Nube de Cuchillas",
  tags: ("Metal", "Ataque", "Área", "Duradera"),
  cost: "1 Acción, 1 chi",
  area: "Esfera pequeña",
  duration: "Concentración",
  crit: "Los afectados sufren Herido-1.",
  desc: "Crea una nube de fragmentos metálicos que inflige 3d6 + SAB/CAR daño Cortante y sangrado a todos los que alcance. Mientras mantengas la concentración, puedes gastar una acción para mover la nube, atacando a cada objetivo en su trayectoria.",
  empower: "Aumenta el área de efecto de la nube por un paso y su daño por un dado.",
)

#ability-card(
  name: "Repulsión Magnética",
  tags: ("Metal", "Reacción", "Duradera"),
  cost: "1 Reacción, 1 chi",
  duration: "Una ronda",
  desc: "Emites un pulso magnético que te hace inmune a todos los proyectiles metálicos pequeños durante esta ronda. Además, todas las criaturas que lleven armas o armaduras metálicas en distancia cercana deben superar un tiro de salvación Físico o son empujadas un paso hacia atrás.",
  empower: "Detienes automáticamente un ataque hecho con un proyectil metálico de cualquier tamaño o hecho por una criatura con armadura metálica.",
)

#ability-card(
  name: "Infusión de Metal",
  tags: ("Metal", "Pasiva"),
  desc: "Impregnas tus armas metálicas con tu control elemental, agudizando su filo más allá de sus límites naturales. Tus ataques con armas metálicas infligen un dado de daño adicional al impactar y cuentan como hechos de material superior a efectos de romper objetos y superar resistencias. Puedes emplear tu modificador de Magia de Metal para todos tus tiros de técnicas de combate y aplicar técnicas de combate a tus ataques elementales.",
)

==== Rango III — Rango III

_Pasiva: Todos tus hechizos de Metal sustituyen sus dados de daño por d8._

#ability-card(
  name: "Espina Metálica",
  tags: ("Metal", "Ataque", "Físico"),
  cost: "1 Acción, 2 chi",
  range: "Medio",
  duration: "Instantáneo",
  crit: "El objetivo sufre Herido-2.",
  desc: "Clavas o tensas el metal que ya porta un objetivo, convirtiendo su propia armadura o arma en su perdición. Un objetivo que lleve un objeto de metal clavado o armadura metálica debe superar un tiro de salvación de Voluntad o sufre 3d8 + SAB/CAR daño Perforante que ignora su defensa, Herido-1 y sangrado.",
  empower: "Afecta a un objetivo adicional que lleve metal en distancia media del primero.",
)

#ability-card(
  name: "Maestría del Metal",
  tags: ("Metal", "Duradera", "Mejora"),
  cost: "2 Acciones, 2 chi",
  duration: "Concentración",
  desc: "Amplías tu dominio sobre el metal cercano, agudizando tu control hasta la perfección. Mientras este efecto permanezca activo, obtienes Ventaja en todos tus tiros relacionados con Magia de Metal y recibes un dado de daño adicional en tus ataques. Puedes atacar con objetos metálicos contra cualquier punto que puedas ver a distancia lejana.",
  empower: "Reduce el coste en acciones del siguiente hechizo de Metal en 1 (mínimo 1).",
)

#ability-card(
  name: "Hilos de Acero",
  tags: ("Metal", "Duradera", "Mejora"),
  cost: "1 Acción, 2 chi",
  duration: "Concentración",
  desc: "Manifiestas hilos de acero que se extienden desde tus manos. Puedes engancharte a cualquier superficie sólida o volante a distancia media para desplazarte por el entorno, obteniendo velocidad de vuelo igual a tu velocidad base y Ventaja en tus tiros de Esquiva. Como acción, puedes atacar a un objetivo a distancia media con los hilos, haciendo así que quede enredado y cuente como si estuviera rodeado de metal a efectos de tus hechizos.",
  empower: "Enreda a un objetivo adicional u obtienes +10 a un tiro de Esquiva y vuelas un paso.",
)

==== Rango IV — Rango IV

_Pasiva: Aumenta tu estadística de Carisma por 1._

#ability-card(
  name: "Armadura de Hierro",
  tags: ("Metal", "Defensivo", "Duradera"),
  cost: "2 acciones, 2 chi",
  duration: "Concentración",
  desc: "Te recubres de placas de hierro y acero que te otorga contadores de escudo iguales a tu Rango. Cada vez que gastes un contador de escudo por un ataque cuerpo a cuerpo, puedes infligir 2d8 daño Cortante al atacante (máximo 6d8). Si esta reducción anula el daño por completo, el arma del atacante queda rota.",
  empower: "Recuperas la mitad de tus contadores de escudo (redondeando hacia abajo).",
)

#ability-card(
  name: "Pulso Destructor",
  tags: ("Metal", "Ataque", "Área", "Duradera"),
  cost: "2 acciones, 2 chi",
  area: "Radio Medio",
  duration: "Instantáneo",
  crit: "Los afectados sufren Herido-1.",
  desc: "Genera un pulso magnético que destruye todos los objetos metálicos en el área afectada y ocasiona el efecto de estado roto a los objetos mágicos de ese material que no sean artefactos. Aquellos que estén llevando objetos que se van a romper deben tener éxito en un tiro de salvación Físico o sufren 3d8 + SAB/CAR daño Perforante y se les clavan fragmentos de metal.",
  empower: "Aumenta el radio por un paso y el daño de la fragmentación por un dado adicional.",
)

#ability-card(
  name: "Ferrokinesia",
  tags: ("Metal", "Duradera", "Agarre"),
  cost: "1 Acción/Reacción, 2 chi",
  range: "Medio",
  duration: "Concentración",
  crit: "El objetivo queda agarrado",
  desc: "Un objetivo con armadura metálica o cantidad suficiente de metal clavado queda enredado y debe tener éxito en un tiro de salvación Físico o queda agarrado. Mientras esté agarrado puedes moverlo un paso como Acción o Reacción para que reciba ataques dirigidos contra ti o emplee Acciones que no supongan un coste (como moverse o hacer ataques básicos). El afectado podrá repetir el tiro gastando una Acción para intentar escapar.",
  empower: "Afecta a un objetivo adicional con esta habilidad",
)

==== Rango V — Rango V

_Pasiva: Todos tus hechizos de Metal sustituyen sus dados de daño por d10._

#ability-card(
  name: "Tormenta de Acero",
  tags: ("Metal", "Ataque", "Área", "Físico"),
  cost: "2 acciones, 3 chi",
  area: "Radio grande",
  duration: "Instantáneo",
  crit: "Los afectados sufren Herido-3 y sangrado grave.",
  desc: "Desatas una tempestad de fragmentos metálicos que inflige 5d10 + SAB/CAR daño Cortante o Perforante a todos los que alcance, Herido-2 y sangrado. Los proyectiles quedan clavados en el terreno, creando terreno difícil, y la armadura metálica de los afectados queda dañada, reduciendo su efectividad hasta ser reparada.",
  empower: "Vuelve a atacar el mismo área o amplía el radio un paso.",
)

#ability-card(
  name: "Polvo Metálico",
  tags: ("Metal", "Gaseosa", "Área", "Duradera"),
  cost: "2 acciones, 3 chi",
  range: "Medio",
  area: "Esfera mediana",
  duration: "Concentración",
  crit: "Los afectados sufren Enfermado-1 durante una ronda.",
  desc: "Crea una nube de partículas de metal que otorga ocultamiento y ciega a todos en ella. Cada objetivo que se encuentre ahí debe tener éxito en un tiro de Voluntad o sufre 3d10 + SAB/CAR daño Perforante que ignora defensa y el metal entrará en su cuerpo, haciendo así que cuenten como si llevasen armadura metálica además de estar enfermados una ronda. Este efecto permanecerá hasta que pierdas la concentración y puedes reactivarlo gastando una acción.",
  empower: "Aumenta el tamaño un paso y el daño por un dado.",
)

#ability-card(
  name: "Metal Líquido",
  tags: ("Metal", "Reacción", "Duradera"),
  cost: "1 Acción/Reacción, 2 chi",
  duration: "Una ronda",
  desc: "Te transformas en metal líquido y fluido. Obtienes Inmunidad a efectos Físicos no mágicos, Agarres, Mentales y Aflicciones, pero pierdes toda tu Defensa y recibes Vulnerabilidad a daño Eléctrico y Ácido. Solo puedes emplear Magia de Metal mientras estés en esta forma. Esta habilidad puede emplearse como reacción para evitar automáticamente un efecto.",
  empower: "Extiende este efecto durante una ronda adicional.",
)

==== Rango VI — Rango VI

_Pasiva: Aumenta tu estadística de Carisma por 1._

#ability-card(
  name: "Forma Elemental",
  tags: ("Metal", "Mejora", "Duradera"),
  cost: "1 acción, 5 chi",
  duration: "Seis rondas",
  desc: "Obtienes +40 Vitalidad temporal. Tus estadísticas físicas y SAB/CAR pasan a 12, tu Defensa base pasa a ser 20 y añades +1 dado de daño a tus hechizos. Obtienes Inmunidad a Aflicciones y efectos de Toque, y tienes activos los hechizos Hilos de Acero y Armadura de Hierro, recibiendo así velocidad de vuelo igual a tu velocidad base, Ventaja en Esquiva y contadores de escudo iguales a tu Rango. Tus hechizos de Magia de Metal de Rango III o menos no te costarán chi para ser lanzados.",
)
