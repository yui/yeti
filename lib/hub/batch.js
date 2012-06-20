"use strict";

var util = require("util");
var EventEmitter2 = require("eventemitter2").EventEmitter2;
var EventYoshi = require("eventyoshi");

var TestServer = require("./test-server");

/**
 * A Batch represents a collection of tests on the Hub.
 *
 * @class Batch
 * @constructor
 * @param {BatchManager} manager
 * @param {Number} id Batch ID.
 * @param {BlizzardSession} session Hub session.
 * @param {Array} tests Array of tests.
 * @param {Boolean} useProxy True if tests should be fetched over RPC, false otherwise.
 */
function Batch(manager, id, session, tests, useProxy) {
    this.manager = manager;
    this.id = id;
    this.session = session;
    this.tests = tests;
    this.useProxy = useProxy;
    this.agentManager = manager.agentManager;

    var mountpoint = manager.hub.mountpoint;

    if (mountpoint === "/") {
        mountpoint = "";
    }

    this.testServer = new TestServer(
        '<script src="' + mountpoint + '/agent/public/inject.js"></script>'
    );

    EventEmitter2.call(this);

    this.batchSession = session.createNamespace("batch" + id);

    this.agents = {};
    this.runningAgents = {};

    this.agentEmitter = new EventYoshi();
    this.setupAgentEmitter();

    this.dispatch();
}

util.inherits(Batch, EventEmitter2);

Batch.prototype.report = function (event, agent, data) {
    this.batchSession.emit("rpc." + event, agent.getName(), data);
};

Batch.prototype.completeAgent = function (agent) {
    var id = agent.getId();

    delete this.runningAgents[id];

    this.agentEmitter.remove(agent);

    if (Object.keys(this.runningAgents).length === 0) {
        this.emit("complete");
        this.report("complete", agent);
        this.batchSession.unbind();
    }
};

Batch.prototype.proxyEvent = function (yoshiEvent, selfEvent) {
    var self = this;

    if (!selfEvent) {
        selfEvent = yoshiEvent;
    }

    self.agentEmitter.on(yoshiEvent, function (data) {
        // Send the event over the wire first.
        // Then handle it ourselves. If we don't,
        // complete could be sent before agentComplete.
        self.report(selfEvent, this.child, data);
        self.emit(selfEvent, this.child, data);
    });
};

Batch.prototype.setupAgentEmitter = function () {
    var self = this;

    // TODO Proxy disconnects,
    // detailed Agent errors, etc.

    // Proxy these events from Agents
    // to our BlizzardSession.
    this.proxyEvent("complete", "agentComplete");
    this.proxyEvent("results", "agentResult");
    this.proxyEvent("beat", "agentBeat");
    this.proxyEvent("agentError", "agentError");
    this.proxyEvent("disconnect", "agentDisconnect");
    this.proxyEvent("scriptError", "agentScriptError");

    // Attaching multiple .on listeners to the agentEmitter
    // can trigger a bug in eventyoshi@0.1.2, so here we
    // listen to our re-emitted agentComplete event setup
    // earlier by proxyEvent.
    self.on("agentComplete", function (agent) {
        self.completeAgent(agent);
    });
    // Complete the agent if it's disconnected
    self.on("agentDisconnect", function (agent) {
        self.completeAgent(agent);
    });
};

Batch.prototype.getId = function () {
    return this.id;
};

Batch.prototype.dispatch = function () {

    // Freeze the current available agents.
    // TODO: Only select agents asked for.

    var agents = this.manager.agentManager.getAvailableAgents(),
        mountpoint = this.manager.hub.mountpoint,
        self = this;

    this.manager.lockAgents(this.id, agents);

    if (mountpoint === "/") {
        mountpoint = "";
    }

    agents.forEach(function (agent) {
        var id = agent.getId(),
            urls = [];

        self.agents[id] = agent;
        self.runningAgents[id] = true;

        self.agentEmitter.add(agent);

        if (self.useProxy) {
            self.tests.forEach(function (test) {
                urls.push(mountpoint + "/agent/" + id +
                    "/batch/" + self.id + "/test/" + test);
            });
        } else {
            // Call slice to pass each urlQueue by value, not by reference.
            urls = self.tests.slice();
        }

        agent.dispatch(urls);
    });
};

Batch.prototype.getFile = function (filename, cb) {
    this.batchSession.emit("rpc.clientFile", filename, cb);
};

Batch.prototype.handleFileRequest = function (server, agentId, filename) {
    var batch = this;
    this.getFile(filename, function (err, buffer) {
        if (err) {
            var agent,
                fileInBatch;
            if (agentId) {
                agent = batch.agents[agentId];
            }
            if (agent) {
                // If this file is in the current test batch,
                // redirect to the next test.
                // Otherwise, send a 404.
                // Note: calling nextURL has side effects
                // and it may fire the complete event.
                fileInBatch = batch.tests.some(function (test) {
                    return test === filename;
                });

                if (fileInBatch) {
                    batch.report("agentError", agent, {
                        message: "Unable to serve the test: " + filename
                    });
                    server.res.writeHead(302, {
                        "Location": agent.nextURL()
                    });
                    server.res.end();
                } else {
                    batch.report("agentError", agent, {
                        message: "Unable to serve the file: " + filename + ", ignoring"
                    });
                    server.res.message(404);
                }
            } else {
                server.res.message(500, "Unable to locate the requested agent.");
            }
            return;
        }
        batch.testServer.serve(server, filename, buffer);
    });
};

/**
 * A BatchManager keeps track of Batch objects on behalf of a Hub.
 *
 * @class BatchManager
 * @constructor
 * @param {Hub} hub Hub object for agentManager and mountpoint properties.
 */
function BatchManager(hub) {
    this.batches = {};
    this.hub = hub;
    this.agentManager = hub.agentManager;

    // Map of Agent IDs to Batch IDs.
    // When a new batch is added, this object is updated.
    // When the batch is complete, the associated
    // agent IDs are removed.
    this.batchAgent = {};
}

BatchManager.prototype.newId = function () {
    return String(Date.now()) + String(Math.random() * 0x100000 | 0);
};

BatchManager.prototype.destroyBatch = function (id) {
    delete this.batches[id];
};

/**
 * Create a new Batch.
 *
 * @param {BlizzardSession} session Hub session.
 * @param {Array} tests Array of tests.
 * @param {Boolean} useProxy True if tests should be fetched over RPC, false otherwise.
 * @param {Function} reply Blizzard reply callback.
 */
BatchManager.prototype.createBatch = function (session, tests, useProxy, reply) {
    var id = this.newId();

    this.batches[id] = new Batch(this, id, session, tests, useProxy);

    this.batches[id].batchSession.once("end", this.destroyBatch.bind(this, id));

    reply(null, id);
};

BatchManager.prototype.getBatch = function (id) {
    return this.batches[id];
};

BatchManager.prototype.getBatchByAgent = function (agentId) {
    var batch = false,
        batchId = this.batchAgent[agentId];

    if (batchId) {
        batch = this.batches[batchId];
    }

    return batch;
};

// Called by the Batch itself
BatchManager.prototype.lockAgents = function (batchId, agents) {
    var self = this;
    agents.forEach(function (agent) {
        self.batchAgent[agent.getId()] = batchId;
    });
};

BatchManager.prototype.unlockAgents = function (agents) {
    var self = this;
    agents.forEach(function (agent) {
        delete self.batchAgent[agent.getId()];
    });
};

exports.Batch = Batch;
exports.BatchManager = BatchManager;
