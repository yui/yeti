var YETI = (function yeti () {

    var TIMEOUT = 300000;

    function createFrame () {
        var frame = document.createElement("iframe");
        document.getElementById("bd").appendChild(frame);
        return frame.contentWindow || frame.contentDocument.contentWindow;
    }

    var my = {
        frame : null,
        tests : []
    };

    var statusEl = document.getElementById("status");
    var skip = document.getElementById("skip");

    function status (msg) {
        showControls(msg.indexOf("Waiting for tests") !== -1);
        statusEl.innerHTML = msg;
    }

    function showControls (bit) {
        skip.disabled = bit;
    }

    function incoming (data) {
        var response = eval("(" + data + ")");
        if (response.tests.length) {
            var t = response.tests;
            for (var i in t) my.tests.push(t[i]);
            YETI.next();
        }
        wait();
    }

    if ("undefined" !== typeof EventSource) {
        var source = false;
        var wait = function () {
            if (!source) {
                source = new EventSource("/tests/wait");
                source.onmessage = function (e) {
                    incoming(e.data);
                };
                source.onerror = function () {
                    if (source.readyState === 2) {
                        // connection was closed
                        source = null;
                        window.setTimeout(wait, 5000);
                        status("Timeout or server error, retrying in 5 seconds.");
                    }
                };
            }
            status("Waiting for tests.");
        }
    } else {
        var xhr;
        if (window.XMLHttpRequest) {
            xhr = function () { return new window.XMLHttpRequest(); }
        } else {
            xhr = function () {
                try {
                    return new window.ActiveXObject("Microsoft.XMLHTTP");
                } catch (e) {}
            };
        }
        var wait = function () {
            var req = xhr();
            if (!req) return status("Unable to create XMLHttpRequest.");
            req.open("POST", "/tests/wait", true);
            req.onreadystatechange = function () {
                if (req.readyState === 0) {
                    // server is down
                    req = null;
                } else if (req.readyState === 4) {
                    if (req.status === 200 && req.responseText) {
                        incoming(req.responseText);
                    } else {
                        window.setTimeout(wait, 5000);
                        status("Timeout or server error, retrying in 5 seconds.");
                    }
                    req = null;
                }
            };
            status("Waiting for tests.");
            req.send(null);
        };
    }
    var reaper = null;

    return {
        start : function () {
            my.frame = createFrame();
            skip.onclick = function (e) {
                e.preventDefault();
                YETI.next();
            };
            wait();
        },
        next : function () {
            if (my.tests.length) {
                var url = my.tests.shift();
                status("Waiting for results for: " + url);
                my.frame.location.replace(url);
                if (reaper) window.clearTimeout(reaper);
                reaper = window.setTimeout(YETI.next, TIMEOUT);
            } else {
                my.frame.location.replace("about:blank");
                status("Test run complete. Waiting for new tests.");
            }
        }
    };

})();
