#import "theme.typ": *

= Hoja de Personaje

La *hoja de personaje* es el documento donde registras toda la información de tu personaje. En Raldamain, la ficha se divide en secciones claras que cubren estadísticas, valores defensivos, habilidades y equipo.

== Información básica

En la parte superior de la hoja encontrarás:

- *Nombre:* El nombre de tu personaje en el mundo.
- *Nivel:* Tu nivel actual (1–20+). Representa la experiencia acumulada.
- *Raza / Ascendencia:* El origen de tu personaje, que puede otorgar habilidades pasivas especiales.
- *Rangos:* La lista de disciplinas que has entrenado y el nivel alcanzado en cada una.

== Estadísticas principales

Las seis estadísticas son el núcleo de tu personaje. Cada una tiene un valor numérico que se suma a tus tiradas de d20.

#table(
  columns: (1.4fr, 0.6fr, 2fr),
  fill: (_, row) => if row == 0 { teal-lt } else if calc.odd(row) { rgb("#f8faf9") } else { white },
  stroke: 0.3pt + rgb("#cccccc"),
  inset: (x: 7pt, y: 5pt),
  [*Estadística*], [*Abr.*], [*Rol en el juego*],
  [Fuerza],       [FUE],    [Ataques cuerpo a cuerpo, atletismo, maniobras],
  [Destreza],     [DES],    [Ataques ágiles/distancia, esquiva, sigilo, iniciativa],
  [Constitución], [CON],    [Puntos de vida, vitalidad, resistencia física],
  [Inteligencia], [INT],    [Magia arcana, conocimientos, concentración],
  [Sabiduría],    [SAB],    [Magia divina, percepción, voluntad],
  [Carisma],      [CAR],    [Magia elemental, persuasión, resistir miedo],
)

#tip-box[
  Los valores de estadística van de −1 (pésimo) a 9 (mítico). Un personaje recién creado parte del *Array Inicial:* *3, 2, 2, 2, 1, 1*. Consulta el Capítulo 2 para ver cómo progresan.
]

== Valores defensivos

=== Puntos de Vida (PV)

Representan tu integridad física real. Cuando llegan a 0 quedas *Inconsciente* y comienzas a perder la vida. Solo se recuperan con un Descanso Largo o magia de sanación.

#formula-box[
  *PV (Nivel 1):* 3 + CON #h(2em) *Progresión:* +1 cada 3 niveles
]

=== Vitalidad (VT)

Es tu primera barrera ante el daño — aguante, suerte y energía. Todo daño va primero a la Vitalidad. Se recupera completamente con un *Descanso Corto*.

#formula-box[
  *Vitalidad:* 2 + CON + Nivel
]

=== Defensa (DEF)

Reduce el daño de cada impacto de forma pasiva. Proviene de la armadura y ciertos talentos o habilidades. A diferencia de las Resistencias, se aplica a todo tipo de daño físico.

=== Cordura

Tu resistencia mental. Si llega a 0, el personaje sufre una *Locura* con consecuencias narrativas y mecánicas. Se recupera con Descanso Largo.

#formula-box[
  *Cordura:* 2 + Nivel + INT
]

=== Tiros de Salvación

Existen tres salvaciones que representan tu capacidad de resistir efectos adversos:

- *Físico (FÍS):* Resistir venenos, enfermedades, empujones y efectos corporales. Usa FUE o CON.
- *Voluntad (VOL):* Resistir miedo, intimidación y efectos emocionales. Usa CAR o CON.
- *Mental (MEN):* Resistir ilusiones, control mental y efectos psíquicos. Usa INT o SAB.

Cuando una habilidad pide un tiro de salvación, tiras `1d20 + estadística relevante` contra la CD del efecto.

== Acciones y reacciones

Cada personaje dispone en combate de:

#table(
  columns: (auto, 1fr),
  fill: (_, row) => if row == 0 { teal-lt } else if calc.odd(row) { rgb("#f8faf9") } else { white },
  stroke: 0.3pt + rgb("#cccccc"),
  inset: (x: 7pt, y: 5pt),
  [*Recurso*], [*Descripción*],
  [*3 Acciones / turno*],   [Se gastan en tu turno para atacar, moverse o usar habilidades],
  [*2 Reacciones / ronda*], [Se gastan fuera de tu turno para esquivar, parar o reaccionar],
  [*Acción Bonus*],         [Extra gratuita otorgada por habilidades específicas; no consume las 3 acciones base],
)

== Chi

El *Chi* representa tu fuerza interior: la energía que canalizas en tus hechizos, técnicas marciales y demás habilidades de Rango. Tu reserva total de Chi es igual a tu *número de Rangos × 2*, sin importar la disciplina. Se recupera completamente con un *Descanso Largo*; un *Descanso Corto* recupera la mitad. _(Ver Cap. 3 para más detalles)_

== Talentos

Los talentos reflejan el entrenamiento no combativo de tu personaje: sigilo, medicina, atletismo, etc. Cada talento tiene un nivel del 0 al 5 que se suma a la estadística correspondiente en pruebas relacionadas.

#formula-box[
  *Prueba de Talento:* 1d20 + Estadística + Nivel de Talento vs. CD
]

== Rangos de combate

Los Rangos son las disciplinas de combate y magia. Cada personaje domina varios Rangos simultáneamente, desde Rango I (iniciado) hasta Rango VI (ascendido). Consulta el Capítulo 3 para la lista completa.

== Equipo

La sección de equipo registra tus armas, armadura y objetos. Las armas determinan tu modificador de ataque según su tipo, y la armadura define tu DEF base. Consulta el Capítulo 4 para tablas detalladas.
