#import "../theme.typ": *

El Estilo Asesino no es brutalidad: es eficiencia llevada al extremo. Cada movimiento tiene un propósito, cada golpe apunta a los puntos donde el dolor es mayor y la recuperación más lenta. Aprendes a desaparecer antes de que el enemigo sepa que estabas ahí, a atacar desde ángulos imposibles y a explotar cada fracción de segundo de vulnerabilidad. Los practicantes del Estilo Asesino terminan los combates en los primeros intercambios, o no los terminan bien.

#tip-box[
  *Reserva de Chi:* Incrementa por Rango x 2.
  *Estadística principal:* Destreza + Rango.
]

==== Rango I — Iniciado

#ability-card(
  name: "Apuntar Ataque",
  tags: ("Asesino", "Mejora"),
  cost: "1 acción",
  desc: "Obtienes +2 en tu siguiente tiro de ataque. Este bonus aumenta a +4 a Rango III y a +6 a Rango V.",
)

#ability-card(
  name: "Ataque Furtivo",
  tags: ("Asesino", "Mejora"),
  cost: "1 chi",
  desc: "Tu siguiente ataque provoca un dado de daño adicional y Herido-1 al impactar. Debes declarar esta habilidad antes de atacar.",
)

==== Rango II — Adepto

#ability-card(
  name: "Presionar Defensas",
  tags: ("Asesino", "Mejora", "Visual"),
  cost: "1 chi",
  desc: "Antes de atacar, el objetivo debe superar un tiro de salvación de Mente o sufre Desventaja en su tiro defensivo. El objetivo puede anular este efecto gastando una Premonición. No funciona contra enemigos con Visión Futura.",
)

#ability-card(
  name: "Clavar Arma",
  tags: ("Asesino", "Mejora"),
  cost: "1 chi",
  desc: "Al impactar, tu arma se queda clavada en el objetivo, provocándole 1d6 daño adicional y enfermándolo durante una ronda. Solo funciona con armas perforantes.",
)

#ability-card(
  name: "Secuencia de Puñaladas",
  tags: ("Asesino", "Mejora"),
  cost: "1 chi",
  desc: "Realizas dos ataques contra el mismo objetivo, quien solo tira una vez para defenderse. Solo puede aplicarse a armas de una mano.",
)

#ability-card(
  name: "Ataque Triple",
  tags: ("Asesino", "Mejora"),
  cost: "1 chi",
  desc: "Tu siguiente ataque puede afectar a hasta tres objetivos que puedas alcanzar. Los efectos adicionales que añadas se aplican a todos los ataques.",
)

==== Rango III — Profesional

#ability-card(
  name: "Golpe Penetrante",
  tags: ("Asesino", "Mejora"),
  cost: "2 chi",
  desc: "Tu siguiente ataque ignora la defensa otorgada por la armadura del objetivo y cuenta como mágico para los propósitos de resistencias e inmunidades.",
)

#ability-card(
  name: "Paso del Asesino",
  tags: ("Asesino", "Mejora"),
  cost: "1 chi",
  desc: "Antes de atacar, te mueves como acción bonus sin provocar aperturas. El objetivo sufre Desventaja en su tiro defensivo como si se tratase de un ataque sorpresa. Este efecto se puede anular gantando una Premonición y no funciona contra enemigos con Visión Futura.",
)

#ability-card(
  name: "Cuchillada",
  tags: ("Asesino", "Pasiva"),
  desc: "Puedes tirar Parada además de Esquiva en todos tus tiros defensivos y quedarte con el mejor resultado. Además, puedes realizar un movimiento como acción bonus al atacar o defenderte, el cual sí provoca aperturas.",
)

==== Rango IV — Experto

#ability-card(
  name: "Maestría de Arma",
  tags: ("Asesino", "Duradera"),
  cost: "2 acciones, 2 chi",
  duration: "Seis rondas",
  desc: "Entras en un estado que te otorga Ventaja en todos tus tiros relacionados con Estilo Asesino. Además, tus ataques provocan un dado de daño adicional y Herido-1 al impactar.",
)

#ability-card(
  name: "Impacto Deshabilitante",
  tags: ("Asesino", "Mejora"),
  cost: "2 chi",
  desc: "Al impactar, el objetivo debe superar un tiro de salvación de Voluntad o una parte de su cuerpo queda debilitada como si sufriese Herido-4 (Herida Crítica Incurable). Este efecto desaparece cuando el afectado reciba sanación. La parte del cuerpo afectada es aleatoria salvo que declares esta habilidad antes de atacar.",
)

#ability-card(
  name: "Furia Asesina",
  tags: ("Asesino", "Mejora"),
  cost: "2 chi",
  desc: "Realizas tres ataques contra el mismo objetivo, quien solo tira una vez para defenderse. Tu tiro de ataque y daño aumenta en +1 por cada impacto consecutivo. Todos los ataques cuentan como Ataque Furtivo, provocando un dado de daño adicional y Herido-1 al impactar (no se acumula con dicha habilidad).",
)

==== Rango V — Maestro

#ability-card(
  name: "Impacto Mortal",
  tags: ("Asesino", "Mejora"),
  cost: "3 chi",
  desc: "Al impactar, el objetivo debe superar un tiro de salvación de Voluntad o sufre 4d6 daño irreducible y Herido-4 (Herida Crítica Incurable). En caso de éxito, sufre la mitad de daño. Este efecto puede activarse con retraso.",
)

#ability-card(
  name: "Masacre",
  tags: ("Asesino", "Mejora"),
  cost: "3 chi",
  desc: "Tu siguiente ataque afecta a todos los enemigos en un radio medio y provoca 2d6 daño adicional y Herido-1 al impactar. Al terminar el ataque, puedes aparecer en cualquier posición dentro del área afectada sin provocar aperturas.",
)

#ability-card(
  name: "Proyección de Chi",
  tags: ("Asesino", "Pasiva"),
  desc: "El daño de tu arma cuenta como mágico para los propósitos de resistencias e inmunidades y tu alcance con ella aumenta a medio. Además, puedes emplear tu arma para detener ataques mágicos o de área.",
)
