/*jshint browser:true, nonstandard:true */
/*global SimpleEvents, SockJS */

// At this point, the only script that
// loaded on the page before us was socket.io.js.

;(function () {
    "use strict";

    var lastStatus = "Loaded",
        heartbeats = 0;

    var OVERLAY_HTML = '<div id="yeti-overlay">' +
        '<div class="yeti-hd">' +
            '<span>Yeti</span>' +
        '</div>' +
        '<div class="yeti-bd">' +
            '<div class="yeti-vital">' +
                '<div class="yeti-stat">' +
                    '<span id="yeti-beat">0</span>' +
               '</div>' +
            '</div>' +
            '<div id="yeti-status">Loading...</div>' +
        '</div>' +
    '</div>';

    var OVERLAY_CSS = "#yeti-overlay, #yeti-overlay * {" +
        "margin: 0;" +
        "padding: 0;" +
    "}" +
    "#yeti-overlay .yeti-hd," +
    "#yeti-overlay .yeti-bd," +
    "#yeti-overlay .yeti-ft {" +
        "padding: 4px;" +
    "}" +
    "#yeti-overlay {" +
        "position: fixed !important;" +
        "position: absolute;" +
        "background: #fff;" +
        "border: 1px solid #ccc;" +
        "bottom: 1em;" +
        "right: 1em;" +
        "font: 12px 'Helvetica Neue', Arial, Helvetica, sans-serif;" +
        "z-index: 999999;" +
    "}" +
    "#yeti-overlay .yeti-hd {" +
        "background: #222;" +
        "color: #fff;" +
        "font-size: 21px;" +
        "font-weight: bold;" +
    "}" +
    "#yeti-overlay .yeti-hd span {" +
        "text-transform: lowercase;" +
        "letter-spacing: -1px;" +
    "}" +
    "#yeti-beat {" +
        "font-size: 50px;"
        "font-style: italic;"
    "}";

    function createStyleSheet (cssText) {
        var sheet, element;

        element = document.createElement("style");
        element.type = "text/css";
        document.getElementsByTagName("head")[0].appendChild(element);

        if (element.styleSheet) {
            element.styleSheet.cssText = cssText;
        } else {
            element.appendChild(document.createTextNode(cssText));
        }

        return sheet;
    }

    function placeHTML(html) {
        var element = document.createElement("div");
        element.innerHTML = html;
        document.body.appendChild(element);
    }

    function status(message) {
        var element = document.getElementById("yeti-status");
        lastStatus = message;
        if (element) {
            element.innerHTML = message;
        }
    }

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

    window.$yetify = function $yetify(firstRunConfiguration) {

        var win = window,
            resultAttempts = 0,
            tower = $yetify.tower,
            Runner = null;

        function sendResults() {
            if ($yetify.complete) {
                return;
            }
            resultAttempts += 1;
            status("Sending results, attempt " + resultAttempts + "...");
            tower.emit("results", $yetify.results);
            $yetify.sendResultTimeout = win.setTimeout(sendResults, 5000);
        }

        function init(config) {
            $yetify.sock = null;
            $yetify.polls = 0;
            $yetify.complete = false;

            var io = win.io,
                resource = config.mountpoint,
                sock,
                tower;

            if (resource === "/") {
                resource = "";
            }

            status("Connecting...");

            sock = new SockJS(getSockURL(resource, "tower"));
            tower = $yetify.tower = new SimpleEvents(sock);

            tower.queueUntil("listening");

            // Handle user errors.
            var onerrorFn = win.onerror;
            win.onerror = function (message, url, line) {
                return;
                tower.emit("scriptError", {
                    message: message,
                    url: url,
                    line: line
                });
                if (onerrorFn) {
                    onerrorFn();
                }
                return true;
            };

            tower.on("navigate", function (test) {
                $yetify.complete = true;
                clearTimeout($yetify.sendResultTimeout);
                document.location.href = test;
            });

            tower.on("listening", function () {
                tower.emit("register", {
                    agentId: getCookie("yeti-agent")
                });
                tower.queueUntil("ready");
            });

            tower.on("ready", function () {
                status("Connected");
            });

            tower.on("close", function () {
                if (!$yetify.complete) {
                    clearTimeout($yetify.sendResultTimeout);
                    window.setTimeout(init, 500);
                    status("Reconnecting...");
                }
            });

            if ($yetify.results) {
                sendResults();
            }
        }

        // Prevent careless errors.
        function reportCarelessErrors() {
            win.print = win.confirm = win.alert = win.open = function () {
                throw new Error("Careless method called.");
            };
        }

        function beat() {
            var element = document.getElementById("yeti-beat");
            reportCarelessErrors();
            tower.emit("beat");
            heartbeats += 1;
            if (element) {
                element.innerHTML = heartbeats;
            }
        }

        function complete(data) {
            $yetify.results = data.results;
            sendResults();
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

            var onloadFn = win.onload;
            win.onload = function () {
                createStyleSheet(OVERLAY_CSS);
                placeHTML(OVERLAY_HTML);
                status(lastStatus);

                if (onloadFn) {
                    onloadFn();
                }
            };
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

        beat();

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
