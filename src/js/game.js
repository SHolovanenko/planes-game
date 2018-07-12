"use strict"; //new IE standarts

var mainScene = document.getElementById("myCanvas");
var ctx = mainScene.getContext("2d");
var socket;

/*
 * Class Jet
 */
var Jet = function (jetColor, selfId, posX, posY, angle) {
    this.selfId = selfId || 0;
    this.jetColor = jetColor;
    this.jetWidth = 60;
    this.jetHeight = 20;
    this.angle = angle || 0;
    this.posX = posX || mainScene.width / 2;
    this.posY = posY || mainScene.height / 2;
    this.speed = 2.5;

};

    Jet.prototype.draw = function(){
        //drawing        
        ctx.beginPath();
        ctx.translate(this.posX,this.posY);
        ctx.rotate(this.angle);
        ctx.fillRect(-this.jetWidth / 2, -this.jetHeight / 2,this.jetWidth,this.jetHeight);
        ctx.fillStyle = this.jetColor;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.closePath();
    };

    Jet.prototype.synchronize = function(posX, posY, angle){
        //
        this.posX = posX;
        this.posY = posY;
        this.angle = angle;
    };

    Jet.prototype.getPosX = function(){
        //
        return this.posX;
    };

    Jet.prototype.getPosY = function(){
        //
        return this.posY;
    };

    Jet.prototype.getAngle = function(){
        //
        return this.angle;
    };

    Jet.prototype.setPosX = function(){
        //
        return this.posX;
    };

    Jet.prototype.setPosY = function(){
        //
        return this.posY;
    };

    Jet.prototype.setAngle = function(){
        //
        return this.angle;
    };

    Jet.prototype.reportPosition = function(){
        //
        if (socket){
            socket.send('POSITION' + '#' + this.posX + ';' + this.posY + ';' + this.angle);
        }
    };

    Jet.prototype.fire = function(){
        //
        if (socket){
            socket.send('FIRE' + '#' + this.posX + ';' + this.posY + ';' + this.angle);
        }
    };
//end class Jet


/*
 * Class Player
 */
function Player (jetColor) {
    Jet.call(this, jetColor);
    
    this.topPressed = false;
    this.botPressed = false;

};

    Player.prototype = Object.create(Jet.prototype);

    Player.prototype.constructor = Player;

    Player.prototype.updateAngle = function() {
        //console.log(this.topPressed);
        if(this.topPressed) {
            this.angle -= 0.03;
            //console.log(this.angle);
        }
        else if(this.botPressed) {
            this.angle += 0.02;
            //console.log(this.angle);
        }

        //return angle;
    };

    Player.prototype.move = function() {
        this.posX += Math.cos(this.angle) * this.speed;
        this.posY += Math.sin(this.angle) * this.speed;
        if((this.posX + (this.jetWidth /2)) > mainScene.width){
            this.posX = -(this.jetWidth /2);
        }
    };
//end class Player

/*
 * Standalone functions
 */
function connectionOpen() {
    //socket.send("Connection with Server. Подключение установлено обоюдно, отлично!");
    console.log("Connected");
    main();
}

function messageReceived(e) {
    let data = (e.data).split('#');
    let command = data[0];
    data = data[1];

    switch (command) {
        case 'ID': {
            console.log('Set player id; was: ' + player_1.selfId + '; Become: ' + data);
            player_1.selfId = data;
            
        } break;
        case 'position': {
            //console.log(data); //6:480;100;0    7:385;100;0

            let players = data.split(' ');
            //console.log(players);
            for (let i in players){
                let playerData = players[i].split(':');
                //console.log(player);
                let playerId = playerData[0];
                let playerPosition = playerData[1].split(';');
                let playerPositionX = playerPosition[0];
                let playerPositionY = playerPosition[1];
                let playerPositionAngle = playerPosition[2];
    
                if (playerId == player_1.selfId){
                    //player_1.synchronize(playerPositionX, playerPositionY, playerPositionAngle);
                } else {
                    let playerExist = false;
                    
                    enemies.forEach(function (value, i, enemies) {
                        //console.log(enemies[i].selfId + ' ' + playerId);
                        if (value.selfId.localeCompare(playerId) == 0){
                            value.synchronize(playerPositionX, playerPositionY, playerPositionAngle);
                            playerExist = true;
                            return true;
                        }
                    });
    
                    if(!playerExist){
                        enemies.push(new Jet('#ff1a1a', playerId, playerPositionX, playerPositionY, playerPositionAngle))
                        console.log('enemy created ' + playerId);
                    }
                }
            }
        } break;
        default: {
            //
        };
    }
}

function connectionClose() {
    socket.close();
    document.getElementById("sock-info").innerHTML += "Соединение закрыто <br />";

}
//Standalone functions end

/*
 * Standalone handlers
 */
document.getElementById("sock-disc-butt").onclick = function () {
    connectionClose();
};

document.getElementById("sock-con-butt").onclick = function () {
    socket = new WebSocket("ws://local-project.loc:8889");
    socket.onopen = connectionOpen;
    socket.onmessage = messageReceived;
};
//Standalone hendlers end




/*
 * Init section start
 */
var player_1 = new Player("#0095DD");

    var enemies = new Array();

    var keyDownHandler = function(e) {
        if(e.keyCode == 38) {
            player_1.topPressed = true;
            //console.log('topPressed down ' + this.topPressed);
        }
        else if(e.keyCode == 40) {
            player_1.botPressed = true;
            //console.log('botPressed down ' + this.botPressed);
        }
    };

    var keyUpHandler = function(e) {
        if(e.keyCode == 38) {
            player_1.topPressed = false;
            //console.log('topPressed up ' + this.topPressed);
        }
        else if(e.keyCode == 40) {
            player_1.botPressed = false;
            //console.log('botPressed up ' + this.topPressed);
        }
    };

    var keyUpHandlerSpaceFire = function(e) {
        if(e.keyCode == 32) {
            player_1.fire();
            //console.log('topPressed up ' + this.topPressed);
        }
    };

    document.addEventListener("keydown", keyDownHandler, false);
    document.addEventListener("keyup", keyUpHandler, false);
    document.addEventListener("keyup", keyUpHandlerSpaceFire, false);
//Init section end

//main() start
function main() {    
    function loop(){
        ctx.clearRect(0, 0, mainScene.width, mainScene.height);

        player_1.updateAngle();
        player_1.move();
        player_1.reportPosition();
        enemies.forEach(function (value, i, enemies) {
            enemies[i].draw();
            //console.log(i + ': ' + enemies[i].getAngle());
        });
        player_1.draw();

        requestAnimationFrame(loop);

    }

    loop();

}//end main()










/*
(function () {
    // ======== private vars ========
	var socket;

    ////////////////////////////////////////////////////////////////////////////
    var init = function () {
        
        
        document.getElementById("sock-send-butt").onclick = function () {
            socket.send(document.getElementById("sock-msg").value);
        };

        document.getElementById("sock-disc-butt").onclick = function () {
            connectionClose();
        };

        document.getElementById("sock-con-butt").onclick = function () {
            socket = new WebSocket("ws://local-project.loc:8889");
            socket.onopen = connectionOpen;
            socket.onmessage = messageReceived;
        };

    };


	function connectionOpen() {
        //socket.send("Connection with Server. Подключение установлено обоюдно, отлично!");
        console.log("Connected");
	}

	function messageReceived(e) {
	    console.log("Ответ сервера: " + e.data);
        document.getElementById("sock-info").innerHTML += (e.data+"<br />");
	}

    function connectionClose() {
        socket.close();
        document.getElementById("sock-info").innerHTML += "Соединение закрыто <br />";

    }


    return {
        ////////////////////////////////////////////////////////////////////////////
        // ---- onload event ----
        load : function () {
            window.addEventListener('load', function () {
                init();
            }, false);
        }
    }
})().load();
*/