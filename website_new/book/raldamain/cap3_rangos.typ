#import "theme.typ": *

= Sistema de Rangos

Los Rangos son las disciplinas de combate y magia de tu personaje. A diferencia de los sistemas de clase fija, en Raldamain cada personaje puede combinar libremente múltiples Rangos, creando arquetipos únicos: un guerrero que domina las llamas, un paladín que lanza rayos, un asesino con poderes psíquicos.

== Progresión de rangos

#table(
  columns: (1.2fr, 1fr, 1fr),
  fill: (_, row) => if row == 0 { teal-lt } else if calc.odd(row) { rgb("#f8faf9") } else { white },
  stroke: 0.3pt + rgb("#cccccc"),
  inset: (x: 7pt, y: 5pt),
  [*Nivel del personaje*], [*Rangos disponibles*], [*Rango máximo*],
  [1],     [2],    [I],
  [2–3],   [3–4],  [I],
  [4–6],   [5–7],  [II],
  [7–9],   [8–10], [III],
  [10–12], [11–13],[IV],
  [13–15], [14–16],[V],
  [16+],   [17+],  [VI],
)

Empiezas con 2 Rangos a Nivel 1. Cada vez que subes de nivel ganas 1 Rango adicional. Los Rangos se distribuyen entre tus disciplinas, normalmente hasta 4 distintas (máximo 5).

== Tiro de Rango

#formula-box[
  *Ataque / Habilidad* = 1d20 + Estadística principal + Nivel de Rango
]

== Recurso: Chi

El *Chi* es tu energía interior: la disciplina, voluntad y poder espiritual que canalizas para ejecutar tus técnicas más allá de lo común, ya sea un hechizo arcano, una maniobra marcial imposible o el don de una Ascendencia. Todas las habilidades de Rango consumen Chi.

#formula-box[
  *Reserva de Chi* = (Número total de Rangos que posees) × 2
]

Cada Rango que posees, sin importar la disciplina —Magia de Fuego, Estilo Coloso, Guerrero Divino, Ascendencia Celestial, etc.—, aumenta tu reserva total de Chi en *2*. El Chi se recupera por completo con un *Descanso Largo*; un *Descanso Corto* recupera la mitad.

== Empoderar

#tip-box[
  *Empoderar (1 Chi · máx. 2×):* La mayoría de habilidades de Rango incluyen un efecto de *Empoderar*: un beneficio adicional opcional. Al usar la habilidad, puedes gastar *1 Chi adicional* para activar su Empoderar, hasta un máximo de *2 veces* por uso (2 Chi adicionales en total).
]

== Categorías de Rango

#table(
  columns: (1fr, 2fr, 0.8fr),
  fill: (_, row) => if row == 0 { teal-lt } else if calc.odd(row) { rgb("#f8faf9") } else { white },
  stroke: 0.3pt + rgb("#cccccc"),
  inset: (x: 7pt, y: 5pt),
  [*Categoría*],     [*Rangos*],                                              [*Stat*],
  [Marcial],        [Estilo Asesino, Estilo Coloso, Estilo Duelista],        [FUE / DES],
  [Combate],        [Fortitud, Ira, Reflejos, Mente Desencadenada, Rastrear],[FUE / DES / INT],
  [Elementalismo],  [Fuego, Hielo, Agua, Aire, Tierra, Tormenta, Metal],     [CAR / SAB],
  [Arcana],         [Evocación, Protectora, Temporal, Espacial],             [INT],
  [Ocultismo],      [Gravitatoria, Ilusoria, Mental, Sombría, Nigromancia],  [INT / CAR],
  [Divino],         [Magia de Vida, Magia Divina, Guerrero Divino],          [SAB / CAR],
  [Ascendencias],   [Abisal, Akhasica, Celestial, Infernal, Primigenia],     [Variable],
  [Ciencia],        [Bombas],                                                 [INT],
)

== Clasificación de fuentes

- *Innato:* No puede suprimirse ni contrarrestarse. Funciona en zonas sin magia. _(Ej: Fortitud, Ira, Reflejos)_
- *Arcano:* Afectado por Campo Antimágico, Disyunción y Contrahechizo. _(Ej: Evocación, Ilusoria)_
- *Divino:* Afectado por efectos anti-divinos, pero *no* por antimagia arcana. _(Ej: Magia Divina)_
- *Elemental / Ocultista:* Generalmente Arcano a efectos de supresión, salvo indicación contraria.

// ═══════════════════════════════════════════════════════
// MARCIAL
// ═══════════════════════════════════════════════════════

== Marcial

Las disciplinas marciales se centran en el dominio de las armas físicas sin depender de la magia. Son *Innatas*: no pueden suprimirse ni contrarrestarse. Su estadística principal varía por estilo (FUE para armas pesadas, DES para ágiles y de duelo).

#pagebreak(weak: true)
=== Estilo Coloso
#include "rangos/estilo_coloso.typ"

#pagebreak(weak: true)
=== Estilo Duelista
#include "rangos/estilo_duelista.typ"

#pagebreak(weak: true)
=== Estilo Asesino
#include "rangos/estilo_asesino.typ"

// ═══════════════════════════════════════════════════════
// COMBATE
// ═══════════════════════════════════════════════════════

#pagebreak(weak: true)
== Combate

Los Rangos de Combate refuerzan las capacidades físicas o tácticas del personaje. Son *Innatos* y se aplican en cualquier circunstancia. Incluyen desde la furia berserker hasta el análisis frío de los puntos débiles de un enemigo.

#pagebreak(weak: true)
=== Ira
#include "rangos/ira.typ"

#pagebreak(weak: true)
=== Fortitud
#include "rangos/fortitud.typ"

#pagebreak(weak: true)
=== Reflejos
#include "rangos/reflejos.typ"

#pagebreak(weak: true)
=== Mente Desencadenada
#include "rangos/mente_desencadenada.typ"

#pagebreak(weak: true)
=== Rastrear
#include "rangos/rastrear.typ"

// ═══════════════════════════════════════════════════════
// ELEMENTALISMO
// ═══════════════════════════════════════════════════════

#pagebreak(weak: true)
== Elementalismo

El Elementalismo abarca el control de los elementos naturales. La estadística principal es *Carisma* para los elementos de energía activa (Fuego, Tormenta, Metal) y *Sabiduría* para los más pasivos o curativos (Agua, Tierra, Vida). Todos son de fuente *Elemental*.

#pagebreak(weak: true)
=== Magia de Fuego
#include "rangos/magia_fuego.typ"

#pagebreak(weak: true)
=== Magia de Hielo
#include "rangos/magia_hielo.typ"

#pagebreak(weak: true)
=== Magia de Agua
#include "rangos/magia_agua.typ"

#pagebreak(weak: true)
=== Magia de Aire
#include "rangos/magia_aire.typ"

#pagebreak(weak: true)
=== Magia de Tierra
#include "rangos/magia_tierra.typ"

#pagebreak(weak: true)
=== Magia de Tormenta
#include "rangos/magia_tormenta.typ"

#pagebreak(weak: true)
=== Magia de Metal
#include "rangos/magia_metal.typ"

// ═══════════════════════════════════════════════════════
// ARCANA
// ═══════════════════════════════════════════════════════

#pagebreak(weak: true)
== Arcana

La magia arcana requiere estudio meticuloso y dominio de la teoría mágica. Usa *Inteligencia* como estadística principal y es de fuente *Arcana*: afectada por antimagia.

#pagebreak(weak: true)
=== Magia de Evocación
#include "rangos/magia_evocacion.typ"

#pagebreak(weak: true)
=== Magia Protectora
#include "rangos/magia_protectora.typ"

#pagebreak(weak: true)
=== Magia Temporal
#include "rangos/magia_temporal.typ"

#pagebreak(weak: true)
=== Magia Espacial
#include "rangos/magia_espacial.typ"

// ═══════════════════════════════════════════════════════
// OCULTISMO
// ═══════════════════════════════════════════════════════

#pagebreak(weak: true)
== Ocultismo

El Ocultismo manipula fuerzas prohibidas o malentendidas. Usa *Inteligencia* o *Carisma* según la disciplina. Es de fuente *Arcana* a efectos de supresión, aunque algunas habilidades son innatas.

#pagebreak(weak: true)
=== Magia Gravitatoria
#include "rangos/magia_gravitatoria.typ"

#pagebreak(weak: true)
=== Magia Ilusoria
#include "rangos/magia_ilusoria.typ"

#pagebreak(weak: true)
=== Magia Mental
#include "rangos/magia_mental.typ"

#pagebreak(weak: true)
=== Magia Sombría
#include "rangos/magia_sombria.typ"

#pagebreak(weak: true)
=== Nigromancia
#include "rangos/nigromancia.typ"

// ═══════════════════════════════════════════════════════
// DIVINO
// ═══════════════════════════════════════════════════════

#pagebreak(weak: true)
== Divino

Las disciplinas divinas canalizan el poder de los dioses y la luz vital. Son de fuente *Divina*: no las afecta la antimagia arcana, pero sí los efectos anti-divinos. Usan *Sabiduría* o *Carisma*.

#pagebreak(weak: true)
=== Magia de Vida
#include "rangos/magia_vida.typ"

#pagebreak(weak: true)
=== Magia Divina
#include "rangos/magia_divina.typ"

#pagebreak(weak: true)
=== Guerrero Divino
#include "rangos/guerrero_divino.typ"

// ═══════════════════════════════════════════════════════
// ASCENDENCIAS
// ═══════════════════════════════════════════════════════

#pagebreak(weak: true)
== Ascendencias

Las Ascendencias representan linajes de sangre extraplanar o divina. Otorgan poderes *Innatos* únicos a costa de consecuencias físicas, mentales o morales. Son las disciplinas más poderosas del sistema.

#pagebreak(weak: true)
=== Ascendencia Abisal
#include "rangos/ascendencia_abisal.typ"

#pagebreak(weak: true)
=== Ascendencia Akhasica
#include "rangos/ascendencia_akhasica.typ"

#pagebreak(weak: true)
=== Ascendencia Celestial
#include "rangos/ascendencia_celestial.typ"

#pagebreak(weak: true)
=== Ascendencia Infernal
#include "rangos/ascendencia_infernal.typ"

#pagebreak(weak: true)
=== Ascendencia Primigenia
#include "rangos/ascendencia_primigenia.typ"

// ═══════════════════════════════════════════════════════
// CIENCIA
// ═══════════════════════════════════════════════════════

#pagebreak(weak: true)
== Ciencia

La Ciencia representa el dominio de la alquimia y los artefactos mecánicos. Usa *Inteligencia* y es completamente *Innata*: no requiere magia y funciona en entornos antimágicos.

#pagebreak(weak: true)
=== Bombas
#include "rangos/bombas.typ"
