var Packet = require('./packet');
var GameServer = require('./GameServer');

function PlayerTracker(gameServer, socket) {
    this.pID = -1;
    this.disconnect = -1; // Disconnection
    this.name = "";
    this.gameServer = gameServer;
    this.socket = socket;
    this.nodeAdditionQueue = [];
    this.nodeDestroyQueue = [];
    this.visibleNodes = [];
    this.cells = [];

    this.mouse = {
        x: 0,
        y: 0
    };
    this.tickViewBox = 0;

    this.team = 0;

    // Viewing box
    this.centerPos = { // Center of map
        x: 3000,
        y: 3000
    };

    // Gamemode function
    if (gameServer) {
        // Find center
        this.centerPos.x = (gameServer.config.borderLeft - gameServer.config.borderRight) / 2;
        this.centerPos.y = (gameServer.config.borderTop - gameServer.config.borderBottom) / 2;
        // Player id
        this.pID = gameServer.getNewPlayerID();
        // Gamemode function
        gameServer.gameMode.onPlayerInit(this);
    }
}

module.exports = PlayerTracker;

// Setters/Getters

PlayerTracker.prototype.setName = function(name) {
    this.name = name;
};

PlayerTracker.prototype.getName = function() {
    return this.name;
};

PlayerTracker.prototype.setColor = function(color) {
    this.color.r = color.r;
    this.color.b = color.b;
    this.color.g = color.g;
};

PlayerTracker.prototype.getTeam = function() {
    return this.team;
};

// Functions

PlayerTracker.prototype.update = function() {
    var updateNodes = []; // Nodes that need to be updated via packet

    // Remove nodes from visible nodes if possible
    var d = 0;
    while (d < this.nodeDestroyQueue.length) {
        var index = this.visibleNodes.indexOf(this.nodeDestroyQueue[d]);
        if (index > -1) {
            this.visibleNodes.splice(index, 1);
            d++; // Increment
        } else {
            // Node was never visible anyways
            this.nodeDestroyQueue.splice(d, 1);
        }
    }

    // Get nodes every 400 ms
    if (this.tickViewBox <= 0) {
        var newVisible = this.gameServer.nodes;
        try { // Add a try block in any case

            // Add nodes to client's screen if client has not seen it already
            for (var i = 0; i < newVisible.length; i++) {
                var index = this.visibleNodes.indexOf(newVisible[i]);
                if (index == -1) {
                    updateNodes.push(newVisible[i]);
                }
            }
        } finally {} // Catch doesn't work for some reason

        this.visibleNodes = newVisible;
        // Reset Ticks
        this.tickViewBox = 2;
    } else {
        this.tickViewBox--;
        // Add nodes to screen
        for (var i = 0; i < this.nodeAdditionQueue.length; i++) {
            var node = this.nodeAdditionQueue[i];
            this.visibleNodes.push(node);
            updateNodes.push(node);
        }
    }

    // Update moving nodes
    for (var i = 0; i < this.visibleNodes.length; i++) {
        var node = this.visibleNodes[i];
        if (node.sendUpdate()) {
            // Sends an update if cell is moving
            updateNodes.push(node);
        }
    }

    // Send packet
    this.socket.sendPacket(new Packet.UpdateNodes(
        this.nodeDestroyQueue,
        updateNodes
    ));

    this.nodeDestroyQueue = []; // Reset destroy queue
    this.nodeAdditionQueue = []; // Reset addition queue

    // Handles disconnections
    if (this.disconnect > -1) {
        // Player has disconnected... remove it when the timer hits -1
        this.disconnect--;
        if (this.disconnect == -1) {
            // Remove all client cells
            var len = this.cells.length;
            for (var i = 0; i < len; i++) {
                var cell = this.socket.playerTracker.cells[0];

                if (!cell) {
                    continue;
                }

                this.gameServer.removeNode(cell);
            }

            // Remove from client list
            var index = this.gameServer.clients.indexOf(this.socket);
            if (index != -1) {
                this.gameServer.clients.splice(index, 1);
            }
        }
    }
};
