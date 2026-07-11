#import "../theme.typ": *

Cuando el Coloso entra en combate, el suelo tiembla. Las armas de dos manos en manos de un experto no son solo armas: son herramientas de demolición que derriban muros y rompen formaciones enteras. El Estilo Coloso sacrifica la gracia y la defensa por una filosofía simple: quien reciba un golpe tuyo no volverá a levantarse con facilidad. A medida que el rango crece, el Coloso aprende a proyectar su chi a través del arma, convirtiendo sus ataques en fuerzas de la naturaleza que ninguna armadura puede ignorar.

#tip-box[
  *Reserva de Chi:* Incrementa por Rango x 2.
  *Estadística principal:* Fuerza + Rango.
]

==== Rango I — Iniciado

#ability-card(
  name: "Ataque Poderoso",
  tags: ("Pesada", "Mejora"),
  cost: "1 acción",
  desc: "Tu siguiente ataque provoca un dado de daño adicional. Debes declarar esta habilidad antes de atacar.",
)

#ability-card(
  name: "Golpe Desestabilizador",
  tags: ("Pesada", "Mejora"),
  cost: "1 chi",
  desc: "Al impactar, el objetivo debe superar un tiro de salvación de Físico o es empujado un paso y cae con Ralentizado-1. También funciona contra enemigos que detengan el ataque con Parada.",
)

==== Rango II — Adepto

#ability-card(
  name: "Gran Barrido",
  tags: ("Pesado", "Mejora", "Área"),
  cost: "1 chi",
  area: "Radio Corto",
  desc: "Tu siguiente ataque afecta a todos los enemigos en radio corto y provoca +1d6 daño. Al impactar, empujas a los afectados un paso hacia atrás.",
)

#ability-card(
  name: "Guardia Fluida",
  tags: ("Pesado", "Mejora"),
  cost: "2 acciones, 1 chi",
  duration: "Una ronda",
  desc: "Terminas inmediatamente tu turno. Hasta el inicio de tu siguiente turno, puedes atacar como reacción a cada criatura que entre en tu alcance. Al impactar, empujas al objetivo un paso hacia atrás. Pierdes este efecto si pierdes la concentración o te mueves.",
)

#ability-card(
  name: "Lanzamiento",
  tags: ("Pesado", "Mejora"),
  cost: "1 acción, 1 chi",
  desc: "Lanzas un arma u objeto a un objetivo a distancia media, provocando +1d6 daño adicional (si es un objeto, su daño base es 3d6). Al impactar a un enemigo volador, este debe superar un tiro de salvación de Voluntad o cae inmediatamente al suelo.",
)

#ability-card(
  name: "Reposición Forzosa",
  tags: ("Pesado", "Reacción"),
  cost: "1 chi",
  desc: "Cuando un enemigo esquiva exitosamente tu ataque, debe superar un tiro de salvación de Físico o es movido un paso y sufre Desventaja en su siguiente tiro defensivo.",
)

==== Rango III — Profesional

#ability-card(
  name: "Golpe Demoledor",
  tags: ("Pesado", "Mejora"),
  cost: "1 chi",
  desc: "Al impactar, eliminas un contador de escudo del objetivo y rompes su armadura. Si el objetivo detiene tu ataque con Parada, puedes emplear esta habilidad para romper su arma. No funciona contra objetos con dureza superior a la de tu arma.",
)

#ability-card(
  name: "Carga Salvaje",
  tags: ("Pesado", "Mejora"),
  cost: "2 chi",
  range: "Línea media",
  desc: "Te mueves como acción bonus y atacas a cada enemigo en tu camino. Estos ataques provocan +1d6 daño y al impactar empujan y dejan con Ralentizado-1 a los objetivos.",
)

#ability-card(
  name: "Golpe Aturdidor",
  tags: ("Pesado", "Mejora"),
  cost: "2 chi",
  desc: "Al impactar, el objetivo debe superar un tiro de salvación de Voluntad o queda con Aturdido-2 durante una ronda. Se declara al impactar.",
)

==== Rango IV — Experto

#ability-card(
  name: "Golpe Ascendente",
  tags: ("Pesado", "Mejora"),
  cost: "2 chi",
  desc: "Saltas verticalmente y realizas un ataque que provoca +2d6 daño. Contra un enemigo volador, este sufre Desventaja en su tiro defensivo y al impactar cae con Ralentizado-1 al suelo.",
)

#ability-card(
  name: "Golpe por Golpe",
  tags: ("Pesado", "Reacción"),
  cost: "1 reacción, 2 chi",
  desc: "Te dejas impactar por un ataque enemigo para impactar automáticamente al atacante. Ambos ataques se resuelven a la vez. Debes declarar esta habilidad en lugar de realizar Parada.",
)

#ability-card(
  name: "Maestría de Estilo",
  tags: ("Pesado", "Duradera"),
  cost: "2 acciones, 2 chi",
  duration: "Seis rondas",
  desc: "Entras en un estado que te otorga Ventaja en todos tus tiros relacionados con Estilo Coloso y una cantidad de contadores de escudo igual a tu Rango. Termina si pierdes la concentración.",
)

#ability-card(
  name: "Secuencia de Golpes",
  tags: ("Pesado", "Mejora"),
  cost: "1 chi",
  desc: "Realizas dos ataques contra el mismo objetivo, quien solo tira una vez para defenderse. Al impactar, empujas al objetivo un paso y puedes perseguirlo como acción bonus. Debes declarar esta habilidad antes de atacar.",
)

==== Rango V — Maestro

#ability-card(
  name: "Impacto Meteoro",
  tags: ("Pesado", "Mejora"),
  cost: "3 chi",
  desc: "Saltas dos pasos y realizas un ataque que provoca 2d6 daño adicional a cada criatura en un radio medio. Al impactar, los objetivos caen con Ralentizado-1. Este ataque destruye estructuras frágiles y muros.",
)

#ability-card(
  name: "Impacto Mortal",
  tags: ("Pesado", "Mejora"),
  cost: "1 acción, 3 chi",
  range: "Cuerpo a cuerpo",
  crit: "Objetivo recibe Herido-4 (Herida Crítica Incurable).",
  desc: "Tu siguiente ataque provoca 3d6 daño adicional al impactar, inflige Herido-3 y elimina todos los contadores de escudo o muros del objetivo, además de romper completamente su arma o armadura. Debes declarar esta habilidad antes de atacar. No funciona contra armas o armaduras de dureza superior a la de tu arma.",
)

#ability-card(
  name: "Proyección de Chi",
  tags: ("Pesado", "Pasiva"),
  desc: "El daño de tu arma cuenta como mágico para los propósitos de resistencias e inmunidades y tu alcance con ella aumenta a medio. Además, puedes emplear tu arma para detener ataques mágicos o de área.",
)
