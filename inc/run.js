YETI = (function yeti (window, document, evaluator) {

    var RETRY = "Server error, retrying in 5 seconds.",
        WAIT_FOR = "Waiting for ",
        WAIT_TESTS = WAIT_FOR + "tests.",
        XMLHTTPREQUEST = "XMLHttpRequest",
        READYSTATE = "readyState",
        CONTENTWINDOW = "contentWindow",
        ENDPOINT = "/tests/wait",
        TIMEOUT = 30000,
        frame = null,
        tests = [],
        st = document.getElementById("status"),
        idle = true,
        source,
        wait,
        startTime,
        reaperTimeout;

    function createFrame () {
        var frame = document.createElement("iframe");
        document.getElementById("bd").appendChild(frame);
        return frame[CONTENTWINDOW] || frame.contentDocument[CONTENTWINDOW];
    }

    function navigate (frame, url) {
        frame.location.replace(url)
    }

    function status (msg) {
        st.innerHTML = msg;
    }

    function phantom () {
        if (reaperTimeout) window.clearTimeout(reaperTimeout);
        if (reaperTimerTimeout) window.clearTimeout(reaperTimerTimeout);
        reaperTimeout = null;
        reaperTimerTimeout = null;
    }

    var reaperTimerTimeout;
    var heartbeats = 0;
    var reaperSecondsRemaining = 0;

    function reaper (fn) {
        var timeout = window.setTimeout,
            second = 1000;
        phantom();
        reaperTimeout = window.setTimeout(fn, TIMEOUT);
        reaperSecondsRemaining = Math.floor(TIMEOUT / second);
        (function TIMER () {
            var timer = document.getElementById("timer");
            reaperSecondsRemaining--;
            var s = "Test Health: ";
            s += heartbeats + " heartbeats";

            var time = (new Date).getTime();

            // yay algebra
            var duration = time - startTime;
            var bpm = Math.round(
                ( (heartbeats * 6000) / duration )
            );
            s += " (" + bpm + " BPM)";

            s += "; " + reaperSecondsRemaining + " seconds left";
            timer.innerHTML = s;
            if (reaperSecondsRemaining > 0)
                reaperTimerTimeout = window.setTimeout(TIMER, second);
        })()
    }

    function incoming (data) {
        var response = evaluator(data);
        if (response.shutdown) {
            // the server was shutdown. no point in reconnecting.
            if (source) source.close();
            status("The server was shutdown. Refresh to reconnect.");
            return;
        }

        if (response.tests.length) {

            heartbeats = 0;
            startTime = (new Date).getTime();

            var t = response.tests;
            for (var i in t) tests.push(t[i]);
            idle && dequeue(); // run if necessary
        }
        wait();
    }

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
                    window.setTimeout(wait, 5000);
                    status(RETRY);
                }
            };
        }
        return function waitEventSource () {
            source || setupEventSource();
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
                        window.setTimeout(wait, 5000);
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
            req.send(null);
        };
    }

    function dequeue () {
        idle = false;
        var url = tests.shift();
        status(WAIT_FOR + "results: " + url);
        navigate(frame, url);
        reaper(YETI.next);
    }

    function complete () {
        idle = true;
        phantom();
        navigate(frame, "about:blank");
        status("Done. " + WAIT_FOR + "new tests.");
    }

    return {
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
        heartbeat : function BEAT () {
            heartbeats++;
            reaper(YETI.next);
        },
        next : function NEXT () {
            tests.length ? dequeue() : complete();
        }
    };

})(
    window,
    document,
    function (d) { return eval("(" + d + ")"); }
);
