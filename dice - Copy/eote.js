// this script is for rolling dice for FFG's Edge of the Empire Star Wars RPG



function getUrlParameter(name) {
	name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
	var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
	var results = regex.exec(location.search);
	return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
};


function edgeRoll( dice ) { // where the rolling magic happens
	var finalRoll = 0;
	var finalRollString = "";

	

	for ( var i = 0; i < dice.length ; i++ ) {
		var sideNumber;
		switch ( dice.charAt( i ) ) {
			case "4" : sideNumber = 4; break;
			case "6" : sideNumber = 6; break;
			case "d" : sideNumber = -6; break;
			case "8" : sideNumber = 8; break;
			case "x" : sideNumber = 10; break;
			case "y" : sideNumber = 12; break;
			case "z" : sideNumber = 20; break;
		}
		var roll;
		roll = calcRoll(sideNumber);
		finalRoll += roll; 
		finalRollString += "d"+sideNumber+ "= "+ roll + " ";
	}
	calcRoll()
	if (document.getElementById("modifier").value < 0){
		finalRollString += " "+document.getElementById("modifier").value;
	}
	else{
		finalRollString += "+ "+document.getElementById("modifier").value;
	}
	finalRoll += parseInt(document.getElementById("modifier").value, 10);

	var request = new XMLHttpRequest();
	request.open("POST", "https://discord.com/api/webhooks/" + getUrlParameter("hook"));

	request.setRequestHeader('Content-type', 'application/json');

	var fields = [];
	fields.push({ name: "result", value: finalRoll, inline: true });

	var params = {
		embeds: [{ title: getUrlParameter("name") + " ha tirado", description: finalRollString, fields: fields }]
	}

	//alert(JSON.stringify(params));

	request.send(JSON.stringify(params));

	return finalRollString + '<br />' + finalRoll;
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
function calcRoll (sideNumber){
	if (sideNumber>0){
		return Math.floor(Math.random()*sideNumber)+1;
	}
	else{
		return Math.floor(Math.random()*sideNumber);
	}
}