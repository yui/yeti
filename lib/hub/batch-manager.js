"use strict";

var Batch = require("./batch");

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
}

BatchManager.prototype.newId = function () {
    return String(Date.now()) + String(Math.random() * 0x100000 | 0);
};

BatchManager.prototype.destroyBatch = function (id) {
    this.batches[id].destroy();
    delete this.batches[id];
};

/**
 * Create a new Batch.
 *
 * @param {BlizzardSession} session Hub session.
 * @param {Object} options Options (see `Client.createBatch()`).
 * @param {Function} reply Blizzard reply callback.
 */
BatchManager.prototype.createBatch = function (session, options, reply) {
    var id = this.newId();

    this.batches[id] = new Batch(this, id, session, options);

    this.batches[id].pipeLog(this.hub);

    this.batches[id].batchSession.once("end", this.destroyBatch.bind(this, id));

    if (options.launchBrowsers) {
        this.batches[id].launchAndDispatch(options.launchBrowsers, reply);
    } else {
        reply(null, id);
        this.batches[id].dispatch();
    }
};

BatchManager.prototype.getBatch = function (id) {
    return this.batches[id];
};

module.exports = BatchManager;
