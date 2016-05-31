//server.js
var http = require('http');
var server = http.createServer( handler );
var io = require("socket.io").listen(server);
server.listen(8000);

var lobbies = [];
var mainlobby = new lobby("Main Lobby", 128, 0);

io.sockets.on("connection", function(socket) {
	var data = socket.handshake.query;
	console.log("user: '" + data.name +"' connected to the main Lobby" );
	mainlobby.users.push(new user(data.name, socket.id));
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
		var user = room.getUserForID(socket.id);
		room.leave(user)
		
	});
	socket.on('serverListRefresh', function() {
		io.sockets.connected[socket.id].emit('lobbies', lobbies);
	});
	socket.on("createlobby", function(data){
		var l = new lobby(data, 2,getNextID());
		var user = mainlobby.getUserForID(socket.id);
		mainlobby.leave(user);
		l.join(user);
		lobbies.push(l);
		console.log("created lobby: " + data);
		io.sockets.connected[socket.id].emit("joinLobby", l);
	});
	socket.on("leaveLobby", function(data){
		var room = getLobbyForUser(socket.id);
		var user = room.getUserForID(socket.id);
		room.leave(user);
		mainlobby.join(user);
		io.sockets.connected[socket.id].emit('lobbies', lobbies);
	});
	socket.on("joinLobby", function(data){
		var destination = getLobbyByID(data);
		if(destination.users.length < destination.maxplayers){
			var room = getLobbyForUser(socket.id);
			var user = room.getUserForID(socket.id);
			room.leave(user);
			destination.join(user);
			io.sockets.connected[socket.id].emit("joinLobby",destination);
		} else {
			io.sockets.connected[socket.id].emit('kick', ["lobby too full",lobbies]);
		}
	});
});

setInterval(function() {
	for(var i = lobbies.length-1; i > -1 ; i--){
		if(lobbies[i].users.length == 0){
			lobbies.splice(i, 1);
		}
	}
	for(var i = 0; i < lobbies.length; i ++){
		lobbies[i].update();
	}
	//io.sockets.emit("gameupdate",lobby);
}, 1000/60);

function user(name, id){
	//connection info
	this.name = name;
	this.id = id;
	//input
	this.keys = [false, false];
	//other
	this.points = 0;
	this.color = 0;
	//physics
	this.point = new point(0,0);
	this.location = 0;
	this.angle = 0;
	
	this.update = function update(){
		if(this.keys[0] && this.location > 0) this.location--;
		if(this.keys[1]&& this.location <100) this.location++;
	}
	this.compare = function compare(user){
		var cn = this.name == user.name;
		var cid = this.id == user.id;
		return (cn && cid);
	}
}

function ball(point){
	this.point = point;
	this.speed = 0;
	this.angle = 0;
}

function point(x,y){
	this.x = x;
	this.y = y; 
}

function lobby(name, maxplayers, id){
	this.gamestatus= 'preparing'
	this.id = id;
	this.name = name;
	this.maxplayers = maxplayers
	this.currentlyplaying =0;
	
	//entities
	this.users = [];
	this.field = [];
	this.ball = new ball(new point(0,0));
	
	this.getUserForID = function getUserForID(id){
		for(var i =0; i < this.users.length; i++){
			if(this.users[i].id == id){
				return this.users[i];
			}
		}
		return -1;
	}	
	this.join = function join(user){
		this.users.push(user);
		this.updateInfo();
	}
	this.leave = function leave(user){
		for(var i =0; i < this.users.length; i++){
			if(this.users[i].compare(user)){
				this.users.splice(i,1);
				this.updateInfo();
				return true;
			}
		}
		return false;
	}
	this.update = function update(){
		for(var i =0; i < this.users.length; i++){
			this.users[i].update();
		}
		this.updateInfo();
	}
	this.updateInfo = function updateInfo(){
		for(var i =0; i < this.users.length; i++){
			io.sockets.connected[this.users[i].id].emit("joinLobby", this);
		}
	}
}

function getNextID(){
	var val = 1;
	for(var i =0; i < lobbies.length; i++){
		if(lobbies[i].id > val){
			val = lobbies[i].id;
		}
	}
	return val+1;
}

function getLobbyForUser(id){
	for(var i =0; i < mainlobby.users.length;i++){
		if(mainlobby.users[i].id ==id){
			return mainlobby
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

function getLobbyByID(id){
	for(var i =0; i < lobbies.length;i++){
		if(lobbies[i].id == id){
			return lobbies[i];
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