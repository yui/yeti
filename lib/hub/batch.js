var util = require("util");
var EventEmitter2 = require("eventemitter2").EventEmitter2;

function HubBatch(id, session, agentPool, tests) {
    this.id = id;
    this.session = session;
    this.tests = tests;
    this.agentPool = agentPool;

    this.agents = null;

    this.dispatch();
}

HubBatch.prototype.dispatch = function () {

    // Freeze the current available agents.
    // TODO: Only select agents asked for.
    this.agents = this.agentPool.getAgents();

    var urls = [],
        self = this;

    this.tests.forEach(function (test) {
        urls.push("/batch/" + self.id + "/test/" + test);
    });

    this.agents.forEach(function (agent) {
        agent.dispatch(urls);
    });
};


HubBatch.prototype.getFile = function (filename, cb) {
    this.session.emit("rpc.clientFile-" + this.id, filename, cb);
};

HubBatch.prototype.handleFileRequest = function (server, filename) {
    var batch = this;
    this.getFile(filename, function (err, buffer) {
        if (err) {
            server.res.writeHead(500, {
                "content-type": "text/plain"
            });
            server.res.end("Unable to serve this file.");
            return;
        }
        // batch.serveFile(server, buffer);
        server.res.writeHead(200, {
            "content-type": "text/plain"
        });
        server.res.end(buffer);
    });
};

function HubBatchManager(agentPool) {
    this.batches = {};
    this.agentPool = agentPool;
}

HubBatchManager.prototype.newId = function () {
    var id;

    do {
        id = String(Math.random() * 10000 | 0);
    } while (this.batches[id]);

    return id;
};

HubBatchManager.prototype.destroyBatch = function (id) {
    delete this.batches[id];
};

HubBatchManager.prototype.createBatch = function (session, tests, reply) {
    var id = this.newId();

    session.on("end", this.destroyBatch.bind(this, id));

    this.batches[id] = new HubBatch(id, session, this.agentPool, tests);

    reply(null, id);
};

HubBatchManager.prototype.getBatch = function (id) {
    return this.batches[id];
};

exports.HubBatch = HubBatch;
exports.HubBatchManager = HubBatchManager;
