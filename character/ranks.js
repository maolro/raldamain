var listofskills = { 
    "Alabardas":
	{
        skills: 
		[
            { name: "Alabarda", level:1, type: "action", cost: 2, description: 
			(context, points) => 
			{
				if (context.mainWeapon.type == "Alabardas"){
					return "+" + (points + context.basestats.str) + " para impactar, alcance "+ context.mainWeapon.reach+ " pies, " + context.mainWeapon.damage  + " + "+ context.basestats.str + " daño "+context.mainWeapon.dmgtype
				}
				else{
					return "No has seleccionado un arma de esta categoría"
				}
			}	
			},       
            { name: "Parada", level:1, type: "reaction", description: 
			(context, points) => 
			{
				if (context.mainWeapon.type == "Alabardas"){
					return "+" + (points + context.basestats.str) + " para defenderse, solo puede protegerse de ataques cuerpo a cuerpo. Recibe desventaja defendiéndose de enemigos adyacentes"
				}
				else{
					return "No has seleccionado un arma de esta categoría"
				}
			}	
			},
			{ name: "Preparación contra cargas", level:1, type: "action", cost: 1, description:"Entras en un estado de preparación hasta el principio de tu siguiente turno o cuando pierdas la concentración. En este estado cada vez que una criatura enemiga pase por un espacio a 10 pies de ti puedes hacerle un ataque como reacción que inflige +1d6 daño y lo detiene en el acto si logras impactar"},			
			{ name: "Ajustar alcance", level:2, type: "passive", description:" Al principio de tu turno puedes entrar en estado ofensivo o estado defensivo, el cual se mantendrá a lo largo de la ronda hasta que llegue tu siguiente turno. Si te encuentras en estado ofensivo aumentas el alcance de tu arma por 5 pies a costa de obtener un dado adicional de desventaja en tus tiros de parada contra ataques hechos por criaturas adyacentes mientras que si te encuentras en estado defensivo reduces tu alcance por 5 pies y pierdes la desventaja en tiros de parada. Puedes volver a cambiar de estado en cualquier momento de la ronda si gastas una acción para ello."},
            { name: "Ataque lateral", level:2, type: "action", cost: 1, description:
			(context, points) =>{return "Tu siguiente ataque de alabardas podrá impactar a hasta tres criaturas en tu radio de alcance que se encuentren a 5 pies una de otra. Estas se defenderán de tu ataque en el orden que tú escojas y puedes hacer un intento de tropezar (+"+(points+context.basestats.str)+") contra aquellas criaturas que fallen su tiro defensivo. Tu ataque se detendrá de inmediato si un defensor logra bloquear tu ataque con un escudo o una parada hecha con un arma que no sea ligera. "}},
            { name: "Flanqueador experto", level:3, type: "passive", description:
			(context, points) =>{return "Tu arma hace +"+((context.basestats.dex<=0 ? 1 : context.basestats.dex))+" daño base contra objetivos que flanquees"}},
            { name: "Ataque serpenteante", level:3, type: "action", cost: 1, description:
			(context, points) =>{return "Haz una de las siguientes maniobras de combate con un bonificador +"+(points+context.basestats.str)+": Tu objetivo se defiende con averiguar intenciones. Si fracasa no podrá defenderse de tu siguiente ataque. \r Tu objetivo se defiende con heroísmo y si fracasa será desarmado del arma que lleve. Esta acción solo puede usarse después que tu objetivo haya parado exitosamente uno de tus ataques. \r Tu objetivo se defiende con heroísmo o esquiva. Si fracasa será empujado 10 pies en cualquier dirección y es tropezado"}},
			{ name: "Alabarda", level:3, type: "action", cost: 1, description: 
			(context, points) => 
			{
				if (context.mainWeapon.type == "Alabardas"){
					return "+" + (points + context.basestats.str) + " para impactar, alcance "+ context.mainWeapon.reach+ " pies, " + context.mainWeapon.damage  + " + "+ context.basestats.str + " daño "+context.mainWeapon.dmgtype
				}
				else{
					return "No has seleccionado un arma de esta categoría"
				}
			}	
			},
			{ name: "Ataque circular", level:4, type: "action", cost:1, description:"Tu siguiente ataque de alabardas atacará todas las criaturas que se encuentren en el radio de alcance de tu arma. Si logras impactar a un objetivo empújalo 5 pies hacia atrás y esta habilidad se detendrá si un enemigo logra detener exitosamente tu ataque con un escudo o una parada hecha con un arma que no sea ligera.  Si gastas una acción adicional en un ataque circular puedes hacer una maniobra de tropezar contra todos los enemigos que impactes."},
		    { name: "Carga con lanza", level:4, type: "passive", description:"Aumenta tu daño base por 1d6 al hacer una carga y al impactar con tu ataque puedes clavarle tu lanza al objetivo para aumentar el nivel de todas las heridas permanentes por un paso. Mientras tengas la lanza enganchada no podrás usarla para atacar o defenderte hasta que gastes una acción para desengancharla"},        
            { name: "Carga repentina", level:5, type: "reaction", description:" Al entrar en el estado de preparación contra cargas en cualquier momento de la ronda puedes moverte una distancia igual a tu movimiento base y hacer un ataque contra un objetivo en tu alcance. Este ataque contará como una carga si te mueves 20 pies o más y al impactar con tu ataque aumenta el nivel de todas las heridas permanentes infligidas por un paso."},
            { name: "Reposicionar", level:5, type: "reaction", base:"Parada", description:"Cada vez que detengas un ataque enemigo de manera exitosa podrás moverte 5 pies en cualquier dirección sin provocar ataques de oportunidad."},
        ]
	},
    "Arcos": 
	{
        skills: 
		[
            { name: "Disparo preciso", level:3, type: "passive", description:"Tus ataques a distancia ignoran cubierta y ocultamiento al atacar a objetivos en tu radio de puntería mortal"},
            { name: "Ojo del francotirador", level:3, type: "passive", description:"Reduce todas las penalizadores por disparar a distancia por un dado de dificultad"},
            { name: "Puntería mortal", level:1, type: "passive", description:"Ignoras la defensa que tengan objetivos que se encuentren a menos de 15 pies de ti"},
            { name: "Ataque furtivo", level:1, type: "passive", description:"Haz un ataque con tu arma contra todas lsa criaturas en un arco de 15 pies. Gasta 2 ventajas para tropezar a tu objetivo"},
            { name: "Puntería experta", level:5, type: "moveaction", description:""},
            { name: "Ataque rápido", level:4, type: "bonusaction", description:""},
            { name: "Arquero experto", level:2, type: "addon", base:"Arco", description:""},
            { name: "Impacto vital", level:5, type: "addon", base:"Arco", description:""},
            { name: "Disparo en movimiento", level:4, type: "passive", description:""}
		]
	},
     "Armaduras": 
	 {
		 bonus: ( context, level ) => { 
		 context.temp.defbonus += 1 + level
		 context.armorpenalty += 2*level
		 },
		 skills: [
            { name: "Blindaje", level:2, type: "passive", description:""},       
            { name: "Protección elemental", level:2, type: "passive", description:""},       
            { name: "Campeón de acero", level:3, type: "reaction", description:""},       
	 ]},
    "Armas de fuego": 
	{
		skills: [
            { name: "Agilidad del pistolero", level:1, type: "passive", description:""},
            { name: "Disparo preciso", level:3, type: "passive", description:"Al disparar a un objetivo que se encuentre a menos de 15 pies de ti ignorarás todos los puntos de defensa que tenga por su armadura. Antes de atacar puedes añadir un dado de dificultad a tu tiro de ataque para duplicar la distancia a la que puedes utilizar Puntería mortal"},
            { name: "Ojo del francotirador", level:3, type: "fullroundaction", description:"Haz un disparo con el cual reduces todas las penalizaciones por distancia en un dado de dificultad y duplicas la distancia a la que puedes usar Puntería mortal"},
            { name: "Disparo en movimiento", level:4, type: "passive", description:"Puedes moverte antes y después de disparar. Además, no sufres penalizaciones por disparar montado"},
            { name: "Puntería mortal", level:1, type: "passive", description:""},
            { name: "Truco de bala", level:2, type: "addon",base:"Arma de fuego", description:"Puedes gastar 2 ventajas generadas para fintar a un objetivo, espantarlo durante un turno o destruir un objeto pequeño que lleve. "},
            { name: "Impacto vital", level:5, type: "addon",base:"Arma de fuego", description:""},
            { name: "Recarga", level:2, type: "moveaction", description:""},
            { name: "Puntería experta", level:5, type: "moveaction", description:""},
            { name: "Disparos a bocajarro", level:4, type: "fullroundaction", description:""},
        ]
	},
    "Artes marciales": 
	{
        skills: [
            { name: "Puño preciso", level:3, type: "moveaction", description:""},
            { name: "Puño aturdidor", level:2, type: "addon",base:"Golpe", description:""},
            { name: "Patada feroz", level:2, type: "addon",base:"Golpe", description:""},
            { name: "Desviar proyectiles", level:3, type: "addon",base:"Parada", description:""},
            { name: "Golpe devastador", level:4, type: "addon", description:""},
            { name: "Puño preciso", level:3, type: "moveaction", description:""},
            { name: "Punto de presión", level:4, type: "addon",base:"Puño preciso", description:""},
            { name: "Puñetazo mortal", level:5, type: "addon",base:"Puño preciso", description:""},
            { name: "Ataque despiadado", level:5, type: "bonusaction", description:""},
            { name: "Golpe", level:1, type: "attack", description:""},
            { name: "Defensa marcial", level:1, type: "block", description:""},
            { name: "Secuencia de ataques", level:1, type: "moveaction", description:""}
	]},
    "Cadenas": 
	{
        skills:[
            { name: "Enredar", level:1, type: "addon",base:"Cadena", description:""},
            { name: "Cadena", level:1, type: "attack", description:""},
            { name: "Parada", level:1, type: "block", description:""},
            { name: "Danza de cadenas", level:1, type: "moveaction", description:""},
            { name: "Ataque circular", level:2, type: "fullroundaction", description:""},
            { name: "Cargar ataque", level:2, type: "standardaction", description:""},
            { name: "Agarre con cadena", level:3, type: "addon",base:"Cadena", description:""},
            { name: "Desviar proyectiles", level:3, type: "addon",base:"Parada", description:""},
            { name: "Cadena serpenteante", level:4, type: "bonusaction", description:""},
            { name: "Escudo humano", level:4, type: "addon",base:"Cadena", description:""},
            { name: "Ahorcar", level:5, type: "addon",base:"Cadena", description:""},
            { name: "Reposicionar", level:5, type: "addon",base:"Parada", description:""}
	]},
    "Contundentes":
	{
    skills:[
        { name: "Maza", level:1, type: "standardacion", description:""},
        { name: "Ataque poderoso", level:1, type: "passive", description:"Antes de realizar un ataque puedes escoger reducir los dados de habilidad que tiras por 1 para incrementar tu daño base por 2"},
        { name: "Impacto de choque", level:1, type: "addon",base:"Ataque", description:""},
        { name: "Parada", level:1, type: "reaction", description:""},
        { name: "Concusión", level:2, type: "addon",base:"Maza", description:""},
        { name: "Maza oscilante", level:2, type: "fullroundaction", description:""},
        { name: "Impacto destructor", level:3, type: "addon",base:"Maza", description:""},
        { name: "Carga poderosa", level:3, type: "passive", description:""},
        { name: "Quebrar el suelo", level:4, type: "fullroundaction", description:""},
        { name: "Golpe fulminante", level:5, type: "addon",base:"Maza", description:""},
        { name: "Ataque despiadado", level:5, type: "bonusaction", description:""},
    ]},
    "Escudo":
	{
    skills:[
        { name: "Golpe de escudo", level:1, type: "bonusaction", description:""},        
        { name: "Proteger aliado", level:1, type: "reaction", description:""},        
        { name: "Escudo", level:1, type: "reaction", description:""},        
        { name: "Interceptar", level:2, type: "moveaction", description:""},        
        { name: "Forma defensiva", level:2, type: "bonusaction", description:""},        
        { name: "Carga poderosa", level:3, type: "addon",base:"Golpe de escudo", description:""},        
        { name: "Barrera móvil", level:3, type: "addon",base:"Forma defensiva", description:""},        
        { name: "Mantener posición", level:4, type: "reaction", description:""},          
        { name: "Guardián", level:4, type: "addon",base:"Forma defensiva", description:""},        
        { name: "Maestría con escudo", level:5, type: "addon",base:"Forma defensiva", description:""}, 
        { name: "Detener hechizos", level:5, type: "passive", description:""}       
    ]},
    "Filos cortantes":
	{
    skills:[
        { name: "Espada", level:1, type: "standardaction", description:""},       
        { name: "Parada", level:1, type: "reaction", description:""},       
        { name: "Tajo feroz", level:1, type: "addon",base:"Espada", description:""},       
        { name: "Gran corte", level:2, type: "fullroundaction", description:""},       
        { name: "Ataque poderoso", level:2, type: "addon",base:"Espada", description:""},       
        { name: "Impacto destructor", level:3, type: "addon",base:"Espada", description:""},       
        { name: "Choque de espadas", level:3, type: "addon",base:"Espada", description:""}, 
        { name: "Gran corte", level:4, type: "standardaction", description:""},       
        { name: "Torbellino de acero", level:4, type: "fullroundaction", description:""},       
        { name: "Rompe escudos", level:4, type: "addon",base:"Espada", description:""},       
        { name: "Tajo cercenador", level:5, type: "addon",base:"Espada", description:""},       
    ]},
    "Filos perforantes":
	{
    skills:[
        { name: "Ataque preciso", level:1, type: "passive", description:""},       
        { name: "Daga", level:1, type: "standardaction", description:""},       
        { name: "Parada", level:1, type: "reaction", description:""},       
        { name: "Finta", level:2, type: "addon",base:"Daga", description:""},       
        { name: "Desarme", level:3, type: "addon",base:"Daga", description:""},       
        { name: "Reposicionar", level:3, type: "addon",base:"Parada", description:""},       
        { name: "Salto", level:4, type: "standardaction", description:""},       
        { name: "Ataque fintado", level:4, type: "bonusaction", description:""},       
        { name: "Impacto vital", level:5, type: "addon",base:"Daga", description:""},
        { name: "Contrataque", level:5, type: "addon",base:"Parada", description:""}     
    ]},
    "Reflejos":
	{
	skills:
    [
        { name: "Sutileza", level:1, type: "passive", description:""},
        { name: "Rapidez", level:1, type: "passive", description:"", bonus:( context, level ) => { context.actions += 1 }},              
        { name: "Evasión", level:2, type: "passive", description:""},       
        { name: "Esquiva asombrosa", level:2, type: "passive", description:""},       
        { name: "Prisa", level:3, type: "passive", description:""},       
        { name: "Acrobacias", level:3, type: "passive", description:""},       
        { name: "Evasión superior", level:4, type: "addon",base:"Evasión", description:""},       
        { name: "Esquiva asombrosa superior", level:4, type: "addon",base:"Esquiva asombrosa", description:""},
        { name: "Libertad de movimiento", level:5, type: "passive", description:""},       
        { name: "Oportunista", level:5, type: "reaction", description:""}      
    ]},

    "Fortitud": 
	{ 
	skills:
    [
        { name: "Resistir la muerte", level:2, type: "passive", description:""},       
        { name: "Resistir armas", level:3, type: "reaction", description:""},       
        { name: "Recuperación rápida", level:3, type: "passive", description:""},       
    ]},
    "Ira": { skills: 
    [
        { name: "Ira", level:1, type: "passive", description:""},       
        { name: "Movimiento ágil", level:1, type: "addon",base:"Ira", description:""},       
        { name: "Reducción al daño", level:2, type: "addon",base:"Ira", description:""},       
        { name: "Golpe decisivo", level:2, type: "passive", description:""},       
        { name: "Fortitud interna", level:3, type: "passive", description:""},       
        { name: "Temerario", level:3, type: "passive", description:""},    
        { name: "Ira primigenia", level:4, type: "passive", description:""},       
        { name: "Difícil de matar", level:4, type: "passive", description:""},          
    ]},
    "Rastrear":  { skill: 
    [
        { name: "Enemigo predilecto", level:1, type: "fullroundaction", description:""},       
        { name: "Terreno predilecto", level:1, type: "passive", description:""},       
        { name: "Rastreador experto", level:2, type: "moveaction", description:""},       
        { name: "Acechar", level:2, type: "standardaction", description:""},       
        { name: "Presa", level:3, type: "moveaction", description:""},       
        { name: "Rastreador rápido", level:3, type: "passive", description:""},   
        { name: "Enemigo predilecto", level:3, type: "standardaction", description:""},           
        { name: "Maestro del terreno", level:4, type: "passive", description:""},       
        { name: "Maestro cazador", level:5, type: "addon",base:"Enemigo predilecto", description:""},     
        { name: "Presa", level:5, type: "bonusaction", description:""},        
        { name: "Depredador imparable", level:5, type: "addon",base:"Presa", description:""},       
    ]},
    "Guerrero divino":  { skill: 
    [
        { name: "Sanación", level:1, type: "standardaction", description:""},      
        { name: "Guerrero de la fe", level:1, type: "passive", description:""}, 
        { name: "Arma sacra", level:2, type: "passive", description:""},
        { name: "Armadura consagrada", level:2, type: "passive", description:""},
        { name: "Plegaria", level:3, type: "passive", description:""},       
        { name: "Guardián de la fe", level:3, type: "standardaction", description:""},       
        { name: "Aliento de vida", level:4, type: "fullroundaction", description:""},       
        { name: "Hueste divina", level:4, type: "passive", description:""},       
        { name: "Aura sacra", level:5, type: "addon",base:"Guardián de la fe", description:""},       
        { name: "Intervención divina", level:5, type: "reaction", description:""},       

    ]},
    "Influenciar": { skill: 
    [
        { name: "Máscara", level:1, type: "passive", description:""},       
        { name: "Persuasivo", level:1, type: "standardaction", description:""},       
        { name: "Aprovechar favores", level:2, type: "addon",base:"Persuasivo", description:""},       
        { name: "Chantaje", level:3, type: "addon",base:"Persuasivo", description:""},       
        { name: "Manipulación mental", level:4, type: "standardaction", description:""},       
        { name: "Sembrar cizaña", level:5, type: "standardaction", description:""},       
        { name: "Persuasión en masa", level:5, type: "addon",base:"Persuasivo", description:""},       
        { name: "Maestro titiritero", level:6, type: "addon",base:"Persuasivo", description:""}, 
        { name: "Conducir a la desesperación", level:6, type: "standardaction", description:""}     
    ]},
    "Presencia":  
	{ 
	skill:  [
        { name: "Voz del comandante", level:1, type: "standardaction", description:""},     
        { name: "Inspirar temor", level:1, type: "passive", description:""},       
        { name: "Atemorizar", level:2, type: "standardaction", description:""},       
        { name: "Dirigir combatientes", level:2, type: "addon",base:"Voz del comandante", description:""},       
        { name: "Inspiración", level:2, type: "bonusaction", description:""},       
        { name: "Indómito", level:3, type: "reaction", description:""},       
        { name: "Inspirar heroísmo", level:3, type: "standardaction", description:""},       
        { name: "Incitar el pánico", level:4, type: "fullroundaction", description:""},       
        { name: "Inflamar emociones", level:4, type: "standardaction", description:""},       
        { name: "Inspirar leyenda", level:5, type: "addon",base:"Inspirar heroísmo", description:""},
        { name: "Bonus táctico", level:5, type: "addon",base:"Voz del comandante", description:""}      
    ]}
}