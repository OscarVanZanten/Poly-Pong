//server.js
var http = require('http');
var server = http.createServer( handler );
var io = require("socket.io").listen(server);
server.listen(8000);

var lobbies = [];
var mainlobby = new lobby("Main Lobby", 128, 0);

io.sockets.on("connection", function(socket) {
	var data = socket.handshake.query;
	console.log("user: '" + data.name +"' connected to the main Lobby: " + socket.id );
	var u = new user(data.name, socket.id);
	mainlobby.users.push(u);
	mainlobby.sendMessageToAll("System:'"+ u.name +"' joined");
	socket.on("namechange", function (data) {
		var room = getLobbyForUser(socket.id);
		var id = getIndexForUser(room.users, socket.id);
		console.log("User '" + room.users[id].name + "' changed their name to '" + data + "'");
		room.sendMessageToAll("System: player '" +  room.users[id].name + "' changed their name to '" + data+"'");
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
		if(room == mainlobby){
			room.leaveSilent(user);
			
		}else{
			room.leave(user)
			room.sendMessageToAll("System:'"+ user.name+"' left");
		}
	});
	socket.on('serverListRefresh', function() {
		io.sockets.connected[socket.id].emit('lobbies', lobbies);
	});
	socket.on("createlobby", function(data){
		var l = new lobby(data[0], 2,getNextID());
		var user = mainlobby.getUserForID(socket.id);
		mainlobby.leaveSilent(user);
		l.join(user);
		lobbies.push(l);
		console.log("created lobby, Name: '" + data[0] + "', MaxPlayers: '" + data[1]+"'");
		io.sockets.connected[socket.id].emit("joinLobby", l);
	});
	socket.on("leaveLobby", function(data){
		var room = getLobbyForUser(socket.id);
		var user = room.getUserForID(socket.id);
		room.sendMessageToAll("System:'"+ user.name+"' left");
		room.leave(user);
		mainlobby.join(user);
		console.log("User left lobby:'"+ user.name+"'");
		io.sockets.connected[socket.id].emit('lobbies', lobbies);
		room.updateInfo();
	});
	socket.on("joinLobby", function(data){
		var destination = getLobbyByID(data);
		if(destination.users.length < destination.maxplayers){
			var room = getLobbyForUser(socket.id);
			var user = room.getUserForID(socket.id);
			user.ready = false;
			room.leave(user);
			destination.join(user);
			room.updateInfo();
		} else {
			io.sockets.connected[socket.id].emit('kick', ["lobby too full",lobbies]);
		}
	});
	socket.on("ready", function(data){
		var room = getLobbyForUser(socket.id);
		var user = room.getUserForID(socket.id);
		user.ready = data;
		room.updateInfo();
		console.log("User '"+ user.name + "' changed ready to: " + user.ready);
	});
	socket.on("message", function(data){
		var room = getLobbyForUser(socket.id);
		var user = room.getUserForID(socket.id);
		console.log("received message from '"+user.name+"'")
		room.sendMessageToAll(user.name+": " + data);
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
}, 1000/60);

function user(name, id){
	//connection info
	this.name = name;
	this.id = id;
	//input
	this.keys = [false, false];
	//other
	this.ready = false;
	this.points = 0;
	this.color = 0;
	//physics
	this.point = [];
	this.location = 0;
	this.angle = 0;
	
	this.getRect =  function getRect(){
		return new rectangle(this.point.x, this.point.y + (200 - this.point.height)/100 * this.location, this.point.width, this.point.height, 0, null);
	}
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

function ball(rectangle){
	this.rectangle = rectangle;
	this.speed = 1;
	this.angle = 0;

	this.update  = function update(lobby){
		for(var i = 0; i < lobby.walls.length; i++){
			if(lobby.walls[i].collision(this.rectangle)){
				this.angle -= 90;
				if(lobby.walls[i].user != null){
					lobby.walls[i].user.points++;
					lobby.resetGame();
				}
			}
		}
		for(var i = 0; i < lobby.users.length; i++){
			if(lobby.users[i].getRect().collision(this.rectangle)){
				this.angle -= 90;
				this.speed += 0.2
			}
		}
		while(this.angle > 360){
			this.angle -= 360;
		}
		while(this.angle < 0){
			this.angle += 360;
		}
		this.rectangle.x += Math.cos(this.angle * (Math.PI/180)) * this.speed;
		this.rectangle.y += Math.sin(this.angle * (Math.PI/180)) * this.speed;
	}
}

function rectangle(x,y,width,height,rot, user){
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
	this.rot = rot;
	this.user = user;
	this.timer = 0;
	this.time = 1;
	this.collision = function collision(rectangle){
		if(this.timer > 0){
			this.timer--;
			return false;
		}
	
		var found = false;
		var points = [];
		points.push(new point(rectangle.x, rectangle.y));
		points.push(new point(rectangle.x, rectangle.y + rectangle.height));
		points.push(new point(rectangle.x + rectangle.width, rectangle.y));
		points.push(new point(rectangle.x + rectangle.width,rectangle.y + rectangle.height));
		for(var i =0; i < points.length; i++){
			if(this.x < points[i].x && (this.x + this.width) > points[i].x
			&& this.y < points[i].y && (this.y+ this.height) > points[i].y){
					found = true;
					this.timer = this.time;
				}
		}
		return found;
	}
}

function point(x,y){
	this.x = x;
	this.y = y; 
}

function lobby(name, maxplayers, id){
	this.gamestatus= "preparing";
	this.id = id;
	this.name = name;
	this.maxplayers = maxplayers
	this.currentlyplaying =0;
	
	this.scorelimit = 5;
	
	//timer
	this.timer = 0;
	this.timerDefault = 600;
	//entities
	this.users = [];
	this.walls = [];
	this.ball;
	//playing field
	this.width;
	this.height;
	
	this.getUserForID = function getUserForID(id){
		for(var i =0; i < this.users.length; i++){
			if(this.users[i].id == id){
				return this.users[i];
			}
		}
		return -1;
	}	
	this.leaveSilent = function leaveSilent(user){
		for(var i =0; i < this.users.length; i++){
			if(this.users[i].compare(user)){
				this.users.splice(i,1);
					return true;
			}
		}
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
		if(this.isReady() == true){
			this.gamestatus = "starting"
			this.resetTimer();
			this.setupGame();		
			this.updateInfo();
		}
		if(this.gamestatus == "starting"){
			this.timer--;
			if(this.timer % 60 == 0){
				this.sendMessageToAll("System: game starting in: " + (this.timer / 60));
			}
			if(this.timer == 0){
				this.gamestatus = "playing";
				this.sendMessageToAll("System: Game started");
				this.timer = 0;
			}
		}
		if(this.gamestatus == "starting" || this.gamestatus == "playing"){
			for(var i =0; i < this.users.length; i++){
				this.users[i].update();
			}
			this.sendGameUpdate();
		}
		if(this.gamestatus == "playing"){
			this.ball.update(this);
			for(var i =0; i < this.users.length; i++){
				if(this.users[i].points == this.scorelimit){
					this.sendMessageToAll(this.users[i].name + " has won the game!");
					for(var x =0; x < this.users.length; x++){
						this.users[x].ready = false;
					}
					this.gamestatus ="preparing";
					this.updateInfo();
				}
			}
			if(this.users.length == 1){
				this.sendMessageToAll("Too little players, stopped the game");
				this.resetGame();
				this.gamestatus ="preparing";
			}
		}
		
		
	}
	this.updateInfo = function updateInfo(){
		if(this.name != "Main Lobby"){
			for(var i =0; i < this.users.length; i++){
				io.sockets.connected[this.users[i].id].emit("joinLobby", this);
			}
		}
	}
	this.isReady = function isReady(){
		var everyoneReady = true;
		for(var i =0; i < this.users.length; i++){
			if(this.users[i].ready == false){
				everyoneReady = false;
				break;
			}
		}
		return (this.gamestatus == "preparing" && this.users.length >= 2 && this.users.length <= this.maxplayers && everyoneReady);
	}
	this.setupGame = function setupGame(){
		this.users[0].points = 0;
		this.users[1].points =0;
		this.width = 300;
		this.height = 200;
		this.walls = [];
		this.walls.push(new rectangle(50,40, 300, 10,0, null));
		this.walls.push(new rectangle(50,50, 10, 200,0, this.users[0]));
		this.walls.push(new rectangle(340,50, 10, 200,0, this.users[1]));
		this.walls.push(new rectangle(50,250, 300, 10,0, null));
		this.users[0].point = new rectangle(80, 50, 10, 60, 00 , null);
		this.users[0].location = 50;
		this.users[1].point = new rectangle(310, 50, 10, 60, 00 , null);
		this.users[1].location = 50;
		this.ball = new ball(new rectangle( this.width /2 + 50 - 10, this.height / 2 + 50 - 10, 20,20, 0, null));
		this.ball.angle = Math.floor(Math.random() *  4) * 90 + 45;
		this.updateInfo();
	}	
	this.resetGame = function resetGame(){
		
		if(this.users[0] != undefined && this.users[1] != undefined){
			this.users[0].location = 50;
			this.users[1].location = 50;
		}
		this.timer = 300;
		this.gamestatus = "starting";
		this.ball = new ball(new rectangle( this.width /2 + 50 - 10, this.height / 2 + 50 - 10, 20,20, 0, null));
		this.ball.angle = Math.floor(Math.random() *  4) * 90 + 45;
		this.updateInfo();
	}
	this.resetTimer = function resetTimer(){
		this.timer = this.timerDefault;
	}
	this.sendMessageToAll = function sendMessageToAll(message){
		for(var i =0; i < this.users.length; i++){
			sendMessage(message, this.users[i]);
		}
	}
	this.sendGameUpdate = function sendGameUpdate(){
		for(var i =0; i < this.users.length; i++){
			io.sockets.connected[this.users[i].id].emit("gameupdate", [this.users, this.walls, this.ball, this.width, this.height]);
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

function sendMessage(message, user){
	io.sockets.connected[user.id].emit("message", message + '\n');
}	

function handler( request, response ) {
	response.writeHead(200 , { "Content-Type": "text/plain"});
 	response.write("Nothing here to find.... <br><br><br> Why are you here?...");
    response.end();
    console.log("response sent..");
};