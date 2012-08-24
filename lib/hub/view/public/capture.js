/*jshint browser:true */
/*global SimpleEvents, SockJS, io */
(function () {
    "use strict";

    function getSockURL(resource, name) {
        return [
            document.location.protocol,
            "//",
            document.domain,
            ":" + document.location.port,
            resource,
            "/" + name
        ].join("");
    }

    var reconnectInterval = 1,
        beatInterval;

    window.Yeti = {
        capture: function capture(resource) {
            reconnectInterval = reconnectInterval * 2;

            if (resource === "/") {
                resource = "";
            }

            var agentId = window.location.href.match(/\/agent\/(\d+)/)[1],
                win = window, moving = false, unload,
                sock = new SockJS(getSockURL(resource, "tower")),
                tower = new SimpleEvents(sock);

            if ("function" === typeof win.onbeforeunload) {
                unload = win.onbeforeunload;
            }

            win.onbeforeunload = function () {
                if (!moving) {
                    var img = new Image();
                    img.src = "/ping/unload/" + agentId;
                }
                if (unload) {
                    unload();
                }
            };

            function beat() {
                tower.emit("beat");
            }

            tower.queueUntil("listening");
            tower.on("listening", function () {
                if (reconnectInterval > 2) {
                    // We detected the server is back online,
                    // to properly register we must reload.
                    window.location.reload(true);
                }
                tower.emit("register", {
                    agentId: agentId,
                    ua: window.navigator.userAgent
                });
                tower.queueUntil("ready");
                document.getElementById("test").innerHTML = "Sending registration...";
            });
            tower.on("ready", function (id) {
                beatInterval = window.setInterval(beat, 10000);
                // Only matters when we fully reconnect
                // without a reload, but for completeness:
                reconnectInterval = 1;
                // attachServer() tests use cookies instead of the URL
                document.cookie = "yeti-agent=" + id +
                    ";path=/;expires=Sat, 10 Mar 2029 08:00:00 GMT";
                document.getElementById("test").innerHTML = "Waiting for tests...";
            });
            tower.on("navigate", function (test) {
                moving = true;
                document.location.href = test;
            });
            tower.on("close", function () {
                window.clearInterval(beatInterval);
                var seconds = reconnectInterval;
                (function tick() {
                    document.getElementById("test").innerHTML = "Disconnected, " +
                        "reconnecting in " + seconds + "...";
                    seconds -= 1;
                    if (seconds !== -1) {
                        setTimeout(tick, 1000);
                    } else {
                        capture(resource);
                    }
                }());
            });
        }
    };
}());
