"use strict";

var hollywood = require("hollywood");
var director = require("director");
var union = require("union");
var util = require("util");
var fs = require("graceful-fs");
var socketio = require("socket.io");
var plates = require("plates");
var onyx = require("onyx");
var urlParser = require("url");

var log = require("../plugin/log");

var Batch = require("../batch").Batch;
var AgentPool = require("../agent").AgentPool;

/**
 * The Hub is what brings Agents and Clients together.
 *
 * @class Hub
 * @constructor
 * @param {Object} options Optional. Configuration options.
 */
var Hub = module.exports = function Hub(options) {
    var settings = {
        log: {
            logAll: true
        }
    };

    if (options) {
        Object.keys(options).forEach(function (key) {
            settings[key] = options[key];
        });
    }

    hollywood.App.call(this, settings);

    // Plugins are optional features. They can be unplugged.
    this.plug(log);

    // Setup the HTTP server, routing, and its Socket.io.
    this.router = this._createRouter();
    this.server = this._createServer(this.router);
    this.io     = this._createSocketIO(this.server);

    // Setup IO events.
    this.io.of("/batch-client").on("connection", this._onBatchClientConnection.bind(this));
    this.io.of("/capture").on("connection", this._onCaptureConnection.bind(this));
    this.io.of("/run").on("connection", this._onRunConnection.bind(this));
    this.io.sockets.on("connection", this._onGlobalConnection.bind(this));

    this.pool = new AgentPool();
    this._setupAgentPoolEvents();
};

util.inherits(Hub, hollywood.App);

Hub.prototype._setupAgentPoolEvents = function () {
    var app = this;
    this.pool.on("agentConnect", function (agent) {
        app.emit("agentConnect", agent);
    });
    this.pool.on("agentDisconnect", function (agent) {
        app.emit("agentDisconnect", agent);
    });
};

Hub.prototype.getAgents = function () {
    return this.pool.getAgents();
};

Hub.prototype.createBatch = function (options) {
    if (!(options.basedir && options.tests && options.tests.length)) {
        throw new Error("Basedir and tests required.");
    }
    options.hub = this;
    var batch = new Batch(options);
    return batch;
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
Hub.prototype._handleTestRequest = function (server, batchId, testId) {
    server.res.writeHead(404, {
        "content-type": "text/plain"
    });
    server.res.end("Nothing found for " + testId + " on batch " + batchId);
};

/**
 * Handle a /local style request.
 *
 * Used when the Hub and Client are in the same process.
 *
 * @method _handleLocalRequest
 * @private
 */
Hub.prototype._handleLocalRequest = function (server, filename) {
    if (this.basedir) {
        server.res.streamFiles([this.basedir + "/" + filename]);
    } else {
        this.debug("No basedir set, not handling request for " + filename);
        server.res.emit("next");
    }
};

/* TODO
Hub.prototype.setBasedir = function (basedir, files) {
    this.basedir = basedir;
};
*/

/**
 * Handle a new Batch Client socket connection.
 *
 * @method _onCaptureConnection
 * @private
 * @param {Socket} socket Connected socket.
 */
Hub.prototype._onBatchClientConnection = function (socket) {
    var app = this;

    socket.on("batch", function (request) {
        console.log("Got a Batch Client request.", request);

        socket.emit("ready", id, function () {
            app.debug("Recv");
        });
    });

    app.emit(["log", "debug"], "Got a Batch Client socket.");
};

/**
 * Handle a new Capture socket connection.
 *
 * @method _onCaptureConnection
 * @private
 * @param {Socket} socket Connected socket.
 */
Hub.prototype._onCaptureConnection = function (socket) {
    var app = this;

    socket.on("register", function (registration) {
        var id = registration.agentId;

        if (!id) {
            id = app.generateId();

            app.debug("Will assign id " + id);
        }

        app.pool.connectAgent(id, registration.ua, socket);

        socket.emit("ready", id, function () {
            app.debug("Recv");
        });
    });

    app.emit(["log", "debug"], "Got a Capture socket.");

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
    var app = this;

    app.emit(["log", "debug"], "Got a Run socket.");
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
    var app = this;

    app.emit(["log", "debug"], "Got a global socket.");
    socket.emit("ready", "Global", function () {
        app.emit(["log", "debug"], "Global message ack.");
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
    var app = this,
        socketOptions = {};

    // Detect if the log plugin is enabled.
    // TODO Handle unplug of the log plugin.
    if (app.log && app.log.log) {
        app.emit(["log", "debug"], "Setting up Socket.io to use Winston.");
        socketOptions.logger = app.log;
    }

    return socketio.listen(server, socketOptions);
};

/**
 * Create a Director HTTP router for the Hub's HTTP server.
 *
 * @method _createRouter
 * @private
 * @return {Router} router Dispatchable router.
 */
Hub.prototype._createRouter = function () {
    var app = this,
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
            app.emit(["log", "debug"], "Trying to send: " + __dirname + "/view/public/" + file);
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
                app._handleTestRequest(this, batchId, testId);
            });
        });
    });

    router.get(/\/local\/((\w|.)*)/, function (filename, position, next) {
        app._handleLocalRequest(this, filename, next);
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
