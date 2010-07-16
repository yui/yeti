(function attachEventsToYUITest () {

    if (!window.YUITest) return window.setTimeout(attachEventsToYUITest, 15);

    var Runner = window.YUITest.TestRunner;

    Runner.on(Runner.COMPLETE_EVENT, function (data) {
        if (!window.YUITest.CLI) return;

        YUI().use("test", function (Y) {
            var reporter = new Y.Test.Reporter(window.YUITest.CLI.url);
            reporter.report(data);
        });
    });

})();
