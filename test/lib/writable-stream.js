"use strict";

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

module.exports = MockWritableStream;
