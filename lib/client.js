"use strict";

var fs = require("graceful-fs");
var util = require("util");
var EventEmitter2 = require("eventemitter2").EventEmitter2;

var Blizzard = require("./blizzard");

function Client(url) {
    EventEmitter2.call(this);

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

Client.prototype.onConnect = function (err, blizzard) {
    if (err) {
        throw err;
    }

    blizzard.incomingBridge(this, "agentConnect");
    blizzard.incomingBridge(this, "agentDisconnect");

    this.blizzard = blizzard;
};

Client.prototype.createBatch = function (config) {
    // TODO check if connection happened!
    // this.blizzard may not yet exist
    return new ClientBatch(this.blizzard, config.basedir, config.tests);
};

function ClientBatch(blizzard, basedir, tests) {
    if (!basedir) {
        throw new Error("Basedir required.");
    }

    if (!Array.isArray(tests)) {
        throw new Error("Array of tests required.");
    }

    EventEmitter2.call(this);

    this.blizzard = blizzard;
    this.basedir = basedir;
    this.tests = tests;

    this.id = null;

    // Setup our events.
    //this.setupEvents();
    this.on("ack", this.onAck.bind(this));

    this.blizzard.emit("rpc.batch", tests, this.emit.bind(this, "ack"));

    this.blizzard.incomingBridge(this, "results-" + this.id, "results");
    this.blizzard.incomingBridge(this, "scriptError-" + this.id, "scriptError");
};

util.inherits(ClientBatch, EventEmitter2);

ClientBatch.prototype.onAck = function (err, id) {
    if (err) {
        this.emit("error", err);
    }

    this.id = id;

    this.provideTests();
};

ClientBatch.prototype.provideTests = function () {
    var self = this;
    this.blizzard.on("request.clientFile-" + this.id, function (file, reply) {
        // TODO Basedir checks.
        fs.readFile(self.basedir + "/" + file, reply);
    });

};

exports.Client = Client;

exports.connect = function (url) {
    return new Client(url);
};
