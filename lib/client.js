"use strict";

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
};

exports.YetiClient = YetiClient;

exports.connect = function (url) {
    return new YetiClient(url);
};
