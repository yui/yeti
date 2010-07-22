var YETI = (function yeti () {

    var TIMEOUT = 20000;

    function createFrame () {
        var frame = document.createElement("iframe");
        document.body.appendChild(frame);
        return frame.contentWindow || frame.contentDocument.contentWindow;
    }

    var log = function () {};
    if (console && console.log) log = console.log;

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
        if (!req) return;
        req.open("GET", "/tests/wait", true);
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
                    console.log("Something went wrong.", req.status);
                }
                req = null;
            }
        };
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
                my.frame.location.replace(my.tests.shift());
                if (reaper) window.clearTimeout(reaper);
                reaper = window.setTimeout(YETI.next, TIMEOUT);
            }
        }
    };

})();
YETI.start();
