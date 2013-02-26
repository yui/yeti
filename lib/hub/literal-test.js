"use strict";

var util = require("util");
var Test = require("./test");

function LiteralTest(options) {
    Test.call(this, options);
}

util.inherits(LiteralTest, Test);

// @override
LiteralTest.prototype.getUrlForAgentId = function (agentId) {
    return this.location;
};

module.exports = LiteralTest;
