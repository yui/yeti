"use strict";

var util = require("util");
var EventEmitter2 = require("eventemitter2").EventEmitter2;
var EventYoshi = require("eventyoshi");

var TestServer = require("./test-server");

function Batch(manager, id, session, tests) {
    this.manager = manager;
    this.id = id;
    this.session = session;
    this.tests = tests;
    this.agentManager = manager.agentManager;

    this.testServer = new TestServer(
        '<script src="/socket.io/socket.io.js"></script>' +
        '<script src="/public/inject.js"></script>');

    EventEmitter2.call(this);

    this.batchSession = session.createNamespace("batch" + id);

    this.agents = {};
    this.runningAgents = {};

    this.yoshi = new EventYoshi();
    this.setupYoshi();

    this.dispatch();
}

util.inherits(Batch, EventEmitter2);

Batch.prototype.report = function (event, agent, data) {
    this.batchSession.emit("rpc." + event, agent.getName(), data);
};

Batch.prototype.completeAgent = function (agent) {
    var id = agent.getId();

    delete this.runningAgents[id];

    this.yoshi.remove(agent);

    this.emit("agentComplete", id);

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

    self.yoshi.on(yoshiEvent, function (data) {
        self.emit(selfEvent, this.child, data);
        self.report(selfEvent, this.child, data);
    });
};

Batch.prototype.setupYoshi = function () {
    var self = this;

    // TODO Proxy disconnects,
    // detailed Agent errors, etc.

    // Proxy these events from Agents
    // to our BlizzardSession.
    this.proxyEvent("complete", "agentComplete");
    this.proxyEvent("results", "agentResult");
    this.proxyEvent("scriptError", "agentScriptError");

    self.yoshi.once("complete", function () {
        self.completeAgent(this.child);
    });
};

Batch.prototype.getId = function () {
    return this.id;
};

Batch.prototype.dispatch = function () {

    // Freeze the current available agents.
    // TODO: Only select agents asked for.

    var agents = this.manager.agentManager.getAgents();

    this.manager.lockAgents(this.id, agents);

    var urls = [],
        self = this;

    this.tests.forEach(function (test) {
        urls.push("/batch/" + self.id + "/test/" + test);
    });

    agents.forEach(function (agent) {
        var id = agent.getId();

        self.agents[id] = agent;
        self.runningAgents[id] = true;

        self.yoshi.add(agent);

        agent.dispatch(urls);
    });
};

Batch.prototype.getFile = function (filename, cb) {
    this.batchSession.emit("rpc.clientFile", filename, cb);
};

Batch.prototype.handleFileRequest = function (server, filename) {
    var batch = this;
    this.getFile(filename, function (err, buffer) {
        if (err) {
            var agent, agentId;
            if (server.req.headers.cookie) {
                agentId = server.req.headers.cookie.split("=")[1].trim();
            }
            if (agentId) {
                agent = batch.agents[agentId];
            }
            if (agent) {
                // TODO: Advance to next test with 302 Found.
                // Emit error for CLI.
            }

            server.res.writeHead(500, {
                "content-type": "text/plain"
            });
            server.res.end("Unable to serve this file.");
            return;
        }
        batch.testServer.serve(server, filename, buffer);
    });
};

function BatchManager(agentManager) {
    this.batches = {};
    this.agentManager = agentManager;

    // Map of Agent IDs to Batch IDs.
    // When a new batch is added, this object is updated.
    // When the batch is complete, the associated
    // agent IDs are removed.
    this.batchAgent = {};
}

BatchManager.prototype.newId = function () {
    var id;

    do {
        id = String(Math.random() * 10000 | 0);
    } while (this.batches[id]);

    return id;
};

BatchManager.prototype.destroyBatch = function (id) {
    delete this.batches[id];
};

BatchManager.prototype.createBatch = function (session, tests, reply) {
    var id = this.newId();

    this.batches[id] = new Batch(this, id, session, tests);

    this.batches[id].batchSession.once("end", this.destroyBatch.bind(this, id));

    reply(null, id);
};

BatchManager.prototype.getBatch = function (id) {
    return this.batches[id];
};

BatchManager.prototype.getBatchByAgent = function (agentId) {
    var batchId = this.batchAgent[agentId];
    if (batchId) {
        return this.batches[batchId];
    } else {
        return false;
    }
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
