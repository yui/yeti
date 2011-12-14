YUI().use("cookie", function (Y) {
    var agentId = Y.Cookie.get("yeti-agent");

    var socket = io.connect(io.util.uniqueUri({}) + "/capture");

    socket.json.emit("register", {
        agentId: agentId,
        ua: Y.UA
    });

    socket.on("ready", function (newId) {
        agentId = newId;
        Y.Cookie.set("yeti-agent", newId, {
            path: "/",
            expires: new Date("March 10, 2029")
        });
        document.getElementById("test").innerHTML = "All set!";
    });
});
