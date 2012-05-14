/*jshint browser:true */
/*global YUI, io */
(function () {
    "use strict";

    function getCookie(name) {
        var parts = document.cookie.split(";"),
            cookie,
            i = 0,
            l = parts.length;
        name += "=";
        for (; i < l; i++) {
            cookie = parts[i].replace(/^\s*(\S*(\s+\S+)*)\s*$/, "$1");
            if (cookie.indexOf(name) === 0) {
                return cookie.substring(name.length, cookie.length);
            }
        }
        return null;
    }

    window.Yeti = {
        capture: function (resource) {
            if (resource === "/") {
                resource = "";
            }
            resource += "/socket.io";
            resource = resource.substr(1); // strip leading slash

            var agentId = getCookie("yeti-agent"),
                socket = io.connect(io.util.uniqueUri({}) + "/capture", {
                    resource: resource
                });

            socket.json.emit("register", {
                agentId: agentId,
                ua: window.navigator.userAgent
            });

            socket.on("ready", function (newId) {
                agentId = newId;
                document.cookie = "yeti-agent=" + newId +
                    ";path=/;expires=Sat, 10 Mar 2029 08:00:00 GMT";
                document.getElementById("test").innerHTML = "All set!";
            });

            socket.on("navigate", function (test) {
                document.location.href = test;
            });
        }
    };
}());
