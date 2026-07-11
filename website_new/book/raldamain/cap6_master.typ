#import "theme.typ": *

= El Director de Juego

El *Director de Juego (DJ)* es el narrador del mundo, el árbitro de las reglas y el principal responsable de que todos en la mesa se diviertan. Este capítulo ofrece guías prácticas para diseñar aventuras, construir encuentros y gestionar el ritmo de la historia.

#tip-box[
  Ser DJ no significa ganar ni perder. No eres el adversario de los jugadores — eres el autor de un mundo que ellos protagonizan. Tu éxito se mide en las historias que recordarán años después.
]

== Estructura de una sesión

Una sesión típica de Raldamain dura entre 3 y 4 horas y sigue un ritmo natural de:

#step-item(1)[
  *Apertura:* Recuerda brevemente lo que ocurrió en la sesión anterior. Sitúa a los personajes en el punto donde lo dejaron.
]

#step-item(2)[
  *Exploración y narración:* Los jugadores interactúan con el mundo, hablan con PNJs, investigan y viajan. Este es el tiempo de desarrollo de historia y personaje.
]

#step-item(3)[
  *Conflicto:* Un encuentro de combate, una confrontación diplomática o un peligro ambiental que pone a prueba las habilidades del grupo.
]

#step-item(4)[
  *Desenlace y cierre:* El conflicto se resuelve y los personajes se instalan en un momento de respiro. Termina la sesión en un punto emocionante o narrativamente satisfactorio.
]

== Construir encuentros

=== Niveles de dificultad

Los encuentros se calibran por el *Nivel de Amenaza* (NA) de los enemigos en relación al nivel del grupo:

#table(
  columns: (1fr, 0.8fr, 2fr),
  fill: (_, row) => if row == 0 { teal-lt } else if calc.odd(row) { rgb("#f8faf9") } else { white },
  stroke: 0.3pt + rgb("#cccccc"),
  inset: (x: 7pt, y: 5pt),
  [*Dificultad*], [*NA vs. nivel PJ*], [*Descripción*],
  [Trivial],   [NA ≤ Nivel −3], [Los PJs no corren peligro real. Útil para escenas de acción rápida],
  [Fácil],     [NA = Nivel −1 o −2], [Posible desgaste menor. Los PJs ganan con comodidad],
  [Moderado],  [NA = Nivel],    [Encuentro estándar. Requiere táctica básica],
  [Difícil],   [NA = Nivel +1 o +2], [Los PJs corren riesgo real. Pueden caer si no coordinan bien],
  [Extremo],   [NA = Nivel +3], [Peligro de muerte. Solo recomendado en momentos climáticos],
)

=== Tipos de criatura

Las criaturas se clasifican por su peso en el combate:

- *Esbirro Simple:* Criatura débil. Muere con 1 golpe significativo (sin sistema de PV). Ideal para tropas numerosas.
- *Esbirro Élite:* Criatura resistente con entre 2 y 4 *Golpes* antes de ser derrotada. Representa amenazas individuales notables.
- *Teniente:* Criatura fuerte con capacidades especiales. Usualmente lidera grupos de esbirros.
- *Jefe:* El enemigo principal de un arco o encuentro climático. Tiene múltiples fases, acciones extra y mecánicas especiales.
- *Único / Mítico:* Ser de poder legendario. Un encuentro con un Único puede definir toda una campaña.

=== Construcción de un encuentro equilibrado

Para un grupo de 4 PJs de Nivel N:

- *1 Esbirro Élite de NA = N* por PJ como regla general.
- O *1 Teniente de NA = N* con 4–6 esbirros simples.
- O *1 Jefe de NA = N+2* para un encuentro climático.

#tip-box[
  El entorno importa tanto como los enemigos. Un puente estrecho, un campo con niebla o una sala en llamas cambian completamente la dinámica de un encuentro sin cambiar las estadísticas de ningún participante.
]

== Escalado de criaturas

Si necesitas ajustar una criatura existente al nivel del grupo, usa estas guías:

#table(
  columns: (1fr, 2fr),
  fill: (_, row) => if row == 0 { teal-lt } else if calc.odd(row) { rgb("#f8faf9") } else { white },
  stroke: 0.3pt + rgb("#cccccc"),
  inset: (x: 7pt, y: 5pt),
  [*Ajuste*], [*Efecto*],
  [+1 Golpe],        [La criatura aguanta aproximadamente 30–40% más de combate],
  [+1 a modificadores], [Sube el peligro de cada ataque y la dificultad de cada salvación],
  [+1 dado de daño], [Cada impacto es notablemente más letal],
  [Nueva habilidad reactiva], [La criatura es mucho más difícil de desbordar con acumulación de ataques],
)

== PNJs y facciones

Los *Personajes No Jugadores (PNJs)* dan vida al mundo. Tienen motivaciones, secretos y relaciones que los jugadores pueden descubrir, explotar o ignorar.

=== Tipos de PNJ

- *Aliados:* Ayudan activamente al grupo. Pueden proporcionar información, apoyo en combate o recursos.
- *Neutros:* Tienen sus propios objetivos. Pueden convertirse en aliados o enemigos según las acciones de los PJs.
- *Antagonistas:* Se oponen activamente al grupo. Los mejores antagonistas tienen motivaciones comprensibles, no son malvados por serlo.

=== Crear un PNJ memorable

Un PNJ no necesita una hoja de personaje completa. Bastará con:

- *Un rasgo físico distintivo* (voz ronca, ojo de cristal, ropa siempre impecable).
- *Una motivación clara* (quiere vengar a su familia, proteger su ciudad, acumular riqueza).
- *Un secreto* (nunca obligatorio de revelar, pero útil para el DJ).
- *Estadísticas mínimas* si podría entrar en combate.

== Recompensas y progresión

=== Experiencia y niveles

Raldamain usa un sistema de *experiencia por hito*: los personajes suben de nivel cuando completan objetivos narrativos importantes, no por matar monstruos. Esto fomenta soluciones creativas y roleplay.

Guía aproximada:
- *Nivel 1 → 2:* Completar el primer arco de la aventura (2–3 sesiones).
- *Nivel 2 → 3:* Completar un arco secundario o resolver una amenaza importante (3–5 sesiones).
- *Nivel 4+:* A partir de aquí, cada nivel requiere superar un desafío de campaña o un momento definitorio.

=== Tesoros y botín

El botín de un encuentro debe sentirse apropiado para el contexto. Directrices:

- *Esbirros básicos:* Monedas menores, equipo estándar, información (mapas, cartas).
- *Tenientes y jefes:* Objetos únicos, recetas, armas o armaduras de calidad, objetos mágicos menores.
- *Encuentros climáticos:* Objetos mágicos notables, artefactos, acceso a localizaciones o personas clave.

== Gestión de la mesa

- *La regla de la diversión:* Si una regla interrumpe el disfrute del grupo más de lo que añade, ignórala o modifícala.
- *Dar y tomar:* El DJ puede impedir que los PJs hagan algo destructivo, pero nunca puede negarles la oportunidad de intentarlo.
- *La seguridad emocional:* Antes de la primera sesión, habla con el grupo sobre temas que prefieren evitar en la ficción. Respeta esos límites siempre.
