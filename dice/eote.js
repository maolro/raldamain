// this script is for rolling dice for FFG's Edge of the Empire Star Wars RPG

var ability = [
	"", "s", "s", "ss", "a", "a", "sa", "aa"
];

var difficulty = [
	"", "f", "ff", "t", "t", "t", "tt", "ft"
];

var boost = [
	"", "", "aa", "a", "sa", "s"
];

var setback = [
	"", "", "f", "f", "t", "t"
];

var proficiency = [
	"", "s", "s", "ss", "ss", "a", "sa", "sa", "sa", "aa", "aa", "T"
];

var challenge = [
	"", "f", "f", "ff", "ff", "t", "t", "ft", "ft", "tt", "tt", "D"
];

var force = [
	"d", "d", "d", "d", "d", "d", "dd", "l", "l", "ll", "ll", "ll"
];

var toname = {
	's': 'success',
	'f': "failure",
	'a': "advantage",
	't': "threat",
	'T': "triumph",
	'D': "despair",
	'd': "dark",
	'l': "light"
};

var translation = {
	's': 'éxito',
	'f': "fracaso",
	'a': "ventaja",
	't': "desventaja",
	'T': "triumfo",
	'D': "desesperación",
	'd': "dark",
	'l': "light"
};

var dicename = {
	"a" : "Habilidad",
	"b" : "Ventaja",
	"c" : "Desafío",
	"d" : "Dificultad",
	"f" : "force",
	"p" : "Soltura",
	"s" : "Desventaja",
};


function getUrlParameter(name) {
	name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
	var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
	var results = regex.exec(location.search);
	return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
};


function edgeRoll( dice ) { // where the rolling magic happens
	var finalRoll = "";

	

	for ( var i = 0; i < dice.length ; i++ ) {
		switch ( dice.charAt( i ) ) {
			case "a" : finalRoll += ability[Math.floor((Math.random()*8))]; break;
			case "b" : finalRoll += boost[Math.floor((Math.random()*6))]; break;
			case "c" : finalRoll += challenge[Math.floor((Math.random()*12))]; break;
			case "d" : finalRoll += difficulty[Math.floor((Math.random()*8))]; break;
			case "f" : finalRoll += force[Math.floor((Math.random()*12))]; break;
			case "p" : finalRoll += proficiency[Math.floor((Math.random()*12))]; break;
			case "s" : finalRoll += setback[Math.floor((Math.random()*6))]; break;
		}
	}
	
	var rollArray = { 'T':0, 's':0, 'a':0, 'f':0, 't':0, 'D':0, 'd':0, 'l':0 };
	for ( var j = 0; j < finalRoll.length ; j++ ) {
		rollArray[ finalRoll.charAt( j ) ]++;
	}
	
	rollArray['s'] += rollArray['T']; // adding Triumphs to successes
	rollArray['f'] += rollArray['D']; // adding Despairs to failures
	if ( rollArray['s'] <= rollArray['f'] ) { // reducing success/failure axis
		rollArray['f'] -= rollArray['s'];
		rollArray['s'] = 0;
	} else {
		rollArray['s'] -= rollArray['f'];
		rollArray['f'] = 0;		
	}

	if ( rollArray['a'] <= rollArray['t'] ) { // reducing advantage/threat axis
		rollArray['t'] -= rollArray['a'];
		rollArray['a'] = 0;
	} else {
		rollArray['a'] -= rollArray['t'];
		rollArray['t'] = 0;		
	}


	var imageRoll = "";
	for (var k in rollArray) {

		for ( var l = 0; l < rollArray[k] ; l++ ) {
			imageRoll += '<img src="' + image(toname[k]) + '" />';
		}
	}

	var request = new XMLHttpRequest();
	request.open("POST", "https://discord.com/api/webhooks/" + getUrlParameter("hook"));

	request.setRequestHeader('Content-type', 'application/json');

	var embeds = [];

	var fields = [];

	for (var k in rollArray) {
		if (rollArray[k] !== 0) {
			fields.push({ name: translation[k], value: rollArray[k], inline: true });
		}
	}

	var dicecount = {};
	for (var i = 0; i < dice.length; i++) {
		if (dicecount[dice.charAt(i)]) {
			dicecount[dice.charAt(i)]++;
		}
		else {
			dicecount[dice.charAt(i)] = 1;
        }
	}

	var message = "";
	for (var d in dicecount) {
		message += dicename[d] + ":" + dicecount[d] + " ";
    }

	var params = {
		embeds: [{ title: getUrlParameter("name") + " ha tirado", description: message, fields: fields }]
	}

	//alert(JSON.stringify(params));

	request.send(JSON.stringify(params));

	
	return finalRoll + '<br />' + imageRoll;
	}

	function image(name) {
		return "e/" + name + ".png";
    }

function reducePool( callingImage ) { // removes a die from the entry box and the pool graphic
	$('#diceEntry').val( $('#diceEntry').val().replace( callingImage.attr("src").charAt( 2 ), '' ) );
	callingImage.remove();
}

function addDie( dieType ) { // adds a die to both the entry box and the pool graphic
	$('#diceEntry').val( $('#diceEntry').val() + dieType.charAt( 0 ) );
	$('#dicePool').append( '<img src="e/' + dieType + '.png" onclick="reducePool($(this));" />' );
}
