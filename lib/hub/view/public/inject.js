/*global window, YUI, document */
window.$yetify = function (options) {
    "use strict";

    // Do not start QUnit tests before bind,
    // we need to setup logging callbacks first.
    if (window.QUnit && window.QUnit.config) {
        window.QUnit.config.autostart = false;
    }

    // Request focus.
    window.focus();

    // Setup basic error handler during startup.
    var errors = [];
    window.onerror = function beforeDomReadyErrorHandler(message, url, line) {
        errors.push([message, url, line]);
    };

    YUI({
        delayUntil: "domready"
    }).use("tempest", function bootInjectedDriver(Y) {
        var driver = new Y.InjectedDriver({
            resource: options.mountpoint
        });

        driver.once("ready",
            Y.bind(driver.transferErrorHandler, driver, errors)
        );

        // Request focus, again.
        Y.later(0, Y.config.win, Y.config.win.focus);

        driver.addAutomation("test", "yui", {
            detectFn: function (win) {
                return win.YUITest && win.YUITest.TestRunner;
            },
            bindFn: function (win) {
                var self = this,
                    Runner = win.YUITest.TestRunner,
                    beat = Y.bind(this.fire, this, "beat");

                function complete(event) {
                    self.fire("results", event.results);
                }

                // Did tests already complete?
                if (
                    Runner._root &&
                    Runner._root.results &&
                    Runner._root.results.type === "report"
                ) {
                    complete(Runner._root);
                    return;
                }

                // Otherwise, listen for completion.
                Runner.subscribe(Runner.COMPLETE_EVENT, complete);

                // Send heartbeats.
                Runner.subscribe(Runner.TEST_PASS_EVENT, beat);
                Runner.subscribe(Runner.TEST_FAIL_EVENT, beat);
                Runner.subscribe(Runner.TEST_IGNORE_EVENT, beat);
            }
        });

        driver.addAutomation("test", "qunit", {
            detectFn: function (win) {
                return win.QUnit;
            },
            bindFn: function (win, undef) {
                var self = this,
                    tostring = {}.toString,
                    qunit = win.QUnit,
                    data = {},
                    tests = {},
                    count = 1,
                    curModuleName = "",
                    curTestName;

                function complete(results) {
                    self.fire("results", results);
                }

                function type(obj) {
                    return tostring.call(obj).match(/^\[object\s+(.*?)\]$/)[1];
                }

                function message(result) {
                    if (result.result === "fail") {
                        if (result.actual !== undef && result.expected !== undef) {
                            if (!result.message) {
                                result.message = "";
                            }
                            var expectedType = type(result.expected),
                                actualType = type(result.actual);

                            result.message = result.message + "\nExpected: " + result.expected.toString() + " (" + expectedType + ")\nActual: " + result.actual.toString() + " (" + actualType + ")";

                            // Delete props so we don't get any circular refs
                            delete result.actual;
                            delete result.expected;
                        }
                    }

                    return result.message || "";
                }

                function formatTests() {
                    var i, out = {};
                    for (i in tests) {
                        out[tests[i].name] = {
                            result: tests[i].result,
                            message: message(tests[i]),
                            name: tests[i].name
                        };
                    }
                    return out;
                }

                qunit.log(function (test) {
                    tests["test" + count] = {
                        message: test.message,
                        result: (test.result) ? test.result : "fail",
                        name: "test" + count,
                        actual: test.actual,
                        expected: test.expected
                    };

                    count = count + 1;
                });

                qunit.testStart(function (test) {
                    curTestName = test.name;
                });

                qunit.testDone(function (test) {
                    var module = formatTests(),
                        name = curModuleName + curTestName;

                    module.name = name;
                    module.passed = test.passed;
                    module.failed = test.failed;
                    module.total = test.total;

                    data[name] = module;

                    tests = {};
                    count = 1;
                });

                qunit.moduleStart(function (test) {
                    curModuleName = test.name + ": ";
                });

                qunit.moduleDone(function (test) {
                    curModuleName = "";
                });

                qunit.done(function (tests) {
                    data = Y.merge(formatTests(), data);

                    data.passed = tests.passed;
                    data.failed = tests.failed;
                    data.total = tests.total;
                    data.duration = tests.runtime;
                    data.name = document.title;

                    complete(data);
                });

                qunit.start();
            }
        });

        driver.addAutomation("test", "jasmine", {
            detectFn: function (win) {
                return win.jasmine;
            },
            bindFn: function (win, undef) {
                var self = this,
                    tostring = {}.toString,
                    jasmine = win.jasmine,
                    env = jasmine.getEnv(),
                    data = { name: "" },
                    reporter = new jasmine.JsApiReporter();

                env.addReporter(reporter);

                function complete(results) {
                    self.fire("results", results);
                }

                function type(obj) {
                    return tostring.call(obj).match(/^\[object\s+(.*?)\]$/)[1];
                }

                function message(result) {
                    if (!result.passed_) {
                        if (result.actual !== undef && result.expected !== undef) {
                            result.message = result.message + "\nExpected: " + result.expected.toString() + " (" + type(result.expected) + ")\nActual: " + result.actual.toString() + " (" + type(result.actual) + ")";

                            // Delete props so we don't get any circular refs
                            delete result.actual;
                            delete result.expected;
                        }
                    }
                    return result.message;
                }

                reporter.reportRunnerStarting = function (runner) {
                    data.name = runner.queue.blocks[0].description;
                };

                // This will fire for each test passing an object of lot's of juicy info
                reporter.reportSpecResults = function (runner) {
                    var suite = runner.suite,
                        suiteName = suite.description,
                        results = suite.results(),
                        test = runner.results_.items_[0];

                    // If suite already exists update object info, otherwise create it
                    if (data[suiteName]) {
                        data[suiteName].passed = results.passedCount;
                        data[suiteName].failed = results.failedCount;
                        data[suiteName].total = results.totalCount;
                    } else {
                        data[suiteName] = {
                            name: suiteName,
                            passed: results.passedCount,
                            failed: results.failedCount,
                            total: results.totalCount
                        };
                    }

                    data[suiteName][runner.description] = {
                        result: (test && test.passed_) ? test.passed_ : "fail",
                        message: test ? message(test):'',
                        name: runner.description
                    };

                    self.fire("beat", data[suiteName]);
                };

                // Fires when test runner has completed
                reporter.reportRunnerResults = function (suite) {
                    var tests = suite.results(),
                        results = data;

                    results.passed = tests.passedCount || 0;
                    results.failed = tests.failedCount || 0;
                    results.total = tests.totalCount;
                    // TODO: How do I get the test suite runtime?
                    results.duration = 0;

                    complete(results);
                };

                env.execute();
            }
        });

        driver.addAutomation("test", "mocha", {
            detectFn: function (win) {
                return win.mocha;
            },
            bindFn: function (win, undef) {
                var self = this,
                    tostring = {}.toString,
                    mocha = win.mocha,
                    runner = mocha.run(),
                    data = {},
                    tests = {},
                    passed = 0,
                    failed = 0,
                    total = 0;

                function complete(results) {
                    self.fire("results", results);
                }

                runner.ignoreLeaks = true;

                runner.on('test end', function (test) {
                    var suiteName = test.title;

                    tests[suiteName] = {
                        message: (test.state === 'failed') ? test.err.message : "",
                        result: (test.state === 'passed') ? true : "fail",
                        name: suiteName
                    };

                    passed = (test.state === 'passed') ? passed + 1 : passed;
                    failed = (test.state === 'failed') ? failed + 1 : failed;
                    total = total + 1;
                });


                runner.on('suite end', function (module) {
                    if (module.suites.length === 0) {
                        var suiteName = module.fullTitle(),
                            i;

                        data[suiteName] = {
                            name: suiteName,
                            passed: passed,
                            failed: failed,
                            total: total
                        };

                        for (i in tests) {
                            data[suiteName][tests[i].name] = {
                                result: tests[i].result,
                                message: tests[i].message,
                                name: tests[i].name
                            };
                        }

                        tests = {};
                        passed = failed = total = 0;
                    }
                });
                runner.on('end', function (test) {
                    var results = data;

                    results.passed = (runner.total - runner.failures) || 0;
                    results.failed = runner.failures || 0;
                    results.total = runner.total;
                    // TODO: How do I get the test suite runtime?
                    results.duration = 0;
                    results.name = document.title;

                    complete(results);
                });
            }
        });

        driver.addAutomation("test", "doh", {
            detectFn: function (win) {
                return !!(win.doh && win.doh._testCount);
            },
            bindFn: function (win) {
                var self = this,
                    results = {},
                    totalDuration = 0,
                    doh = win.doh,
                    handleFailure = doh._handleFailure;

                function complete(results) {
                    self.fire("results", results);
                }

                doh._onEnd = function () {
                    Y.mix(results, {
                        passed: doh._testCount - doh._failureCount,
                        failed: doh._failureCount,
                        total: doh._testCount,
                        duration: totalDuration,
                        name: win.document.title
                    });

                    complete(results);
                };

                doh._testStarted = function (group, fixture) {
                    results[group][fixture.name] = {
                        name: fixture.name,
                        type: "test",
                        message: 'Test passed'
                    };
                };

                doh._testFinished = function (group, fixture, success) {
                    var elapsed;

                    elapsed = fixture.endTime - fixture.startTime;

                    totalDuration += elapsed;

                    Y.mix(results[group][fixture.name], {
                        result: success ? 'pass' : 'fail',
                        duration: elapsed
                    });
                };

                doh._handleFailure = function (group, fixture, e) {
                    var message;

                    handleFailure.apply(doh, arguments);
                    message = [];
                    if (e instanceof this._AssertFailure) {
                        message.push("AssertFailure:");
                        if (e.fileName) { message.push(e.fileName, ':'); }
                        if (e.lineNumber) { message.push(e.lineNumber); }
                        message.push(e.message);
                    } else {
                        message.push("Error:", e.message || e);
                    }

                    Y.mix(results[group][fixture.name], {
                        message: message.join(' ')
                    }, true);
                };

                doh._groupStarted = function (group) {
                    results[group] = results[group] || {};
                };

                doh._groupFinished = function (group, success) {
                    var failures, total;

                    failures = doh._groups[group].failures;
                    total = doh._groups[group].length;

                    Y.mix(results[group], {
                        name: group,
                        passed: total - failures,
                        failed: failures,
                        total: total
                    });
                };

                doh.run();
            }
        });

        driver.addAutomation("test", "generic", {
            detectFn: function (win) {
                return Y.config.win.stopYetiScan;
            },
            bindFn: function (win) {
                var self = this;

                Y.config.win.sendYetiResults = function (results) {
                    self.fire("results", results);
                };
            }
        });

        driver.addAutomation("coverage", "istanbul", {
            detectFn: function (win) {
                return !!win.__coverage__;
            },
            collectFn: function (win) {
                return win.__coverage__;
            }
        });

        driver.connectWithHandshake();

        driver.scan();
    });
};
