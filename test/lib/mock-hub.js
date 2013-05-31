"use strict";

var MockAllAgents = require("./mock-all-agents");

module.exports = function createHubMock(topic) {
    return {
        server: {
            address: function () {
                return {
                    address: topic.ipAddress,
                    port: topic.port
                };
            }
        },
        webdriver: topic.wdOptions,
        allAgents: new MockAllAgents()
    };
};
