//server.js
var http = require('http');
var server = http.createServer( handler );
var io = require("socket.io").listen(server);
server.listen(8000);

var lobbies = [];
var lobby = new lobby("Main Lobby", 128, 0);

io.sockets.on("connection", function(socket) {
	var data = socket.handshake.query;
	console.log("user: '" + data.name +"' connected to the main Lobby" );
	lobby.users.push(new user(data.name, socket.id));
	socket.on("namechange", function (data) {
		var room = getLobbyForUser(socket.id);
		var id = getIndexForUser(room.users, socket.id);
		console.log("User '" + room.users[id].name + "' changed their name to '" + data + "'");
		room.users[id].name = data;
	});
	socket.on("updateKeys", function (data) {
		var room = getLobbyForUser(socket.id);
		var id = getIndexForUser(room.users, socket.id);
		for(var i =0; i < data.length;i++){
			room.users[id].keys[i] = data[i];
		}
	});
	socket.on('disconnect', function() {
		var room = getLobbyForUser(socket.id);
		var id = getIndexForUser(room.users, socket.id);
		console.log("user disconnected: '" +  room.users[id].name+"'");
		room.users.splice(id,1);
	});
	socket.on('serverListRefresh', function() {
		io.sockets.connected[socket.id].emit('lobbies', lobbies);
	});
});


setInterval(function() {
	console.log(lobby);
	console.log(lobbies);
}, 5000);

setInterval(function() {
	for(var i = 0; i < lobbies.length; i ++){
		lobbies[i].update();
	}
	//io.sockets.emit("gameupdate",lobby);
}, 1000/60);

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

function lobby(name, maxplayers, id){
	this.id = id;
	this.name = name;
	this.maxplayers = maxplayers
	this.users = [];
	this.currentlyplaying =0;
	this.ball = ball;
	this.update = function update(){
		currentlyplaying = users.length;
		for(var i =0; i < this.users.length; i++){
			this.users[i].update();
		}
	}
}

function getLobbyForUser(id){
	for(var i =0; i < lobby.users.length;i++){
		if(lobby.users[i].id ==id){
			return lobby
		}
	}
	for(var i =0; i < lobbies.length;i++){
		for(var x = 0; x< lobbies[i].users.length; x++){
			if(lobbies[i].users[x].id == id){
				return lobbies[i];
			}
		}
	}
	return -1;
}

function getIndexForUser(users, id){
	for(var i =0; i < users.length;i++){
		if(users[i].id ==id){
			return i;
		}
	}
	return -1;
}

function handler( request, response ) {
	response.writeHead(200 , { "Content-Type": "text/plain"});
 	response.write("Nothing here to find.... <br><br><br> Why are you here?...");
    response.end();
    console.log("response sent..");
};