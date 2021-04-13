var listofskills = { 
    "Alabardas":
        [
            { name: "Alabarda", level:1, type: "standardaction", description:""},       
            { name: "Parada", level:1, type: "reaction", description:""},       
            { name: "Flanqueador experto", level:3, type: "passive", description:"Tu arma hace +2 daño base contra objetivos que flanquees"},
            { name: "Carga con lanza", level:4, type: "passive", description:"Aumenta tu daño base por 2 al hacer una carga. Además, puedes gastar 2 ventajas generadas en una carga para agarrar a un objetivo clavándole tu arma"},
            { name: "Preparación contra cargas", level:1, type: "moveaction", description:"En cualquier momento de la ronda, cuando una criatura que esté cargando pase por el radio de tu alabarda, haz un ataque inmediato con el cual infliges +2 daño. Si impactas, el objetivo debe detenerse de inmediato"},
            { name: "Ajustar alcance", level:2, type: "moveaction", description:"Cambia el alcance de tu arma por 5 pies. Si lo reduces a 5 pies, perderás todas las penalizaciones al defenderte, mientras que si lo aumentas a 15 pies pierdes un dado de dificultad en tiros defensivos"},
            { name: "Ataque lateral", level:4, type: "standardaction", description:"Haz un ataque con tu arma contra todas las criaturas en un arco de 15 pies. Gasta 2 ventajas para tropezar a tu objetivo"},
            { name: "Ataque circular", level:4, type: "fullround", description:""},
            { name: "Ataque serpenteante", level:3, type: "addon", base:"Alabarda", description:""},
            { name: "Carga repentina", level:4, type: "addon", base:"Preparación contra cargas", description:"En cualquier momento de la ronda puedes hacer una carga como reacción"},
            { name: "Ataque vital", level:5, type: "addon", base:"Alabarda", description:"Las heridas permanentes que provocas son de un nivel superior al hacer preparación contra cargas. Gasta 4 ventajas para dejar al objetivo a 0 PV y moribundo"},
            { name: "Reposicionar", level:5, type: "addon", base:"Parada", description:"Muévete 5 pies tras hacer una parada exitosa"}
        ],
    "Arcos":
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

        ],
     "Armaduras":
        [
            { name: "Blindaje", level:2, type: "passive", description:""},       
            { name: "Protección elemental", level:2, type: "passive", description:""},       
            { name: "Campeón de acero", level:3, type: "reaction", description:""},       
    
        ],
    "Armas de fuego":
        [
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
        ],
    "Artes marciales":
        [
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
        ],
    "Cadenas":
        [
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
        ],
    "Contundentes":
    [
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
    ],
    "Escudo":
    [
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
    ],
    "Filos cortantes":
    [
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
    ],
    "Filos perforantes":
    [
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
    ],
    "Reflejos":
    [
        { name: "Sutileza", level:1, type: "passive", description:""},       
        { name: "Evasión", level:2, type: "passive", description:""},       
        { name: "Esquiva asombrosa", level:2, type: "passive", description:""},       
        { name: "Acrobacias", level:3, type: "passive", description:""},       
        { name: "Evasión superior", level:4, type: "addon",base:"Evasión", description:""},       
        { name: "Esquiva asombrosa superior", level:4, type: "addon",base:"Esquiva asombrosa", description:""},       
        { name: "Oportunista", level:5, type: "reaction", description:""}      
    ],

    "Fortitud":
    [
        { name: "Resistir la muerte", level:2, type: "passive", description:""},       
        { name: "Resistir armas", level:3, type: "reaction", description:""},       
        { name: "Recuperación rápida", level:3, type: "passive", description:""},       

    ],
    "Ira":
    [
        { name: "Ira", level:1, type: "passive", description:""},       
        { name: "Movimiento ágil", level:1, type: "addon",base:"Ira", description:""},       
        { name: "Reducción al daño", level:2, type: "addon",base:"Ira", description:""},       
        { name: "Golpe decisivo", level:2, type: "passive", description:""},       
        { name: "Fortitud interna", level:3, type: "passive", description:""},       
        { name: "Temerario", level:3, type: "passive", description:""},    
        { name: "Ira primigenia", level:4, type: "passive", description:""},       
        { name: "Difícil de matar", level:4, type: "passive", description:""},          
    ],
    "Rastrear":
    [
        { name: "Enemigo predilecto", level:1, type: "passive", description:""},       
        { name: "Terreno predilecto", level:1, type: "passive", description:""},       
        { name: "Rastreador experto", level:2, type: "moveaction", description:""},       
        { name: "Acechar", level:2, type: "standardaction", description:""},       
        { name: "Presa", level:3, type: "moveaction", description:""},       
        { name: "Maestro del terreno", level:4, type: "passive", description:""},       
        { name: "Maestro cazador", level:5, type: "addon",base:"Enemigo predilecto", description:""},       
        { name: "Depredador imparable", level:5, type: "addon",base:"Presa", description:""},       
    ],
    "Guerrero divino":
    [
        { name: "Sanación", level:1, type: "standardaction", description:""},       
        { name: "Plegaria", level:3, type: "passive", description:""},       
        { name: "Guardián de la fe", level:3, type: "standardaction", description:""},       
        { name: "Aliento de vida", level:4, type: "fullroundaction", description:""},       
        { name: "Hueste divina", level:4, type: "passive", description:""},       
        { name: "Aura sacra", level:5, type: "addon",base:"Guardián de la fe", description:""},       
        { name: "Intervención divina", level:5, type: "reaction", description:""},       

    ],
    "Influenciar":
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
    ],
    "Presencia":
    [
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
    ]
}