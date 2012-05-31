/**
 * Yeti Hub Client.
 * @module client
 */

"use strict";

var fs = require("graceful-fs");
var path = require("path");
var util = require("util");
var EventEmitter2 = require("eventemitter2").EventEmitter2;

var Blizzard = require("./blizzard");

/**
 * The ClientBatch represents a batch on the Hub.
 *
 * @class ClientBatch
 * @constructor
 * @extends EventEmitter2
 * @param {BlizzardSession} session Connected Blizzard session to the Hub.
 * @param {String} basedir The base path to serve tests from.
 * @param {Array} tests An array of string paths of test files.
 * @param {Boolean} useProxy True if tests should be fetched over RPC, false otherwise.
 */
function ClientBatch(session, basedir, tests, useProxy) {
    if (!basedir && useProxy) {
        throw new Error("Basedir required.");
    }

    if (basedir && (basedir !== path.resolve(basedir))) {
        throw new Error("Basedir is not an absolute path!");
    }

    if (!Array.isArray(tests)) {
        throw new Error("Array of tests required.");
    }

    EventEmitter2.call(this);

    this.session = session;
    this.basedir = basedir;
    this.tests = tests;

    this.id = null;
    this.batchSession = null;

    // Setup our events.
    this.once("ack", this.onAck.bind(this));

    this.session.emit("rpc.batch", {
        tests: tests,
        useProxy: useProxy
    }, this.emit.bind(this, "ack"));
}

util.inherits(ClientBatch, EventEmitter2);

/**
 * Something went wrong.
 * @event error
 * @param {Error} error The error object.
 */

/**
 * The batch is complete. No more events will be fired.
 * @event complete
 */

/**
 * The agent given has completed testing.
 * @event agentComplete
 * @param {String} agent Agent name.
 */

/**
 * Test result from an agent.
 * @event agentResult
 * @param {String} agent Agent name.
 * @param {Object} details Test result details, in YUI Test JSON format.
 */

/**
 * Error while handling an agent request.
 * @event agentError
 * @param {String} agent Agent name.
 * @param {Object} details Exception details. Contains message property.
 */

/**
 * Uncaught JavaScript error from an agent.
 * @event agentScriptError
 * @param {String} agent Agent name.
 * @param {Object} details Exception details. Contains url, line and message properties.
 */

/**
 * @method onAck
 * @protected
 * @param {Error} err
 * @param {Number} id
 */
ClientBatch.prototype.onAck = function (err, id) {
    var self = this;

    if (err) {
        self.emit("error", err);
    }

    self.id = id;

    self.batchSession = self.session.createNamespace("batch" + self.id);

    self.batchSession.incomingBridge(self, "complete");
    self.batchSession.incomingBridge(self, "agentComplete");
    self.batchSession.incomingBridge(self, "agentResult");
    self.batchSession.incomingBridge(self, "agentError");
    self.batchSession.incomingBridge(self, "agentScriptError");

    self.once("complete", function () {
        self.batchSession.unbind();
    });

    self.provideTests();
};

/**
 * Setup BlizzardNamespace event listener that will
 * serve local test files under this.basedir.
 *
 * @method provideTests
 * @protected
 */
ClientBatch.prototype.provideTests = function () {
    var self = this;

    self.batchSession.on("request.clientFile", function (file, reply) {
        if (!self.basedir) {
            reply("Not permitted.");
            return;
        }

        if (file[0] !== "/") {
            // Path is relative, resolve it to an absolute path.
            file = path.resolve(self.basedir, file);
        }

        // The file path must be inside the basedir.
        if (file.indexOf(self.basedir) !== 0) {
            reply("Filename provided is not in basedir!");
            return;
        }

        fs.readFile(file, reply);
    });

};

/**
 * The Client submits test batches to a Yeti Hub and tracks their progress.
 *
 * @class Client
 * @constructor
 * @extends EventEmitter2
 * @param {String} url Yeti Hub HTTP URL.
 */
function Client(url) {
    EventEmitter2.call(this);

    this.session = null;

    this.url = url;

    this.blizzard = new Blizzard();

    this.blizzard.on("error", this.handleBlizzardError.bind(this));
}

util.inherits(Client, EventEmitter2);

/**
 * Something went wrong.
 * @event error
 * @param {Error} error The error object.
 */

/**
 * An agent connected to the Hub.
 * @event agentConnect
 * @param {String} agent Agent name.
 */

/**
 * An agent requested a page (test or capture) from the connected Hub.
 * @event agentSeen
 * @param {String} agent Agent name.
 */

/**
 * An agent disconnected from the Hub.
 * @event agentDisconnect
 * @param {String} agent Agent name.
 */

/**
 * Connect to the Yeti Hub.
 *
 * @method connect
 * @param {Function} cb Callback function.
 */
Client.prototype.connect = function (cb) {
    var self = this;
    self.blizzard.connect(self.url, function (err, session) {
        if (err) {
            cb(err);
            return;
        }

        session.incomingBridge(self, "agentConnect");
        session.incomingBridge(self, "agentSeen");
        session.incomingBridge(self, "agentDisconnect");

        self.session = session;

        cb(err);
    });
};

/**
 * Disconnect from the Yeti Hub.
 *
 * @method end
 */
Client.prototype.end = function () {
    if (!this.session) {
        throw new Error("Session not started.");
    }
    this.session.end();
};

/**
 * @method handleBlizzardError
 * @protected
 */
Client.prototype.handleBlizzardError = function (err) {
    if (err.code === "ECONNRESET") {
        this.emit("error", new Error("Server does not speak Yeti's protocol. Version mismatch?"));
        return;
    }
    this.emit("error", err);
};

/**
 * Create and submit a batch of tests to the Hub.
 *
 * @method createBatch
 * @param {Object} config Batch information.
 *                        Must contain tests (Array) property.
 *                        Must also contain either:
 *                         - basedir (String) -- Root path for test filenames.
 *                         - useProxy (Boolean) --
 *                           True if tests are filenames to proxy to the Hub,
 *                           false if they are literal URL pathnames.
 *                           Optional. Defaults to true.
 * @return {ClientBatch} batch The new ClientBatch object.
 */
Client.prototype.createBatch = function (config) {
    // TODO check if connection happened!
    // this.session may not yet exist
    if (!this.session) {
        // TODO Refactor to make this impossible.
        throw new Error("Session started too soon -- Yeti bug.");
    }

    if (undefined === config.useProxy) {
        // Use the proxy by default.
        config.useProxy = true;
    }

    return new ClientBatch(this.session, config.basedir, config.tests, config.useProxy);
};

/**
 * @class exports
 * @static
 */
exports.Client = Client;

/**
 * Create a new Yeti Client instance.
 *
 * @method createClient
 * @param {String} url Yeti Hub HTTP URL.
 * @return {Client} client Yeti Client instance.
 */
exports.createClient = function (url) {
    return new Client(url);
};
