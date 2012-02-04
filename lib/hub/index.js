"use strict";

var director = require("director");
var union = require("union");
var util = require("util");
var fs = require("graceful-fs");
var socketio = require("socket.io");
var plates = require("plates");
var onyx = require("onyx");
var urlParser = require("url");

var EventEmitter2 = require("eventemitter2").EventEmitter2;

var BatchManager = require("./batch").BatchManager;
var AgentManager = require("./agent").AgentManager;

var Blizzard = require("../blizzard");

/**
 * The Hub is what brings Agents and Clients together.
 *
 * @class Hub
 * @constructor
 * @param {Object} options Optional. Configuration options.
 */
var Hub = module.exports = function Hub(options) {
    EventEmitter2.call(this, {
        wildcard: true
    });

    // Setup the HTTP server, routing, and its Socket.io.
    this.router   = this._createRouter();
    this.server   = this._createServer(this.router);
    this.io       = this._createSocketIO(this.server);
    this.blizzard = this._createBlizzard(this.server);

    // Setup IO events.
    this.io.of("/capture").on("connection", this._onCaptureConnection.bind(this));
    this.io.of("/run").on("connection", this._onRunConnection.bind(this));
    this.io.sockets.on("connection", this._onGlobalConnection.bind(this));

    this.agentManager = new AgentManager();
    this.batchManager = new BatchManager(this.agentManager);
    this._setupAgentManagerEvents();

    this.on("log.*", function () {
        console.log.apply(this, [
            "[Yeti Hub]",
            "[" + this.event[1] + "]"
        ].concat(Array.prototype.slice.call(arguments, 0)));
    });

    this.on("log.*.socketio", function () {
        console.log.apply(this, [
            "[Yeti Hub Socket.io]",
            "[" + this.event[1] + "]"
        ].concat(Array.prototype.slice.call(arguments, 0)));
    });
};

util.inherits(Hub, EventEmitter2);

Hub.prototype._setupAgentManagerEvents = function () {
    var self = this;

    self.on("batch", function (session, tests, reply) {
        self.batchManager.createBatch(session, tests, reply);
    });

    self.blizzard.on("session", function (blizzard) {
        blizzard.outgoingBridge(self.agentManager, "agentConnect");
        blizzard.outgoingBridge(self.agentManager, "agentDisconnect");

        blizzard.incomingBridge(self, "batch");
    });
};

Hub.prototype.getAgents = function () {
    return this.pool.getAgents();
};

/**
 * The Hub's router, an instance of `director.http.Router`.
 * @type {Router}
 * @property router
 */

/**
 * The Hub's server, created with Union, a subclass of Node's `HTTPServer`.
 * @type {HTTPServer}
 * @property server
 */

/**
 * The Hub's socket.io Manager.
 * @type {Manager}
 * @property io
 */

/**
 * Log messages. These are not typically exposed to the CLI.
 *
 * This is also a namespaced event: provide "debug", "info", or another loglevel
 * to target that loglevel. Default is "debug".
 *
 * @event log
 * @param {String} message Something to log.
 */


/**
 * Emit a debug log event.
 *
 * @method debug
 * @protected
 */
Hub.prototype.debug = function () {
    var args = Array.prototype.slice.apply(arguments);
    args.unshift(["log", "debug"]);
    this.emit.apply(this, args);
};

/**
 * Generate a unique identifier for Agents.
 *
 * Based on the current time and the PRNG.
 *
 * @method generateId
 * @protected
 * @return {String} id A unique identifier.
 */
Hub.prototype.generateId = function () {
    return String(Date.now()) +
        String(Math.random() * 0x100000 | 0);
};

/**
 * Handle a /batch/1/test style request.
 *
 * @method _handleTestRequest
 * @private
 */
Hub.prototype._handleTestRequest = function (server, batchId, filename) {
    function error() {
        server.res.writeHead(404, {
            "content-type": "text/plain"
        });
        server.res.end("Batch not found.");
    }

    var batch = this.batchManager.getBatch(batchId);

    if (!batch) {
        return error();
    }

    batch.handleFileRequest(server, filename);
};

/**
 * Handle a new Capture socket connection.
 *
 * @method _onCaptureConnection
 * @private
 * @param {Socket} socket Connected socket.
 */
Hub.prototype._onCaptureConnection = function (socket) {
    var self = this;

    socket.on("register", function (registration) {
        var id = registration.agentId;

        if (!id) {
            id = self.generateId();

            self.debug("Will assign id " + id);
        }

        self.agentManager.connectAgent(id, registration.ua, socket);

        socket.emit("ready", id, function () {
            self.debug("Recv");
        });
    });

    self.emit(["log", "debug"], "Got a Capture socket.");

    // Welcome to the capture socket!
    // 1. Does your cookie match an agent that's in an active batch?
    //    If so, let's find the last test you ran, and start you on the next
    //    test after a 5 second frontend delay (to manually abort).
    // 2. If you have a cookie that is not in an active batch,
    //    then we'll just put you in the agent pool.
    // 3. If you don't have a cookie yet, we'll give you one. Then step 2.
    //

    // Error cases:
    //  - !agent.isAWOL() && agent.idle()
    //     When that happens, an agent is in capture mode already.
    //     Give an error right away -- do NOT update the socket.
};

/**
 * Handle a new Run socket connection.
 *
 * @method _onRunConnection
 * @private
 * @param {Socket} socket Connected socket.
 */
Hub.prototype._onRunConnection = function (socket) {
    var self = this;

    self.emit(["log", "debug"], "Got a Run socket.");
    socket.on("register", function (registration) {
        var id = registration.agentId,
            batch = self.batchManager.getBatchByAgent(id);

        if (!id) {
            // TODO handle error.
            throw new Error("Expected ID!");
        }

        self.debug("Run socket with ID", id);

        self.agentManager.connectAgent(id, registration.ua, socket);

        if (batch) {
            var batchId = batch.getId();
            self.debug("Found batch for this socket! Batch", batchId);
            // Join the room for this batch.
            socket.join("batch-" + batchId);
        }

        socket.emit("ready", id, function () {
            self.debug("Recv");
        });
    });

    socket.emit("ready", "Run");

    // Figure out what batch this test belongs to.
    // 1. What batch is this cookie a part of?
    //    What test are you running?
    //    If these make sense, prepare to recieve test data
    //    regarding pass, fail, skip, script error, etc.
    // 2. No batch? Okay, you probably disconnected, then
    //    the batch ended while you were away. Redirect to
    //    capture page.

};

/**
 * Handle a new socket connection.
 *
 * @method _onGlobalConnection
 * @private
 * @param {Socket} socket Connected socket.
 */
Hub.prototype._onGlobalConnection = function (socket) {
    var self = this;

    self.emit(["log", "debug"], "Got a global socket.");
    socket.emit("ready", "Global", function () {
        self.emit(["log", "debug"], "Global message ack.");
    });

    // You're either on the capture page or run page.
    // No matter what, we want to mark you as present
    // by clearing the disconnected flag from the
    // Agent API.
    //
    // When you disconnect, we presume it's to another
    // capture or run page.
    //
    // We want you to reconnect quickly. If you don't
    // reconnect quickly enough, we need to remove you
    // as an agent.
    //
    // When a disconnect, we flag you as disconnected
    // in the Agent API. If this flag isn't cleared in
    // 10 seconds, you're evicted.
};

/**
 * Create the Hub's HTTP Server.
 *
 * @method _createServer
 * @private
 * @param {Router} router A configured Director router instance.
 * @return {HTTPServer} An HTTP server.
 */
Hub.prototype._createServer = function (router) {
    return union.createServer({
        before: [
            onyx.createProvider(),
            function yetiRouter(req, res) {
                var found = router.dispatch(req, res);
                if (!found) {
                    res.emit("next");
                }
            }
        ]
    });
};

/**
 * Attach Socket.io on the Hub's HTTP server.
 *
 * @method _createSocketIO
 * @param {HTTPServer} server An HTTP server.
 * @return {Manager} io A Socket.io Manager instance, bound to the HTTP server.
 * @private
 */
Hub.prototype._createSocketIO = function (server) {
    return socketio.listen(server, {
        "destroy upgrade": false, // Required for Blizzard.
        logger: {
            debug: this.emit.bind(this, ["log", "debug", "socketio"]),
            info: this.emit.bind(this, ["log", "info", "socketio"])
        }
    });
};

/**
 * Attach Blizzard on the Hub's HTTP server.
 *
 * @method _createSocketIO
 * @param {HTTPServer} server An HTTP server.
 * @return {Blizzard} An instance of Blizzard, waiting for connections.
 * @private
 */
Hub.prototype._createBlizzard = function (server) {
    var blizzard = new Blizzard();
    return blizzard.listen(server);
};

/**
 * Create a Director HTTP router for the Hub's HTTP server.
 *
 * @method _createRouter
 * @private
 * @return {Router} router Dispatchable router.
 */
Hub.prototype._createRouter = function () {
    var self = this,
        router = new director.http.Router();

    // Warning: You'll notice "(\w|*)" is used
    // instead of "*".
    //
    // We are working around a bug in Director
    // that mangles RegExps.
    //
    // https://github.com/flatiron/director/issues/59

    router.path(/\/public\/(.*)/, function () {
        this.get(function (file) {
            self.emit(["log", "debug"], "Trying to send: " + __dirname + "/view/public/" + file);
            this.res.streamFiles([__dirname + "/view/public/" + file]);
        });
    });

    router.path(/\/batch/, function () {
        /*
        this.post(function () {
            // Create the batch.
            // Return 201 Created.
        });
        */
        this.post(function () {
            console.log(this.req);
            console.log("Post batch...");
            this.res.writeHead(201, {
                "content-type": "application/json"
            });
            this.res.end();
        });
        this.path(/\/(\d+)/, function () {
            // PUT - replace batch, perhaps terminating the old one?
            // POST - update batch, adding to it
            // DELETE - abort batch
            // GET - information about batch
            this.get(/\/test\/((\w|.)*)/, function (batchId, testId) {
                self._handleTestRequest(this, batchId, testId);
            });
        });
    });

    router.get(/\//, function () {
        var server = this;
        function onFile(err, html) {
            html = plates.bind(html, {
                "yeti-version": "SNAPSHOT",
                "test": "Starting up..."
            });
            server.res.writeHead(200, {
                "content-type": "text/html"
            });
            server.res.end(html);
        }
        fs.readFile(__dirname + "/view/index.html", "utf8", onFile);
    });

    return router;
};

/**
 * Starts the HTTP server.
 *
 * Pass through to HTTPServer.
 *
 * @method listen
 * @param {Number|String} port Port to listen to, or a UNIX socket.
 * @param {String} hostname Optional. Only accept connections to this address.
 * @param {Function} callback Optional. Function to call when the server is bound.
 */
Hub.prototype.listen = function () {
    var args = Array.prototype.slice.apply(arguments);
    this.server.listen.apply(this.server, args);
};

Hub.prototype.getServer = function () {
    return this.server;
};

/**
 * Stops the HTTP server.
 *
 * Pass through to HTTPServer.
 *
 * @method close
 */
Hub.prototype.close = function () {
    this.server.close();
};
