"use strict";

var fs = require("graceful-fs");
var util = require("util");
var EventEmitter2 = require("eventemitter2").EventEmitter2;

var Blizzard = require("./blizzard");

function YetiClient(url) {
    EventEmitter2.call(this);

    var blizzard = new Blizzard();

    blizzard.connect(url, this.emit.bind(this, "connect"));
    blizzard.on("error", this.handleBlizzardError.bind(this));

    this.on("connect", this.onConnect.bind(this));
}

util.inherits(YetiClient, EventEmitter2);

YetiClient.prototype.handleBlizzardError = function (err) {
    if (err.code === "ECONNRESET") {
        this.emit("error", new Error("Server does not speak Yeti's protocol. Version mismatch?"));
        return;
    }
    this.emit("error", err);
};

YetiClient.prototype.onConnect = function (err, blizzard) {
    if (err) {
        throw err;
    }

    blizzard.incomingBridge(this, "agentConnect");
    blizzard.incomingBridge(this, "agentDisconnect");

    this.blizzard = blizzard;
};

YetiClient.prototype.createBatch = function (config) {
    // TODO check if connection happened!
    // this.blizzard may not yet exist
    return new YetiClientBatch(this.blizzard, config.basedir, config.tests);
};

function YetiClientBatch(blizzard, basedir, tests) {
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
};

util.inherits(YetiClientBatch, EventEmitter2);

YetiClientBatch.prototype.onAck = function (err, id) {
    if (err) {
        this.emit("error", err);
    }

    this.id = id;

    this.provideTests();
};

YetiClientBatch.prototype.provideTests = function () {
    var self = this;
    this.blizzard.on("request.clientFile-" + this.id, function (file, reply) {
        // TODO Basedir checks.
        fs.readFile(self.basedir + "/" + file, reply);
    });

};

exports.YetiClient = YetiClient;

exports.connect = function (url) {
    return new YetiClient(url);
};
