"use strict";

var assert = require("assert");
var util = require("util");

var Tests = require("./tests");
var NullTest = require("./null-test");

function NullTests(options) {
    this.setMountpoint(options.mountpoint);
    this.nullTest = new NullTest(this);
}

util.inherits(NullTests, Tests);

NullTests.createForMountpoint = function (mountpoint) {
    return new NullTests({
        mountpoint: mountpoint
    });
};

NullTests.prototype.peek = function () {
    return this.nullTest;
};

NullTests.prototype.next = function () {
    return this.peek();
};

NullTests.prototype.didComplete = function () {
    return true;
};

module.exports = NullTests;
