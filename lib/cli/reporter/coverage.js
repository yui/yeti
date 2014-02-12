"use strict";

/**
 * @module reporter-coverage
 */

var util = require("util");
var istanbul;

var Reporter = require("./reporter");
var CoverageSummaryReporter = require("./coverage-summary");

/**
 * @class CoverageReporter
 * @constructor
 * @extends Reporter
 */
function CoverageReporter(options) {
    Reporter.call(this, options);

    try {
        istanbul = require("istanbul");
    } catch (ex) {
        throw new Error("Unable to report coverage unless Istanbul is installed");
    }

    this.collector = new istanbul.Collector();

    this.istanbulReporter = istanbul.Report.create(
        this.options.get("coverage-report"),
        {
            dir: this.options.get("coverage-dir")
        }
    );

    this.complete = false;
}

CoverageReporter.create = function (config) {
    var Reporter = CoverageReporter;

    if (config.options.get("coverage-report") === "summary") {
        Reporter = CoverageSummaryReporter;
    }

    return new Reporter(config);
};

util.inherits(CoverageReporter, Reporter);

CoverageReporter.prototype.bindEvents = function () {
    this.batch.on("agentResult", this.handleAgentResult.bind(this));
    this.batch.once("complete", this.handleComplete.bind(this));
    this.batch.once("end", this.handleEnd.bind(this));
};

CoverageReporter.prototype.handleAgentResult = function (agent, details) {
    if (details.coverage) {
        this.collector.add(details.coverage);
    }
};

CoverageReporter.prototype.handleComplete = function () {
    this.istanbulReporter.writeReport(this.collector, /* sync */ true);
    this.cli.error(util.format(
        "Wrote %s coverage report to %s",
        this.options.get("coverage-report"),
        this.options.get("coverage-dir")
    ));
    this.complete = true;
};

CoverageReporter.prototype.handleEnd = function () {
    if (!this.complete) { this.handleComplete(); }
    this.emit("end");
};

module.exports = CoverageReporter;
