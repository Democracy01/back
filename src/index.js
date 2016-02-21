// Imports
var Commands = require('./modules/CommandList');
var GameServer = require('./GameServer');

// Start msg
console.log("[Game] Democracy - This is not madness, this is SPARTA - #YOLO");

var gameServer = new GameServer();
gameServer.start();