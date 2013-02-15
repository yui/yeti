"use strict";

var util = require("util");
var EventEmitter2 = require("../event-emitter");
var EventYoshi = require("eventyoshi");

var TestServer = require("./test-server");

var WebDriverCollection = require("./webdriver-collection");

/**
 * A Batch represents a collection of tests on the Hub.
 *
 * @class Batch
 * @constructor
 * @param {BatchManager} manager
 * @param {Number} id Batch ID.
 * @param {BlizzardSession} session Hub session.
 * @param {Object} options Options (see `Client.createBatch()`).
 */
function Batch(manager, id, session, options) {
    this.manager = manager;
    this.id = id;
    this.session = session;
    this.tests = options.tests;
    this.query = options.query;
    this.timeout = options.timeout;
    this.useProxy = options.useProxy;
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
    this.setupCleanupEvents();

    this.requestedCapabilities = options.requestedCapabilities;
}

util.inherits(Batch, EventEmitter2);

/**
 * Prepare to handle the end of our Yeti Client session.
 *
 * @method setupCleanupEvents
 * @private
 */
Batch.prototype.setupCleanupEvents = function () {
    var self = this;

    // Our Yeti Client, who has our test data, has died.
    self.session.on("end", function handleDeadClient() {
        // TODO: Place into an abort() method.

        self.destroy();

    });
};

Batch.prototype.report = function (event, agent, data) {
    this.batchSession.emit("rpc." + event, agent.getName(), data);
};

Batch.prototype.destroy = function () {
    var self = this;

    if (self.destroyed) {
        return;
    }

    self.destroyed = true;

    // Return all browsers to the capture page.
    // Important: remove agentEmitter's agents
    Object.keys(self.runningAgents).forEach(function unbind(id) {
        var agent = self.agents[id];

        self.agentEmitter.remove(agent);
        agent.dispatch(self.id, []);
    });

    self.batchSession.unbind();

    if (self.managedBrowsers) {
        self.managedBrowsers.quit();
        delete self.managedBrowsers;
    }

    self.runningAgents = null;
    self.agents = null;

    self.emit("end");
};

Batch.prototype.completeAgent = function (agent) {
    var id = agent.getId();

    delete this.runningAgents[id];

    this.agentEmitter.remove(agent);

    if (Object.keys(this.runningAgents).length === 0) {
        this.emit("complete");
        this.report("complete", agent);
        this.destroy();
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
    this.proxyEvent("progress", "agentProgress");
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

Batch.prototype.launchAndDispatch = function (browsers, reply) {
    var self = this,
        address,
        remote,
        queue;

    self.managedBrowsers = new WebDriverCollection({
        hub: self.manager.hub,
        browsers: browsers
    });

    self.managedBrowsers.launch(function (err) {
        reply(err, self.id);
        // TODO destroy self on error
        self.dispatch();
    });
};

Batch.prototype.dispatch = function () {
    if (this.destroyed) {
        return false;
    }

    // Freeze the current available agents.
    // TODO: Only select agents asked for.

    var agents = this.manager.agentManager.groupAvailableAgents(),
        agentNames = [],
        query = this.query,
        mountpoint = this.manager.hub.mountpoint,
        self = this;

    if (mountpoint === "/") {
        mountpoint = "";
    }

    agentNames = agents.map(function (agent) {
        return agent.getName();
    });

    self.batchSession.emit("rpc.dispatch", agentNames);

    self.debug("dispatch, query:", query, "agents:", agents);

    agents.forEach(function (agent) {
        var id = agent.getId(),
            urls = [];

        if (self.destroyed) {
            // We were destroyed on the same tick.
            return;
        }

        self.agents[id] = agent;
        self.runningAgents[id] = true;

        self.agentEmitter.add(agent);
        
        if (self.useProxy) {
            self.tests.forEach(function (test) {
                urls.push(test + (query ? "?" + query : ""));
            });
        } else {
            // Call slice to pass each urlQueue by value, not by reference.
            urls = self.tests.slice();
            agent.useDirectURLsUntilComplete();
        }

        if ("number" === typeof self.timeout) {
            agent.setTTLUntilComplete(self.timeout * 1000);
        }

        agent.dispatch(self.id, urls);
    });

};

Batch.prototype.getFile = function (filename, cb) {
    this.batchSession.emit("rpc.clientFile", filename, cb);
};

Batch.prototype.getAgent = function (agentId) {
    var agentGroupId,
        agent;

    for (agentGroupId in this.agents) {
        agent = this.agents[agentGroupId].getAgent(agentId);
        if (agent) {
            break;
        }
    }

    return agent;
};

Batch.prototype.handleFileRequest = function (server, agentId, filename) {
    var agent,
        fileInBatch,
        batch = this;

    if (agentId) {
        agent = batch.getAgent(agentId);
    }

    fileInBatch = batch.tests.some(function (test) {
        return test === filename;
    });

    this.getFile(filename, function (err, buffer) {
        if (err) {
            if (agent) {
                // If this file is in the current test batch,
                // redirect to the next test.
                // Otherwise, send a 404.
                // Note: calling nextURL has side effects
                // and it may fire the complete event.
                if (fileInBatch) {
                    batch.report("agentError", agent, {
                        message: "Unable to serve the test: " + filename
                    });
                    server.res.writeHead(302, {
                        "Location": agent.nextURL()
                    });
                    server.res.end();
                } else {
                    batch.report("agentPedanticError", agent, {
                        message: "Unable to serve the file: " + filename + ", ignoring"
                    });
                    server.res.message(404);
                }
            } else {
                server.res.message(500, "Unable to locate the requested agent.");
            }
            return;
        }

        if (agent) {
            batch.debug("Recording ping for agentId =", agentId, "for file =", filename);
            agent.ping();
        }

        batch.testServer.serve(server, filename, fileInBatch, buffer);
    });
};

module.exports = Batch;
