"use strict";

var util = require("util");
var EventEmitter2 = require("../event-emitter");
var EventYoshi = require("eventyoshi");

var Agent = require("./agent");
var AgentGroup = require("./agent-group");

var makeURLFromComponents = require("./url-builder");

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

AgentManager.prototype.removeAgent = function (id) {
    var agent = this.agents[id];

    if (agent) {
        agent.unload();
        delete this.agents[id];
    }

    return !!agent;
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
        agent.once("disconnect", function () {
            delete self.agents[agent.id];
            self.emit("agentDisconnect", agent.getName());
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
        self.emit("newAgent", agent);
    }

    self.emit("agentSeen", agent.getName());
};

module.exports = AgentManager;
