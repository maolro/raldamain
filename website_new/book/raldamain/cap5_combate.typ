#import "theme.typ": *

= El Combate

El combate en Raldamain se desarrolla en *Rondas* de 6 segundos. En cada ronda, todos los participantes actúan por orden de *Iniciativa*.

#formula-box[
  *Iniciativa* = 1d20 + DES
]

== Estructura del combate

#step-item(1)[
  *Inicio del combate:* El DJ declara que comienza el combate. Todos los participantes tiran iniciativa. Los empates se resuelven a favor de los PJs.
]

#step-item(2)[
  *Turnos:* En orden descendente de iniciativa, cada participante usa su turno: gasta acciones, se mueve y puede usar reacciones cuando corresponda.
]

#step-item(3)[
  *Fin de ronda:* Cuando todos han actuado, comienza una nueva ronda. Las reacciones se recuperan al inicio del turno de cada uno.
]

#step-item(4)[
  *Fin del combate:* El combate termina cuando todos los enemigos están derrotados, incapacitados o huyen, o cuando los PJs consiguen su objetivo.
]

== Acciones en tu turno

Cada personaje dispone de *3 acciones* en su turno.

#table(
  columns: (1fr, 0.5fr, 2fr),
  fill: (_, row) => if row == 0 { teal-lt } else if calc.odd(row) { rgb("#f8faf9") } else { white },
  stroke: 0.3pt + rgb("#cccccc"),
  inset: (x: 7pt, y: 5pt),
  [*Acción*], [*Coste*], [*Descripción*],
  [Atacar],            [1],        [Ataque cuerpo a cuerpo o a distancia con arma],
  [Usar habilidad],    [Variable], [Según el coste indicado en la habilidad (1–3)],
  [Moverse],           [1],        [Avanzar 1 paso (~3m) en cualquier dirección],
  [Maniobra],          [1],        [Empujar, Agarrar, Desarmar o Apoyar (ver sección)],
  [Interactuar],       [1],        [Abrir puerta, sacar objeto, beber poción, activar truco],
  [Acción Bonus],      [0],        [Solo cuando una habilidad la otorga explícitamente],
)

#tip-box[
  Puedes distribuir tus 3 acciones como quieras dentro del turno. Usar *Moverse + Atacar + Atacar*, *Habilidad (2 acc) + Moverse*, o *Habilidad (3 acc)* son todas opciones válidas.
]

== Distancias

#table(
  columns: (1fr, 1fr, 1fr),
  fill: (_, row) => if row == 0 { teal-lt } else if calc.odd(row) { rgb("#f8faf9") } else { white },
  stroke: 0.3pt + rgb("#cccccc"),
  inset: (x: 7pt, y: 5pt),
  [*Nombre*], [*Distancia*], [*Casillas (grid 1.5m)*],
  [Adyacente / Toque], [1.5m],  [1],
  [Cercano],           [3m],    [2],
  [Corto],             [6m],    [4],
  [Medio],             [12m],   [8],
  [Largo],             [24m],   [16],
  [Lejano],            [48m+],  [32+],
)

== Reacciones

Cada personaje dispone de *2 reacciones por ronda*. Se gastan fuera de tu turno (o dentro de él en respuesta a un estímulo) y se recuperan al inicio de tu siguiente turno.

#table(
  columns: (1.2fr, 0.7fr, 2.5fr),
  fill: (_, row) => if row == 0 { teal-lt } else if calc.odd(row) { rgb("#f8faf9") } else { white },
  stroke: 0.3pt + rgb("#cccccc"),
  inset: (x: 7pt, y: 5pt),
  [*Uso*], [*Coste*], [*Cuándo*],
  [Parada],                 [1 reacción], [Al ser atacado],
  [Esquiva],                [1 reacción], [Al ser atacado],
  [Ataque de Oportunidad],  [1 reacción], [Enemigo falla un ataque cuerpo a cuerpo, o abandona tu alcance de melee],
  [Movimiento de Reacción], [1 reacción], [Un enemigo se acerca a tu alcance o te ataca en melee; muévete hasta tu velocidad completa],
  [Habilidad reactiva],     [Variable],   [Habilidades con «Reacción» en su coste],
)

Si no te quedan reacciones, *no puedes defenderte activamente*. Solo quedan tu DEF pasiva, Resistencias y Escudos.

== Parada y Esquiva

Cuando recibes un ataque puedes usar una reacción para defenderte activamente. Todo personaje que realice un tiro de *Parada* o *Esquiva* tiene automáticamente *Ventaja* en dicho tiro.

=== Parada

#formula-box[
  *Parada* = 1d20 + FUE o DES + Rango de arma o habilidad #h(1em) #text(fill: teal)[(+Ventaja automática)]
]

Requiere un arma o escudo equipado. Si iguala o supera el tiro de ataque, bloqueas el impacto completamente. Los Rangos mágicos pueden permitir parar con su estadística principal (ej: _Magia Protectora_ usa INT).

=== Esquiva

#formula-box[
  *Esquiva* = 1d20 + DES + Rango de Reflejos (u otro relevante) #h(1em) #text(fill: teal)[(+Ventaja automática)]
]

No requiere equipo. Si iguala o supera el tiro de ataque, evitas completamente el daño. Funciona contra la mayoría de ataques, incluidos algunos de Área.

== Ataques de Oportunidad

Los *Ataques de Oportunidad* son reacciones que explotan momentos de vulnerabilidad del enemigo.

*Condiciones que provocan un Ataque de Oportunidad:*

- Un combatiente *falla un ataque cuerpo a cuerpo* contra un enemigo.
- Un combatiente *abandona el alcance cuerpo a cuerpo* de un enemigo sin usar una habilidad especial de movimiento.

*Cómo explotar un Ataque de Oportunidad:*

- Cuesta *1 reacción*.
- Permite realizar una habilidad de coste 1 o inferior.
- Los Ataques de Oportunidad *no provocan nuevos Ataques de Oportunidad* aunque fallen.
- Ciertas habilidades como _Paso Ligero_ o _Salto Espacial_ permiten moverse sin provocar Ataques de Oportunidad.

== Maniobras

Cualquier personaje puede gastar acciones en *maniobras de combate* en lugar de (o además de) atacar. Todas cuestan *1 acción* salvo indicación contraria.

=== Empujar

Realizas un ataque de FUE o DES contra la defensa del objetivo. Si tienes éxito, el objetivo es empujado *4 casillas* en línea recta. Si el camino está bloqueado, sufre 1d6 daño contundente por casilla no recorrida.

=== Agarrar

La maniobra de Agarrar es *bifásica*:

*Fase 1 — Enredar:* El objetivo debe superar una salvación Físico contra tu tirada de FUE + Rango relevante. Si falla, queda *Enredado* (velocidad 0, Desventaja en ataques y defensas).

*Fase 2 — Agarrar:* Mientras el objetivo está *Enredado*, puedes gastar 1 acción adicional para agarrarlo completamente. Si falla de nuevo la salvación, queda *Agarrado* (no puede moverse ni usar acciones que requieran movimiento; rompe su Concentración).

#tip-box[
  *Romper el agarre:* Gastar 1 acción e intentar una salvación Físico contra CD = última tirada del agarrador. Éxito: pasa de Agarrado a Enredado, o de Enredado a libre.
]

=== Desarmar

Realizas un ataque contra la defensa del objetivo. Si tienes éxito, su arma o escudo cae a una casilla adyacente de tu elección. El objetivo puede recuperarlo gastando 1 acción.

=== Apoyar

Gastas tu acción en ayudar a un aliado visible. Ese aliado gana *+1 Ventaja* en su próximo tiro antes de tu siguiente turno. Puedes apoyar ataques, defensas o habilidades activas.

== Ventaja y Desventaja

Muchas habilidades otorgan *Ventaja* (+1d6) o *Desventaja* (−1d6) en tiros.

- *Ventaja:* Suma +1d6 al resultado. Máximo +4d6 por tiro.
- *Desventaja:* Resta −1d6 del resultado. Máximo −4d6 por tiro.
- *Cancelación:* Una Ventaja cancela una Desventaja. Con 2 Ventajas y 1 Desventaja te queda 1 Ventaja.

== Concentración

Muchas habilidades duraderas requieren *Concentración*. A diferencia de otros sistemas, en Raldamain *puedes mantener múltiples efectos de Concentración simultáneamente*.

*Pierdes la concentración si:*

- Sufres una Herida Permanente (Leve, Media o Grave).
- Quedas *Agarrado*, *Aturdido-2* o superior, o *Inconsciente*.
- Caes a 0 PV.
- Fallas un tiro de Concentración al recibir daño: CD = 10 + daño recibido.

Si pierdes la concentración, *pierdes TODOS* los efectos activos de una sola vez.

== Empoderar

La mayoría de habilidades de Rango incluyen un efecto de *Empoderar*: un beneficio adicional al gastar recursos extra.

- Al usar una habilidad, puedes gastar *1 chi adicional* para activar su Empoderar.
- Máximo *2 veces* por uso (1 chi cada vez).
- No cuesta acciones adicionales, solo el recurso.

== Críticos

Un *crítico* se produce al sacar un *20 natural* en el d20.

- En ataques: tira el *doble de dados de daño*.
- Activa el efecto especial descrito en el campo «crit» de la habilidad.

== Estados de combate

Los estados representan condiciones adversas acumuladas en combate. Existen *9 estados principales*, cada uno con hasta *4 niveles de gravedad*. Cada nivel añade *+1 Desventaja* en las tiradas de las estadísticas específicas del estado.

#tip-box[
  *Nivel 4 — Incapacitado:* Alcanzar el Nivel 4 de *cualquier* estado deja al personaje incapaz de combatir (no puede tomar acciones ofensivas). Casos especiales: *Herido-4* genera una _Herida Crítica Incurable_ (requiere curación mágica especial); *Enloquecido-4* produce una _Locura Permanente_ (requiere magia de nivel superior).
]

#table(
  columns: (0.85fr, 1fr, 2.5fr),
  fill: (_, row) => if row == 0 { teal-lt } else if calc.odd(row) { rgb("#f8faf9") } else { white },
  stroke: 0.3pt + rgb("#cccccc"),
  inset: (x: 7pt, y: 5pt),
  [*Estado*], [*Stats penalizadas*], [*Efectos por nivel*],
  [*Fatigado*],       [FUE, DES, CON], [Cada nivel añade −1d6 en FUE, DES y CON. Nivel 3: no puede correr ni usar Empoderar. Nivel 4: incapacitado físicamente.],
  [*Ralentizado*],    [DES],           [Cada nivel añade −1d6 en DES. Nivel 2: velocidad reducida a la mitad. Nivel 3: velocidad reducida a 1/4. Nivel 4: velocidad 0, no puede moverse.],
  [*Enfermado*],      [CON, FUE],      [Cada nivel añade −1d6 en CON y FUE. Nivel 3: pierde VT al inicio de cada turno. Nivel 4: incapacitado; requiere tratamiento.],
  [*Desconcentrado*], [INT],           [Cada nivel añade −1d6 en INT. Nivel 2: no puede iniciar nuevos efectos de Concentración. Nivel 4: no puede usar habilidades activas.],
  [*Confundido*],     [INT, SAB],      [Cada nivel añade −1d6 en INT y SAB. Nivel 3: al inicio del turno tira 1d6: 1–3 actúa normal, 4–6 ataca al aliado más cercano. Nivel 4: el DJ controla sus acciones.],
  [*Aterrado*],       [VOL, CAR],      [Cada nivel añade −1d6 en VOL y CAR. Nivel 2: no puede acercarse voluntariamente a la fuente del miedo. Nivel 4: huye en pánico o cae inconsciente.],
  [*Aturdido*],       [DES, FUE],      [Cada nivel añade −1d6 en DES y FUE; pierde 1 acción al inicio de turno por nivel. Nivel 3: no puede usar reacciones. Nivel 4: no puede actuar ni reaccionar.],
  [*Herido*],         [Todos],         [Cada nivel añade −1d6 en todos los tiros. Nivel 3: no puede gastar Chi. Nivel 4: _Herida Crítica Incurable_; incapacitado hasta curación mágica especial.],
  [*Enloquecido*],    [MEN, SAB],      [Cada nivel añade −1d6 en MEN y SAB. Nivel 2: sufre alucinaciones (el DJ puede dar información falsa). Nivel 3: acumula Confundido-2. Nivel 4: _Locura Permanente_.],
)

#tip-box[
  *Recuperación:* La mayoría de estados se reducen en 1 nivel con un Descanso Corto. Los estados de Nivel 4, Herido-4 y Enloquecido-4 requieren cuidados especiales o magia de sanación.
]

== Descansos

=== Descanso Corto (~1 hora)

- Recupera *Vitalidad* completa.
- Recupera la *mitad* del Chi.
- Reduce en 1 nivel cualquier estado que no sea Nivel 4.
- Permite usar _Primeros Auxilios_ para tratar heridas.

=== Descanso Largo (~8 horas)

- Recupera *todos* los PV y VT.
- Recupera *todo* el Chi.
- Recupera la *Cordura* completa.
- Elimina todos los estados que no sean Nivel 4.
- Requiere un lugar seguro y raciones si se está en entornos hostiles.
