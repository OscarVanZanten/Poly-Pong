//connect to websocket
socket = io.connect("http://localhost:8000", {query: "name="+ $("#name").val()});
keyinputs = [false, false];
var canvas = document.getElementById("canvas");
var graphics = canvas.getContext("2d");
lobby= [];

//name change
$("#name").change(function(){
	console.log("changing name");
	socket.emit("namechange", $("#name").val());
});

//input

//listeners
window.addEventListener('keydown', function(event) {
  switch (event.keyCode) {
    case 37: // Left
      keyinputs[0] = true;
	  updateKeys();
    break;

    case 39: // Right
      keyinputs[1] = true;
	  updateKeys();
    break;

  }
}, false);


window.addEventListener('keyup', function(event) {
  switch (event.keyCode) {
   case 37: // Left
      keyinputs[0] = false;
	  updateKeys();
    break;

    case 39: // Right
      keyinputs[1] = false;
	  updateKeys();
    break;
  }
}, false);

function updateKeys(){
	socket.emit("updateKeys", keyinputs);
}

setInterval(function() {
	graphics.fillStyle = "#FFFFFF";
	graphics.fillRect(0,0, 300,300);
	var center= new point(150,150);
	var radius = 100;
	var points = [];
	var count= 6;
	var angle = Math.PI * 2 / count;
	for(var i = 0 ; i < count;i++){
		var x =Math.cos(angle * i) *radius + center.x;
		var y =Math.sin(angle * i) *radius + center.y;
		points.push(new point(x,y));
	}
	for(var i = 0 ; i < points.length;i++){
		graphics.fillStyle = "#FF0000";
		graphics.fillRect(points[i].x,points[i].y, 2,2);
	}
	
		
	for(var i = 0 ; i < lobby.users.length;i++){
		var x =lobby.users[i].location;
		var y = 100 +  (i+1) * 50;
		graphics.fillStyle = "#FF0000";
		graphics.fillRect(x,y, 10,10);
	}

}, 1000/60);

socket.on("gameupdate", function (data) {
	lobby = data;
});


function point(x,y){
	this.x = x;
	this.y = y; 
}
