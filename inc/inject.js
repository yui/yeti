(function attachEventsToYUITest () {

    if (!window.YCLIid && window.location.pathname) {
        var matches = window.location.pathname.match(/^\/project\/([^\/]*)/);
        if (matches) window.YCLIid = matches.pop();
    }

    if (!window.YUITest) return window.setTimeout(attachEventsToYUITest, 15);

    YUI().use("test", function (Y) {

        function submit (data) {
            if (!window.YCLI) return;

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

        };

        window.onerror = function (e) {
            submit({
                results : {
                    name : window.location.href,
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

        var Runner = window.YUITest.TestRunner;
        Runner.on(Runner.COMPLETE_EVENT, submit);

    });


})();

window.print = window.confirm = window.alert = window.open = function () {};
