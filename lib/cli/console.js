"use strict";

var util = require("util");
var readline = require("readline");
var YetiEventEmitter2 = require("../event-emitter");

/**
 * The Yeti virtual console.
 *
 * @class Console
 * @constructor
 * @extends YetiEventEmitter2
 * @param {Object} config Configuration.
 * @param {ReadableStream} config.stdin  Readable stream for creating a readline interface.
 * @param {WritableStream} config.stdout Writable stream for creating a readline interface.
 * @param {WritableStream} config.stderr Writable stream for creating a readline interface.
 */
function Console(config) {
    /**
     * For readline.
     *
     * @property stdin
     * @type {ReadableStream}
     */
    this.stdin = config.stdin;

    /**
     * For readline.
     *
     * @property stdout
     * @type {WritableStream}
     */
    this.stdout = config.stdout;

    /**
     * For readline.
     *
     * @property stderr
     * @type {WritableStream}
     */
    this.stderr = config.stderr;

    this.rl = readline.createInterface(this.stdin, this.stderr);
}

util.inherits(Console, YetiEventEmitter2);

/**
 * Fire the `error` event with the given arguments.
 * @method exit
 * @param {String|Object} Multiple arguments.
 * @protected
 */
Console.prototype.error = function () {
    var args = Array.prototype.slice.apply(arguments),
        formattedString = util.format.apply(util, args);
    this.stderr.write(formattedString + "\n", "utf8");
};


/**
 * Fire the `puts` event with the given arguments.
 * @method puts
 * @param {String|Object} Multiple arguments.
 * @protected
 */
Console.prototype.puts = function () {
    var args = Array.prototype.slice.apply(arguments),
        formattedString = util.format.apply(util, args);
    this.stdout.write(formattedString + "\n", "utf8");
};

module.exports = Console;
