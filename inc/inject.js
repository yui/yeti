(function attachEventsToYUITest () {

    if (!window.YCLIid && window.location.pathname) {
        var matches = window.location.pathname.match(/^\/project\/([^\/]*)/);
        if (matches) window.YCLIid = matches.pop();
    }

    if (!window.YUITest) return window.setTimeout(attachEventsToYUITest, 15);

    var Runner = window.YUITest.TestRunner;

    Runner.on(Runner.COMPLETE_EVENT, function (data) {
        if (!window.YCLI) return;

        YUI().use("test", function (Y) {
            var reporter = new Y.Test.Reporter(
                window.YCLI.url,
                Y.Test.Format.JSON
            );
            reporter.addField("id", window.YCLIid);
            reporter.report(data.results);

            if (parent.YETI) {
                var onload = parent.YETI.next;
                var ifr = reporter._iframe;
                if (ifr.attachEvent) {
                    ifr.attachEvent("onload", onload);
                } else {
                    ifr.onload = onload;
                }
            }
        });
    });

})();
