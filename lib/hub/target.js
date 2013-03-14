"use strict";

var util = require("util");
var EventEmitter2 = require("../event-emitter");
var EventYoshi = require("eventyoshi");

var parseUA = require("./ua");
var makeURLFromComponents = require("./url-builder");

var NullTests = require("./null-tests");

/**
 * An Target is a collection of Agents
 * that share the load of testing a Batch.
 *
 * @class Target
 * @constructor
 * @inherits EventEmitter2
 * @param {AllAgents} allAgents Agent repository associated with this Target.
 * @param {Agent[]} agents Agents to include in this Target.
 */
function Target(allAgents, agents) {
    this.allAgents = allAgents;
    this.agents = {};

    this.id = String(Date.now()) + String(Math.random() * 0x100000 | 0);
    this.ua = agents[0].ua;
    this.name = parseUA(this.ua);

    EventEmitter2.call(this);

    this.batchId = null;
    this.testSpec = null;
    this.nullTests = new NullTests.createForMountpoint(allAgents.hub.mountpoint);
    this.tests = this.nullTests;

    this.debug("Setup agentEmitter for", agents);
    this.agentEmitter = new EventYoshi();
    this.agentEmitter.proxy("setTarget");
    this.setupEvents();

    this.appendAgents(agents);
}

util.inherits(Target, EventEmitter2);

/**
 * Append agents to agent list.
 *
 * @param {Agent[]} Array of Agent objects.
 * @private
 */
Target.prototype.appendAgents = function (agents) {
    var self = this;

    agents.forEach(function (agent) {
        self.agents[agent.id] = agent;
        agent.pipeLog(self);
    });

    agents.forEach(this.agentEmitter.add.bind(this.agentEmitter));

    // Take ownership of all agents.
    this.agentEmitter.setTarget(this);
};

/**
 * Get this agent's human-readable name.
 *
 * @method getName
 * @return {String} Agent name.
 */
Target.prototype.getName = function () {
    return this.name;
};

/**
 * Get an Agent from this group.
 *
 * @param {String} agentId Agent ID.
 * @return {Agent} Agent object.
 */
Target.prototype.getAgent = function (agentId) {
    return this.agents[agentId];
};

/**
 * Get this agent's ID.
 *
 * @method getId
 * @return {String} Numeric agent ID.
 */
Target.prototype.getId = function () {
    return this.id;
};

/**
 * Setup events.
 *
 * @method setupEvents
 * @private
 */
Target.prototype.setupEvents = function () {
    var self = this;

    self.agentEmitter.on("results", function (data) {
        var test = self.tests.getByUrl(data.url);
        test.setResults(data);
        test.setExecuting(false);
        self.emit("results", data);
    });
    self.agentEmitter.on("scriptError", function (data) {
        var test = self.tests.getByUrl(data.url);
        // TODO: Set results should include error message.
        test.setResults({});
        test.setExecuting(false);
        data.url = test.location;
        self.emit("scriptError", data);
    });
    self.agentEmitter.on("beat", self.emit.bind(self, "beat"));
    self.agentEmitter.on("agentError", self.emit.bind(self, "agentError"));
    // TODO handle disconnects

    self.agentEmitter.on("disconnect", function () {
        self.agentEmitter.remove(this.child);
    });
};

/**
 * Get the next Test.
 *
 * Fires our complete event when no more
 * URLs are in the queue, then returns
 * the capture page URL.
 *
 * @method nextTest
 * @param {String} agentId Agent ID.
 * @return {Test} Next test. May be a NullTest if we're done.
 */
Target.prototype.nextTest = function (agentId) {
    if (this.tests.didComplete()) {
        this.emit("complete");
        this.batchId = null;
    }

    this.emit("progress", {
        total: this.tests.totalSubmitted(),
        current: this.tests.totalSubmitted() - this.tests.totalPending()
    });

    return this.tests.next();
};

/**
 * Set the URL queue to the given URL array
 * and advance the browser to the first test.
 *
 * @method dispatch
 * @param {String} batchId Batch ID.
 * @param {TestSpecification} testSpec Test specification.
 */
Target.prototype.dispatch = function (batchId, testSpec) {
    this.batchId = batchId;
    this.testSpec = testSpec;
    this.ttl = testSpec.timeout * 1000;
    this.tests = testSpec.createTests();
    this.debug("Emit dispatch for batchId", batchId);
    this.emit("dispatch", batchId);

};

module.exports = Target;
