"use strict";

var util = require("util");
var EventEmitter2 = require("../events").EventEmitter2;
var EventYoshi = require("eventyoshi");

var parseUA = require("./ua");

// TODO: Periodic GC of missing Agents.
// var periodic = require("./periodic");

function makeURLFromComponents(mountpoint, agentId, batchId, test) {
    var url = mountpoint;

    if (url !== "/") {
        // XXX So hacky.
        url += "/";
    }

    url += "agent/" + agentId;

    if (test && batchId) {
        // XXX if test is true,
        // batchId should always be set
        url += "/batch/" + batchId;
        url += "/test/" + test;
    }

    return url;
}

/**
 * An Agent represents a web browser.
 *
 * @class Agent
 * @constructor
 * @inherits EventEmitter2
 * @param {AgentManager} manager AgentManager associated with this Agent.
 * @param {Object} registration Object with `id` and `ua` properties.
 */
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
    this.connected = true;

    this.dispatchedTests = 0;
    this.agentGroup = null;
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
    this.socketEmitterQueue = [];

    // Same thing for AgentGroup. Only
    // 1 AgentGroup is ever used.
    this.agentGroupEmitter = new EventYoshi();

    this.setupEvents();
}

util.inherits(Agent, EventEmitter2);

/**
 * TTL for Agents in milliseconds.
 *
 * Agents are discared if they do not respond
 * for this many milliseconds.
 *
 * @property TTL
 * @type Number
 * @default 45000
 */
Agent.TTL = 45000;

/**
 * The Agent emitted a heartbeat.
 *
 * @event beat
 */

/**
 * The Agent reported test results.
 *
 * @event results
 * @param {Object} YUI Test results object.
 */

/**
 * The Agent reported a JavaScript error.
 *
 * @event scriptError
 * @param {Object} Error-like object.
 */

/**
 * The Agent became unable to run tests.
 *
 * @event agentError
 * @param {Object} Error-like object.
 */

/**
 * The Agent disconnected. This event is normal during
 * test runs as the Agent navigates to a new test.
 *
 * @event agentDisconnect
 */

/**
 * The Agent was seen, e.g. by connecting.
 *
 * @event agentSeen
 * @param {String} name Agent name.
 */

/**
 * The current queue of test URLs was aborted.
 *
 * @event abort
 */

/**
 * Setup events on `this.socketEmitter`.
 *
 * @method setupEvents
 * @private
 */
Agent.prototype.setupEvents = function () {
    var self = this;

    // Kickoff.
    self.agentGroupEmitter.on("dispatch", self.next.bind(self));

    // Cleanup.
    self.agentGroupEmitter.on("complete", self.removeAgentGroup.bind(self));

    self.socketEmitter.on("close", function () {
        self.socketEmitter.remove(this.child);
    });

    self.socketEmitter.on("results", function (data) {
        data.url = self.currentUrl;
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

/**
 * Get this agent's human-readable name.
 *
 * @method getName
 * @return {String} Agent name.
 */
Agent.prototype.getName = function () {
    return this.name;
};

/**
 * Provide a socket for communication with
 * the Agent.
 *
 * @method connect
 * @param {SimpleEvents} socket Instance of SimpleEvents
 * for this socket connection, itself an EventEmitter2 instance.
 * @return {Boolean} False if connection failed because a socket
 * is already connected. True otherwise.
 */
Agent.prototype.connect = function (socket) {
    var self = this,
        queuedEvents = self.socketEmitterQueue.slice();

    if (self.socketEmitter.children.length === 0) {
        self.socketEmitter.add(socket);
    } else {
        // Duplicate ID.
        return false;
    }

    if (queuedEvents.length) {
        self.socketEmitterQueue = [];
        queuedEvents.forEach(function (args) {
            self.socketEmitter.emit.apply(self.socketEmitter, args);
        });
    }

    return true;
};

Agent.prototype.setAgentGroup = function (agentGroup) {
    if (!this.agentGroup) {
        this.agentGroup = agentGroup;
        this.agentGroupEmitter.add(agentGroup);
        this.debug("Added to AgentGroup", agentGroup.id);

        if (this.agentGroup.hasTests()) {
            // Tests are already available.
            this.next();
        }
    }
};

Agent.prototype.removeAgentGroup = function () {
    if (this.agentGroup) {
        this.agentGroupEmitter.remove(this.agentGroup);
        this.agentGroup = null;
        this.debug("Removed from AgentGroup");
    }
};

/**
 * Get the value for the next URL,
 * removing it from `this.urlQueue`.
 *
 * Fires our complete event when no more
 * URLs are in the queue, then returns
 * the capture page URL.
 *
 * @method nextURL
 * @return {String} Next test URL, or capture page URL.
 */
Agent.prototype.nextURL = function () {
    var url = this.manager.hub.mountpoint;

    // this.agentGroup should be defined
    // if we're calling this function.

    if (this.agentGroup) {
        url = this.agentGroup.nextURL(this.id);
    } else {
        // This agent is no longer a part of an AgentGroup.
        // This happens when a Batch is ended, esp.
        // when it's aborted.
        //
        // Go back to the capture page keeping
        // the same agentId.
        url = makeURLFromComponents(url, this.id);
    }

    this.currentUrl = url;

    return url;
};

/**
 * Queue an event to emit on the socketEmitter
 * once a socket is added to the socketEmitter
 * EventYoshi. If a socket is ready, emit
 * the event immediately.
 *
 * @method queueSocketEmit
 * @protected
 * @param {String} event Event name.
 * @param {Object} data Event payload.
 */
Agent.prototype.queueSocketEmit = function (event, data) {
    // Is anybody listening on the socketEmitter?
    if (this.socketEmitter.children.length > 0) {
        this.socketEmitter.emit(event, data);
    } else {
        this.socketEmitterQueue.push([event, data]);
    }
};

/**
 * Queue an event to navigate the Agent
 * to the next URL.
 *
 * @method next
 * @return {Boolean} True if the browser is waiting, false otherwise
 */
Agent.prototype.next = function () {
    this.queueSocketEmit("navigate", this.nextURL());
    return !this.waiting;
};

/**
 * Is this browser running tests?
 *
 * @method available
 * @return {Boolean} True if the browser idle, false if it is running tests.
 */
Agent.prototype.available = function () {
    return !this.agentGroup;
};

/**
 * TODO
 *
 * @method unload
 */
Agent.prototype.unload = function () {
    this.debug("disconnecting agent! stack:", (new Error()).stack);
    this.connected = false;
    this.seen = 0;
    this.emit("disconnect");
};

/**
 * Abort running the current test
 * and advance to the next test.
 *
 * @method abort
 */
Agent.prototype.abort = function () {
    this.emit("abort");
    this.emit("agentError", {
        message: "Agent timed out running test: " + this.currentUrl
    });
    this.next(); //to next test
};

/**
 * Record that this browser is
 * still active.
 *
 * @method ping
 */
Agent.prototype.ping = function () {
    this.connected = true;
    this.seen = new Date();
    this.emit("beat");
};

/**
 * Check if this Agent is expired,
 * meaning that it has not connected
 * in a since the TTL.
 *
 * @method expired
 * @return {Boolean} True if the Agent is expired, false otherwise.
 */
Agent.prototype.expired = function () {
    var age = Date.now() - this.seen,
        ttl = this.ttl;

    if (this.agentGroup) {
        ttl = this.agentGroup.ttl;
    }

    this.debug("expired check, age:", age, "ttl:", ttl);
    return age > ttl;
};

/**
 * An AgentGroup is a collection of Agents
 * that share the load of testing a Batch.
 *
 * @class AgentGroup
 * @constructor
 * @inherits EventEmitter2
 * @param {AgentManager} manager AgentManager associated with this Agent.
 * @param {Agent[]} Agents.
 */
function AgentGroup(manager, agents) {
    this.manager = manager;
    this.agents = {};

    this.id = String(Date.now()) + String(Math.random() * 0x100000 | 0);
    this.ua = agents[0].ua;
    this.name = parseUA(this.ua);

    EventEmitter2.call(this);

    this.batchId = null;
    this.urlQueue = [];

    this.useDirectURLs = false;
    this.ttl = Agent.TTL;

    this.debug("Setup agentEmitter for", agents);
    this.agentEmitter = new EventYoshi();
    this.agentEmitter.proxy("setAgentGroup");
    this.setupEvents();

    this.appendAgents(agents);
}

util.inherits(AgentGroup, EventEmitter2);

/**
 * Append agents to agent list.
 *
 * @param {Agent[]} Array of Agent objects.
 * @private
 */
AgentGroup.prototype.appendAgents = function (agents) {
    var self = this;

    agents.forEach(function (agent) {
        self.agents[agent.id] = agent;
        agent.pipeLog(self);
    });

    agents.forEach(this.agentEmitter.add.bind(this.agentEmitter));

    // Take ownership of all agents.
    this.agentEmitter.setAgentGroup(this);
};

/**
 * Get this agent's human-readable name.
 *
 * @method getName
 * @return {String} Agent name.
 */
AgentGroup.prototype.getName = function () {
    return this.name;
};

/**
 * Get an Agent from this group.
 *
 * @param {String} agentId Agent ID.
 * @return {Agent} Agent object.
 */
AgentGroup.prototype.getAgent = function (agentId) {
    return this.agents[agentId];
};

/**
 * Get this agent's ID.
 *
 * @method getId
 * @return {String} Numeric agent ID.
 */
AgentGroup.prototype.getId = function () {
    return this.id;
};

/**
 * Set a new TTL.
 * The old TTL will be restored when the complete event fires.
 *
 * @method setTTLUntilComplete
 * @param {Number} ttl TTL in milliseconds.
 */
AgentGroup.prototype.setTTLUntilComplete = function (ttl) {
    this.debug("setTTLUntilComplete:", ttl);
    this.ttl = ttl;
};

/**
 * @method useDirectURLsUntilComplete
 */
AgentGroup.prototype.useDirectURLsUntilComplete = function () {
    this.useDirectURLs = true;
};

/**
 * Setup events.
 *
 * @method setupEvents
 * @private
 */
AgentGroup.prototype.setupEvents = function () {
    var self = this;

    self.agentEmitter.on("results", self.emit.bind(self, "results"));
    self.agentEmitter.on("scriptError", self.emit.bind(self, "scriptError"));
    self.agentEmitter.on("beat", self.emit.bind(self, "beat"));
    self.agentEmitter.on("agentError", self.emit.bind(self, "agentError"));
    // TODO handle disconnects

    self.agentEmitter.on("disconnect", function () {
        self.socketEmitter.remove(this.child);
    });
};

AgentGroup.prototype.makeURL = function (agentId, test) {
    var url = this.manager.hub.mountpoint;

    if (test && this.useDirectURLs) {
        this.debug("makeURL using direct URL:", test);
        return test;
    }

    url = makeURLFromComponents(url, agentId, this.batchId, test);

    this.debug("makeURL:", url);
    return url;
};

/**
 * Get the value for the next URL,
 * removing it from `this.urlQueue`.
 *
 * Fires our complete event when no more
 * URLs are in the queue, then returns
 * the capture page URL.
 *
 * @method nextURL
 * @param {String} agentId Agent ID.
 * @return {String} Next test URL, or capture page URL.
 */
AgentGroup.prototype.nextURL = function (agentId) {
    var url;

    if (this.urlQueue.length) {
        url = this.makeURL(agentId, this.urlQueue.shift());
        this.emit("progress", {
            total: this.dispatchedTests,
            current: this.dispatchedTests - this.urlQueue.length
        });
    } else {
        url = this.makeURL(agentId);
        this.emit("complete");
        this.batchId = null;
    }

    return url;
};

/**
 * Determine if this AgentGroup has tests ready to run.
 *
 * @method hasTests
 * @return {Boolean} True if tests are available, false otherwise.
 */
AgentGroup.prototype.hasTests = function () {
    return !!this.urlQueue.length;
};

/**
 * Set the URL queue to the given URL array
 * and advance the browser to the first test.
 *
 * @method dispatch
 * @param {String} batchId Batch ID.
 * @param {Array} urls URLs to test.
 */
AgentGroup.prototype.dispatch = function (batchId, urls) {
    this.batchId = batchId;
    this.dispatchedTests = urls.length;
    this.urlQueue = urls;

    this.debug("Emit dispatch for batchId", batchId);
    this.emit("dispatch", batchId);
};

var REAP = true;
if (process.env.YETI_NO_TIMEOUT) {
    console.warn("Yeti AgentManager: Disabling agent reaping");
    REAP = false;
}

/**
 * @class AgentManager
 * @constructor
 * @inherits EventEmitter2
 * @param {Hub} hub Yeti Hub associated with this AgentManager.
 * @param {Number} ttl TTL for associated Agents.
 */
function AgentManager(hub, ttl) {
    this.hub = hub;
    this.agents = {};
    this.boundAgentGroups = {};
    EventEmitter2.call(this, {
        verbose: true
    });

    this.ttl = ttl || AgentManager.REAP_TTL;

    this.defaults = {
        ttl: this.ttl
    };

    if (REAP) {
        this._startReap();
    }

    this.agentGroupEmitter = new EventYoshi();
    this.bindEvents();
}

util.inherits(AgentManager, EventEmitter2);

AgentManager.prototype.bindEvents = function () {
    this.agentGroupEmitter.on("dispatch", this.syncReapInterval.bind(this));
};

AgentManager.prototype.bindAgentGroup = function (agentGroup) {
    this.debug("bindAgentGroup", agentGroup.id);

    agentGroup.pipeLog(this);

    this.agentGroupEmitter.add(agentGroup);
    agentGroup.on("complete", this.unbindAgentGroup.bind(this, agentGroup));

    this.boundAgentGroups[agentGroup.id] = agentGroup;

};

AgentManager.prototype.unbindAgentGroup = function (agentGroup) {
    delete this.boundAgentGroups[agentGroup.id];

    this.agentGroupEmitter.remove(agentGroup);

    this.syncReapInterval(agentGroup);
};

AgentManager.prototype.syncReapInterval = function () {
    var ttl = this.ttl,
        baseline = this.defaults.ttl,
        boundAgentGroups = this.boundAgentGroups,
        runningValues = [],
        minValue,
        maxValue,
        newInterval;

    Object.keys(boundAgentGroups).forEach(function (agentGroupId) {
        runningValues.push(boundAgentGroups[agentGroupId].ttl);
    });

    if (runningValues.length) {

        minValue = runningValues.reduce(function (a, b) {
            return Math.min(a, b);
        });

        if (minValue < ttl) {
            newInterval = minValue;
        } else {
            maxValue = runningValues.reduce(function (a, b) {
                return Math.max(a, b);
            });

            if (maxValue < baseline) {
                newInterval = maxValue;
            } else {
                newInterval = baseline;
            }
        }

    } else {
        newInterval = baseline;
    }

    this.debug("syncReapInterval new =", newInterval, "old =", this.ttl);

    if (newInterval !== this.ttl) {
        this.ttl = newInterval;
        this._startReap();
    }
};

/**
 * @property REAP_TTL
 * @type Number
 * @default 45000
 */
//TODO Make this configurable
//TODO This should probably be allowed to be passed to an Agent as it's TTL too. Not sure
AgentManager.REAP_TTL = (10 * 1000); //Default reap timeout

/**
 * TODO
 *
 * @method _startReap
 * @private
 */
//TODO this needs to be destroyed at some point, just not sure where (`agentManager.destroy()` maybe)
AgentManager.prototype._startReap = function () {
    if (this._reap) {
        this.debug("About to reschedule reap to ttl =",
                this.ttl + ", clearing old interval", this._reap);
        clearInterval(this._reap);
    }
    this._reap = setInterval(this.reap.bind(this), this.ttl);
};

/**
 * TODO
 *
 * @method reap
 * @private
 */
AgentManager.prototype.reap = function () {
    this.getAgents().forEach(function (agent) {
        if (agent.expired()) {
            agent.abort();
        }
    });
};

/**
 * Get all Agents marked as available.
 *
 * @method getAvailableAgents
 * @return {Array} Agents marked available.
 */
AgentManager.prototype.getAvailableAgents = function () {
    return this.getAgents().filter(function (agent) {
        return agent.available();
    });
};

/**
 * Group all available agents.
 * This will make all available agents unavailable
 * to prepare for binding to a Batch.
 *
 * @method groupAvailableAgents
 * @return {AgentGroup[]} AgentGroups.
 */
AgentManager.prototype.groupAvailableAgents = function () {
    return this.groupAgents(this.getAvailableAgents());
};

AgentManager.prototype.groupAgents = function (agents) {
    var self = this,
        agentsByUA = {},
        agentGroups = [];

    agents.forEach(function (agent) {
        if (!(agent.ua in agentsByUA)) {
            agentsByUA[agent.ua] = [];
        }

        agentsByUA[agent.ua].push(agent);
    });

    Object.keys(agentsByUA).forEach(function (ua) {
        var agentGroup,
            agentsForUA = agentsByUA[ua];

        agentGroup = new AgentGroup(self, agentsForUA);

        self.bindAgentGroup(agentGroup);

        agentGroups.push(agentGroup);
    });

    return agentGroups;
};


/**
 * Get all Agents.
 *
 * @method getAgents
 * @return {Array} Agents.
 */
AgentManager.prototype.getAgents = function () {
    var out = [],
        self = this;
    Object.keys(self.agents).forEach(function (id) {
        out.push(self.agents[id]);
    });
    return out;
};

/**
 * Get an Agent by ID.
 *
 * @method getAgent
 * @param {Number} id Agent ID.
 * @return {Agent} The matching agent.
 */
AgentManager.prototype.getAgent = function (id) {
    return this.agents[id];
};

/**
 * Append this Agent to an active AgentGroup,
 * if available. This allows a new Agent to
 * join a Batch that is already in progress.
 *
 * @method findGroupForNewAgent
 * @private
 * @param {Agent} agent Agent to add.
 */
AgentManager.prototype.findGroupForNewAgent = function (agent) {
    var self = this,
        ua = agent.ua,
        boundAgentGroups = this.boundAgentGroups,
        agentGroup;

    Object.keys(boundAgentGroups).forEach(function (agentGroupId) {
        agentGroup = boundAgentGroups[agentGroupId];

        if (agentGroup.ua === ua) {
            agentGroup.appendAgents([agent]);
        }
    });
};

/**
 * Connect the given socket and UA string
 * to the Agent instance identified by the
 * given ID.
 *
 * @method connectAgent
 * @param {Number} id Agent ID.
 * @param {String} ua User-Agent.
 * @param {SimpleEvents} socket Socket.
 */
AgentManager.prototype.connectAgent = function (id, ua, socket) {
    var self = this,
        firstConnect = false,
        agent = self.agents[id],
        mountpoint = self.hub.mountpoint,
        connectSuccess;

    if (!id) {
        throw new Error("ID required.");
    } else if (!socket) {
        throw new Error("Socket required.");
    }

    if (agent) {
        connectSuccess = agent.connect(socket);
        if (!connectSuccess) {
            socket.emit("regenerateId");
        }
    } else if (ua) {
        firstConnect = true;
        agent = self.agents[id] = new Agent(self, {
            id: id,
            ua: ua
        });
        agent.pipeLog(self);
        agent.connect(socket);
        self.findGroupForNewAgent(agent);
    } else {
        // First-time connection from an injected
        // page instead of the capture page.
        socket.emit("navigate", makeURLFromComponents(mountpoint, id));
        return;
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
