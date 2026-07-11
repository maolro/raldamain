#import "../theme.typ": *

El Plano Sombrío es el espejo oscuro del mundo material: un lugar donde la luz no llega y los sueños se pudren hasta convertirse en pesadillas. Los maestros de la Magia Sombría han aprendido a extraer energía de ese lugar y usarla en el mundo real, drenando la vitalidad de sus enemigos, creando oscuridad impenetrable y materializando los miedos de quienes se atreven a enfrentarlos. Es una magia lenta y deliberada, especializada en control y desgaste: quien lucha contra un maestro de las sombras descubre que el verdadero combate ocurre en la mente.

#tip-box[
  *Reserva de Chi:* Incrementa por Rango x 2.
  *Estadística principal:* Carisma + Rango.
]

==== Rango I — Rango I

#ability-card(
  name: "Toque Drenador",
  tags: ("Sombría", "Toque", "Aflicción", "Frío"),
  cost: "1 acción",
  range: "Cuerpo a cuerpo",
  duration: "Instantáneo",
  crit: "El afectado queda con Fatigado-1 durante una ronda.",
  desc: "Realizas un ataque de toque. El objetivo debe superar un tiro de salvación de CON o sufre 1d6 + Rango daño Frío. Además, reduce su Vitalidad y PV máximos (Aflicción nivel 1).",
  empower: "Aumenta el alcance a medio.",
)

#ability-card(
  name: "Tajo Umbrío",
  tags: ("Sombría", "Ataque", "A Distancia", "Frío"),
  cost: "1 acción",
  range: "Medio",
  duration: "Instantáneo",
  crit: "El afectado queda con Fatigado-1 durante una ronda.",
  desc: "Lanzas un corte de energía sombría a distancia. Inflige 1d6 + Rango daño Frío y reduce la Vitalidad y PV máximos del objetivo (Aflicción nivel 1).",
  empower: "Afecta a una criatura adicional a distancia media.",
)

#ability-card(
  name: "Crear Oscuridad",
  tags: ("Sombría", "Gaseosa", "Duradera"),
  cost: "2 acciones, 1 chi",
  range: "Medio",
  area: "Esfera pequeña",
  duration: "Concentración",
  desc: "Creas una nube de oscuridad que apaga fuentes de luz y disipa hechizos de Vida de Rango menor. Las criaturas dentro quedan con Confundido-1 y obtienen ocultamiento.",
  empower: "Extiende el área a esfera mediana o mueve la nube un paso.",
)

==== Rango II — Rango II

#ability-card(
  name: "Bola Sombra",
  tags: ("Sombría", "Ataque", "Área", "Frío"),
  cost: "1 o más acciones, 1 chi",
  range: "Medio",
  area: "Esfera pequeña",
  duration: "Instantáneo",
  crit: "El afectado queda con Fatigado-1 durante una ronda.",
  desc: "Lanzas una explosión de energía sombría que inflige 1d6 + CAR daño Frío y reduce Vitalidad y PV máximos. Puedes cargarla: por cada 2 acciones adicionales gastadas (máximo 4 acciones totales), aumenta el daño en +1d6 y el radio en +1 paso. Requiere oscuridad para cargar.",
  empower: "Lanza una bola sombría adicional a otro objetivo.",
)

#ability-card(
  name: "Capullo Sombrío",
  tags: ("Sombría", "Defensiva", "Duradera"),
  cost: "1 acción, 1 chi",
  duration: "Concentración",
  desc: "Te envuelves en sombras protectoras. Obtienes Vitalidad temporal igual a Rango x 3, Inmunidad a efectos de Toque y Ocultamiento. Los enemigos adyacentes sufren 1d6 + Rango daño Frío y reducción de Vitalidad y PV máximos.",
  empower: "Recuperas toda la Vitalidad temporal (solo en oscuridad).",
)

#ability-card(
  name: "Oscuridad Devoradora",
  tags: ("Sombría", "Agarre", "Duradera"),
  cost: "1 acción, 1 chi",
  range: "Medio",
  duration: "Concentración",
  crit: "El afectado queda con Fatigado-1 durante una ronda.",
  desc: "Solidificas la oscuridad para atrapar a un objetivo. El objetivo debe superar un tiro de Heroísmo o Destrozar contra tu Sombría o queda Enredado y sufre 1d6 + Rango daño Frío. Mientras permanezca atrapado, sufre daño recurrente cada vez que falle el tiro para escapar.",
  empower: "Afecta a un objetivo adicional.",
)

==== Rango III — Rango III

_Pasiva: Todos tus hechizos Sombríos sustituyen sus dados de daño por d8._

#ability-card(
  name: "Tentáculos de Oscuridad",
  tags: ("Sombría", "Frío", "Ataque", "Agarre", "Duradera"),
  cost: "2 acciones, 2 chi",
  range: "Medio",
  area: "Radio corto",
  duration: "Concentración",
  crit: "Todos los afectados son agarrados automáticamente.",
  desc: "Invocas tentáculos de oscuridad en un área. Los objetivos sufren 1d8 + CAR daño Frío y deben superar un tiro de Heroísmo o Atletismo o quedan agarrados. Las criaturas agarradas sufren daño Necrótico recurrente al inicio de cada turno.",
  empower: "Como reacción, puedes redirigir un ataque recibido hacia una criatura agarrada por los tentáculos.",
)

#ability-card(
  name: "Maldición de Shade",
  tags: ("Sombría", "Mejora", "Maldición"),
  cost: "2 chi",
  duration: "Hasta que sea eliminada",
  desc: "Al impactar con un ataque Sombrío, puedes maldecir al objetivo. La maldición impide toda curación y recuperación de cordura. El efecto empeora con el daño recibido o el paso del tiempo: nivel 1 (sin moral), nivel 2 (Fatigado-3), nivel 3 (Confundido-4), nivel 4 (muerte o transformación en Criatura Sombría).",
  empower: "Realizas un ataque de Toque Sombrío como acción bonus contra un objetivo maldito.",
)

#ability-card(
  name: "Terror Nocturno",
  tags: ("Sombría", "Duradera", "Miedo", "Visual"),
  cost: "2 acciones, 2 chi",
  range: "Medio",
  area: "Esfera media",
  duration: "Concentración",
  desc: "Creas una nube de pesadillas vivientes. Obtienes Ventaja en tiros de Sombría dentro del área. Los enemigos deben superar un tiro de Voluntad o Percepción o sufren Miedo +1 y quedan atrapados en el área. La nube otorga ceguera y ocultamiento.",
  empower: "Tu siguiente hechizo Sombrío cuesta -1 acción.",
)

==== Rango IV — Rango IV

#ability-card(
  name: "Titiritero Sombrío",
  tags: ("Sombría", "Duradera", "Agarre"),
  cost: "1 acción, 2 chi",
  range: "Medio",
  duration: "Concentración",
  desc: "Tomas el control de los movimientos de un enemigo que se encuentre en oscuridad. El objetivo debe superar un tiro de Heroísmo o Destrozar contra tu Sombría o queda agarrado. Puedes gastar tus propias acciones para forzar al objetivo a actuar según tus órdenes.",
  empower: "Afecta a un objetivo adicional.",
)

#ability-card(
  name: "Clones Sombríos",
  tags: ("Sombría", "Invocación", "Duradera"),
  cost: "2 acciones, 2 chi",
  duration: "Concentración",
  desc: "Creas clones sombríos de ti mismo (cantidad igual a tu Rango). Cada clon tiene la mitad de tu nivel y 1 PV, y son inmunes a efectos de Mente, Miedo y Toque. Mientras estés oculto, puedes redirigir ataques dirigidos a ti hacia uno de tus clones.",
  empower: "Crea un clon sombrío adicional.",
)

#ability-card(
  name: "Oscuridad Enloquecedora",
  tags: ("Sombría", "Mental", "Visual", "Duradera"),
  cost: "2 acciones, 2 chi",
  area: "Esfera media",
  duration: "Concentración",
  desc: "Confundes a los enemigos dentro del área (tiro de Voluntad o Concentración para resistir). Si un enemigo tiene la Maldición de Shade, percibe a sus aliados como monstruos. Requiere oscuridad en el área.",
  empower: "Cambias la apariencia de una criatura para redirigir un ataque enemigo hacia otro objetivo.",
)

==== Rango V — Rango V

_Pasiva: Todos tus hechizos Sombríos sustituyen sus dados de daño por d10._

#ability-card(
  name: "Furia de Shade",
  tags: ("Sombría", "Ataque", "Área", "Necrótico"),
  cost: "2 acciones, 3 chi",
  area: "Cono grande",
  duration: "Instantáneo",
  crit: "Los afectados fallan automáticamente su tiro contra la Maldición de Shade.",
  desc: "Liberas un cono devastador de energía sombría que inflige 3d10 + CAR daño Frío. Aplica Maldición de Shade a todos los afectados, crea Tierra Consagrada Sombría y apaga todas las fuentes de luz en el área. Requiere oscuridad.",
  empower: "Tu siguiente hechizo Sombrío puede lanzarse como acción bonus.",
)

#ability-card(
  name: "Ejecución Sombría",
  tags: ("Sombría", "Aflicción", "Necrótico"),
  cost: "1 acción, 3 chi",
  range: "Lejano",
  duration: "Instantáneo",
  crit: "Aumenta el nivel de la Maldición de Shade del objetivo. Si lo mata, se transforma en Criatura Sombría.",
  desc: "Infliges 3d10 + CAR daño Frío a un objetivo que tenga la Maldición de Shade. Si el objetivo falla su tiro de salvación, explota y causa 1d10 daño Frío a todas las criaturas cercanas.",
  empower: "Afecta a un objetivo adicional.",
)

#ability-card(
  name: "Laberinto de Pesadillas",
  tags: ("Sombría", "Espacial", "Duradera"),
  cost: "2 acciones, 3 chi",
  range: "Medio",
  duration: "Concentración",
  desc: "Exilias a un enemigo a un demiplano sombrío (tiro de salvación de Salud contra tu Sombría). Mientras permanezca exiliado, pierde cordura y gana un nivel de Maldición de Shade cada turno. Para escapar, debe acumular 3 éxitos en tiros de Voluntad.",
  empower: "Afecta a un enemigo adicional.",
)

==== Rango VI — Rango VI

#ability-card(
  name: "Eclipse de Sacrificio",
  tags: ("Sombría", "Ataque", "Área", "Frío"),
  cost: "3 acciones, 5 chi",
  range: "Medio",
  area: "Radio grande",
  duration: "Siete rondas",
  desc: "Creas una zona de oscuridad total. Obtienes Ventaja en tiros de Sombría dentro del área. Los enemigos sufren Maldición de Shade progresiva cada ronda. Efectos por ronda: invocas criaturas sombrías (ronda 2), moldeas el terreno (ronda 4) y lanzas Furia de Shade potenciada (ronda 7).",
  empower: "N/A",
)
