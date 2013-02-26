"use strict";

var Test = require("./test");
var LiteralTest = require("./literal-test");
var NullTest = require("./null-test");

function Tests(spec) {
    this.children = {};
    this.initializeFromSpecification(spec);
    this.waitingToStart = Object.keys(this.children);

    this.nullTest = new NullTest(spec);
}

Tests.prototype.setMountpoint = function (mountpoint) {
    this.mountpoint = mountpoint;
};

Tests.prototype.getByUrl = function (url) {
    var locations = Object.keys(this.children),
        length = locations.length,
        index = 0,
        location;

    for (; index < length; index += 1) {
        location = locations[index];

        if (url.indexOf(location) !== -1) {
            return this.children[location];
        }
    }

    return this.nullTest;
};

Tests.prototype.getTestsWithoutResults = function () {
    var self = this,
        testsWithoutResults = [];

    Object.keys(self.children).forEach(function (location) {
        var test = self.children[location];

        if (!test.results) { testsWithoutResults.push(test); }
    });

    return testsWithoutResults;
};

Tests.prototype.initializeFromSpecification = function (spec) {
    var self = this,
        tests;

    self.setMountpoint(spec.mountpoint);

    spec.tests.forEach(function (location) {
        var options = {},
            TestCtor = LiteralTest;

        options.location = location;
        options.batchId = spec.batchId;

        if (spec.useProxy) {
            TestCtor = Test;
            options.query = spec.query;
            options.mountpoint = self.mountpoint;
        }

        self.children[location] = new TestCtor(options);
    });
};

Tests.prototype.didComplete = function () {
    return this.getTestsWithoutResults().length === 0;
};

Tests.prototype.totalSubmitted = function () {
    return Object.keys(this.children).length;
};

Tests.prototype.totalPending = function () {
    return this.waitingToStart.length;
};

Tests.prototype.queuedTestAtIndex = function (index) {
    var test = this.children[this.waitingToStart[index]];
    if (!test) { test = this.nullTest; }
    return test;
};

Tests.prototype.peek = function () {
    return this.queuedTestAtIndex(0);
};

Tests.prototype.next = function () {
    var nextTest = this.peek();
    this.waitingToStart.shift();
    return nextTest;
};

module.exports = Tests;
