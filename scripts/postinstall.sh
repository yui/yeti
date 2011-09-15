#!/bin/bash

[ "x$npm_config_loglevel" = "xsilent" ] && exit

cat <<MESSAGE

Thanks for installing Yeti v$npm_package_version.

Recently added to HISTORY.md:

`head -n 20 HISTORY.md`

MESSAGE
