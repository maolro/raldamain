#import "../theme.typ": *

El fuego es el elemento más antiguo de la civilización: fuente de calor, herramienta de destrucción y símbolo de transformación. Los maestros de la Magia de Fuego comprenden que las llamas no son simplemente calor: son energía con voluntad propia que consume, purifica y renueva. Este rango convierte ese entendimiento en un arsenal de llamaradas, explosiones y muros de fuego que niegan el movimiento enemigo mientras el practicante canaliza las llamas para protegerse. En sus expresiones más avanzadas, el fuego obedece como un segundo cuerpo.

#tip-box[
  *Reserva de Chi:* Incrementa por Rango x 2.
  *Estadística principal:* Carisma + Rango.
  *Parada mágica:* Usas Magia de Fuego para defensa. Protege contra Fuego, Frío, Radiante, Agua y Naturaleza.
]

==== Rango I — Iniciado

#ability-card(
  name: "Llamarada",
  tags: ("Fuego", "Ataque", "A distancia"),
  cost: "1+ acciones",
  range: "Medio",
  crit: "Objetivo sufre quemadura leve.",
  desc: "Inflige 1d6 + CAR daño Fuego y prende objetos inflamables. Puedes emplear una acción adicional aumentar el daño base de este ataque por 1d6 (máx 2 veces).",
  empower: "Haz un ataque contra un objetivo adicional o haz un segundo ataque contra el mismo objetivo contra el cual deberá emplear su mismo resultado defensivo.",
)

#ability-card(
  name: "Aliento de Fuego",
  tags: ("Fuego", "Ataque", "Área"),
  cost: "2 acciones, 1 chi",
  area: "Cono pequeño",
  crit: "Afectados sufren quemadura leve.",
  desc: "Inflige 2d6 + CAR daño Fuego a todos los objetivos en el área. Prende objetos y elimina efectos de Hielo, Agua o Naturaleza.",
  empower: "Aumenta tamaño un paso y añade un dado de daño adicional (máximo 2 veces).",
)

#ability-card(
  name: "Fuego Interno",
  tags: ("Innata", "Pasiva"),
  desc: "Obtienes Resistencia al daño Fuego y Frío, además de Inmunidad al calor y frío extremo. Tienes también visión térmica a distancia media.",
)

==== Rango II — Adepto

_Pasiva: Aumenta estadística de Destreza por 1_

#ability-card(
  name: "Muro de Llamas",
  tags: ("Fuego", "Defensivo", "Duradero"),
  cost: "1 acción, 1 chi",
  range: "Medio",
  area: "Esfera pequeña / Línea media",
  duration: "Concentración",
  crit: "Afectados sufren quemadura media.",
  desc: "Crea un muro con PV iguales a tu Rango x 3. El muro proporciona cubierta parcial e inflige 1d6 + CAR daño Fuego a las criaturas que intenten cruzarlo. Si se emplea como reacción defensiva, reduce el daño de un ataque que recibas por un valor igual a sus PV.",
  empower: "Restaura todos los PV del muro.",
)

#ability-card(
  name: "Bola de Fuego",
  tags: ("Fuego", "Ataque", "Área"),
  cost: "1+ acciones, 1 chi",
  range: "Medio",
  area: "Radio pequeño",
  crit: "Afectados sufren quemadura media.",
  desc: "Inflige 2d6 + CAR daño Fuego al impactar. Puedes cargar con acciones adicionales, aumentando el daño en 1d6 y el tamaño un paso por cada acción extra (máximo 2 cargas).",
  empower: "Lanza una bola adicional con la misma carga a otro objetivo.",
)

#ability-card(
  name: "Infusión de Fuego",
  tags: ("Fuego", "Pasiva"),
  desc: "Tus armas infligen 1d6 daño Fuego adicional al impactar y cuentan como mágicas. Puedes emplear tu modificador de Magia de Fuego para todos tus tiros relacionados con armas. El daño Fuego aumenta a 2d6 a Rango IV y a 3d6 a Rango VI.",
)

==== Rango III — Profesional

_Pasiva: Los dados de daño base aumentan a d10._

#ability-card(
  name: "Erupción Abrasadora",
  tags: ("Fuego", "Ataque", "Área"),
  cost: "1 Acción, 2 chi",
  area: "Esfera pequeña",
  crit: "Afectados sufren quemadura media.",
  desc: "Crea una explosión centrada en ti que inflige 3d8 + CAR daño Fuego al impactar y una quemadura leve. Si el objetivo ya tiene una quemadura, solo puede defenderse con un tiro de salvación de Voluntad.",
  empower: "Aumenta el área de efecto de este hechizo por un paso y el daño por un dado adicional, o ataca de nuevo a todas las criaturas en el área afectada.",
)

#ability-card(
  name: "Propulsión",
  tags: ("Fuego", "Duradera"),
  cost: "1 Acción, 2 chi",
  duration: "Concentración",
  desc: "Obtienes velocidad de vuelo 2 y Ventaja en tus tiros de Esquiva. No puedes acabar tu turno en el aire.",
  empower: "Te mueves un paso y reduces el daño de un ataque enemigo a la mitad. Cuesta 1 reacción.",
)

#ability-card(
  name: "Elemento del Poder",
  tags: ("Innata", "Pasiva"),
  desc: "Reduce tu Vitalidad o PV máximos por 2 para reducir el coste de un hechizo en 1 chi (mínimo 1).",
)

==== Rango IV — Experto

_Pasiva: Aumenta estadística de Carisma por 1_

#ability-card(
  name: "Renacer del Fénix",
  tags: ("Fuego", "Reacción", "Sanación"),
  cost: "1 Acción/Reacción, 1 chi",
  desc: "Recuperas Vitalidad igual a tu Rango x 2 y reduces el nivel de Herido (permanente) por un paso. Requiere estar en un lugar en llamas o sufrir un ataque de daño Fuego, cuyo daño se anula de inmediato.",
)

#ability-card(
  name: "Torbellino de Fuego",
  tags: ("Fuego", "Ataque", "Área"),
  cost: "2 acciones, 2 chi",
  range: "Medio",
  area: "Cilindro pequeño",
  duration: "Concentración",
  crit: "Afectados sufren quemadura media.",
  desc: "Crea un torbellino móvil que inflige 3d8 + CAR daño Fuego y una quemadura. Deja un rastro de Muro de Llamas y puede moverse como acción.",
  empower: "Crea un torbellino extra o aumenta el daño de un torbellino en 1d8 y su alcance un paso durante una ronda.",
)

#ability-card(
  name: "Maestro de las Llamas",
  tags: ("Fuego", "Duradera"),
  cost: "2 acciones, 2 chi",
  duration: "Concentración",
  desc: "Obtienes Ventaja en todos tus tiros relacionados con Magia de Fuego, recibes un dado de daño en tus tiros relacionados con ellos (esto se aplica también a Magia de Tormenta y Aire) y el espacio a distancia media de ti cuenta como calor extremo. Recibes una cantidad de contadores de escudo igual a tu Rango.",
  empower: "El siguiente hechizo de fuego cuesta -1 acción.",
)

==== Rango V — Maestro

_Pasiva: Los dados de daño base aumentan a d10._

#ability-card(
  name: "Lluvia de Brasas",
  tags: ("Fuego", "Ataque", "Área"),
  cost: "2 acciones, 3 chi",
  range: "Medio",
  area: "4 Esferas pequeñas",
  crit: "Afectados sufren quemadura grave.",
  desc: "Lanza 4 explosiones simultáneas que infligen 4d10 + CAR daño Fuego. Puedes dejar bolas suspendidas para lanzarlas en un turno posterior.",
  empower: "Crea una bola de fuego adicional, atacando a otra localización o al mismo punto otra vez.",
)

#ability-card(
  name: "Rayo de Plasma",
  tags: ("Fuego", "Ataque", "Área"),
  cost: "1 acción, 3 chi",
  range: "Lejano",
  area: "Línea grande",
  crit: "Herido-3 (permanente).",
  desc: "Rayo que inflige 4d10 + CAR daño Radiante. Ignora muros, armadura y escudos.",
  empower: "Afecta a un objetivo adicional que puedas alcanzar o lanza de nuevo este hechizo sin la necesidad de pagar chi.",
)

#ability-card(
  name: "Llama Viviente",
  tags: ("Fuego", "Duradera", "Reacción"),
  cost: "1 Acción/Reacción, 2 chi",
  duration: "1 Ronda",
  desc: "Te transformas en fuego. Obtienes Inmunidad a efectos Físicos no-mágicos, Agarres, Mentales, Fuego y Aflicciones, pero pierdes toda tu Defensa y recibes Vulnerabilidad a efectos de Agua y Hielo. Esta habilidad puede emplearse como reacción para evitar automáticamente un efecto.",
)

==== Rango VI — Ascendido

_Pasiva: Aumenta estadística de Constitución por 1._

#ability-card(
  name: "Forma Elemental",
  tags: ("Fuego", "Duradera"),
  cost: "1 acción, 5 chi",
  duration: "Seis rondas",
  desc: "Obtienes +20 Vitalidad temporal. Tus estadísticas físicas y CAR pasan a 12, tu Defensa base pasa a ser 20 y añades +1 dado de daño a tus hechizos. Obtienes Inmunidad a Aflicciones y Toque y tienes activos los hechizos Aura Abrasadora y Propulsión, recibiendo así velocidad de vuelo 2 y contadores de escudo iguales a tu Rango. Tus hechizos de Magia de Fuego de Rango III o menos no te costarán chi para ser lanzados.",
)
