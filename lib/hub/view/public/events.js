;var SimpleEvents = (function () {

    "use strict";

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
            self.socket.once("close", function () {
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

    proto.emit = function (event, args) {
        var packet = {
            event: event,
            args: args
        };

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
        var self = this;

        console.log("invokeRPC for " + event);

        if (event in self.listeners) {
            self.listeners[event].forEach(function (cb) {
                console.log("listener", cb);
                cb.call(self, args);
            });
        } else {
            console.log("ignoring...");
        }
    };

    return SimpleEvents;

}());

if ("object" === typeof exports && exports) {
    exports.SimpleEvents = SimpleEvents;
}
