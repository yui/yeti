/*global window, YUI, document */
window.$yetify = function (options) {
    "use strict";

    // Do not start QUnit tests before bind,
    // we need to setup logging callbacks first.
    if (window.QUnit && window.QUnit.config) {
        window.QUnit.config.autostart = false;
    }

    YUI().use("tempest", function bootInjectedDriver(Y) {
        var driver = new Y.InjectedDriver({
            resource: options.mountpoint
        });

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

                qunit.log = function (test) {
                    tests["test" + count] = {
                        message: test.message,
                        result: (test.result) ? test.result : "fail",
                        name: "test" + count,
                        actual: test.actual,
                        expected: test.expected
                    };

                    count = count + 1;
                };

                qunit.moduleStart = function (test) {
                    curTestName = test.name;
                };

                qunit.moduleDone = function (test) {
                    var testName = curTestName,
                        i;

                    data[testName] = {
                        name: testName,
                        passed: test.passed,
                        failed: test.failed,
                        total: test.total
                    };

                    for (i in tests) {
                        data[testName][tests[i].name] = {
                            result: tests[i].result,
                            message: message(tests[i]),
                            name: tests[i].name
                        };
                    }

                    tests = {};
                    count = 1;
                };

                qunit.done = function (tests) {
                    var results = data;

                    results.passed = tests.passed;
                    results.failed = tests.failed;
                    results.total = tests.total;
                    results.duration = tests.runtime;
                    results.name = document.title;

                    complete(results);
                };

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

        driver.addAutomation("coverage", "yui", {
            detectFn: function (win) {
                return win.YUITest && win.YUITest.TestRunner &&
                    "function" === typeof win.YUITest.TestRunner.getCoverage;
            },
            collectFn: function (win) {
                return win.YUITest.TestRunner.getCoverage();
            }
        });

        driver.connectWithHandshake();

        driver.scan();
    });
};
