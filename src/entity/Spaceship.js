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
