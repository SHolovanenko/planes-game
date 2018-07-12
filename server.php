<?php
error_reporting(E_ALL); 
set_time_limit(180);
ob_implicit_flush();

define("FIELD_WIDTH", 800);
define("FIELD_HEIGHT", 600);



/*
 * Start Jet class
 */
class Jet {
    private $id; 
    private $posX;
    private $posY;
    private $angle;
    private $connect;
    private $packetLoss = 0;
    private $score = 0;

    private $speed = 4.0;

    function __construct($connect, $id, $posX, $posY, $angle){
        $this->id = $id;
        $this->posX = $posX;
        $this->posY = $posY;
        $this->angle = $angle;
        $this->connect = $connect;
    }

    function getId(){
        return $this->id;
    }

    function getConnect(){
        return $this->connect;
    }

    function getPacketLoss(){
        return $this->packetLoss;
    }

    function packetLost(){
        $this->packetLoss++;
    }

    function packetLostReset(){
        $this->packetLost = 0;
    }

    function closeConnection(){
        fclose($this->$connect);
    }

    function getPosX(){
        return $this->posX;
    }

    function getPosY(){
        return $this->posY;
    }

    function getAngle(){
        return $this->angle;
    }

    function getPosition(){
        return $this->id . ':' . $this->posX . ';' . $this->posY . ';' . $this->angle;
    }

    function updateAngle($topPressed, $botPressed){
        if ($topPressed){
            $this->angle -= 0.05;
        }
        if ($botPressed){
            $this->angle += 0.035;
        }
    }

    function move($clientCommand){
        $clientCommandParsed = explode(';',$clientCommand);
        $topPressed = boolval($clientCommandParsed[0]);
        $botPressed = boolval($clientCommandParsed[1]);

        $this->updateAngle($topPressed, $botPressed);

        $this->posX += cos($this->angle) * $this->speed;
        $this->posY += sin($this->angle) * $this->speed;
        if ($this->posX > FIELD_WIDTH){
            $this->posX = 0;
        }
        if ($this->posX < 0){
            $this->posX = FIELD_WIDTH;
        }
        if ($this->posY > FIELD_HEIGHT){
            $this->posY = FIELD_HEIGHT;
        }
        if ($this->posY < 0){
            $this->posY = 0;
        }
    }

    function spawn(){
        $this->posX = FIELD_WIDTH / 2;
        $this->posY = FIELD_HEIGHT / 2;
        $this->angle = 0;
    }
}
//Jet class end



/*
 * Start Bullet class
 */
class Bullet {
    private $id;
    private $ownerId;
    private $posX;
    private $posY;
    private $angle;

    private $speed = 9.0;

    function __construct($id, $ownerId, $posX, $posY, $angle){
        $this->id = $id;
        $this->ownerId = $ownerId;
        $this->posX = $posX;
        $this->posY = $posY;
        $this->angle = $angle;
    }

    function getPosition(){
        return $this->id . ':' . $this->posX . ';' . $this->posY . ';' . $this->angle;
    }

    function getPosX(){
        return $this->posX;
    }

    function getPosY(){
        return $this->posY;
    }
    
    function getOwnerId(){
        return $this->ownerId;
    }

    function move(){
        $this->posX += cos($this->angle) * $this->speed;
        $this->posY += sin($this->angle) * $this->speed;
    }
}
//Bullet class end



/*
 * Standalone custom functions
 */
function packDataPosition($arr){
    $result = "";

    foreach ($arr as $object){
        $result .= $object->getPosition() . ' ';
    }
    return trim($result);
}

function collisionDetecting(&$arrayBullets, &$arrayPlayers){
    $jetWidth = 60;
    $jetHeight = 20;

    foreach ($arrayPlayers as $player){
        $playerId = $player->getId();
        $playerPosX = $player->getPosX();
        $playerPosY = $player->getPosY();
        $playerAngle = $player->getAngle();
        
        foreach ($arrayBullets as $key => $bullet){
            $bulletOwner = $bullet->getOwnerId();
            $bulletPosX = $bullet->getPosX();
            $bulletPosY = $bullet->getPosY();
            if (
                $bulletOwner != $playerId &&
                $bulletPosX >= ($playerPosX - 10) && $bulletPosX <= ($playerPosX + 10) && 
                $bulletPosY >= ($playerPosY - 10) && $bulletPosY <= ($playerPosY + 10) 
            ){
                unset($arrayBullets[$key]);
                echo "\nPlayer " . $playerId . " was killed by " . $bulletOwner . "\n";
                $player->spawn();
            } 
            else if ($bulletPosX > FIELD_WIDTH || $bulletPosX < 0 || $bulletPosY > FIELD_HEIGHT || $bulletPosY < 0){
                unset($arrayBullets[$key]);
            }
        }
    }
}

function onOpen($connect, $info) {
    //
    echo "Open OK\n";
    echo "sending ID...\n";

    fwrite($connect, encode('ID' . '#' . intval($connect)));
}

function onClose($connect) {
    //
    echo "close OK<br />\n";
}

function onMessagePosition($connect, $data) {
    //
    fwrite($connect, encode('POSITION' . '#' . $data));
}

function onMessageBulletPosition($connect, $data) {
    //
    fwrite($connect, encode('BULLET' . '#' . $data));
}
//Standalone custom functions end


$starttime = round(microtime(true),2);

echo "Try to start...\n";

$dnsRecords = dns_get_record("local-project.loc");
$domainInfo = array_pop($dnsRecords);
$socket = stream_socket_server("tcp://" . $domainInfo['ip'] . ":8889", $errno, $errstr);

if (!$socket) {
	echo "socket unavailable\n";
    die($errstr. "(" .$errno. ")\n");
}

$connects = array();
$players = array();
$bullets = array();
$countBullets = 0;

echo "Starting on " . $domainInfo['ip'] . "...\n";



/*
 * Main loop
 */
while (true) {
    $read = $connects;
    $read []= $socket;
    $write = $except = null;
    if (!stream_select($read, $write, $except, null)) {
        break;
    }

    if (in_array($socket, $read)) {
        if (($connect = stream_socket_accept($socket, -1)) && $info = handshake($connect)) {
			echo "New connection: $connect\n";            
			$connects[] = $connect;
            $players[intval($connect)] = new Jet($connect, intval($connect), 100, 100, 0);
            onOpen($connect, $info);
        }
        unset($read[ array_search($socket, $read) ]);
    }

    foreach ($bullets as $bullet){
        $bullet->move();
    }

    collisionDetecting($bullets, $players);

    foreach ($read as $connect) {
        $data = fread($connect, 32);
        if (!$data) {
			echo "Connection closed...\n\n";    
            fclose($connect);
            unset($players[intval($connect)]);
            unset($connects[ array_search($connect, $connects) ]);
            onClose($connect);
            continue;
        }
        
        $decodedMessage = decode($data);
        if (empty($decodedMessage['payload'])){
            $players[intval($connect)]->packetLost();
            echo $players[intval($connect)]->getPacketLoss();
            if ($players[intval($connect)]->getPacketLoss() >= 1){
                echo "Connection closed because of packet loss...\n\n";    
                fclose($connect);
                unset($players[intval($connect)]);
                unset($connects[ array_search($connect, $connects) ]);
                onClose($connect);
                continue;
            }
        } 
        else {
            $explodedDecodedMessage = explode('#', $decodedMessage['payload']);
            $command = $explodedDecodedMessage[0];
            $data = $explodedDecodedMessage[1];
            switch ($command) {
                case 'POSITION': {
                    $players[intval($connect)]->move($data);
                    $players[intval($connect)]->packetLostReset();
                    break;
                } 
                case 'FIRE': {
                    $bullets[$countBullets] = new Bullet(
                        $countBullets, 
                        intval($connect), 
                        $players[intval($connect)]->getPosX(), 
                        $players[intval($connect)]->getPosY(), 
                        $players[intval($connect)]->getAngle()
                    );
                    $countBullets++;
                }
                default: {
                    //
                }
            }

            onMessagePosition($connect, packDataPosition($players));

            if(!empty($bullets)){
                onMessageBulletPosition($connect, packDataPosition($bullets));
            }
        }
    }
    
	if ((round(microtime(true),2) - $starttime) > 120) { 
		echo "time = ".(round(microtime(true),2) - $starttime); 
		echo "exit <br />\r\n"; 
		fclose($socket);
		echo "connection closed OK\n"; 
		exit();
	}
}
//Main loop end

fclose($socket);

function handshake($connect) {
    $info = array();

    $line = fgets($connect);
    $header = explode(' ', $line);
    $info['method'] = $header[0];
    $info['uri'] = $header[1];
    while ($line = rtrim(fgets($connect))) {
        if (preg_match('/\A(\S+): (.*)\z/', $line, $matches)) {
            $info[$matches[1]] = $matches[2];
        } 
        else {
            break;
        }
    }

    $address = explode(':', stream_socket_get_name($connect, true)); 
    $info['ip'] = $address[0];
    $info['port'] = $address[1];
    if (empty($info['Sec-WebSocket-Key'])) {
        return false;
    }

    $SecWebSocketAccept = base64_encode(pack('H*', sha1($info['Sec-WebSocket-Key'] . '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')));
    $upgrade = "HTTP/1.1 101 Web Socket Protocol Handshake\r\n" .
        "Upgrade: websocket\r\n" .
        "Connection: Upgrade\r\n" .
        "Sec-WebSocket-Accept:".$SecWebSocketAccept."\r\n\r\n";
    fwrite($connect, $upgrade);

    return $info;
}

function encode($payload, $type = 'text', $masked = false) 
{
    $frameHead = array();
    $payloadLength = strlen($payload);
    switch ($type) {
        case 'text':
            // first byte indicates FIN, Text-Frame (10000001):
            $frameHead[0] = 129;
            break;

        case 'close':
            // first byte indicates FIN, Close Frame(10001000):
            $frameHead[0] = 136;
            break;

        case 'ping':
            // first byte indicates FIN, Ping frame (10001001):
            $frameHead[0] = 137;
            break;

        case 'pong':
            // first byte indicates FIN, Pong frame (10001010):
            $frameHead[0] = 138;
            break;
    }

    // set mask and payload length (using 1, 3 or 9 bytes)
    if ($payloadLength > 65535) {
        $payloadLengthBin = str_split(sprintf('%064b', $payloadLength), 8);
        $frameHead[1] = ($masked === true) ? 255 : 127;
        for ($i = 0; $i < 8; $i++) {
            $frameHead[$i + 2] = bindec($payloadLengthBin[$i]);
        }
        // most significant bit MUST be 0
        if ($frameHead[2] > 127) {
            return array('type' => '', 'payload' => '', 'error' => 'frame too large (1004)');
        }
    } 
    elseif ($payloadLength > 125) {
        $payloadLengthBin = str_split(sprintf('%016b', $payloadLength), 8);
        $frameHead[1] = ($masked === true) ? 254 : 126;
        $frameHead[2] = bindec($payloadLengthBin[0]);
        $frameHead[3] = bindec($payloadLengthBin[1]);
    } 
    else {
        $frameHead[1] = ($masked === true) ? $payloadLength + 128 : $payloadLength;
    }

    // convert frame-head to string:
    foreach (array_keys($frameHead) as $i) {
        $frameHead[$i] = chr($frameHead[$i]);
    }

    if ($masked === true) {
        // generate a random mask:
        $mask = array();
        for ($i = 0; $i < 4; $i++) {
            $mask[$i] = chr(rand(0, 255));
        }

        $frameHead = array_merge($frameHead, $mask);
    }

    $frame = implode('', $frameHead);

    // append payload to frame:
    for ($i = 0; $i < $payloadLength; $i++) {
        $frame .= ($masked === true) ? $payload[$i] ^ $mask[$i % 4] : $payload[$i];
    }

    return $frame;
}

function decode($data)
{
    $unmaskedPayload = '';
    $decodedData = array();

    // estimate frame type:
    $firstByteBinary = sprintf('%08b', ord($data[0]));
    $secondByteBinary = sprintf('%08b', ord($data[1]));
    $opcode = bindec(substr($firstByteBinary, 4, 4));
    $isMasked = ($secondByteBinary[0] == '1') ? true : false;
    $payloadLength = ord($data[1]) & 127;

    // unmasked frame is received:
    if (!$isMasked) {
        return array('type' => '', 'payload' => '', 'error' => 'protocol error (1002)');
    }

    switch ($opcode) {
        // text frame:
        case 1:
            $decodedData['type'] = 'text';
            break;

        case 2:
            $decodedData['type'] = 'binary';
            break;

        // connection close frame:
        case 8:
            $decodedData['type'] = 'close';
            break;

        // ping frame:
        case 9:
            $decodedData['type'] = 'ping';
            break;

        // pong frame:
        case 10:
            $decodedData['type'] = 'pong';
            break;

        default:
            return array('type' => '', 'payload' => '', 'error' => 'unknown opcode (1003)');
    }

    if ($payloadLength === 126) {
        $mask = substr($data, 4, 4);
        $payloadOffset = 8;
        $dataLength = bindec(sprintf('%08b', ord($data[2])) . sprintf('%08b', ord($data[3]))) + $payloadOffset;
    } 
    elseif ($payloadLength === 127) {
        $mask = substr($data, 10, 4);
        $payloadOffset = 14;
        $tmp = '';
        for ($i = 0; $i < 8; $i++) {
            $tmp .= sprintf('%08b', ord($data[$i + 2]));
        }
        $dataLength = bindec($tmp) + $payloadOffset;
        unset($tmp);
    } 
    else {
        $mask = substr($data, 2, 4);
        $payloadOffset = 6;
        $dataLength = $payloadLength + $payloadOffset;
    }

    /**
     * We have to check for large frames here. socket_recv cuts at 1024 bytes
     * so if websocket-frame is > 1024 bytes we have to wait until whole
     * data is transferd.
     */
    if (strlen($data) < $dataLength) {
        return false;
    }

    if ($isMasked) {
        for ($i = $payloadOffset; $i < $dataLength; $i++) {
            $j = $i - $payloadOffset;
            if (isset($data[$i])) {
                $unmaskedPayload .= $data[$i] ^ $mask[$j % 4];
            }
        }
        $decodedData['payload'] = $unmaskedPayload;
    } 
    else {
        $payloadOffset = $payloadOffset - 4;
        $decodedData['payload'] = substr($data, $payloadOffset);
    }

    return $decodedData;
}