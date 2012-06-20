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

    window.Yeti = {
        capture: function (resource) {
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

            tower.queueUntil("listening");
            tower.on("listening", function () {
                tower.emit("register", {
                    agentId: agentId,
                    ua: window.navigator.userAgent
                });
                tower.queueUntil("ready");
                document.getElementById("test").innerHTML = "Sending registration...";
            });
            tower.on("ready", function (id) {
                document.getElementById("test").innerHTML = "Waiting for tests...";
            });
            tower.on("navigate", function (test) {
                moving = true;
                document.location.href = test;
            });

        }
    };
}());
