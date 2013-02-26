"use strict";

function Test(options) {
    this.query = options.query;
    this.location = options.location;
    this.batchId = options.batchId;
    this.mountpoint = options.mountpoint;
    this.results = null;
}

Test.prototype.getUrlForAgentId = function (agentId) {
    var url = this.mountpoint;
    url += "agent/" + agentId;
    url += "/batch/" + this.batchId;
    url += "/test/" + this.location;
    if (this.query) { url += "?" + this.query; }
    return url;
};

Test.prototype.setResults = function (results) {
    this.results = results;
};

module.exports = Test;
