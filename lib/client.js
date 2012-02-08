"use strict";

var fs = require("graceful-fs");
var util = require("util");
var EventEmitter2 = require("eventemitter2").EventEmitter2;

var Blizzard = require("./blizzard");

function Client(url) {
    EventEmitter2.call(this);

    this.session = null;

    this.url = url;

    this.blizzard = new Blizzard();

    this.blizzard.on("error", this.handleBlizzardError.bind(this));
}

util.inherits(Client, EventEmitter2);

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


Client.prototype.handleBlizzardError = function (err) {
    if (err.code === "ECONNRESET") {
        this.emit("error", new Error("Server does not speak Yeti's protocol. Version mismatch?"));
        return;
    }
    this.emit("error", err);
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
    this.batchSession = null;

    // Setup our events.
    this.once("ack", this.onAck.bind(this));

    this.session.emit("rpc.batch", tests, this.emit.bind(this, "ack"));
};

util.inherits(ClientBatch, EventEmitter2);

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

ClientBatch.prototype.provideTests = function () {
    var self = this;

    self.batchSession.on("request.clientFile", function (file, reply) {
        // TODO Basedir checks.
        fs.readFile(self.basedir + "/" + file, reply);
    });

};

exports.Client = Client;

exports.createClient = function (url) {
    return new Client(url);
};
