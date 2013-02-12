"use strict";

var util = require("util");
var EventEmitter2 = require("../events").EventEmitter2;
var EventYoshi = require("eventyoshi");

var parseUA = require("./ua");
var makeURLFromComponents = require("./url-builder");

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
    this.ttl = 45000;

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
        self.agentEmitter.remove(this.child);
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

module.exports = AgentGroup;
