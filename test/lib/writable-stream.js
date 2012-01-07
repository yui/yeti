"use strict";

/**
 * Returns a Vows topic function, which will return
 * a MockWritableStream, a fake Writable Stream.
 *
 * Implements writeHead, like a http.ServerResponse.
 * Only the (status, headers) signature is implemented.
 *
 * Verify with these instance variables:
 *
 * - $store: Written data, from write
 * - $status: HTTP status code, from writeHead
 * - $headers: HTTP header object, from writeHead
 *
 * @return {Function} Vows topic function
 */
module.exports = function () {
    return function () {
        function MockWritableStream() {
            this.$store = "";
        }

        var proto = MockWritableStream.prototype;

        proto.writeHead = function (status, /* msg, */ headers) {
            this.$status = status;
            this.$headers = headers;
        };

        proto.end = function (input) {
            if (input) {
                this.write(input);
            }
            this.$end = true;
        };

        proto.write = function (input) {
            if (this.$end) {
                throw new Error("Unable to write: closed.");
            }

            if (Buffer.isBuffer(input)) {
                this.$store += input.toString("utf8");
            } else {
                this.$store += input;
            }
        };

        return new MockWritableStream();
    };
};
