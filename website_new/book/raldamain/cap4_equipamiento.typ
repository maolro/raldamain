#import "theme.typ": *

= Equipamiento

El equipo de un personaje es la herramienta física con la que enfrenta el mundo. Las armas determinan el estilo de combate y el modificador ofensivo; la armadura fija la DEF base.

== Armas

Las armas se dividen en cuatro estilos, cada uno con características distintas que definen las habilidades de Rango compatibles:

=== Estilos de arma

#table(
  columns: (0.8fr, 2fr, 1fr, 1fr),
  fill: (_, row) => if row == 0 { teal-lt } else if calc.odd(row) { rgb("#f8faf9") } else { white },
  stroke: 0.3pt + rgb("#cccccc"),
  inset: (x: 7pt, y: 5pt),
  [*Estilo*], [*Descripción*], [*Stat*], [*Ejemplo*],
  [Pesada],    [Armas de dos manos o gran masa. Daño elevado pero lentas.],  [FUE], [Mandoble, hacha de guerra, mazo],
  [Ligera],    [Armas de una mano, ágiles. Pueden usarse con Destreza.],      [DES], [Daga, espada corta, rapier],
  [Duelo],     [Armas de una mano diseñadas para la esgrima precisa.],        [DES], [Estoque, sable de duelo, cimitarra],
  [A Distancia],[Arcos, ballestas y armas arrojadizas.],                      [DES], [Arco largo, ballesta, jabalina],
  [Flexible],  [Armas que pueden usarse como pesadas o ligeras según contexto.], [FUE/DES], [Bastón de guerra, lanza],
)

=== Tabla de armas

#table(
  columns: (1.5fr, 0.8fr, 0.8fr, 1fr, 1.5fr),
  fill: (_, row) => if row == 0 { teal-lt } else if calc.odd(row) { rgb("#f8faf9") } else { white },
  stroke: 0.3pt + rgb("#cccccc"),
  inset: (x: 7pt, y: 5pt),
  [*Arma*], [*Estilo*], [*Daño base*], [*Alcance*], [*Propiedad*],
  [Daga],          [Ligera],     [1d4 Cortante], [Toque / Lanzar], [Arrojadiza, ligera],
  [Espada corta],  [Ligera],     [1d6 Cortante], [Toque],          [—],
  [Estoque],       [Duelo],      [1d8 Perforante],[Toque],         [Precisión (+1 ataque)],
  [Sable],         [Duelo],      [1d8 Cortante], [Toque],          [—],
  [Espada larga],  [Flexible],   [1d8 Cortante], [Toque],          [Versátil (2m. = 1d10)],
  [Mandoble],      [Pesada],     [2d6 Cortante], [Cercano],        [Dos manos, cargada],
  [Hacha de guerra],[Pesada],    [1d12 Cortante],[Toque],          [Dos manos],
  [Lanza],         [Flexible],   [1d8 Perforante],[Cercano],       [Arrojadiza, versátil],
  [Arco largo],    [A distancia],[1d8 Perforante],[Largo],          [Dos manos, munición],
  [Ballesta],      [A distancia],[1d10 Perforante],[Medio],         [Recarga (1 acción)],
)

#tip-box[
  *Usar el modificador de Magia:* Algunos Rangos (como *Infusión de Fuego* de Magia de Fuego II) permiten sustituir el modificador de arma por el de tu hechicería para todos los ataques con armas, combinando esgrima y magia de forma fluida.
]

== Armaduras

La armadura determina tu *DEF base* (Defensa pasiva). Llevar armadura pesada sin el entrenamiento adecuado puede penalizar tus tiros de DES.

#table(
  columns: (1.5fr, 0.7fr, 1fr, 1.8fr),
  fill: (_, row) => if row == 0 { teal-lt } else if calc.odd(row) { rgb("#f8faf9") } else { white },
  stroke: 0.3pt + rgb("#cccccc"),
  inset: (x: 7pt, y: 5pt),
  [*Armadura*], [*DEF base*], [*Penalización*], [*Notas*],
  [Sin armadura],   [0],   [—],               [Depende solo de habilidades y escudos],
  [Armadura ligera],[2],   [—],               [Cuero, piel endurecida],
  [Armadura media], [4],   [DES máx. 4],      [Cota de malla, escamas],
  [Armadura pesada],[6],   [DES máx. 2],      [Placas, loriga completa],
  [Escudo],        [+2],   [—],               [Se puede combinar con cualquier armadura],
)

=== Escudos y parada

Un *escudo* equipado aumenta la DEF en +2 y permite usar la habilidad de *Parada* con el modificador de FUE o DES según prefieras. Los escudos no tienen estilo de arma; su función es exclusivamente defensiva.

== Objetos y consumibles

Los personajes pueden llevar objetos en su inventario para apoyar la aventura fuera del combate, así como consumibles de efecto inmediato:

#table(
  columns: (1.5fr, 0.8fr, 2fr),
  fill: (_, row) => if row == 0 { teal-lt } else if calc.odd(row) { rgb("#f8faf9") } else { white },
  stroke: 0.3pt + rgb("#cccccc"),
  inset: (x: 7pt, y: 5pt),
  [*Objeto*], [*Acción*], [*Efecto*],
  [Poción de Curación menor], [1 acción], [Recupera 2d4 + 2 VT],
  [Poción de Curación],       [1 acción], [Recupera 4d4 + 4 PV],
  [Antídoto],                 [1 acción], [Elimina un veneno o aflicción de nivel 1–2],
  [Granada de Fuego],         [1 acción], [2d6 daño de Fuego en radio pequeño (CD 12)],
  [Cuerda (15m)],             [—],        [Uso en exploración y escalada],
  [Equipo de escalada],       [—],        [Ventaja en tiros de Atletismo para trepar],
  [Kit de curación],          [—],        [Necesario para usar Primeros Auxilios a plena efectividad],
  [Antorcha / Farol],         [—],        [Ilumina en radio cercano o medio respectivamente],
  [Ración (1 día)],           [—],        [Necesaria para Descansos Largos en entornos hostiles],
)

== Equipo mágico

Los personajes con Rangos mágicos o que encuentran tesoros pueden obtener *objetos mágicos*. Estos actúan como fuentes de Resistencia o Inmunidad adicionales, otorgan bonificadores a estadísticas, o contienen hechizos de un solo uso.

El Director de Juego determina la disponibilidad y coste de los objetos mágicos según la ambientación de la campaña.

#tip-box[
  *Límite de equipo mágico:* Un personaje no puede beneficiarse de más de tres objetos mágicos a la vez (contando anillos, amuletos y armas encantadas conjuntamente). Los objetos de un solo uso no cuentan contra este límite.
]

== Dinero y precios

El sistema de moneda usa como unidad el *Denario de Oro (DO)*. Las monedas de plata (DP) y cobre (DC) son equivalentes:

- 1 DO = 10 DP = 100 DC

Las armas básicas cuestan entre 5 DO (daga) y 50 DO (mandoble). Una armadura de placas puede superar los 500 DO.
