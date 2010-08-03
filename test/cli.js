var vows = require("vows");
var assert = require("assert");

var cli = require("../cli");

vows.describe("CLI").addBatch({
    "Configuring the app" : {
        topic : function () {
            return cli.configure({
                port : 8089,
                argv : ["hallo", "--bar","baz", "reid", "--foo"]
            });
        },
        "should set an argv option without a value to true" : function (config) {
            assert.isTrue(config.foo);
        },
        "should set an argv option with a value to its value" : function (config) {
            assert.equal(config.bar, "baz");
        },
        "should inherit properties from the passed object" : function (config) {
            assert.equal(config.port, 8089);
        },
        "should treat everything that isn't an option as a file" : function (config) {
            assert.length(config.files, 2);
            assert.include(config.files, "hallo");
            assert.include(config.files, "reid");
        },
        "should omit argv" : function (config) {
            assert.isUndefined(config.argv);
        }
    } 
}).export(module);
