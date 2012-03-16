YUI().use("test", function (Y) {
    var LocalJSTestCase = new Y.Test.Case({
        name: "Yeti Local JS Test Case",
        testOk: function () {
            Y.Assert.areEqual(1, 1);
        }
    });

    var LocalJSSuite = new Y.Test.Suite("Yeti Local JS Test Suite");

    LocalJSSuite.add(LocalJSTestCase);

    Y.Test.Runner.add(LocalJSSuite);

    Y.Test.Runner.run();
});
