"use strict";

var util = require("util");

var EventEmitter2 = require("../../lib/event-emitter");

function MockTarget() {
    this.agents = [];
}

function MockAllAgents() {
    this.agents = {};
    EventEmitter2.call(this);
}

util.inherits(MockAllAgents, EventEmitter2);

MockAllAgents.prototype.addAgent = function (agent) {
    var self = this;
    self.agents[agent.id] = agent;
    process.nextTick(function () {
        self.emit("newAgent", agent);
    });
};

MockAllAgents.prototype.removeAgent = function (agent) {
    delete this.agents[agent.id];
};

/**
 * Get all Agents.
 *
 * @method getAgents
 * @return {Agent[]} Agents.
 */
MockAllAgents.prototype.getAgents = function () {
    var out = [],
        self = this;
    Object.keys(self.agents).forEach(function (id) {
        out.push(self.agents[id]);
    });
    return out;
};

/**
 * Get all Agents matching the given ids.
 *
 * @method getAllById
 * @param {String[]} agentIds
 * @return {Agent[]} Matching Agents.
 */
MockAllAgents.prototype.getAllById = function (agentIds) {
    return this.getAgents().filter(function (agent) {
        return agentIds.some(function (agentId) {
            return agent.id === agentId;
        });
    });
};

/**
 * Create new Target objects for the given Agents
 * grouped by their User-Agent string.
 *
 * Side-effect: This will make all given agents unavailable
 * to prepare for binding to a Batch.
 *
 * @method createBatchTargetsFromAgents
 * @return {Target[]} Targets.
 */
MockAllAgents.prototype.createBatchTargetsFromAgents = function (batch, agents) {
    var agentsByUA = {},
        targets = [];

    agents.forEach(function (agent) {
        if (!(agent.ua in agentsByUA)) {
            agentsByUA[agent.ua] = [];
        }

        agentsByUA[agent.ua].push(agent);
    });

    Object.keys(agentsByUA).forEach(function (ua) {
        var target,
            agentsForUA = agentsByUA[ua];

        target = new MockTarget(batch, ua);
        target.agents.concat(agentsForUA);
        targets.push(target);
    });

    return targets;
};

module.exports = MockAllAgents;
