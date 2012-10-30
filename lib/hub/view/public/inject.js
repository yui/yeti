/*global window, YUI, Image, SimpleEvents, SockJS */

YUI.add("tempest-base-core", function (Y, name) {
    "use strict";

    function TempestBaseCore(options) {
        TempestBaseCore.superclass.constructor.call(this, options);
    }

    Y.extend(TempestBaseCore, Y.BaseCore);

    TempestBaseCore.prototype.debug = function () {
        var args = Array.prototype.slice.call(arguments);
        args = Y.Array.map(args, Y.bind(Y.dump, Y)).join(" ");
        Y.log(args, "info", "[Tempest] " + this.constructor.NAME);
    };

    Y.TempestBaseCore = TempestBaseCore;
}, "1.0", {
    requires: [
        "array-extras",
        "base-core"
    ]
});

YUI.add("tempest-hubclient", function (Y, name) {
    "use strict";

    var proto,
        ATTRS;

    function HubClient(options) {
        HubClient.superclass.constructor.call(this, options);

        /**
         * SockJS reference.
         *
         * @property sock
         * @protected
         * @type SockJS
         */
        this.sock = null;

        /**
         * SockJS wrapper.
         *
         * @property tower
         * @protected
         * @type SimpleEvents
         */
        this.tower = null;
    }

    HubClient.NAME = "hubClient";

    ATTRS = HubClient.ATTRS = {};

    /**
     * Mountpoint.
     *
     * @property resource
     * @default ""
     * @type String
     * @readOnly
     */
    ATTRS.resource = {
        value: "",
        setter: function (value) {
            if (value === "/") {
                value = "";
            }
            return value;
        }
    };

    /**
     * SockJS URL.
     *
     * @property sockUrl
     * @type String
     */
    ATTRS.sockUrl = {
        readOnly: true,
        valueFn: function () {
            var doc = Y.config.doc;
            return [
                doc.location.protocol,
                "//",
                doc.domain,
                ":" + doc.location.port,
                this.get("resource"),
                "/tower"
            ].join("");
        }
    };

    /**
     * SockJS protocols to use.
     *
     * @property protocols
     * @type {String[]}
     * @readOnly
     */
    ATTRS.protocols = {
        readOnly: true,
        valueFn: function () {
            var protocols = [
                "websocket",
                "xdr-streaming",
                // "iframe-eventsource",
                // "iframe-htmlfile",
                "xdr-polling",
                "xhr-polling",
                // "iframe-xhr-polling",
                "jsonp-polling"
            ];

            if (!Y.UA.android) {
                protocols.push("xhr-streaming");
            }

            return protocols;
        }
    };

    Y.extend(HubClient, Y.TempestBaseCore);
    Y.augment(HubClient, Y.AttributeEvents);

    proto = HubClient.prototype;

    /**
     * Destroy this instance.
     *
     * @method destroy
     */
    proto.destroy = function () {
        var self = this;
        self.destroyConnection();
        HubClient.superclass.destroy.call(self);
        self = null;
    };

    proto.destroyConnection = function () {
        this.tower = null;
        this.sock = null;
    };

    /**
     * Connect to SockJS.
     *
     * @method connectWithHandshake
     */
    proto.connect = function () {
        this.debug("Connecting to", this.get("sockUrl"));

        this.sock = new SockJS(this.get("sockUrl"), null, {
            protocols_whitelist: this.get("protocols")
        });

        return new SimpleEvents(
            this.sock,
            Y.bind(this.debug, this, "[SimpleEvents]")
        );
    };

    Y.HubClient = HubClient;
}, "1.0", {
    requires: [
        "oop",
        "tempest-base-core",
        "attribute-events"
    ]
});

YUI.add("tempest", function (Y, name) {
    "use strict";

    var win = Y.config.win,
        ATTRS,
        proto;

    /**
     * Browser Agent driver.
     *
     * @class InjectedDriver
     * @constructor
     * @extends Y.BaseCore
     * @uses Y.EventTarget
     */
    function InjectedDriver(options) {
        InjectedDriver.superclass.constructor.call(this, options);

        /**
         * Hub client.
         *
         * @property hub
         * @protected
         * @type HubClient
         */
        this.hub = new Y.HubClient(options);

        /**
         * Page load event handler.
         *
         * @property loadHandler
         * @private
         * @type EventHandle|null
         */
        this.loadHandler = null;

        /**
         * Page unload event handler.
         *
         * @property unloadHandler
         * @private
         * @type EventHandle|null
         */
        this.unloadHandler = null;

        /**
         * Page error event handler.
         *
         * @property errorHandler
         * @private
         * @type EventHandle|null
         */
        this.errorHandler = null;

        /**
         * Timeout for resubmitting results.
         *
         * @property watchdogTimeout
         * @private
         * @type Object|null
         */
        this.watchdogTimeout = null;

        /**
         * Page destruction is pending.
         *
         * @property destroySoon
         * @private
         * @type Boolean
         */
        this.destroySoon = false;

        /**
         * Test framework scanning is in progress.
         *
         * @property scanning
         * @private
         * @type Boolean
         */
        this.scanning = false;

        this.setupWindowHandlers();

        this.automation = new Y.AutomationGroup();
    }

    InjectedDriver.NAME = "injectedDriver";

    ATTRS = InjectedDriver.ATTRS = {};

    /**
     * Time to wait before moving to the next test.
     *
     * @property navigateTimeout
     * @default 10
     * @type Number
     */
    ATTRS.navigateTimeout = {
        valueFn: function () {
            if (Y.UA.ie && Y.UA.ie <= 6) {
                return 1000;
            }
            return 10;
        }
    };

    /**
     * @property agentId
     * @type String
     */
    ATTRS.agentId = {
        valueFn: function () {
            var matches = win.location.href.match(/\/agent\/(\d+)/),
                agentId;
            if (matches && matches[1]) {
                agentId = matches[1];
            } else {
                // attachServer() tests use cookies instead of the URL
                agentId = Y.Cookie.get("yeti-agent");
            }
            return agentId;
        },
        readOnly: true
    };

    /**
     * @property scanTimeout
     * @type Number
     */
    ATTRS.scanTimeout = {
        value: 37500,
        readOnly: true
    };

    /**
     * @property unloadUrl
     * @type String
     */
    ATTRS.unloadUrl = {
        valueFn: function () {
            return "/ping/unload/" + this.get("agentId");
        },
        readOnly: true
    };

    Y.extend(InjectedDriver, Y.TempestBaseCore);
    Y.augment(InjectedDriver, Y.AttributeEvents);

    proto = InjectedDriver.prototype;

    proto.addAutomation = function (kind, name, options) {
        this.debug("addAutomation", kind, name);
        this.automation.add(kind, name, options);
    };

    proto.scan = function () {
        var self = this,
            scanTimeout = self.get("scanTimeout");

        function endScanIfRunning() {
            if (self.scanning) {
                self.debug("Scan running, stopping.");
                self.scanning = false;
                self.automation.endScan();
                self.bindAutomation();
            }
        }

        this.automation.on("detect", function onAutomationDetect(name) {
            self.debug("Framework detected.", name);
            // self.frameworkCount += 1;
            endScanIfRunning();
        });

        Y.later(scanTimeout, null, endScanIfRunning);

        this.debug("Starting scan. Timeout in", scanTimeout, "milliseconds.");
        this.scanning = true;
        this.automation.beginScan();
    };

    /**
     * Connect to SockJS.
     *
     * @method connectWithHandshake
     */
    proto.connectWithHandshake = function () {
        this.tower = this.hub.connect();

        this.debug("Waiting for listening.");
        this.tower.queueUntil("listening");
        this.setupTowerHandlers();
    };

    /**
     * Cancel watchdog timer.
     *
     * @method cancelWatchdog
     */
    proto.cancelWatchdog = function () {
        if (this.watchdogTimeout) {
            this.watchdogTimeout.cancel();
        }
    };

    /**
     * Destroy this instance.
     *
     * @method destroy
     */
    proto.destroy = function () {
        var self = this;
        self.unloadHandler.detach();
        self.errorHandler.detach();
        self.loadHandler.detach();
        self.hub.destroy();
        InjectedDriver.superclass.destroy.call(self);
        self = null;
    };

    proto.renderUI = function () {
        // TODO
    };

    proto.syncUI = function () {
        if (!this.get("loaded")) {
            return;
        }
    };

    proto.beat = function () {
        this.set("beats", this.get("beats") + 1);
        if (this.tower) {
            this.tower.emit("beat");
        }
        this.syncUI();
    };

    proto.setStatus = function (message) {
        this.set("status", message);
        this.syncUI();
    };

    proto.setupTowerHandlers = function () {
        var self = this;

        self.tower.on("navigate", function onNavigate(test) {
            var timeout = self.get("navigateTimeout");

            self.cancelWatchdog();

            self.destroySoon = true;

            Y.later(timeout, null, function () {
                self.destroy();
                Y.config.doc.location.href = test;
            });
        });

        self.tower.on("listening", function onListening() {
            self.tower.emit("register", {
                agentId: self.get("agentId")
            });
            self.tower.queueUntil("ready");
        });

        self.tower.on("ready", function onReady() {
            self.setStatus("Connected");
        });

        self.tower.on("close", function onClose() {
            if (self.destroySoon) {
                return;
            }

            self.cancelWatchdog();
            self.hub.destroyConnection();
            self.debug("Closed, reconnecting in 5 sec.");
            Y.later(5000, self, self.connectWithHandshake);
        });
    };

    proto.hijackCarelessErrors = function () {
        win.print = win.confirm = win.alert = win.open = function () {
            throw new Error("Careless method called.");
        };
    };

    proto.bindAutomation = function () {
        var self = this;

        self.debug("binding automation!");

        self.automation.on("results", function (results) {
            self.beat();
            self.tower.emit("results", results);
        });

        self.automation.on("beat", Y.bind(self.beat, self));
    };

    proto.setupWindowHandlers = function () {
        var self = this;

        self.debug("Attaching window event handlers.");

        function errorHandler(message, url, line) {
            self.debug("errorHandler", message, url, line);

            // Firefox throws on script includes that 404.
            if (
                message &&
                "string" === typeof message &&
                message.toLowerCase().indexOf("error loading") !== -1
            ) {
                // Ignore.
                return true;
            }

            if (self.tower) {
                self.tower.emit("scriptError", {
                    message: message,
                    url: url,
                    line: line
                });
            }

            return true;
        }

        function unloadHandler() {
            var img = new Image();
            img.src = self.get("unloadUrl");
            self.destroy();
        }

        function loadHandler() {
            self.set("loaded", true);
        }

        self.loadHandler = Y.on("load", loadHandler, win);
        self.errorHandler = Y.on("error", errorHandler, win);
        self.unloadHandler = Y.on("unload", unloadHandler, win);
    };

    Y.InjectedDriver = InjectedDriver;
}, "1.0", {
    requires: [
        "oop",
        "cookie",
        "attribute-events",
        "tempest-base-core",
        "tempest-hubclient",
        "tempest-automation-group"
    ]
});

YUI.add("tempest-automation-group", function (Y, name) {
    "use strict";

    var proto;

    function AutomationGroup() {
        this.testSystems = {};
        this.coverageSystems = {};
        this.detectedTestSystem = null;
        this.detectedCoverageSystem = null;
        this.testResults = null;
        this.periodicScan = null;
    }

    AutomationGroup.NAME = "automationGroup";

    AutomationGroup.ATTRS = {
        "scanInterval": {
            value: 50,
            readOnly: true
        }
    };

    Y.extend(AutomationGroup, Y.TempestBaseCore);
    Y.augment(AutomationGroup, Y.EventTarget);

    proto = AutomationGroup.prototype;

    proto.detectCoverage = function () {
        var self = this,
            result = {};

        // TODO stop on first result
        Y.Object.each(self.coverageSystems, function (system, name) {
            self.debug("Attempting to detect coverage system", name);
            if (system.detect()) {
                self.debug("Found", name);
                result.name = name;
                result.system = system;
            }
        });

        return result;
    };

    proto.add = function (kind, name, options) {
        var system;

        switch (kind) {
        case "test":
            system = new Y.TestFramework(options);
            this.testSystems[name] = system;
            this.bindTestSystem(name, system);
            break;
        case "coverage":
            system = new Y.CoverageFramework(options);
            this.coverageSystems[name] = system;
            break;
        default:
            throw new Error("Invalid kind " + kind);
        }

        this.debug("Added", kind, name);
    };

    proto.bindTestSystem = function (name, system) {
        var self = this;

        system.on("detect", function () {
            self.detectedTestSystem = name;
            self.fire("detect", name);
        });
        system.on("beat", function () {
            self.debug("Beat from", name);
            self.fire("beat", name);
        });
        system.on("results", function (res) {
            var coverage = self.detectCoverage();
            if (coverage.system) {
                res.coverage = coverage.system.collect();
                res.coverageSystem = coverage.name;
                self.debug("Collected coverage.");
            }
            self.fire("results", res);
        });
    };

    proto.beginScan = function () {
        var self = this;
        self.periodicScan = Y.later(30, self, function () {
            Y.Object.each(self.testSystems, function (system, name) {
                self.debug("Attempting to detect system", name);
                system.detect();
            });
        }, null, true);
    };

    proto.endScan = function () {
        var self = this;
        if (self.periodicScan) {
            self.periodicScan.cancel();
        }

        Y.Object.each(self.testSystems, function (system, name) {
            if (name !== self.detectedTestSystem) {
                delete self.testSystems[name];
            }
        });
    };

    Y.AutomationGroup = AutomationGroup;
}, "1.0", {
    requires: [
        "tempest-base-core",
        "event-custom-base",
        "tempest-frameworks"
    ]
});

YUI.add("tempest-frameworks", function (Y, name) {
    "use strict";

    var win = Y.config.win, asp, cfp;

    // detect
    // beat
    // results
    function TestFramework(options) {
        this.detectFn = options.detectFn;
        this.bindFn = options.bindFn;

        Y.Array.each(
            ["detect", "beat", "results"],
            Y.bind(this.publish, this)
        );

        this.detected = false;
    }

    /**
     * This system was detected.
     *
     * @event detect
     */

    /**
     * This system did some work.
     *
     * @event beat
     */

    /**
     * This system reports results.
     *
     * @event results
     */

    asp = TestFramework.prototype;

    asp.detect = function () {
        var ret;

        ret = this.detectFn(win);

        if (ret) {
            this.detected = true;
            this.fire("detect");
            if (this.bindFn) {
                this.bindFn.call(this, win);
            }
        }
        return ret;
    };

    Y.augment(TestFramework, Y.EventTarget);

    function CoverageFramework(options) {
        this.collectFn = options.collectFn;
        CoverageFramework.superclass.constructor.call(this, options);
    }

    Y.extend(CoverageFramework, TestFramework);

    cfp = CoverageFramework.prototype;

    cfp.collect = function () {
        if (this.detected) {
            return this.collectFn(win);
        }
    };

    Y.TestFramework = TestFramework;
    Y.CoverageFramework = CoverageFramework;

}, "1.0", {
    requires: [
        "base-core",
        "event-custom-base"
    ]
});

window.$yetify = function $yetify(options) {
    "use strict";

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
