#import "../theme.typ": *

Mientras otros buscan el poder en la magia o la fe, tú lo encuentras en la química y la física. La Ciencia de las Bombas no requiere talento mágico ni gracia divina: solo inteligencia, paciencia y la disposición a comprender cómo funciona el mundo para usarlo en tu contra. Tu repertorio va desde granadas de metralla y cegadores hasta bombas de ácido y gases tóxicos que transforman el campo de batalla en una trampa letal. En manos expertas, un solo alquimista bien equipado puede cambiar el curso de una batalla.

#tip-box[
  *Reserva de Chi:* Incrementa por Rango x 2.
  *Estadística principal:* Inteligencia + Rango.
]

==== Rango I — Rango I

#ability-card(
  name: "Bomba de Metralla",
  tags: ("Ciencia", "Ataque", "Área", "Físico"),
  cost: "1 Acción",
  range: "Medio",
  area: "Esfera pequeña",
  duration: "Instantáneo",
  crit: "Los afectados sufren Herido-1 (permanente).",
  desc: "Lanzas una bomba que explota en una lluvia de fragmentos metálicos, infligiendo 2d6 + INT daño Cortante y Fuego a todos los que alcance. Los fragmentos dispersos crean terreno difícil en el área hasta el inicio de tu siguiente turno.",
  empower: "Aumenta el área un paso y el daño por un dado adicional.",
)

#ability-card(
  name: "Bomba de Humo",
  tags: ("Ciencia", "Área", "Duradera"),
  cost: "1 Acción",
  range: "Medio",
  area: "Esfera pequeña",
  duration: "Una ronda",
  desc: "Lanzas una bomba de humo que crea una nube densa en el área afectada, cegando y otorgando ocultamiento a todos en ella. La nube se disipará al cabo de una ronda.",
  empower: "Aumenta el área un paso y la duración por una ronda adicional.",
)

#ability-card(
  name: "Granada Destellante",
  tags: ("Ciencia", "Área", "Visual"),
  cost: "1 Acción, 1 chi",
  range: "Medio",
  area: "Esfera pequeña",
  duration: "Instantáneo",
  crit: "Confundido-2 durante dos rondas y Aturdido-2 una ronda adicional.",
  desc: "Lanzas una granada que emite un destello cegador, forzando a todas las criaturas en el área afectada a tener éxito en un tiro de salvación de Voluntad o quedan con Confundido-1 durante una ronda.",
  empower: "Aumenta el área un paso y la duración del Confundido por una ronda adicional.",
)

==== Rango II — Rango II

#ability-card(
  name: "Bomba PEM",
  tags: ("Ciencia", "Área"),
  cost: "1 Acción, 1 chi",
  range: "Medio",
  area: "Esfera pequeña",
  duration: "Instantáneo",
  desc: "Lanzas una bomba de pulso electromagnético que provoca 3d6 + INT daño Eléctico y deshabilita todos los objetos electrónicos durante una ronda. Los personajes con armadura metálica o que empleen Magia de Metal tienen Desventaja en el tiro.",
  empower: "Aumenta el daño por un dado y extiende el efecto durante una ronda adicional.",
)

#ability-card(
  name: "Bomba de Ácido",
  tags: ("Ciencia", "Área", "Duradera", "Aflicción"),
  cost: "1 Acción, 1 chi",
  range: "Medio",
  area: "Esfera pequeña",
  duration: "Una ronda",
  crit: "La armadura del objetivo queda arruinada hasta ser reparada, perdiendo toda su efectividad.",
  desc: "Lanzas una bomba que crea un charco corrosivo en el área afectada. Todos los que estén en ella sufren 3d6 + INT daño Ácido y su armadura queda rota. El charco permanece mientras mantengas la concentración, y cualquier criatura que se mueva por él o permanezca al final de su turno sufrirá 1d6 + INT daño Ácido adicional.",
  empower: "Aumenta el daño por un dado y extiende el efecto durante una ronda adicional.",
)

#ability-card(
  name: "Bomba Pegajosa",
  tags: ("Ciencia", "Área", "Duradera", "Agarre"),
  cost: "1 acción, 1 chi",
  range: "Medio",
  area: "Esfera pequeña",
  duration: "Una ronda",
  crit: "Las criaturas en el área quedan agarradas automáticamente.",
  desc: "Lanzas una bomba que crea una zona de sustancia adhesiva, haciendo así que todos los afectados queden enredados hasta que escapen. El área permanece activa durante el resto del combate, y cualquier criatura que entre en ella debe suprear un tiro de salvación Físico o quedará enredada.",
  empower: "El área de efecto aumenta por un paso y el efecto por una ronda adicional.",
)

==== Rango III — Rango III

_Pasiva: Todas sus bombas convierten sus dados de daño por d8._

#ability-card(
  name: "Bomba de Gas",
  tags: ("Ciencia", "Área", "Duradera", "Gaseosa", "Aflicción"),
  cost: "1 Acción, 2 chi",
  range: "Medio",
  area: "Esfera mediana",
  duration: "Concentración",
  crit: "Los afectados sufren Enfermado-1 durante una ronda.",
  desc: "Lanzas una bomba que libera una nube de gas tóxico que ciega y da ocultamiento. Todos los que estén en ella deben superar un tiro de salvación de Voluntad o quedan enfermados y sufren 3d8 + INT daño Veneno. La nube permanece mientras mantengas la concentración, y cualquier criatura que entre en ella o permanezca al final de su turno deberá superar de nuevo el tiro.

Si tienes el rango de Química, puedes dar los efectos de cualquier poción al gas creado mediante esta bomba pagando su coste en chi.",
  empower: "Aumenta el área un paso y el daño por un dado adicional.",
)

#ability-card(
  name: "Bomba Antimágica",
  tags: ("Ciencia", "Área"),
  cost: "1 acción, 2 chi",
  range: "Medio",
  area: "Esfera pequeña",
  duration: "Instantáneo",
  crit: "El objetivo no puede activar habilidades mágicas durante una ronda.",
  desc: "Lanzas una bomba que genera una onda de negación mágica, disipándo automáticamente los efectos mágicos no-míticos activos en el área durante una ronda. Además, cualquier criatura que emplee habilidades mágicas activas debe superar un tiro de salvación de Inteligencia o perderá todos sus hechizos Duraderos y se deshabilitarán sus objetos mágicos.",
  empower: "La negación mágica permanece activa una ronda adicional.",
)

#ability-card(
  name: "Retrasar Explosión",
  tags: ("Ciencia", "Mejora"),
  cost: "+1 chi",
  duration: "Hasta seis rondas",
  desc: "Puedes aplicar este modificador a cualquiera de tus hechizos de Ciencia para que exploten con retraso. El explosivo queda latente hasta que lo actives como acción bonus, lo cual hará que cuente como un ataque sorpresa.",
)

==== Rango IV — Rango IV

#ability-card(
  name: "Bomba Teledirigida",
  tags: ("Ciencia", "Mejora"),
  cost: "2 chi",
  desc: "Lanzas una bomba que puedes guiar mentalmente hacia tu objetivo, haciendo así que si el objetivo logra evitarla puedas repetir el tiro contra él hasta que la bomba impacte o choque con una superficie sólida.",
)

#ability-card(
  name: "Bombas de Racimo",
  tags: ("Ciencia", "Mejora"),
  cost: "2 chi",
  desc: "Lanzas un dispositivo que se fragmenta en múltiples bombas secundarias, atacando a todos los objetivos en el área afectada. Al hacer un ataque con una bomba puedes tirar dos bombas más como acción bonus del mismo coste o uno inferior, forzando a tus objetivos a defenderse de ellas con el mismo tiro.",
)

#ability-card(
  name: "Bomba Defensiva",
  tags: ("Ciencia", "Reacción", "Defensiva"),
  cost: "1 reacción, 1 chi",
  duration: "Instantáneo",
  desc: "En respuesta a ser atacado, detonas una bomba defensiva en distancia cercana. Reduces el daño recibido en Rango x 3 y el atacante debe superar un tiro de salvación Físico o ser empujado un paso hacia atrás y quedar con Ralentizado-1. Si empleas esta reacción contra un ataque que falle o logras reducir su daño a 0, el atacante sufre automáticamente los efectos de una bomba de tu elección (debes seguir pagando su coste en chi).",
)

==== Rango V — Rango V

_Pasiva: Todas sus bombas convierten sus dados de daño por d10._

#ability-card(
  name: "Bomba Sísmica",
  tags: ("Ciencia", "Ataque", "Área", "Físico"),
  cost: "2 Acciones, 3 chi",
  range: "Medio",
  area: "Radio grande",
  duration: "Instantáneo",
  crit: "Los afectados sufren Herido-1 (permanente).",
  desc: "Lanzas una bomba de alto impacto que sacude el terreno en un área masiva. Todos los afectados sufren 5d10 + INT daño Contundente y deben tener éxito en un tiro de salvación Físico o quedan con Ralentizado-1. Las estructuras frágiles en el área se derrumban y el área afectada se convierte en terreno difícil.",
  empower: "Lanza de nuevo el ataque contra la misma zona, o aumenta el daño por un dado adicional.",
)

#ability-card(
  name: "Bomba de Entropía",
  tags: ("Ciencia", "Ataque", "Área"),
  cost: "2 Acciones, 3 chi",
  range: "Medio",
  area: "Esfera pequeña",
  duration: "Una ronda",
  crit: "El objetivo sufre Herido-3 (permanente) y queda con Fatigado-3.",
  desc: "Lanzas una bomba que descompone la materia a nivel fundamental. Inflige 4d10 + INT daño Fuerza a todos en el área y destruye objetos no mágicos. Además, todas las criaturas a distancia media deberán tener éxito en un tiro de salvación Físico o son arrastradas un paso hacia ella y sufren el mismo daño. La esfera permanecerá en el campo de batalla durante una ronda y arrastrará a cada criatura que entre en un espacio a distancia media.",
  empower: "Aumenta el área de efecto por un paso y el daño por un dado adicional o extiende el efecto de la bomba durante una ronda adicional.",
)

#ability-card(
  name: "Bomba Radioactiva",
  tags: ("Ciencia", "Área", "Duradera", "Aflicción"),
  cost: "2 Acciones, 3 chi",
  range: "Medio",
  area: "Esfera mediana",
  duration: "Concentración",
  crit: "Los afectados quedan con Fatigado-1 automáticamente al inicio de su siguiente turno.",
  desc: "Lanzas una bomba que contamina el área con energía radiactiva. Todos en ella al lanzarla sufren 3d10 + INT daño Necrótico y quedan enfermados. La zona afectada impedirá la Sanación y provocará que todos los objetos mágicos tengan una probabilidad 50% de fallar.",
  empower: "Aumenta el área un paso y el daño por un dado adicional.",
)
