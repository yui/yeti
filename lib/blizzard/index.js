"use strict";

var http = require("http");
var util = require("util");

var BlizzardSession = require("./session");

var EventEmitter2 = require("eventemitter2").EventEmitter2;

function Blizzard(options) {
    this.sessions = {};
    this.methods = {};

    EventEmitter2.call(this);

    this.on("connect", this.createSession.bind(this));
}

util.inherits(Blizzard, EventEmitter2);

/**
 * Protocol identifier, used during an HTTP Upgrade handshake.
 */
Blizzard.prototype.PROTOCOL = "Blizzard-Yeti";

Blizzard.prototype.expose = function (name, fn) {
    this.methods[name] = fn;
};

/**
 * Destroy our reference to an BlizzardSession.
 *
 * @param {Number} id
 * @protected
 */
Blizzard.prototype.destroySession = function (id) {
    delete this.sessions[id];
};

/**
 * Create a new BlizzardSession from the given socket.
 *
 * @param {Socket} socket Upgraded socket.
 * @return {BlizzardSession} A created session.
 * @protected
 */
Blizzard.prototype.createSession = function (socket, instigator) {
    var id, session;

    do {
        id = String(Math.random() * 10000 | 0);
    } while (this.sessions[id]);

    session = new BlizzardSession(id, socket, this.methods, instigator);
    this.sessions[id] = session;

    session.on("end", this.destroySession.bind(this, id));
    return session;
};

/**
 * Handle an HTTP Client upgrade event.
 *
 * @param {Function} cb Callback called with a new BlizzardSession.
 * @param {HTTPRequest} req HTTP request.
 * @param {Socket} socket Upgraded socket.
 * @protected
 */
Blizzard.prototype.onClientUpgrade = function (cb, req, socket) {
    //this.emit("connect", socket);
    cb(null, this.createSession(socket, true));
};

/**
 * Handle an HTTP Server upgrade event.
 *
 * @param {HTTPRequest} req HTTP request.
 * @param {Socket} socket Upgraded socket.
 * @protected
 */
Blizzard.prototype.serverUpgrade = function (req, socket) {
    // console.log("Recieved upgrade.");
    // console.log("Headers =", req.headers);

    var self = this;

    if (req.headers.upgrade !== this.PROTOCOL) {
        return false;
    }

    socket.write([
        "HTTP/1.1 101 Welcome to " + this.PROTOCOL,
        "Upgrade: " + this.PROTOCOL,
        "Connection: Upgrade",
        "", ""
    ].join("\r\n"), function () {
        self.emit("session", self.createSession(socket, false));
    });

    return true;
};

/**
 * Connect to an Blizzard-ready HTTP server.
 *
 * @param {String} host Hostname.
 * @param {Number | String} port Port.
 * @param {Function} cb Callback, called after the handshake is complete.
 */
Blizzard.prototype.connect = function (host, port, cb) {
    var req = http.request({
        path: "/",
        host: host || "127.0.0.1",
        port: port || 5060,
        headers: {
            "Connection": "Upgrade",
            "Upgrade": this.PROTOCOL
        }
    }, function (req) {
        cb(new Error("Unexpected HTTP response: " + req.statusCode));
    });

    req.end();

    req.on("upgrade", this.onClientUpgrade.bind(this, cb));
};

/**
 * Intercept HTTP upgrades on the provided server.
 *
 * @method listen
 * @param {HTTPServer} httpServer
 */
Blizzard.prototype.listen = function (httpServer) {
    var self = this,
        listeners = httpServer.listeners("upgrade");

    httpServer.removeAllListeners("upgrade");

    httpServer.on("upgrade", function (req, socket, head) {

        // First, attempt to upgrade to Blizzard.
        var success = self.serverUpgrade(req, socket, head),
            written = false,
            originalWrite;

        if (!success) {
            // Blizzard was not the protocol asked for.

            // If data is written to the socket,
            // the connection was upgraded.
            originalWrite = socket.write;
            socket.write = function (string, encoding, fd) {
                written = true;
                originalWrite.call(this, string, encoding, fd);
            };

            // Try other upgrade listeners, e.g. Socket.io.
            listeners.forEach(function (fn) {
                fn(req, socket, head);
            });

            // Restore original write.
            socket.write = originalWrite;

            // No listener wrote to the socket.
            // Destroy the connection.
            if (!written && socket.writable) {
                socket.write([
                    "HTTP/1.1 400 Bad Request",
                    "X-Reason: Protocol not supported",
                    "Connection: close",
                    "Content-Length: 0",
                    "", ""
                ].join("\r\n"));
                socket.end();
            }
        }
    });
};

module.exports = Blizzard;
