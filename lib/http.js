var http = require("http");
var EventEmitter = require("events").EventEmitter;

function responseEventForRequest (req) {
    var event = new EventEmitter();
    req.addListener("response", function (response) {
        response.setEncoding("utf8");
        var data = "";
        response.addListener("data", function (chunk) {
            data += chunk;
        });
        response.addListener("end", function () {
            event.emit("response", response, data);
        });
    });
    req.connection.addListener("error", function (err) {
        event.emit("error", err);
    });
    req.end();
    return event;
}

function httpRequest (host, port, path, secure, method, body) {
    method = method || "GET";
    var headers = {
        "host" : host
    };

    if (body) {
        headers["content-length"] = body.length;
        headers["content-type"] = "application/json";
    }

    var req = http.createClient(
        port || (secure ? 443 : 80),
        host,
        secure
    ).request(method, path, headers);

    req.write(body);

    return responseEventForRequest(req);
}

exports.request = httpRequest;
