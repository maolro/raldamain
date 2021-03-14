var ranks = { 
    "Alabardas":
        [
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
    "Armas de fuego":
        [
            { name: "Agilidad del pistolero", level:1, type: "passive", description:""},
            { name: "Disparo preciso", level:3, type: "passive", description:""},
            { name: "Ojo del francotirador", level:3, type: "passive", description:""},
            { name: "Disparo en movimiento", level:4, type: "passive", description:""},
            { name: "Puntería mortal", level:1, type: "passive", description:""},
            { name: "Truco de bala", level:2, type: "addon",base:"Arma de fuego", description:""},
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
        { name: "Maza", level:1, type: "attack", description:""},
        { name: "Ataque poderoso", level:1, type: "", description:""},
        { name: "", level:, type: "", description:""},
        { name: "", level:, type: "", description:""},
        { name: "", level:, type: "", description:""},
        { name: "", level:, type: "", description:""},
        { name: "", level:, type: "", description:""},

    ]
}