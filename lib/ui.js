var sys = require("sys");

exports.good = "✔";
exports.bad = "✖";

exports.color = require("./color").codes;

exports.log = function (msg) {
    if (msg instanceof Error) msg = msg.stack;
    if (typeof msg !== "string") msg = sys.inspect(msg, 0, 4);
    sys.error(msg);
};
