A Brief History of Yeti
=======================

0.1.3 / 2010-12-08
------------------

  * Require `--server` to start the server.
  * Add usage statement.
  * Windows support: Fix fatal error under Cygwin. (#9)
  * Changed: Options must be "--port=8000" instead of "--port 8000".
  * Upgrade Express to 1.0.0.
  * Upgrade Connect to 0.5.0.
  * Upgrade Jade to 0.5.7.
  * Upgrade Optimist to 0.1.1.

0.1.2 / 2010-11-10
------------------

  * Better fault tolerance: 404s, syntax errors, etc.
  * Added some fun stats to the test runner.
  * Fix missing module "jade" errors. (#5)
  * Upgraded to Express 1.0.0rc4.

0.1.1 / 2010-09-29
------------------

  * YUI 2.x support.
  * Internet Explorer 9 now reports test results.
  * UI improvements. (Dav Glass)
  * CLI changes: exception handlers, bug report URL, graceful shutdown, etc.
  * Fixed an issue when spaces where in the path of the test. (#2)
  * Upgraded to Express 1.0.0rc3.

0.1.0 / 2010-08-25
------------------

  * Report full User-agent string.
  * Corrected dependency versions in package.json.
  * Minor enhancements for future releases.

0.1.0rc3 / 2010-08-16
---------------------

  * Open source under BSD!
  * Better caching of test resources.
  * Prevent some IE memory leaks.
  * --solo option to exit on arrival of 1 result per file, with summary.

0.1.0rc2 / 2010-08-11
---------------------

  * Security: Yeti now only serves from the cwd you're in or the --path directory.
  * Polished the test runner page.
  * Removed dependency on class.js.
  * Files served in the same test run are cached.

0.1.0rc / 2010-08-05
--------------------
Public release candidate.

  * Added YUI favicon.
  * Added additional cli tests.

0.1.0demo / 2010-08-03
---------------------
Public demo.

  * Works with any standalone HTML document.
  * Added Vows test scripts.
  * Broke up app.js into modules to make testing easier.
  * Cleaned up inject.js, app.js and cli.js.

0.0.6 / 2010-07-23
------------------

  * Server mode.
  * Display failed test details.
  * Added window.onerror handler.

0.0.5 / 2010-07-20
------------------

  * Added --port option to override the default port 8000.
  * Removed frozen dependencies from vendor directory.

0.0.4 / 2010-07-19
------------------

  * Safari opens tests much more reliably. (AppleScript is no longer used.)
  * Updated to Express 1.0.0beta.

0.0.3 / 2010-07-19
------------------

  * Added Firefox and Chrome browsers.

0.0.2 / 2010-07-19
------------------

  * First release to npm.
  * Test reporting looks better.
  * Multiple file support.

0.0.1 / 2010-07-17
------------------

  * Published to GitHub.
