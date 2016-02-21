var Packet = require('./packet');

function PacketHandler(gameServer, socket) {
    this.gameServer = gameServer;
    this.socket = socket;
}

module.exports = PacketHandler;

PacketHandler.prototype.handleMessage = function(message) {
    function stobuf(buf) {
        var length = buf.length;
        var arrayBuf = new ArrayBuffer(length);
        var view = new Uint8Array(arrayBuf);

        for (var i = 0; i < length; i++) {
            view[i] = buf[i];
        }

        return view.buffer;
    }

    // Discard empty messages
    if (message.length == 0) {
        return;
    }

    var buffer = stobuf(message);
    var view = new DataView(buffer);
    var packetId = view.getUint8(0, true);

    switch (packetId) {
        case 16:
            // Set Target
            if (view.byteLength == 13) {
                var client = this.socket.playerTracker;
                client.mouse.x = view.getInt32(1, true) - client.scrambleX;
                client.mouse.y = view.getInt32(5, true) - client.scrambleY;
            }
            break;
        case 255:
            // Connection Start
            if (view.byteLength == 5) {
                this.protocol = view.getUint32(1, true);
                // Send SetBorder packet first
                var c = this.gameServer.config;
                this.socket.sendPacket(new Packet.SetBorder(
                    c.borderLeft + this.socket.playerTracker.scrambleX,
                    c.borderRight + this.socket.playerTracker.scrambleX,
                    c.borderTop + this.socket.playerTracker.scrambleY,
                    c.borderBottom + this.socket.playerTracker.scrambleY
                ));
            }
            break;
        default:
            break;
    }
};
