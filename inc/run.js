YETI = (function yeti (window, document, evaluator) {

    var RETRY = "Server error, retrying in 5 seconds.",
        WAIT_FOR = "Waiting for ",
        WAIT_TESTS = WAIT_FOR + "tests.",
        XMLHTTPREQUEST = "XMLHttpRequest",
        READYSTATE = "readyState",
        CONTENTWINDOW = "contentWindow",
        ENDPOINT = "/tests/wait",
        TIMEOUT = 30000, // after this many ms of no activity, skip the test
        setTimeout = window.setTimeout,
        clearTimeout = window.clearTimeout,
        heartbeats = 0, // counter for YETI.heartbeat() calls
        reaperSecondsRemaining = 0, // counter for UI
        frame = null, // test target frame's contentWindow
        tests = [], // tests to run
        elementCache = {}, // cache of getElementById calls
        idle = true, // = !(tests_running)
        source, // the EventSource
        wait, // holder for the wait() function
        startTime, // for elapsed time
        reaperTimeout, // reaper(fn)'s timeout to call fn
        syncUITimeout; // reaper(fn)'s timeout to sync UI

    // caching getElementById
    function _ (id) {
        if (!(id in elementCache)) elementCache[id] = document.getElementById(id);
        return elementCache[id];
    }

    function setContent (id, html) {
        _(id).innerHTML = html;
    }

    // creates our test target
    function createFrame () {
        var frame = document.createElement("iframe");
        _("bd").appendChild(frame);
        return frame[CONTENTWINDOW] || frame.contentDocument[CONTENTWINDOW];
    }

    function navigate (frame, url) {
        frame.location.replace(url)
    }

    // wrappers around setContent

    function mode (str) {
        setContent("mode", str);
    }

    function smode (str) {
        setContent("smode", str);
    }

    function status (str) {
        setContent("status", str);
    }

    // clears all timers
    function phantom () {
        if (reaperTimeout) clearTimeout(reaperTimeout);
        if (syncUITimeout) clearTimeout(syncUITimeout);
        reaperTimeout = syncUITimeout = null;
    }

    // starts the reaper timers
    // updates the vitals UI
    // calls the provided function after TIMEOUT ms
    // unless reset by phantom() or by calling reaper again
    function reaper (fn) {
        var second = 1000;
        phantom();
        reaperTimeout = setTimeout(fn, TIMEOUT);
        reaperSecondsRemaining = Math.floor(TIMEOUT / second);
        (function SYNCUI () {
            var bpm = Math.round(
                ( (heartbeats * 60000) / ( (new Date).getTime() - startTime ) )
            );
            if (!isNaN(bpm) && bpm > 0) setContent("pulse", bpm);
            setContent("timer", reaperSecondsRemaining);
            setContent("heartbeats", heartbeats);
            reaperSecondsRemaining--;
            if (reaperSecondsRemaining > 0)
                syncUITimeout = setTimeout(SYNCUI, second);
        })();
    }

    // handling incoming data from the server
    // this may be from EventSource or XHR
    function incoming (data) {
        smode("Data");
        var response = evaluator(data);
        if (response.shutdown) {
            // the server was shutdown. no point in reconnecting.
            if (source) source.close();
            status("The server was shutdown. Refresh to reconnect.");
            mode("Offline");
            return;
        }

        if (response.tests.length) {
            mode("Run");
            heartbeats = 0;
            startTime = (new Date).getTime();

            var t = response.tests;
            for (var i in t) tests.push(t[i]);
            idle && dequeue(); // run if necessary
        }
        wait();
    }

    // factories for the wait() function

    function patientEventSource () {
        function setupEventSource () {
            source = new EventSource(ENDPOINT);
            source.onmessage = function (e) {
                incoming(e.data);
            };
            source.onerror = function () {
                if (source[READYSTATE] === 2) {
                    // connection was closed
                    source = null;
                    setTimeout(wait, 5000);
                    status(RETRY);
                }
            };
        }
        return function waitEventSource () {
            source || setupEventSource();
            smode("Listening EV");
            status(WAIT_TESTS);
        }
    }

    function patientXHR () {
        var xhr, nativeXHR = window[XMLHTTPREQUEST];
        if (nativeXHR) {
            xhr = function () { return new nativeXHR(); }
        } else {
            xhr = function () {
                try {
                    return new window.ActiveXObject("Microsoft.XMLHTTP");
                } catch (e) {}
            };
        }
        return function waitXHR () {
            var poll,
                req = xhr();
            if (!req) return status("Unable to create " + XMLHTTPREQUEST);
            req.open("POST", ENDPOINT, true);

            // prevent memory leaks by polling
            // instead of using onreadystatechange
            poll = window.setInterval(function () {
                if (req[READYSTATE] === 0) {
                    // server is down
                } else if (req[READYSTATE] === 4) {
                    var data = req.responseText;
                    if (req.status === 200 && req.responseText) {
                        incoming(req.responseText);
                    } else {
                        setTimeout(wait, 5000);
                        status(RETRY);
                    }
                } else {
                    return;
                }
                // readystate is either 0 or 4, we're done.
                req = null;
                window.clearInterval(poll);
            }, 50);

            status(WAIT_TESTS);
            smode("Listening XHR");
            req.send(null);
        };
    }

    // run the next test
    function dequeue () {
        idle = false;
        var url = tests.shift();
        status(WAIT_FOR + "results: " + url);
        navigate(frame, url);
        reaper(YETI.next);
    }

    // stop running all tests, restart with dequeue()
    function complete () {
        idle = true;
        phantom();
        navigate(frame, "about:blank");
        status("Done. " + WAIT_FOR + "new tests.");
        mode("Idle");
    }

    // public API
    return {
        // called once by the Yeti runner
        start : function START (config) {
            var transport = config.transport,
                supportEV = "undefined" !== typeof EventSource,
                forceXHR = transport == "xhr",
                forceEV = transport == "eventsource";
            frame = createFrame();
            wait = (
                supportEV
                && (!forceXHR || forceEV)
            ) ? patientEventSource() : patientXHR();
            wait();
        },
        // called by run.js when test activity occurs
        heartbeat : function BEAT () {
            // update the heartbeat symbol
            _("beat").style.visibility = "visible";
            setTimeout(function () {
                // turn it off after a short time
               _("beat").style.visibility = "hidden";
            }, 50);
            heartbeats++;
            reaper(YETI.next); // restart the reaper timer
        },
        // called by run.js when it's ready to move on
        next : function NEXT () {
            tests.length ? dequeue() : complete();
        }
    };

})(
    window,
    document,
    // you can't minify any JS with eval() in its scope
    // provide this toxic function in its own little box
    function (d) { return eval("(" + d + ")"); }
);
