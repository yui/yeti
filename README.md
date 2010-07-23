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

Yeti is a command-line tool for launching JavaScript unit tests in a browser and reporting the results without leaving your terminal. It's very similar to [jspec][] in this regard,  except yeti is designed to work with existing unmodified YUI-based tests.

Yeti is designed to help you run tests before you commit. It compliments existing CI tools like Selenium and Hudson which run tests post-commit. Yeti is not a replacement for those tools.

Server mode!
------------

You can also run Yeti as a server:

    $ yeti
    Visit http://benson.local:8000 to run tests.

Then subsequent Yeti commands will dispatch tests to all browsers pointed at the test page at that moment:

    $ yeti datasource/tests/datasource.html
    ✖  http://localhost:8000/project/FC391F72-0705-46D6-B683-B6899C7BA3A6/Users/rburke/working/yui/yui3/src/datasource/tests/datasource.html
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

You can pass the --port option to override port 8000 with your preferred server port. If you do this, be sure to also pass --port when running Yeti as a client.

Mobile testing made easy
------------------------

When combined with localtunnel, things get interesting. Startup your yeti server and then run:

    $ localtunnel 8000
       Port 8000 is now publicly accessible from http://3z48.localtunnel.com ...

You can then visit that URL on your mobile (or any other) device and have it run new tests.

You probably shouldn't use this. Yet.
-------------------------------------

Yeti is limited:

  - Requires Mac OS X.
  - Assumes you're testing the local copy of the [yui3][] project.

In the future, Yeti will probably meet your needs better. Right now, it's pretty handy for [YUI][yui3] developers. :)

Installation
------------

This is experimental software. Use at your own risk.

You should only do this on Mac OS X. Yeti won't work on other platforms (yet).

If you have [npm][] installed, this will be easy.

    $ npm install yeti

If you want to run off the latest code, clone this project and then run make.

    $ git clone git://github.com/reid/yeti.git && cd yeti && make

This will install [homebrew][], [node][] and [npm][] for you if you don't have them installed already.

Installing [localtunnel][] helps proxy Yeti outside of your firewall. It's available as a Ruby gem:

    $ gem install localtunnel

  [jspec]: http://github.com/visionmedia/jspec
  [yui3]: http://github.com/yui/yui3
  [localtunnel]: http://localtunnel.com/
  [homebrew]: http://github.com/mxcl/homebrew
  [node]: http://nodejs.org/
  [npm]: http://npmjs.org/

