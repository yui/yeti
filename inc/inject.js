function $yetify (config) {

    var w = window,
        Y2 = ("YAHOO" in w) ? w.YAHOO.tool : false,
        YTest = w.YUITest || Y2.TestRunner,
        matches;

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

    if (Y2 && !w.YAHOO.lang.JSON) { // YUI 2.x; missing Y.lang.JSON
        var json = document.createElement("script");
        json.src = "/inc/yui2-json.js";
        document.body.appendChild(json);
        return; // yui2-json will call $yetify when ready
    }

    // poll for Y.Test
    if (!YTest) return w.setTimeout($yetify, 50);

    var href = w.location.href,
        YETI = parent.YETI;

    function attachReporter (Y) {
        if (Y.UA.ie == 9) {
            Y.UA.ie = 0;
        }

        function submit (data) {

            var self = $yetify.config,
                yui2 = Y === Y2,
                TestReporter = (yui2) ? Y.TestReporter : Y.Test.Reporter,
                FormatJSON = (yui2) ? Y.TestFormat.JSON : Y.Test.Format.JSON;

            if (!self.url) return;

            var reporter = new TestReporter(self.url, FormatJSON);
            reporter.addField("id", self.id);
            reporter.report(data.results);

            if (YETI) {
                var cb = YETI.next,
                    ifr = reporter._iframe;
                if (ifr.attachEvent) {
                    ifr.attachEvent("onload", cb);
                } else {
                    ifr.onload = cb;
                }
            }
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

        var Runner = YTest.TestRunner || YTest;

        if (Runner._root && Runner._root.results && Runner._root.results.type == "report") {
            return submit(Runner._root);
        }

        Runner.subscribe(Runner.COMPLETE_EVENT, submit);

    }

    if (Y2) attachReporter(Y2)
    else w.YUI().use("test", attachReporter);

};
