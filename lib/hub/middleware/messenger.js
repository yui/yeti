"use strict";

/**
 * Dependencies.
 */
var STATUS_CODES = require("http").STATUS_CODES;

/**
 * Provides `res.message`, which displays a pretty
 * message as the HTTP response.
 *
 * A Connect middleware.
 */
module.exports = function messengerProvider(renderConfig) {

    return function messengerFilter(req, res, next) {

        /**
         * End the request with a pretty message.
         *
         * @param {Number} code HTTP status code
         * @param {String} message Message.
         * @param {String} subtitle A title. Optional.
         *                          Defaults to HTTP code explination.
         */
        res.message = function yetiMessage(code, message, subtitle) {


            var hasBody = req.method.toUpperCase() !== "HEAD",
                accept = req.headers.accept || "",
                contentType;

            if (accept.indexOf("html") !== -1) {
                // TODO HTML error page
                // contentType = "text/html";
                contentType = "text/plain";
            } else if (accept.indexOf("text/plain") !== -1) {
                contentType = "text/plain";
            } else {
                if (accept.indexOf("css") !== -1) {
                    contentType = "text/css";
                } else {
                    contentType = "application/javascript";
                }
            }

            res.writeHead(code, {
                "Content-Type" : contentType
            });

            if (!hasBody) {
                return res.end();
            }

            subtitle = subtitle || STATUS_CODES[code];
            subtitle += "\n";

            switch (contentType) {
            /*
            case "text/html":
                var options = renderConfig;
                options.subtitle = subtitle;
                options.body = "<p>" + message + "</p>";
                render(options, function (err, html) {
                    if (err) {
                        res.end(subtitle + message);
                    } else {
                        res.end(html);
                    }
                });
                break;
            */
            case "text/css":
            case "application/javascript":
                message = "/" + "* " + subtitle + message + " *" + "/";
                res.end(message);
                break;
            default:
            // case "text/plain":
                res.end(subtitle + message);
                break;
            }

        };

        next();

    };

};
