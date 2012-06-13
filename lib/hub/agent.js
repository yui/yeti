"use strict";

var util = require("util");
var EventEmitter2 = require("eventemitter2").EventEmitter2;
var EventYoshi = require("eventyoshi");

var parseUA = require("./ua");

// TODO: Periodic GC of missing Agents.
// var periodic = require("./periodic");

function Agent(manager, registration) {
    this.manager = manager;

    this.id = registration.id;
    this.ua = registration.ua;

    this.ttl = registration.ttl || Agent.TTL;

    if (!this.id) {
        throw new Error("ID required.");
    } else if (!this.ua) {
        throw new Error("UA required.");
    }

    this.name = parseUA(this.ua);

    this.seen = new Date();
    this.waiting = true;
    this.connected = true;

    this.urlQueue = [];

    EventEmitter2.call(this);

    // The this.socketEmitter EventYoshi should
    // contain at most 1 Socket.io socket.
    //
    // We use an EventYoshi so that event
    // listeners for sockets only need to be
    // setup once. We can then connect and
    // disconnect the Agent's socket as needed.
    this.socketEmitter = new EventYoshi();

    this.setupEvents();
    this.connect(registration.socket);

}

Agent.TTL = 3600;

util.inherits(Agent, EventEmitter2);

Agent.prototype.setupEvents = function () {
    var self = this;

    self.socketEmitter.on("close", function () {
        self.socketEmitter.remove(this.child);
    });

    self.socketEmitter.on("results", function (data) {
        self.emit("results", data);
        self.next();
    });

    self.socketEmitter.on("scriptError", function (details) {
        self.emit("scriptError", details);
        self.next();
    });

    self.socketEmitter.on("beat", function () {
        self.ping();
        self.emit("beat");
    });
};

Agent.prototype.getName = function () {
    return this.name;
};

Agent.prototype.getId = function () {
    return this.id;
};

Agent.prototype.connect = function (socket) {
    this.socketEmitter.add(socket);
};

Agent.prototype.nextURL = function () {
    var url;

    if (this.urlQueue.length) {
        url = this.urlQueue.shift();
        this.waiting = false;
    } else {
        url = this.manager.hub.mountpoint;
        this.waiting = true;
        this.emit("complete");
    }

    return url;
};

Agent.prototype.next = function () {
    this.socketEmitter.emit("navigate", this.nextURL());
    return !this.waiting;
};

Agent.prototype.available = function () {
    return this.waiting;
};

Agent.prototype.dispatch = function (urls) {
    if (!this.alive()) {
        throw new Error("Agent is dead.");
    }

    this.urlQueue = urls;

    this.next();
};

Agent.prototype.unload = function () {
    this.connected = false;
    this.seen = 0;
    this.waiting = false;
    this.emit("disconnected");
};

Agent.prototype.ping = function () {
    this.connected = true;
    this.seen = new Date();
    this.emit("beat");
};

Agent.prototype.expired = function () {
    return (!this.waiting && ((Date.now() - this.seen) > this.ttl));
};

Agent.prototype.alive = function () {
    return this.connected || !this.expired();
};

function AgentManager(hub) {
    this.hub = hub;
    this.agents = {};
    EventEmitter2.call(this, {
        verbose: true
    });
}

util.inherits(AgentManager, EventEmitter2);

AgentManager.prototype.getAvailableAgents = function () {
    return this.getAgents().filter(function (agent) {
        return agent.available();
    });
};

AgentManager.prototype.getAgents = function () {
    var out = [],
        self = this;
    Object.keys(self.agents).forEach(function (id) {
        out.push(self.agents[id]);
    });
    return out;
};

AgentManager.prototype.getAgent = function (id) {
    return this.agents[id];
};

AgentManager.prototype.connectAgent = function (id, ua, socket) {
    var self = this,
        firstConnect = false,
        agent = self.agents[id];

    if (!id) {
        throw new Error("ID required.");
    } else if (!socket) {
        throw new Error("Socket required.");
    }

    if (agent) {
        agent.connect(socket);
    } else {
        firstConnect = true;
        agent = self.agents[id] = new Agent(self, {
            id: id,
            ua: ua,
            socket: socket
        });
    }

    if (firstConnect) {
        // XXX Serialize the agent to JSON.
        self.emit("agentConnect", agent.getName());
        agent.once("disconnect", function () {
            delete self.agents[agent.id];
            self.emit("agentDisconnect", agent.getName());
        });
    }

    self.emit("agentSeen", agent.getName());
};

exports.Agent = Agent;
exports.AgentManager = AgentManager;
