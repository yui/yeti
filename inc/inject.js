function $yetify (config) {

    var w = window,
	parent = w.parent,
        Y2 = ("YAHOO" in w) ? w.YAHOO : false,
        YTest = w.YUITest || Y2.TestRunner,
        matches;

    // No YUI? Drop and move on.
    // This file probably 404ed.
    // TODO: Stop eating this error.
    //if (!Y2 && !w.YUI) return parent.YETI.next();

    if (!$yetify.config) { // first run

        var path = w.location.pathname;

        if (!path) return; // very required

        if (!config) return;
        $yetify.config = config;

        matches = path.match(/^\/project\/([^\/]*)/);
        if (!matches) return;

        $yetify.config.id = matches.pop();

        // prevent careless errors
        w.print = w.confirm = w.alert = w.open = function () {};

    }

    if (Y2 && !Y2.lang.JSON) { // YUI 2.x; missing Y.lang.JSON
        var json = document.createElement("script");
        json.src = "/inc/yui2-json.js";
        document.body.appendChild(json);
        return; // yui2-json will call $yetify when ready
    }

    // poll for Y.Test
    if (!YTest) return w.setTimeout($yetify, 50);

    var href = w.location.href,
        YETI = parent.YETI;

    // YETI may be undefined if we're running
    // outside of server mode

    if (YETI) YETI.heartbeat();

    function fixIE9 (v) {
        // TestReporter does UA sniffing
        // for IE 9, disable the IE hackery
        // leave other versions of IE alone
        return (v == 9) ? 0 : v;
    }

    function attachReporter (Y) {

        var TestReporter, FormatJSON, self;

        if (Y === Y2) { // yui 2.x
            TestReporter = Y.tool.TestReporter;
            FormatJSON = Y.tool.TestFormat.JSON;
            Y.env.ua.ie = fixIE9(Y.env.ua.ie);
        } else {
            TestReporter = Y.Test.Reporter;
            FormatJSON = Y.Test.Format.JSON;
            Y.UA.ie = fixIE9(Y.UA.ie);
        }

        function submit (data) {

            self = $yetify.config;

            if (!self.url) return;

            var reporter = new TestReporter(self.url, FormatJSON);
            reporter.addField("id", self.id);
            reporter.report(data.results);

        };

        w.onerror = function (e) {
            submit({
                results : {
                    name : href,
                    total : 1,
                    passed : 0,
                    failed : 1,
                    data : {
                        failed : 1,
                        name : "window.onerror handler (yeti virtual test)",
                        data : {
                            name : "window.onerror should not fire",
                            message : e,
                            result : "fail"
                        }
                    }
                }
            });
            return false;
        };

        if (document.compatMode !== "CSS1Compat") {
            w.onerror("Not in Standards Mode!");
        }

        var Runner = YTest.TestRunner || YTest;

        if (Runner._root && Runner._root.results && Runner._root.results.type == "report") {
            return submit(Runner._root);
        }

        Runner.subscribe(Runner.COMPLETE_EVENT, submit);

        if (YETI) {
            Runner.subscribe(Runner.TEST_PASS_EVENT, YETI.heartbeat);
            Runner.subscribe(Runner.TEST_FAIL_EVENT, YETI.heartbeat);
            Runner.subscribe(Runner.TEST_IGNORE_EVENT, YETI.heartbeat);
        }

    }

    if (Y2) attachReporter(Y2)
    else w.YUI().use("test", attachReporter);

};
