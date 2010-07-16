(function attachEventsToYUITest () {

    if (!window.YUITest) return window.setTimeout(attachEventsToYUITest, 15);

    var Runner = window.YUITest.TestRunner;

    Runner.on(Runner.COMPLETE_EVENT, function (data) {
        if (!window.YCLI) return;

        YUI().use("test", function (Y) {
            var reporter = new Y.Test.Reporter(
                window.YCLI.url,
                Y.Test.Format.JSON
            );
            reporter.report(data.results);
        });
    });

})();
