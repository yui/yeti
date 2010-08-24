yeti
====

Yeti is the YUI Easy Testing Interface.

How easy?
--------

Here you go:

    [reid@benson ~/working/yui/yui3/src]
    $ yeti dom/tests/dom.html attribute/tests/attribute.html json/tests/json.html 
    ✔  yuisuite
    From: Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_4; en-us) AppleWebKit/533.16 (KHTML, like Gecko) Version/5.0 Safari/533.16
      20 passed
      0 failed

    ✔  Y.JSON (JavaScript implementation)
    From: Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_4; en-us) AppleWebKit/533.16 (KHTML, like Gecko) Version/5.0 Safari/533.16
      68 passed
      0 failed

    ✔  Attribute Unit Tests
    From: Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_4; en-us) AppleWebKit/533.16 (KHTML, like Gecko) Version/5.0 Safari/533.16
      106 passed
      0 failed

    194 tests passed! (3217ms)

What just happened?
-------------------

Yeti is a command-line tool for launching JavaScript unit tests in a browser and reporting the results without leaving your terminal. Yeti is designed to work with existing unmodified YUI-based tests.

Yeti is designed to help you run tests before you commit. It compliments existing CI tools like Selenium and Hudson which run tests post-commit. Yeti is not a replacement for those tools.

Server mode!
------------

You can also run Yeti as a server:

    $ yeti
    Visit http://localhost:8000 to run tests.

Then subsequent Yeti commands will dispatch tests to all browsers pointed at the test page at that moment:

    $ yeti datasource/tests/datasource.html
    Waiting for results. When you're done, hit Ctrl-C to exit.
    ✖  http://localhost:8000/project/1278285667/Users/rburke/working/yui/yui3/src/datasource/tests/datasource.html
    From: Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10.6; en-US; rv:1.9.2.3) Gecko/20100401 Firefox/3.0.6  0 passed
      1 failed
      in window.onerror handler (yeti virtual test)
         window.onerror should not fire uncaught exception: Assert Error: IO failure case.

    ✖  DataSource Test Suite
    From: Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_0 like Mac OS X; en-us) AppleWebKit/532.9 (KHTML, like Gecko) Version/4.0.5 Mobile/8A293 Safari/6531.22.7
      14 passed
      1 failed
      in DataSource.IO Tests
         testIOPost Method handleSuccess() wasn't called the expected number of times.
    Expected: 1 (number)
    Actual: 0 (number)

    ^C

As you can see, this is very handy to quickly run tests on mobile devices. You can pass multiple tests to Yeti, as always.

Server mode is great for working offline: you can test your commits across A-grade browsers in different local VMs without requiring a network connection to a centralized test system.

You can pass the `--port` option to override port 8000 with your preferred server port. If you do this, be sure to also pass `--port` when running Yeti as a client.

Yeti doesn't exit automatically when used with server mode. If you're using only 1 browser with server mode (i.e. just running tests on 1 browser on another computer or VM), you may use the `--solo 1` option to have Yeti exit with a summary after all tests run once. This is also handy for scripting Yeti: if a failure occurs, Yeti will exit with a non-zero status code.

Please note that Yeti keeps running until you exit with Ctrl-C, even after all tests results have arrived. (This will be fixed in a future release.)

Mobile testing made easy
------------------------

When combined with [localtunnel][], things get interesting. Startup your yeti server and then run:

    $ localtunnel 8000
       Port 8000 is now publicly accessible from http://3z48.localtunnel.com ...

You can then visit that URL on your mobile (or any other) device and have it run new tests.

Caveats
-------

Yeti is currently only tested on Mac OS X. However, you can run tests on any platform: just run Yeti in server mode and point the browser on another OS to your Yeti server. Yeti should work on other platforms as well, especially in server mode. Feel free to submit patches: see the Contribute section below.

You must start Yeti in server mode in the directory you'll be serving tests from. For security reasons, Yeti will reject requests that try to access files outside of the directory you start Yeti in.

Installation
------------

This is experimental software. Use at your own risk. For now, we've only tested the installation process on Mac OS X.

### Recommended Install

If you have [npm][] installed, this will be easy.

    $ npm install yeti@stable

If you want to run off the latest code, clone this project and then run make.

    $ git clone git://github.com/reid/yeti.git && cd yeti && make

This will install [homebrew][], [node][] and [npm][] for you if you don't have them installed already.

Installing [localtunnel][] helps proxy Yeti outside of your firewall. It's available as a Ruby gem:

    $ gem install localtunnel

### Native Mac Install

A fancy native installer is available if you're using a modern Mac. You will need:

* Mac OS X 10.6 or later
* An Intel Core 2 processor or better

Check out [GitHub Downloads on reid/yeti][dl] for the installer.

The native installer is limited to modern configurations because it ships with all dependencies pre-built. If you have a different configuration, please install with the recommended install method.

Bugs & Feedback
---------------

Open a ticket on [YUILibrary.com's Yeti Issue Tracker][issues] to report bugs or feature requests.

Yeti is an experimental project of [YUI Labs][]. As such, it doesn't receive the same level of support as other mature YUI projects.

Testing
-------

Yeti uses [Vows][] for testing its built-in server. After installing Vows, you may run the `vows` command to run all suites. See the [Vows website][Vows] for information on installing and running Vows.

The server test suite requires [YUI 3][yui3] to be installed into tests/vendor to test its integration with YUI Test. You may easily do this by running:

    $ git submodule init
    $ git submodule update

License
-------

Yeti is offered under the terms of the BSD license. See the LICENSE file or the [YUI license][license] for license text and copyright information.

Contribute
----------

Your contributions are welcome! Please review the [YUI contributor guide][CLA] before contributing. If you haven't contributed to a [YUI project][YUI] before, you'll need to review and sign the [YUI CLA][CLA] before we can accept your pull request.

  [jspec]: http://github.com/visionmedia/jspec
  [yui3]: http://github.com/yui/yui3
  [localtunnel]: http://localtunnel.com/
  [homebrew]: http://github.com/mxcl/homebrew
  [node]: http://nodejs.org/
  [npm]: http://npmjs.org/
  [dl]: http://github.com/reid/yeti/downloads
  [issues]: http://yuilibrary.com/projects/yeti/newticket
  [YUI Labs]: http://yuilibrary.com/labs/
  [Vows]: http://vowsjs.org/
  [license]: http://developer.yahoo.com/yui/license.html
  [CLA]: http://developer.yahoo.com/yui/community/#cla
  [YUI]: http://yuilibrary.com/
