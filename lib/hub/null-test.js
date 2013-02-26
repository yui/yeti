"use strict";

var util = require("util");

var Test = require("./test");

function NullTest(options) {
    this.mountpoint = options.mountpoint;
    this.results = null;
}

util.inherits(NullTest, Test);

NullTest.prototype.getUrlForAgentId = function (agentId) {
    return this.mountpoint + "agent/" + agentId;
};

module.exports = NullTest;
