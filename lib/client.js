/**
 * Yeti Hub Client.
 * @module client
 */

"use strict";

var fs = require("graceful-fs");
var util = require("util");
var EventEmitter2 = require("eventemitter2").EventEmitter2;

var Blizzard = require("./blizzard");

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
        session.incomingBridge(self, "agentDisconnect");

        self.session = session;

        cb(err);
    });
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
 * @param {Object} config Batch information. Must contain basedir (String) and tests (Array) properties.
 * @return {ClientBatch} batch The new ClientBatch object.
 */
Client.prototype.createBatch = function (config) {
    // TODO check if connection happened!
    // this.session may not yet exist
    if (!this.session) {
        // TODO Refactor to make this impossible.
        throw new Error("Session started too soon -- Yeti bug.");
    }
    return new ClientBatch(this.session, config.basedir, config.tests);
};

/**
 * The ClientBatch represents a batch on the Hub.
 *
 * @class ClientBatch
 * @constructor
 * @extends EventEmitter2
 * @param {BlizzardSession} session Connected Blizzard session to the Hub.
 * @param {String} basedir The base path to serve tests from.
 * @param {Array} tests An array of string paths of test files.
 */
function ClientBatch(session, basedir, tests) {
    if (!basedir) {
        throw new Error("Basedir required.");
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

    this.session.emit("rpc.batch", tests, this.emit.bind(this, "ack"));
};

util.inherits(ClientBatch, EventEmitter2);

/**
 * Something went wrong.
 * @event error
 * @param {Error} error The error object.
 */

/**
 * The batch is complete. No more events will be fired.
 * @event complete
 * @param {BlizzardNamespace} session Blizzard session namespace for the batch.
 */

/**
 * The agent given has completed testing.
 * @event agentComplete
 * @param {BlizzardNamespace} session Blizzard session namespace for the batch.
 * @param {String} agent Agent name.
 */

/**
 * Test result from an agent.
 * @event agentResult
 * @param {BlizzardNamespace} session Blizzard session namespace for the batch.
 * @param {String} agent Agent name.
 * @param {Object} details Test result details, in YUI Test JSON format.
 */

/**
 * Uncaught JavaScript error from an agent.
 * @event agentScriptError
 * @param {BlizzardNamespace} session Blizzard session namespace for the batch.
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
        // TODO Basedir checks.
        fs.readFile(self.basedir + "/" + file, reply);
    });

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
