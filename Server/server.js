//server.js
var http = require('http');
var server = http.createServer( handler );
var io = require("socket.io").listen(server);
server.listen(8000);
console.log("listening on port 8000");

var lobby = new lobby(2);

function handler( request, response ) {
	response.writeHead(200 , { "Content-Type": "text/plain"});
 	response.write("Nothing here to find.... <br><br><br> Why are you here?...");
    response.end();
    console.log("response sent..");
};

io.sockets.on("connection", function(socket) {
	var data = socket.handshake.query;
	console.log("user connected: '" + data.name +"'" );
	lobby.users.push(new user(data.name, socket.id));
	
	
	socket.on("namechange", function (data) {
		var id = getIndexForUser(lobby.users, socket.id);
		console.log("User '" + lobby.users[id].name + "' changed his name to '" + data + "'");
		lobby.users[id].name = data;
	});
	
	socket.on("updateKeys", function (data) {
		var id = getIndexForUser(lobby.users, socket.id);
		for(var i =0; i < data.length;i++){
			lobby.users[id].keys[i] = data[i];
		}
	});
	
	socket.on('disconnect', function() {
		var id = getIndexForUser(lobby.users, socket.id);
		console.log("user disconnected: '" +  lobby.users[id].name+"'");
		lobby.users.splice(id,1);
	});
});


setInterval(function() {
	console.log(lobby);
}, 5000);

setInterval(function() {
	update();
	io.sockets.emit("gameupdate",lobby);
}, 1000/60);


function update(){
	lobby.update();
}

function user(name, id){
	this.name = name;
	this.id = id;
	this.keys = [false, false];
	this.location = 0;
	this.points = 0;
	this.color = 0;
	this.update = function update(){
		if(this.keys[0] && this.location > 0) this.location--;
		if(this.keys[1]&& this.location <100) this.location++;
	}
}

function ball(xAs, yAs){
	this.xAs = xAs;
	this.yAs = yAs;
	this.speed = 0;
	this.angle = 0;
}

function lobby( maxplayers){
	this.maxplayers = maxplayers
	this.users = [];
	this.currentlyplaying = 2;
	this.ball = ball;
	
	this.update = function update(){
		for(var i =0; i < this.users.length; i++){
			this.users[i].update();
		}
	}
}

function getIndexForUser(users, id){
	for(var i =0; i < users.length;i++){
		if(users[i].id ==id){
			return i;
		}
	}
	return -1;
}