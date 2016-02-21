// Library imports
var WebSocket = require('./WebSocket.js');
var http = require('http');
var fs = require("fs");
var ini = require('./modules/ini.js');

// GameServer Constructor
function GameServer(){
	this.clients = [];

	 // Config
    this.config = { // Border - Right: X increases, Down: Y increases (as of 2015-05-20)
        serverMaxConnections: 10, // Maximum amount of connections to the server.
        serverPort: 4000, // Server port
        serverGamemode: 0, // Gamemode, 0 = FFA, 1 = Teams
        serverBots: 0, // Amount of player bots to spawn
        serverViewBaseX: 1024, // Base view distance of players. Warning: high values may cause lag
        serverViewBaseY: 592,
        serverStatsPort: 88, // Port for stats server. Having a negative number will disable the stats server.
        borderLeft: 0, // Left border of map (Vanilla value: 0)
        borderRight: 400, // Right border of map
        borderTop: 0, // Top border of map (Vanilla value: 0)
        borderBottom: 400, // Bottom border of map
        // spawnInterval: 20, // The interval between each food cell spawn in ticks (1 tick = 50 ms)
        // foodSpawnAmount: 10, // The amount of food to spawn per interval
        // foodStartAmount: 100, // The starting amount of food in the map
        // foodMaxAmount: 500, // Maximum food cells on the map
        // foodMass: 1, // Starting food size (In mass)
        // foodMassGrow: 0, // Enable food mass grow ?
        // foodMassGrowPossiblity: 50, // Chance for a food to has the ability to be self growing
        // foodMassLimit: 5, // Maximum mass for a food can grow
        // foodMassTimeout: 120, // The amount of interval for a food to grow its mass (in seconds)
        // virusMinAmount: 10, // Minimum amount of viruses on the map.
        // virusMaxAmount: 50, // Maximum amount of viruses on the map. If this amount is reached, then ejected cells will pass through viruses.
        // virusStartMass: 100, // Starting virus size (In mass)
        // virusFeedAmount: 7, // Amount of times you need to feed a virus to shoot it
        // ejectMass: 12, // Mass of ejected cells
        // ejectMassCooldown: 200, // Time until a player can eject mass again
        // ejectMassLoss: 16, // Mass lost when ejecting cells
        // ejectSpeed: 100, // Base speed of ejected cells
        // ejectSpawnPlayer: 50, // Chance for a player to spawn from ejected mass
        // playerStartMass: 10, // Starting mass of the player cell.
        // playerMaxMass: 22500, // Maximum mass a player can have
        // playerMinMassEject: 32, // Mass required to eject a cell
        // playerMinMassSplit: 36, // Mass required to split
        // playerMaxCells: 16, // Max cells the player is allowed to have
        // playerRecombineTime: 30, // Base amount of seconds before a cell is allowed to recombine
        // playerMassAbsorbed: 1.0, // Fraction of player cell's mass gained upon eating
        // playerMassDecayRate: .002, // Amount of mass lost per second
        // playerMinMassDecay: 9, // Minimum mass for decay to occur
        // playerMaxNickLength: 15, // Maximum nick length
        playerSpeed: 30, // Player base speed
        // playerSmoothSplit: 0, // Whether smooth splitting is used
        playerDisconnectTime: 60, // The amount of seconds it takes for a player cell to be removed after disconnection (If set to -1, cells are never removed)
    };
    // Parse config
    this.loadConfig();
}

GameServer.prototype.loadConfig = function() {
    try {
        // Load the contents of the config file
        var load = ini.parse(fs.readFileSync('./gameserver.ini', 'utf-8'));

        // Replace all the default config's values with the loaded config's values
        for (var obj in load) {
            this.config[obj] = load[obj];
        }
    } catch (err) {
        // No config
        console.log("[Game] Config not found... Generating new config");

        // Create a new config
        fs.writeFileSync('./gameserver.ini', ini.stringify(this.config));
    }
};

GameServer.prototype.start = function() {

    // Start the server
    this.socketServer = new WebSocket.Server({
        port: this.config.serverPort,
        perMessageDeflate: false
    }, function() {

        // Start Main Loop
        setInterval(this.mainLoop.bind(this), 1);

        // Done
        console.log("[Game] Listening on port " + this.config.serverPort);
        console.log("[Game] Current game mode is " + this.gameMode.name);

    }.bind(this));

    this.socketServer.on('connection', connectionEstablished.bind(this));

    // Properly handle errors because some people are too lazy to read the readme
    this.socketServer.on('error', function err(e) {
        switch (e.code) {
            case "EADDRINUSE":
                console.log("[Error] Server could not bind to port! Please close out of Skype or change 'serverPort' in gameserver.ini to a different number.");
                break;
            case "EACCES":
                console.log("[Error] Please make sure you are running Ogar with root privileges.");
                break;
            default:
                console.log("[Error] Unhandled error code: " + e.code + " - it said because fuck you. Rude, i know");
                break;
        }
        process.exit(1); // Exits the program
    });

    function connectionEstablished(ws) {
        if (this.clients.length >= this.config.serverMaxConnections) { // Server full
            ws.close();
            return;
        }

        // -----/Client authenticity check code -----

        function close(error) {

            var client = this.socket.playerTracker;
            var len = this.socket.playerTracker.cells.length;
            for (var i = 0; i < len; i++) {
                var cell = this.socket.playerTracker.cells[i];

                if (!cell) {
                    continue;
                }

                cell.calcMove = function() {
                    return;
                }; // Clear function so that the cell cant move
                //this.server.removeNode(cell);
            }

            client.disconnect = this.server.config.playerDisconnectTime * 20;
            this.socket.sendPacket = function() {
                return;
            }; // Clear function so no packets are sent
        }

        ws.playerTracker = new PlayerTracker(this, ws);
        ws.packetHandler = new PacketHandler(this, ws);
        ws.on('message', ws.packetHandler.handleMessage.bind(ws.packetHandler));

        var bindObject = {
            server: this,
            socket: ws
        };
        ws.on('error', close.bind(bindObject));
        ws.on('close', close.bind(bindObject));
        this.clients.push(ws);
    }

    this.startStatsServer(this.config.serverStatsPort);
};


GameServer.prototype.mainLoop = function() {
    // Timer
    var local = new Date();
    this.tick += (local - this.time);
    this.time = local;

    if (this.tick >= 50) {
        // Loop main functions
        if (this.run) {
            setTimeout(this.updateMoveEngine(), 0);
        }

        // Update the client's maps
        this.updateClients();

        // Reset
        this.tick = 0;
    }
};


GameServer.prototype.updateMoveEngine = function() {
    // Move player cells
    var len = this.nodesPlayer.length;

    for (var i = 0; i < len; i++) {
        var cell = this.nodesPlayer[i];

        var client = cell.owner;

        cell.calcMove(client.mouse.x, client.mouse.y, this);
    }

    // A system to move cells not controlled by players (ex. viruses, ejected mass)
    len = this.movingNodes.length;
    for (var i = 0; i < len; i++) {
        var check = this.movingNodes[i];

        // Recycle unused nodes
        while ((typeof check == "undefined") && (i < this.movingNodes.length)) {
            // Remove moving cells that are undefined
            this.movingNodes.splice(i, 1);
            check = this.movingNodes[i];
        }

        if (i >= this.movingNodes.length) {
            continue;
        }

        if (check.moveEngineTicks > 0) {
            check.onAutoMove(this);
            // If the cell has enough move ticks, then move it
            check.calcMovePhys(this.config);
        } else {
            // Auto move is done
            check.moveDone(this);
            // Remove cell from list
            var index = this.movingNodes.indexOf(check);
            if (index != -1) {
                this.movingNodes.splice(index, 1);
            }
        }
    }

    // Another, special check for player cells, which are actually never moving (but are moving here)
    len = this.nodesPlayer.length;
    for (var i = 0; i < len; i++) {
        var check = this.nodesPlayer[i];

        // Recycle unused nodes
        while ((typeof check == "undefined") && (i < this.nodesPlayer.length)) {
            // Remove moving cells that are undefined
            this.nodesPlayer.splice(i, 1);
            check = this.nodesPlayer[i];
        }

        if (i >= this.nodesPlayer.length) {
            continue;
        }

        check.onAutoMove(this);
        check.calcMovePhys(this.config);
    }
};