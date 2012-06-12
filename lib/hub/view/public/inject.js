/*jshint browser:true, nonstandard:true */

// At this point, the only script that
// loaded on the page before us was socket.io.js.

(function () {
    "use strict";

    window.$yetify = function $yetify(firstRunConfiguration) {

        var win = window,
            socket = $yetify.socket,
            Runner = null;

        function getCookie(name) {
            var parts = document.cookie.split(";"),
                cookie,
                i = 0,
                l = parts.length;
            name += "=";
            for (; i < l; i += 1) {
                cookie = parts[i].replace(/^\s*(\S*(\s+\S+)*)\s*$/, "$1");
                if (cookie.indexOf(name) === 0) {
                    return cookie.substring(name.length, cookie.length);
                }
            }
            return null;
        }

        function init(config) {
            $yetify.socket = null;
            $yetify.polls = 0;

            var io = win.io,
                socket,
                unload,
                moving = false,
                resourcePaths = ["socket.io"];

            if (config.mountpoint !== "/") {
                resourcePaths.unshift(config.mountpoint.substr(1));
            }

            socket = $yetify.socket = io.connect(io.util.uniqueUri({}) + "/run", {
                resource: resourcePaths.join("/")
            });

            // Handle user errors.

            win.onerror = function (message, url, line) {
                socket.json.emit("scriptError", {
                    message: message,
                    url: url,
                    line: line
                });
                return true;
            };

            if ('function' === typeof win.onbeforeunload) {
                unload = win.onbeforeunload;
            }

            win.onbeforeunload = function () {
                if (!moving) {
                    var img = new Image();
                    img.src = '/ping/unload/' + getCookie("yeti-agent");
                }
                if (unload) {
                    unload();
                }
            };

            socket.on("navigate", function (test) {
                moving = true;
                document.location.href = test;
            });

            socket.json.emit("register", {
                agentId: getCookie("yeti-agent")
            });
        }

        // $yetify will be called again from setTimeout.
        // In Firefox < 13, the first argument may be a `lateness` argument.
        // https://developer.mozilla.org/en/window.setTimeout
        // Make sure this argument is an object before initializing.
        if ("object" === typeof firstRunConfiguration) {
            init(firstRunConfiguration);
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
            // TODO Make this value configurable.
            if ($yetify.polls > 750) {
                //console.log("Timing out...");
                throw new Error("Could not find YUI Test.");
            } else {
                $yetify.polls = $yetify.polls + 1;
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

    };
}());
