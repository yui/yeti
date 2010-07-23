var YETI = (function yeti () {

    var TIMEOUT = 20000;

    function createFrame () {
        var frame = document.createElement("iframe");
        document.body.appendChild(frame);
        return frame.contentWindow || frame.contentDocument.contentWindow;
    }

    var my = {
        frame : null,
        tests : []
    };

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

    var statusEl = document.getElementById("status");
    function status (msg) {
        statusEl.innerHTML = msg;
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

    function wait () {
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
                    window.setTimeout(function () {
                        wait();
                    }, 5000);
                    status("Timeout or server error, retrying in 5 seconds.");
                }
                req = null;
            }
        };
        status("Waiting for tests.");
        req.send(null);
    };
        
    var reaper = null;

    return {
        start : function () {
            my.frame = createFrame();
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
YETI.start();