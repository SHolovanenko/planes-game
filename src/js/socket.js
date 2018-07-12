"use strict";

var MAIN_SCENE = document.getElementById("myCanvas");
var CTX = MAIN_SCENE.getContext("2d");
var SOCKET;

/*
 * Class Jet
 */
var Jet = function (selfId, posX, posY, angle) {
    this.selfId = selfId;
    this.angle  = angle     || 0;
    this.posX   = posX      || 0;
    this.posY   = posY      || 0;
    this.jetWidth   = 60;
    this.jetHeight  = 20;

};

    Jet.prototype.draw = function(jetColor){
        //drawing        
        CTX.beginPath();
        CTX.translate(this.posX,this.posY);
        CTX.rotate(this.angle);
        CTX.fillStyle = jetColor;
        CTX.fillRect(-this.jetWidth / 2, -this.jetHeight / 2,this.jetWidth,this.jetHeight);
        CTX.beginPath();

        CTX.arc(0, (-this.jetHeight / 2) - 6, 5, 0, Math.PI * 2, true);

        //tail
        CTX.moveTo((-this.jetWidth / 2), (-this.jetHeight / 2) - 2); 
        CTX.lineTo((-this.jetWidth / 2), (-this.jetHeight / 2) - 15);
        CTX.lineTo((-this.jetWidth / 2) + 5, (-this.jetHeight / 2) - 15);
        CTX.lineTo((-this.jetWidth / 2) + 15, (-this.jetHeight / 2) - 2);

        //wing
        CTX.fillStyle = '#fff';
        CTX.fillRect(0, 0,19,20); 
        CTX.fillStyle = jetColor;
        CTX.fillRect(2, 0,15,20); 

        //engine
        CTX.fillStyle = jetColor;
        CTX.fillRect((this.jetWidth / 2) + 2, (-this.jetHeight / 2) - 5,2,this.jetHeight + 10); 

        CTX.fill();
        CTX.font = "16px Arial";
        CTX.fillStyle = '#fff';
        CTX.fillText(this.selfId,-25,5);
        CTX.setTransform(1, 0, 0, 1, 0, 0);
        CTX.closePath();
    };

    Jet.prototype.synchronize = function(posX, posY, angle){
        //
        this.posX = posX;
        this.posY = posY;
        this.angle = angle;
    };
//end class Jet



/*
 * Class Player
 */
function Player (selfId, posX, posY, angle) {
    //Jet.call(this, selfId, posX, posY, angle);
    Jet.apply(this, [selfId, posX, posY, angle]);
    this.topPressed = "0";
    this.botPressed = "0";
};

    Player.prototype = Object.create(Jet.prototype);

    Player.prototype.constructor = Player;

    Player.prototype.sendState = function(){
        if (!SOCKET || SOCKET.readyState !== 1) return 0;

        try {
            SOCKET.send('POSITION' + '#' + this.topPressed + ';' + this.botPressed);
        } catch (e){
            console.log(e);
        }

        return 1;
    }

    Player.prototype.fire = function(){
        if (!SOCKET || SOCKET.readyState !== 1) return 0;

        try {            
            SOCKET.send('FIRE' + '#' + true);
        } catch (e){
            console.log(e);
        }

        return 1;
    }
//end class Player

/*
 * Class Bullet
 */
var Bullet = function (selfId, posX, posY, angle) {
    this.selfId = selfId;
    this.angle  = angle     || 0;
    this.posX   = posX      || 0;
    this.posY   = posY      || 0;
    this.bulletWidth   = 15;
    this.bulletHeight  = 10;

};

    Bullet.prototype.draw = function(){
        //drawing        
        CTX.beginPath();
        CTX.translate(this.posX,this.posY);
        CTX.rotate(this.angle);
        CTX.fillStyle = '#FF7F00';
        CTX.fillRect(-this.bulletWidth / 2, -this.bulletHeight / 2,this.bulletWidth,this.bulletHeight);
        CTX.setTransform(1, 0, 0, 1, 0, 0);
        CTX.closePath();
    };

    Bullet.prototype.synchronize = function(posX, posY, angle){
        //
        this.posX = posX;
        this.posY = posY;
        this.angle = angle;
    };
//end class Bullet


/*
 * Init section start
 */
var player_1 = new Player();
var enemies = new Array();
var bullets = new Array();
//Init section end



/*
 * Standalone handlers
 */
document.getElementById("sock-disc-butt").onclick = function () {
    connectionClose();
};

document.getElementById("sock-con-butt").onclick = function () {
    SOCKET = new WebSocket("ws://" + window.location.hostname + ":8889");
    SOCKET.onopen = connectionOpen;
    SOCKET.onmessage = messageReceived;
};

var keyDownHandler = function(e) {
    if (e.keyCode == 38) {
        player_1.topPressed = "1";
    }
    else if (e.keyCode == 40) {
        player_1.botPressed = "1";
    }
};

var keyUpHandler = function(e) {
    if (e.keyCode == 38) {
        player_1.topPressed = "0";
    }
    else if (e.keyCode == 40) {
        player_1.botPressed = "0";
    }
};

var keyUpHandlerSpaceFire = function(e) {
    if(e.keyCode == 70) {
        player_1.fire();
    }
};

document.addEventListener("keydown", keyDownHandler, false);
document.addEventListener("keyup", keyUpHandler, false);
document.addEventListener("keyup", keyUpHandlerSpaceFire, false);
//Standalone hendlers end



/*
 * Standalone functions
 */
function connectionOpen() {
    main();
}

function messageReceived(e) {
    //
    let data = (e.data).split('#');
    let command = data[0];
    data = data[1];
    switch (command) {
        case 'ID': {
            player_1.selfId = data;
        } break;

        case 'POSITION': {
            enemies = [];
            let players = data.split(' ');
            let countPlayers = players.length;
            for (let i = 0; i < countPlayers; i++){
                let playerData = players[i].split(':');
                let playerId = playerData[0];
                let playerPosition = playerData[1].split(';');
                let playerPositionX = playerPosition[0];
                let playerPositionY = playerPosition[1];
                let playerPositionAngle = playerPosition[2];
                if (playerId == player_1.selfId){
                    player_1.synchronize(playerPositionX, playerPositionY, playerPositionAngle);
                } else {
                    let playerExist = false;
                    let countEnemies = enemies.length;
                    for (let j = 0; j < countEnemies; j++){
                        if (enemies[j].selfId == playerId){
                            playerExist = true;
                            enemies[j].synchronize(playerPositionX, playerPositionY, playerPositionAngle);
                        }
                    }
    
                    if (!playerExist){
                        enemies.push(new Jet(playerId, playerPositionX, playerPositionY, playerPositionAngle));
                    }
                }
            }
        } break;

        case 'BULLET': {
            bullets = [];
            let arrayBullets = data.split(' ');
            let countArrayBullets = arrayBullets.length;
            for (let i = 0; i < countArrayBullets; i++){
                let bulletData = arrayBullets[i].split(':');
                let bulletId = bulletData[0];
                let bulletPosition = bulletData[1].split(';');
                let bulletPositionX = bulletPosition[0];
                let bulletPositionY = bulletPosition[1];
                let bulletPositionAngle = bulletPosition[2];
                bullets.push(new Bullet(bulletId, bulletPositionX, bulletPositionY, bulletPositionAngle));
            }
        } break;

        case 'CON_CLOSED': {
            let disconnected = data.split(' ');
            let countPlayers = enemies.length;
            let countDisconnected = disconnected.length;
            for (let i = 0; i < countPlayers; i++){
                for (let j = 0; j < countDisconnected; j++){
                    if (enemies[i].selfId == disconnected[j]){
                        enemies.splice(i+1, 1);
                    }
                }
            }
        } break;
        
        default: {
            //
            //console.log("Unexpected command");
        };
    }
}

function connectionClose() {
    SOCKET.close();
    console.log("Socket closed.");
}
//Standalone functions end



//main() start
function main() {    
    function loop(){
        CTX.clearRect(0, 0, MAIN_SCENE.width, MAIN_SCENE.height);

        if (!player_1.sendState()){
            return;
        }

        enemies.forEach(function (value, i, enemies) {
            enemies[i].draw('#ff1a1a');
        });

        bullets.forEach(function (value, i, bullets) {
            bullets[i].draw();
        });

        player_1.draw('#0095DD');
        requestAnimationFrame(loop);
    }

    loop();
}//end main()

