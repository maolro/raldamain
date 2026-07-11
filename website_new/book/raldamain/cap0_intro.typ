#import "theme.typ": *

= Introducción

Raldamain es un juego de rol de fantasía épica en el que los jugadores encarnan a héroes capaces de moldear el destino de un mundo repleto de magia, peligros y misterios. En estas páginas encontrarás todo lo necesario para vivir aventuras memorables junto a tus amigos.

#tip-box[
  Si es la primera vez que juegas a un juego de rol de mesa, no te preocupes. Este libro está diseñado para guiarte paso a paso. El único requisito es tener ganas de contar una buena historia.
]

== ¿Qué es un juego de rol?

Un juego de rol de mesa (_TTRPG_) es un juego narrativo en el que un grupo de personas crea y protagoniza una historia de manera colaborativa. Uno de los participantes actúa como *Director de Juego* (DJ), quien da vida al mundo, sus habitantes y los desafíos que se presentan. El resto son *Jugadores*, cada uno controlando a un personaje con sus propias capacidades, miedos y ambiciones.

La historia avanza mediante la descripción verbal: el DJ plantea una situación, los jugadores declaran qué hacen sus personajes, y los dados determinan el resultado cuando el éxito no está garantizado.

== ¿Qué hace especial a Raldamain?

Raldamain fue diseñado con tres principios en mente:

- *Combate dinámico.* Las acciones y reacciones se equilibran para que cada turno importe. Atacar, moverse o lanzar un hechizo tiene consecuencias tácticas reales.

- *Personalización profunda.* El sistema de Rangos permite construir personajes únicos combinando disciplinas marciales, elementales y místicas sin restricciones de clase.

- *Narrativa primero.* Las reglas sirven a la historia, no al revés. Cada mecánica tiene un propósito narrativo claro.

== Los roles en la mesa

#step-item(1)[
  *Director de Juego (DJ):* Narra el mundo, controla a los Personajes No Jugadores (PNJs) y arbitra las reglas. No gana ni pierde — su objetivo es crear una experiencia memorable para todos.
]

#step-item(2)[
  *Jugadores:* Cada jugador controla a un *Personaje Jugador (PJ)*. Decide sus acciones, habla con su voz y lleva la hoja de personaje donde se registran sus estadísticas y habilidades.
]

== Cómo usar este libro

El libro está dividido en capítulos que cubren los aspectos del juego de forma progresiva:

- *Capítulo 1 — Hoja de Personaje:* Explica todos los valores de la ficha.
- *Capítulo 2 — Estadísticas:* Las seis estadísticas principales y cómo progresar.
- *Capítulo 3 — Rangos:* Los poderes de combate y magia disponibles.
- *Capítulo 4 — Equipamiento:* Armas, armaduras y objetos.
- *Capítulo 5 — Combate:* Reglas detalladas de combate.
- *Capítulos 6-8:* Guía del Director de Juego, el Mundo y el Bestiario.

#tip-box[
  *Consejo:* Los jugadores solo necesitan leer los capítulos 1–4. El DJ debería familiarizarse con todo el libro, pero puede comenzar con los capítulos 1–5 y los capítulos del DJ cuando lo necesite.
]

== Dados

Raldamain usa dados poliédricos estándar. La notación `NdX` indica tirar N dados de X caras. Los dados que más usarás son:

#table(
  columns: (auto, 1fr),
  fill: (_, row) => if row == 0 { teal-lt } else if calc.odd(row) { rgb("#f8faf9") } else { white },
  stroke: 0.3pt + rgb("#cccccc"),
  inset: (x: 7pt, y: 5pt),
  [*Dado*], [*Cuándo se usa*],
  [*d20*], [Todas las pruebas, ataques y defensas],
  [*d6*], [Bonificaciones de Ventaja y Desventaja; daño de hechizos básicos],
  [*d8 / d10*], [Daño de habilidades de Rango elevado],
  [*d4*], [Efectos menores, objetos consumibles],
)
