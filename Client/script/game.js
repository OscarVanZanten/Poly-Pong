//connect to websocket
socket = io.connect("http://localhost:8000", {query: "name="+ $("#name").val()});
keyinputs = [false, false];
var canvas = document.getElementById("canvas");
var graphics = canvas.getContext("2d");
var width = $("#canvas").width();
var height = $("#canvas").height();
var splasscreen = new Image();
var background = new Image();
splasscreen.src="img/Splasscreen.png";
background.src = "img/background.png";

var status = "Startup";

var lobby;
var lobbies;

var walls;
var users ;
var ball ;
var playWidth;
var playHeight;
//splasscreen
$("#canvas").ready(function(){
	graphics.beginPath();	
	graphics.drawImage(splasscreen,0,0,width ,height);
	setTimeout(function(){
		status  = "Browser";
		graphics.beginPath();		
		graphics.fillStyle = "#FFFFFF";
		graphics.fillRect(0,0, width,height);
		socket.emit("serverListRefresh", []);
	}, 2000); 
});

//draw game if lobby is set
setInterval(function() {
	if(status == "Browser"){
		walls = undefined;
		users = undefined;
		bull = undefined;
	}
	
	graphics.beginPath();
	graphics.save()	
	graphics.drawImage(background,0,0,width ,height);
	graphics.restore();
	
	if( walls === undefined || users === undefined || ball === undefined){
		return;
	}

	for(var i =0; i < walls.length; i++){
		graphics.save()
		graphics.fillStyle = "red";
		graphics.translate( walls[i].x, walls[i].y);
		graphics.rotate(walls[i].rot * Math.PI/180);
		graphics.fillRect(0,0  , walls[i].width, walls[i].height);
		graphics.restore();
	}	
	for(var i = 0 ; i < users.length; i++){
		graphics.save();
		graphics.fillStyle = "blue";
		graphics.translate(users[i].point.x, users[i].point.y + (((playHeight-users[i].point.height) / 100) * users[i].location));
		graphics.rotate(users[i].point.rot * Math.PI/180);
		graphics.fillRect(0,0, users[i].point.width,users[i].point.height);
		graphics.restore();
	}
	graphics.save();
	graphics.fillStyle = "orange";
	graphics.fillRect(ball.rectangle.x, ball.rectangle.y, ball.rectangle.width, ball.rectangle.height);
	graphics.restore();
}, 1000/60);

////connection listeners
socket.on("gameupdate", function (data) {
	users = data[0];
	walls = data[1];
	ball = data[2];
	playWidth = data[3];
	playHeight = data[4];
});

socket.on("lobbies", function (data) {
	status = 'Browser';
	lobbies = data;
	$("#menu").html(createServerList(data));
});

socket.on("kick", function (data) {
	status = 'Browser';
	lobbies = data[1];
	alert(data[0]);
	$("#menu").html(createServerList(data[1]));
});

socket.on("joinLobby", function (data){
	status = 'Ingame';
	lobby = data;
	$("#menu").html(createLobbyView(data));
});

socket.on("message", function(data){
	 $('#chatHistory').scrollTop($('#chatHistory')[0].scrollHeight);
	console.log("received message: " + data);
	$("#chatHistory").append(data);
});

//////generating menus
//creating lobby view
function createLobbyView(lobby){
	var lobbyView = "<Strong>Lobby</Strong><br><br><strong>Players:</strong><br>";
	lobbyView+="-----------------------<br>"
	for(var i =0; i < lobby.users.length; i++){
		lobbyView += lobby.users[i].name;
		if(lobby.users[i].ready){
			lobbyView +=  " <strong>ready</strong>" + "<br>";
		}else{
			lobbyView +=  " <strong>not ready</strong>" + "<br>";
		}
	}
	lobbyView+="------------------------<br>"
	lobbyView += "<input type='button' id='ready' value='ready'>";
	lobbyView += "<input type='button' id='unready' value='unready'><br>";
	lobbyView += "<input type='button' id='leaveLobby' value='Leave'>";
	return lobbyView;
}

//creating serverlist
function createServerList(data){
	var serverlist = "<Strong>ServerList</Strong>";
	if(data.length >0){
		serverlist += "<ul>";
		for(var i =0; i < data.length;i++){
			serverlist += "<li>" + data[i].name + "<input type='button' value='Join' id='server' class='"+ data[i].id + "'></li>";
		}
		serverlist += "</ul>";
	} else {
		serverlist +="<br> no servers found"
	}
	serverlist += "<button id='create' type='button'>Create Lobby</button>";
	serverlist += "<button id='refresh' type='button'>Refresh list</button>";
	return serverlist;
}

///////////button listeners
//create lobby button
$("#container").on('click', '#create', function () {
	var form = "Name: <input type='text' id='lobbyname' value='name'></input>";
	form += "<button id='createlobby' type='button'>Create Lobby</button>";
	$("#menu").html(form);
});

//create lobby packet 
$("#container").on('click', '#createlobby', function () {
	var name  = [$("#lobbyname").val()];
	socket.emit("createlobby", name);
	$("#menu").html(createServerList(lobbies));
});

//refresh button
$("#container").on('click', '#refresh', function () {
	socket.emit("serverListRefresh", []);
	console.log("Send serverlist refresh packet");
});

//name change
$("#name").change(function(){
	console.log("changing name");
	socket.emit("namechange", $("#name").val());
});
//send message
$("#sendMessage").on("click", function(){
	console.log("sending message");
	socket.emit("message", $("#message").val());
});
//leave lobby
$("#container").on("click", '#leaveLobby', function(){
	console.log("leaving lobby");
	socket.emit("leaveLobby",lobby.id);
});
//join l
$("#container").on("click", '#server', function(){
	var c = $('#server').attr("class");
	socket.emit("joinLobby",c);
});
//ready/unready
$("#container").on("click", '#ready', function(){
	console.log("readying");
	socket.emit("ready",true);
});
$("#container").on("click", '#unready', function(){
	console.log("unreadying");
	socket.emit("ready",false);
});
///////////////input
//listeners
window.addEventListener('keydown', function(event) {
	
  switch (event.keyCode) {
    case 37: // Left
      keyinputs[0] = true;
    break;
    case 39: // Right
      keyinputs[1] = true;
    break;
  }
}, false);

window.addEventListener('keyup', function(event) {
	
  switch (event.keyCode) {
   case 37: // Left
      keyinputs[0] = false;
    break;
    case 39: // Right
      keyinputs[1] = false;
    break;
  }
}, false);

setInterval(function (){
	socket.emit("updateKeys", keyinputs);
} , 1000/60);

