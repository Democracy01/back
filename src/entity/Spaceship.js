function Cell(nodeId, owner, position, mass, gameServer) {
    this.nodeId = nodeId;
    this.owner = owner; // playerTracker that owns this cell
    this.color = {
        r: 0,
        g: 255,
        b: 0
    };
    this.position = position;
}

module.exports = Cell;

// Functions

Cell.prototype.collisionCheck = function(bottomY, topY, rightX, leftX) {
    // Collision checking
    if (this.position.y > bottomY) {
        return false;
    }

    if (this.position.y < topY) {
        return false;
    }

    if (this.position.x > rightX) {
        return false;
    }

    if (this.position.x < leftX) {
        return false;
    }

    return true;
};

// This collision checking function is based on CIRCLE shape
Cell.prototype.collisionCheck2 = function(objectSquareSize, objectPosition) {
    // IF (O1O2 + r <= R) THEN collided. (O1O2: distance b/w 2 centers of cells)
    // (O1O2 + r)^2 <= R^2
    // approximately, remove 2*O1O2*r because it requires sqrt(): O1O2^2 + r^2 <= R^2

    var dx = this.position.x - objectPosition.x;
    var dy = this.position.y - objectPosition.y;

    return (dx * dx + dy * dy + this.getSquareSize() <= objectSquareSize);
};

Cell.prototype.visibleCheck = function(box, centerPos) {
    // Checks if this cell is visible to the player
    return this.collisionCheck(box.bottomY, box.topY, box.rightX, box.leftX);
};

// Lib

Cell.prototype.abs = function(x) {
    return x < 0 ? -x : x;
};

Cell.prototype.getDist = function(x1, y1, x2, y2) {
    var xs = x2 - x1;
    xs = xs * xs;

    var ys = y2 - y1;
    ys = ys * ys;

    return Math.sqrt(xs + ys);
};

PlayerCell.prototype.onAdd = function(gameServer) {
    // Add to special player node list
    gameServer.nodesPlayer.push(this);
    // Gamemode actions
    gameServer.gameMode.onCellAdd(this);
};

PlayerCell.prototype.calcMove = function(x2, y2, gameServer) {
    var config = gameServer.config;
    var r = this.getSize(); // Ship radius

    // Get angle
    var deltaY = y2 - this.position.y;
    var deltaX = x2 - this.position.x;
    var angle = Math.atan2(deltaX, deltaY);

    if (isNaN(angle)) {
        return;
    }

    // Distance between mouse pointer and cell
    var dist = this.getDist(this.position.x, this.position.y, x2, y2);
    var speed = Math.min(this.getSpeed(), dist);

    var x1 = this.position.x + (speed * Math.sin(angle));
    var y1 = this.position.y + (speed * Math.cos(angle));

    var collidedCells = 0; // Amount of cells collided this tick

    // Collision check for other cells
    // for (var i = 0; i < this.owner.cells.length; i++) {
    //     var cell = this.owner.cells[i];

    //     if (this.nodeId == cell.nodeId) {
    //         continue;
    //     }

    //     if ((!cell.shouldRecombine) || (!this.shouldRecombine)) {
    //         // Cannot recombine - Collision with your own cells
    //         var collisionDist = cell.getSize() + r; // Minimum distance between the 2 cells
    //         dist = this.getDist(x1, y1, cell.position.x, cell.position.y); // Distance between these two cells

    //         // Calculations
    //         if (dist < collisionDist) { // Collided
    //             // The moving cell pushes the colliding cell
    //             // Strength however depends on cell1 speed divided by cell2 speed
    //             collidedCells++;
    //             if (this.collisionRestoreTicks > 0 || cell.collisionRestoreTicks > 0) continue;

    //             var c1Speed = this.getSpeed();
    //             var c2Speed = cell.getSpeed();

    //             var mult = c1Speed / c2Speed / 2;

    //             var newDeltaY = y1 - cell.position.y;
    //             var newDeltaX = x1 - cell.position.x;

    //             var newAngle = Math.atan2(newDeltaX, newDeltaY);
    //             var move = (collisionDist - dist) * mult;

    //             x1 = x1 + (move * Math.sin(newAngle)) >> 0;
    //             y1 = y1 + (move * Math.cos(newAngle)) >> 0;
    //         }
    //     }
    // }

    // if (collidedCells == 0) this.collisionRestoreTicks = 0; // Automate process of collision restoration as no cells are colliding

    // Check to ensure we're not passing the world border (shouldn't get closer than a quarter of the cell's diameter)
    if (x1 < config.borderLeft + r / 2) {
        x1 = config.borderLeft + r / 2;
    }
    if (x1 > config.borderRight - r / 2) {
        x1 = config.borderRight - r / 2;
    }
    if (y1 < config.borderTop + r / 2) {
        y1 = config.borderTop + r / 2;
    }
    if (y1 > config.borderBottom - r / 2) {
        y1 = config.borderBottom - r / 2;
    }

    this.position.x = x1 >> 0;
    this.position.y = y1 >> 0;
};