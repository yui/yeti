"use strict";

var fs = require("graceful-fs");
var util = require("util");
var EventEmitter2 = require("eventemitter2").EventEmitter2;

var Blizzard = require("./blizzard");

function Client(url) {
    EventEmitter2.call(this);

    this.session = null;

    var blizzard = new Blizzard();

    blizzard.connect(url, this.emit.bind(this, "connect"));
    blizzard.on("error", this.handleBlizzardError.bind(this));

    this.on("connect", this.onConnect.bind(this));
}

util.inherits(Client, EventEmitter2);

Client.prototype.handleBlizzardError = function (err) {
    if (err.code === "ECONNRESET") {
        this.emit("error", new Error("Server does not speak Yeti's protocol. Version mismatch?"));
        return;
    }
    this.emit("error", err);
};

Client.prototype.onConnect = function (err, session) {
    if (err) {
        throw err;
    }

    session.incomingBridge(this, "agentConnect");
    session.incomingBridge(this, "agentDisconnect");

    this.session = session;
};

Client.prototype.createBatch = function (config) {
    // TODO check if connection happened!
    // this.session may not yet exist
    if (!this.session) {
        // TODO Refactor to make this impossible.
        throw new Error("Session started too soon -- Yeti bug.");
    }
    return new ClientBatch(this.session, config.basedir, config.tests);
};

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

    // Setup our events.
    this.on("ack", this.onAck.bind(this));

    this.session.emit("rpc.batch", tests, this.emit.bind(this, "ack"));
};

util.inherits(ClientBatch, EventEmitter2);

ClientBatch.prototype.onAck = function (err, id) {
    var self = this;

    if (err) {
        this.emit("error", err);
    }

    this.id = id;

    // TODO Cleanup this bridge.
    ["complete", "agentComplete", "agentResult", "agentScriptError"].forEach(function (event) {
        self.session.incomingBridge(self, "batch" + self.id + "-" + event, event);
    });

    this.provideTests();
};

ClientBatch.prototype.provideTests = function () {
    var self = this;
    this.session.on("request.clientFile-" + this.id, function (file, reply) {
        // TODO Basedir checks.
        fs.readFile(self.basedir + "/" + file, reply);
    });

};

exports.Client = Client;

exports.connect = function (url) {
    return new Client(url);
};
