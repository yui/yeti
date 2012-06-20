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

    var abortNow;

    this.ttl = registration.ttl || Agent.TTL;

    if (!this.id) {
        throw new Error("ID required.");
    } else if (!this.ua) {
        // TODO Zombies should be killed.
        // If the Yeti Client goes away, the zombies should
        // move back to the capture page.
        abortNow = "Unknown (zombie browser from previous test run)";
        this.ua = abortNow;
    }

    this.name = parseUA(this.ua) + ", ID: " + this.id;

    this.seen = new Date();
    this.waiting = true;
    this.connected = true;

    this.urlQueue = [];
    this.currentUrl = null;

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
    
    if (abortNow) {
        this.abort();
        this.emit("agentError", abortNow);
    }
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

    self.socketEmitter.on("heartbeat", function () {
        self.ping();
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
        if (url !== "/") {
            // XXX So hacky.
            url += "/";
        }

        url += "agent/" + this.id;
        this.waiting = true;
        this.emit("complete");
    }
    this.currentUrl = url;

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
        return this.unload();
    }

    this.urlQueue = urls;

    this.next();
};

Agent.prototype.unload = function () {
    this.connected = false;
    this.seen = 0;
    this.waiting = false;
    this.emit("disconnect");
};

Agent.prototype.abort = function () {
    this.emit("abort");
    this.emit("agentError", {
        message: "Agent timed out running test: " + this.currentUrl
    });
    this.next(); //to next test
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

function AgentManager(hub, ttl) {
    this.hub = hub;
    this.agents = {};
    EventEmitter2.call(this, {
        verbose: true
    });

    this.ttl = ttl || AgentManager.REAP_TTL;

    this._startReap();
}

util.inherits(AgentManager, EventEmitter2);

//TODO Make this configurable
//TODO This should probably be allowed to be passed to an Agent as it's TTL too. Not sure
AgentManager.REAP_TTL = (45 * 1000); //Default reap timeout


//TODO this needs to be destroyed at some point, just not sure where (`agentManager.destroy()` maybe)
AgentManager.prototype._startReap = function () {
    this._reap = setInterval(this.reap.bind(this), this.ttl);
};

AgentManager.prototype.reap = function () {
    this.getAgents().forEach(function (agent) {
        if (agent.expired()) {
            agent.abort();
        }
    });
};

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
