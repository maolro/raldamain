#import "../theme.typ": *

El Duelista no combate: negocia. Cada parada es una respuesta, cada finta una pregunta, y cada golpe la conclusión lógica de un argumento que el oponente no supo refutar. El Estilo Duelista perfecciona el arte del combate individual, convirtiendo la esgrima en un lenguaje con el que el practicante expresa superioridad técnica sobre cualquier adversario. Los mejores duelistas resuelven un combate sin recibir un solo golpe, usando las defensas propias para crear las oportunidades que terminan la pelea.

#tip-box[
  *Reserva de Chi:* Incrementa por Rango x 2.
  *Estadística principal:* Fuerza o Destreza + Rango.
]

==== Rango I — Iniciado

#ability-card(
  name: "Defensa Hábil",
  tags: ("Duelo", "Pasiva"),
  desc: "Al defenderse, tira tanto Esquiva como Parada y se queda con el mejor resultado.",
)

#ability-card(
  name: "Preparación contra Cargas",
  tags: ("Duelo", "Maniobra"),
  cost: "2 acciones, 1 chi",
  desc: "Termina su turno entrando en posición defensiva. Puede realizar un ataque de oportunidad a cada enemigo que entre en una posición que alcance, el cual empuja al impactar. El efecto termina al inicio de su siguiente turno, al recibir un impacto o al moverse. No afecta a enemigos que ya pueda alcanzar.",
)

==== Rango II — Adepto

#ability-card(
  name: "Finta Engañosa",
  tags: ("Duelo", "Visual"),
  cost: "1 chi",
  desc: "Si su ataque es detenido exitosamente, provoca Desventaja al objetivo en su siguiente ataque. Si el ataque impacta, no hace daño ni provoca efectos. Debe declararse antes de atacar y puede identificarse con un tiro exitoso de Mente.",
)

#ability-card(
  name: "Ataque Torbellino",
  tags: ("Duelo", "Mejora"),
  cost: "1 chi",
  desc: "Ataca a cada enemigo que alcance y empuja hacia atrás a todos los que impacte. Aplica mejoras de ataque a todos los golpes.",
)

#ability-card(
  name: "Estocada Fuerte",
  tags: ("Duelo", "Mejora"),
  cost: "1 chi",
  desc: "Al impactar provoca un dado de daño adicional y Herido-1 en la parte del cuerpo que escoja. Debe declararse antes de atacar.",
)

#ability-card(
  name: "Secuencia de Golpes",
  tags: ("Duelo", "Mejora"),
  cost: "1 chi",
  desc: "Hace dos ataques contra el mismo objetivo, quien solo tira una vez para defenderse. Solo puede usarse con armas de una mano.",
)

==== Rango III — Profesional

#ability-card(
  name: "Carga del Espadachín",
  tags: ("Duelo", "Mejora"),
  cost: "1 chi",
  desc: "Realiza un movimiento como acción bonus y ataca a cada enemigo en su camino, recibiendo un dado de daño adicional en cada ataque.",
)

#ability-card(
  name: "Contrataque",
  tags: ("Duelo", "Reacción"),
  cost: "1 reacción, 2 chi",
  desc: "En respuesta a ser atacado, realiza un ataque como reacción. Al impactar, interrumpe la acción enemiga y gasta toda su reserva de chi empleada en ella, incluyendo si el objetivo emplea una reacción defensiva.",
)

#ability-card(
  name: "Espadas Trabadas",
  tags: ("Duelo", "Maniobra"),
  cost: "1 chi",
  desc: "Al ser detenido con Parada, puede forzar al afectado a superar un tiro físico o su arma queda agarrada. Si el arma ya está agarrada, puede usar esta habilidad para desarmarle. Cada intento de repetir el tiro cuesta una acción y provoca apertura.",
)

==== Rango IV — Experto

#ability-card(
  name: "Maestría de Arma",
  tags: ("Duelo", "Duradera"),
  cost: "2 acciones, 2 chi",
  desc: "Entra en un estado donde recibe Ventaja en todos sus tiros relacionados con armas y puede moverse al atacar o defenderse sin provocar aperturas.",
  empower: "(1 Reacción) Reduce el daño de un ataque enemigo a la mitad.",
)

#ability-card(
  name: "Cortar el Acero",
  tags: ("Duelo", "Mejora"),
  cost: "1 chi",
  desc: "Su ataque elimina un contador de escudo del objetivo y rompe su armadura. Si el objetivo ha detenido el ataque con Parada, rompe el arma en su lugar.",
)

#ability-card(
  name: "Impacto Aéreo",
  tags: ("Duelo", "Mejora"),
  cost: "2 chi",
  desc: "Vuela dos pasos antes de atacar y tira un dado de daño adicional. Los objetivos voladores tienen Desventaja al defenderse. Si hiere a un objetivo volador, este debe superar un tiro de salvación Físico o cae al suelo.",
)

==== Rango V — Maestro

#ability-card(
  name: "Muerte por Mil Cortes",
  tags: ("Duelo", "Mejora"),
  cost: "2 acciones, 3 chi",
  desc: "Realiza cuatro ataques contra un mismo objetivo, quien solo puede tirar defensa una vez. Cada ataque consecutivo tira con +1 al tiro de ataque y al daño, y todos provocan Herido-1.",
)

#ability-card(
  name: "Partir Montañas",
  tags: ("Duelo", "Mejora"),
  cost: "3 chi",
  desc: "Su siguiente ataque añade 2 dados de daño y afecta a cada objetivo en un radio medio o una línea grande. Destruye barreras y estructuras en su camino, y lanza por los aires y tropieza a todo objetivo que impacte.",
)

#ability-card(
  name: "Proyección de Chi",
  tags: ("Duelo", "Pasiva"),
  desc: "Puede detener ataques mágicos y de área con su arma. Duplica el alcance de su arma y su daño cuenta como mágico a efectos de resistencias e inmunidades.",
)
