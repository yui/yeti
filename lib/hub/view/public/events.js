;var SimpleEvents = (function () {

    "use strict";

    if ("object" !== typeof exports && !window.console) {
        var fn = function () {};
        window.console = {
            log: fn,
            error: fn
        }
    }

    function SimpleEvents(socket) {
        var self = this;

        function onIncoming(message) {
            var data;

            switch (typeof message) {
            case "object":
                data = message.data;
                break;
            case "string":
                data = message;
                break;
            default:
                self.error("Unexpected message type " + message);
                return;
            }

            console.log("got data", data);
            try {
                data = JSON.parse(data);
            } catch (ex) {
                self.error("Failed to parse " + data);
                return;
            }

            if (data.event) {
                console.log("got ev", data.event, "queueUntil:", self.queueUntilEvent);
                if (data.event === self.queueUntilEvent) {
                    self.queueUntilEvent = null;
                    self.flushQueue();
                }
                self.invokeRPC(data.event, data.args);
            } else {
                self.error("Ignoring bad data " + data);
            }
        }

        function onClose(cxn) {
            if (self.socket.removeListener) {
                // Server-side connection.
                console.log("removing data listener");
                self.socket.removeListener("data", onIncoming);
            }
            self.invokeRPC("close");
        }

        function onConnection(cxn) {
            self.invokeRPC("open");
        }

        self.socket = socket;
        self.listeners = {};
        self.messageQueue = [];

        if ("function" === typeof self.socket.send) {
            // Client-side connection.
            console.log("client ev.");
            self.socket.onclose = onClose;
            self.socket.onopen = onConnection;
            self.socket.onmessage = onIncoming;
            self.write = function (message) {
                self.socket.send.call(self.socket, message);
            };
        } else if ("function" === typeof self.socket.on) {
            // Already connected, the socket is the unique connection EE.
            console.log("server ev.");
            // self.socket.on("connection", onConnection);
            self.write = self.socket.write.bind(self.socket);
            self.socket.on("end", function () {
                onClose();
            });
            self.socket.on("data", onIncoming);
        } else {
            self.error("SimpleEvents: Unable to attach events.");

        }
    }

    var proto = SimpleEvents.prototype;

    proto.error = function (message) {
        if (console && console.error) {
            console.error(message);
        }
    };

    proto.on = function (event, fn) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }

        this.listeners[event].push(fn);
    };

    proto.removeListener = function (event, fn) {
        var match = false,
            self = this;

        if (!self.listeners[event]) {
            return false;
        }

        self.listeners[event].forEach(function (listener, index) {
            if (listener === fn) {
                match = true;
                self.listeners[event].splice(index, 1);
            }
        });

        return match;
    };
    proto.emit = function (event, args) {
        var packet = {
            event: event,
            args: args
        };

        if (this.queueUntilEvent) {
            console.log("queueing for transport later");
            this.messageQueue.push([event, args]);
            return;
        }

        try {
            packet = JSON.stringify(packet);
        } catch (ex) {
            this.error("Unable to convert to JSON " + packet);
            return;
        }
        console.log("here we go!", packet);
        this.write(packet);
    };

    proto.invokeRPC = function (event, args) {
        var self = this,
            i = 0,
            cb,
            events,
            length;

        console.log("invokeRPC for " + event);
        console.log("self.listeners", self.listeners);

        if (event in self.listeners) {
            console.log("iterating!");
            events = self.listeners[event];
            length = events.length;
            for (; i < length; i += 1) {
                cb = events[i];
                if ("function" !== typeof cb) {
                    throw new Error("bad listener for ev " + event);
                }
                console.log("listener", cb);
                cb.call(self, args);
            }
        } else {
            console.log("ignoring...");
        }
    };

    proto.queueUntil = function (event) {
        console.log("queue events until we get " + event);
        this.queueUntilEvent = event;
    };

    proto.flushQueue = function () {
        console.log("flushing event queue");
        var i,
            message,
            self = this,
            length = self.messageQueue.length;
        if (length) {
            for (i = 0; i < length; i += 1) {
                message = self.messageQueue[i];
                console.log("sending queued message", message);
                self.emit(message[0], message[1]);
            }
        }
    };

    return SimpleEvents;

}());

if ("object" === typeof exports && exports) {
    exports.SimpleEvents = SimpleEvents;
}
