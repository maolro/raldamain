var listofgear = { 
   "armor": {
       "Ligera": { def:2, penalty:0},
	   "Media": { def:4, penalty:-2},
	   "Pesada": { def:6, penalty:-4},
	   "Completa": {def:8, penalty:-6}
   },
   "weapons":{
       "Espada larga": {damage:"1d8",type:"Filos cortantes",hands:1,reach:5,dmgtype:"cortante"},
       "Hacha de batalla": {damage:"2d6",type:"Filos cortantes",hands:1,reach:5,dmgtype:"cortante"},
       "Hacha de mano": {damage:"2d4",type:"Filos cortantes",hands:1,reach:5,dmgtype:"cortante"},
       "Gran hacha": {damage:"2d8",type:"Filos cortantes",hands:2,reach:5,dmgtype:"cortante"},
       "Mandoble": {damage:"1d10",type:"Filos cortantes",hands:2,reach:5,dmgtype:"cortante"},
       "Espada corta": {damage:"1d6",type:"Filos perforantes",hands:1,reach:5,dmgtype:"cortante"},
       "Daga": {damage:"1d4",type:"Filos cortantes",hands:1,reach:5,dmgtype:"perforante"},
       "Espada ropera": {damage:"1d8",type:"Filos perforantes",hands:1,reach:5,dmgtype:"perforante"},
       "Lanza": {damage:"1d10",type:"Alabardas",hands:2,reach:10,dmgtype:"perforante"},
	   "Ballesta": {damage:"2d6",type:"A distancia",hands:2,reach:90,dmgtype:"perforante"},
	   "Golpe": {damage:"1",type:"Artes marciales",hands:1,reach:5,dmgtype:"contundente"},
   }
}