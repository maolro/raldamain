#import "theme.typ": *

= Estadísticas y Talentos

== Distribución inicial

A *Nivel 1* dispones de los siguientes valores para asignar a tus seis estadísticas libremente:

#formula-box[
  *Array Inicial:* 3 · 2 · 2 · 2 · 1 · 1
]

*Regla de Ajuste:* Al crear el personaje puedes reducir una estadística en −1 para aumentar otra en +1. El mínimo es −1 y el máximo inicial es 3.

=== Progresión y límites

Cada vez que subes de nivel puedes aumentar una estadística en +1. Tu potencial está limitado por tu nivel:

#table(
  columns: (1.2fr, 1fr),
  fill: (_, row) => if row == 0 { teal-lt } else if calc.odd(row) { rgb("#f8faf9") } else { white },
  stroke: 0.3pt + rgb("#cccccc"),
  inset: (x: 7pt, y: 5pt),
  [*Franja de Nivel*], [*Estadística máxima*],
  [Nivel 1],     [3],
  [Nivel 2–5],   [4],
  [Nivel 6–8],   [5],
  [Nivel 9–11],  [6],
  [Nivel 12–14], [7],
  [Nivel 15–17], [8],
  [Nivel 18+],   [9],
)

== Las seis estadísticas

=== Fuerza (FUE)

Determina la potencia física bruta de tu personaje. Se usa en ataques cuerpo a cuerpo con armas pesadas, maniobras de agarre, atletismo y resistir empujones.

=== Destreza (DES)

Refleja la agilidad, reflejos y precisión. Se usa en ataques a distancia y con armas ligeras, iniciativa, sigilo, acrobacias y la *Esquiva* defensiva.

=== Constitución (CON)

Representa la resistencia y vitalidad del cuerpo. Determina directamente los Puntos de Vida, la Vitalidad y las salvaciones físicas contra venenos y enfermedades.

=== Inteligencia (INT)

Mide el intelecto y la memoria. Fundamental para la magia arcana, el conocimiento, la investigación y la *Concentración* en combate.

=== Sabiduría (SAB)

Refleja la intuición y conexión espiritual. Se usa en magia divina y de Vida, percepción, primeros auxilios y resistir efectos mentales.

=== Carisma (CAR)

Representa la fuerza de voluntad y personalidad. Necesario para la magia elemental y de Ocultismo, persuasión, intimidación y resistir miedo.

== Valores defensivos

=== Vitalidad y Puntos de Vida

La Vitalidad (VT) actúa como un escudo de aguante que absorbe el daño primero. Solo cuando llega a 0 el daño excedente pasa a los Puntos de Vida (PV), que representan lesiones reales.

#table(
  columns: (1fr, 2fr, 2fr),
  fill: (_, row) => if row == 0 { teal-lt } else if calc.odd(row) { rgb("#f8faf9") } else { white },
  stroke: 0.3pt + rgb("#cccccc"),
  inset: (x: 7pt, y: 5pt),
  [*Valor*], [*Fórmula*], [*Recuperación*],
  [Vitalidad], [2 + CON + Nivel], [Descanso Corto o Largo],
  [Puntos de Vida], [3 + CON (Nivel 1); +1 c/3 niveles], [Solo Descanso Largo o sanación mágica],
  [Cordura], [2 + INT + Nivel], [Descanso Largo],
)

=== Sistema de heridas y muerte

Cuando recibes daño que supera tu VT y alcanza tus PV, sufres consecuencias inmediatas:

#step-item(1)[
  *Herida Permanente:* Perder PV causa una *Herida Permanente Leve*. Si ya tienes una, escala a Media y luego a Grave. Las heridas permanentes imponen penalizadores crecientes a tus tiros.
]

#step-item(2)[
  *Inconsciencia:* Si tus PV llegan a *0*, caes *Inconsciente* y sufres una *Herida Permanente Grave*. Quedas en estado *Moribundo*.
]

#step-item(3)[
  *Moribundo:* Mientras estás Moribundo, pierdes 1 PV por turno automáticamente.
]

#step-item(4)[
  *Muerte Definitiva:* Mueres si tus PV negativos igualan a tu CON en negativo. Con CON 2, mueres al alcanzar −2 PV.
]

=== Resistencias, Resistencias Superiores e Inmunidades

Las Resistencias reducen el daño de un tipo específico (Fuego, Frío, Necrótico, etc.):

#table(
  columns: (1.2fr, 1fr, 2fr),
  fill: (_, row) => if row == 0 { teal-lt } else if calc.odd(row) { rgb("#f8faf9") } else { white },
  stroke: 0.3pt + rgb("#cccccc"),
  inset: (x: 7pt, y: 5pt),
  [*Nivel*], [*Efecto*], [*Condición*],
  [Resistencia],          [Daño ÷ 2],   [Una fuente de Resistencia],
  [Resistencia Superior], [Daño ÷ 4],   [Dos fuentes distintas al mismo tipo],
  [Inmunidad],            [Daño = 0],   [Otorgada explícitamente],
)

#tip-box[
  Las Resistencias se aplican *después* de restar la DEF. Tener tres o más fuentes del mismo tipo sigue siendo Resistencia Superior (÷4) y nunca llega a Inmunidad.
]

=== Contadores de Escudo

Varias habilidades otorgan *contadores de escudo*, que se acumulan hasta un máximo de Nivel ÷ 2 (redondeado arriba). Cada contador se puede gastar para *reducir el daño de un impacto en 10*, después de restar la DEF pero antes de las Resistencias. Puedes gastar tantos como desees en un mismo golpe.

== Talentos

Los talentos representan el entrenamiento especializado de tu personaje en áreas no-combativas.

=== Niveles de talento y progresión

#table(
  columns: (1fr, 1fr),
  fill: (_, row) => if row == 0 { teal-lt } else if calc.odd(row) { rgb("#f8faf9") } else { white },
  stroke: 0.3pt + rgb("#cccccc"),
  inset: (x: 7pt, y: 5pt),
  [*Nivel del personaje*], [*Talento máximo*],
  [1–4],  [2],
  [5–7],  [3],
  [8–10], [4],
  [11+],  [5],
)

- *Nivel 1:* Recibes 4 puntos para distribuir entre talentos.
- *Cada nivel:* Recibes 2 puntos adicionales.

=== Realizar tiros de talento

#formula-box[
  *Resultado* = 1d20 + Estadística + Nivel de Talento vs. CD
]

La *dificultad (CD)* oscila entre 10 (Fácil) y 30 (Heroico). Un aliado con al menos 1 nivel en el mismo talento puede *asistir*, otorgándote +2 al tiro.

=== Lista de talentos

#table(
  columns: (1.5fr, 0.7fr, 2.8fr),
  fill: (_, row) => if row == 0 { teal-lt } else if calc.odd(row) { rgb("#f8faf9") } else { white },
  stroke: 0.3pt + rgb("#cccccc"),
  inset: (x: 7pt, y: 5pt),
  [*Talento*],         [*Stat*], [*Descripción*],
  [Acrobacias],        [DES],   [Equilibrio, saltos, caídas, escapar de agarres],
  [Actuación],         [CAR],   [Arte, música, distracción, disfraces],
  [Arcanismo],         [INT],   [Teoría mágica, identificar hechizos, rituales],
  [Atletismo],         [FUE],   [Correr, nadar, trepar, proezas físicas],
  [Averiguar intenc.], [SAB],   [Detectar mentiras, predecir movimientos, leer emociones],
  [Concentración],     [INT],   [Mantener hechizos, resistir efectos mentales, tareas largas],
  [Destrozar],         [FUE],   [Romper objetos y puertas; identificar puntos débiles],
  [Engaño],            [CAR],   [Mentir, fintar en combate, manipulación],
  [Estudio],           [INT],   [Conocimiento general, idiomas, investigación],
  [Heroísmo],          [FUE],   [Maniobras (empujar/agarrar), demostraciones de valor físico],
  [Intimidar],         [FUE/CAR],[Amenazar, asustar, demostraciones de fuerza],
  [Juego de Manos],    [DES],   [Robar, trucos, abrir cerraduras],
  [Percepción],        [SAB],   [Detectar enemigos, buscar pistas, notar detalles],
  [Persuasión],        [CAR],   [Diplomacia, convencer, calmar situaciones],
  [Primeros Auxilios], [SAB],   [Estabilizar moribundos, tratar venenos, medicina],
  [Salud],             [CON],   [Resistencia física, aguantar la respiración, enfermedades],
  [Sigilo],            [DES],   [Ocultarse, moverse en silencio],
  [Supervivencia],     [SAB],   [Rastrear, orientación, encontrar comida y agua],
  [Trastear],          [INT],   [Mecánica, artesanía, reparar objetos complejos],
  [Voluntad],          [CAR],   [Coraje, moral, resistir miedo o desesperación],
)

== Tipos de daño

=== Daño físico

#table(
  columns: (0.8fr, 2fr, 1.5fr),
  fill: (_, row) => if row == 0 { teal-lt } else if calc.odd(row) { rgb("#f8faf9") } else { white },
  stroke: 0.3pt + rgb("#cccccc"),
  inset: (x: 7pt, y: 5pt),
  [*Tipo*], [*Fuentes*], [*Nota*],
  [Cortante],    [Espadas, hachas, garras],      [Causa sangrado],
  [Contundente], [Mazas, martillos, puños],      [Tropieza en críticos],
  [Perforante],  [Lanzas, flechas, colmillos],   [Ignora parte de armaduras pesadas],
)

=== Daño elemental y mágico

#table(
  columns: (0.8fr, 2fr, 1.5fr),
  fill: (_, row) => if row == 0 { teal-lt } else if calc.odd(row) { rgb("#f8faf9") } else { white },
  stroke: 0.3pt + rgb("#cccccc"),
  inset: (x: 7pt, y: 5pt),
  [*Tipo*],    [*Fuentes típicas*],                    [*Interacción notable*],
  [Fuego],     [Magia de Fuego, Infernal],              [Quemaduras; se opone a Hielo],
  [Frío],      [Magia de Hielo, Magia Sombría],         [Ralentiza; se opone a Fuego],
  [Eléctrico], [Magia de Tormenta],                    [Aturde; conduce en agua/metal],
  [Radiante],  [Magia de Vida, Celestial],              [Muy eficaz contra no-muertos],
  [Necrótico], [Nigromancia, Sombría],                  [Reduce VT/PV máximos; sana no-muertos],
  [Arcano],    [Evocación, Rayo Arcano],                [Destruye barreras mágicas],
  [Fuerza],    [Gravitatoria, Protectora],              [No puede resistirse salvo con habilidades específicas],
  [Profano],   [Infernal, maldiciones],                 [Impide sanación; eficaz contra celestiales],
)
