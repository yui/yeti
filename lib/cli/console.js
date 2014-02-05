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
 * @param {Function} config.exitFn Handler when process exit is requested, 1-arity.
 * @param {ReadableStream} config.stdin  Readable stream for creating a readline interface.
 * @param {WritableStream} config.stdout Writable stream for creating a readline interface.
 * @param {WritableStream} config.stderr Writable stream for creating a readline interface.
 */
function Console(config) {
    /**
     * Fires when the process should exit.
     *
     * @property exitFn
     * @type {Function}
     * @param {Number} Return code.
     */
    this.exitFn = config.exitFn;

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
 * Fire the `exit` event with the given code.
 * @method exit
 * @param {Number} Return code.
 * @protected
 */
Console.prototype.exit = function (code) {
    this.exitFn(code);
};

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

/**
 * Call error with the given arguments, then call exit(1).
 * @method panic
 * @param {String|Object} Multiple arguments.
 * @protected
 */
Console.prototype.panic = function () {
    var args = Array.prototype.slice.apply(arguments);
    this.error.apply(this, args);
    this.exit(1);
};

module.exports = Console;
