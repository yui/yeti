// At this point, the only script that
// loaded on the page before us was socket.io.js.

function $yetify(firstRun) {

    var win = window,
        socket = $yetify.socket,
        Runner = null;

    function init() {
        $yetify.socket = null;
        $yetify.polls = 0;

        var getCookie = function (sKey) {
                return unescape(document.cookie.replace(new RegExp("(?:^|.*;\\s*)" + escape(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*((?:[^;](?!;))*[^;]?).*"), "$1"));
            },
            io = win.io;
            socket = $yetify.socket = io.connect(io.util.uniqueUri({}) + "/run");

        // Handle user errors.
        win.onerror = function (message, url, line) {
            socket.json.emit("scriptError", {
                message: message,
                url: url,
                line: line
            });
            return true;
        };

        // TODO rename to navigate
        socket.on("test", function (test) {
            document.location.href = test;
        });

        socket.on("complete", function () {
            document.location.href = "/";
        });

        socket.json.emit("register", {
            agentId: getCookie("yeti-agent"),
        });
    }

    if (firstRun) {
        init();
        if (document.compatMode !== "CSS1Compat") {
            throw new Error("Yeti requires HTML files with doctypes.");
        }
    }

    // At this point, we are ready to attempt injection.
    if (win.YUITest && win.YUITest.TestRunner) {
        Runner = win.YUITest.TestRunner;
    }

    // Poll for YUI test.
    if (!Runner) {
        if ($yetify.polls > 40) {
            throw new Error("Could not find YUI Test.");
        } else {
            $yetify.polls++;
            return win.setTimeout($yetify, 50);
        }
    }

    // The test runner is on the page.

    // Prevent careless errors.
    function reportCarelessErrors() {
        win.print = win.confirm = win.alert = win.open = function () {
            throw new Error("Careless method called.");
        };
    }

    function beat() {
        reportCarelessErrors();
        socket.json.emit("beat");
    }

    beat();

    function complete(data) {
        socket.json.emit("results", data.results);
    }

    // Did tests already complete?
    if (Runner._root && Runner._root.results && Runner._root.results.type === "report") {
        complete(Runner._root);
    }

    // Otherwise, listen for completion.
    Runner.subscribe(Runner.COMPLETE_EVENT, complete);

    // Send heartbeats.
    Runner.subscribe(Runner.TEST_PASS_EVENT, beat);
    Runner.subscribe(Runner.TEST_FAIL_EVENT, beat);
    Runner.subscribe(Runner.TEST_IGNORE_EVENT, beat);
}

$yetify(true);
