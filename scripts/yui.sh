#!/bin/sh

die () {
    echo >&2 "$@\nusage: $0 [path-to-yui3] [query]"
    exit 1
}

# Node.js and PHP are required.
hash node 2>&- || die "Could not find Node.js."
hash php 2>&- || die "Could not find PHP."

CWD=`pwd`
YETI=$CWD/cli.js

[ -e $YETI ] || die "Yeti not found, expected to find $YETI\n\
Run this script from Yeti's source directory root."

# Accept two optional arguments: path-to-yui3, search-query.
if [ "x$1" != "x" ] && [ -d $1 ]; then
    # First argument is a directory.
    YUI=$1
    QUERY=$2
else
    # Assume YUI is one level up.
    YUI="../yui3"
    QUERY=$1
fi

[ -d $YUI ] || die "Could not find YUI source at: $YUI\n\
Provide the directory as the first argument."

[ -e "$YUI/src/common/tests/unit.xml" ] || die "YUI unit.xml not found.\n\
Make sure this directory contains YUI source: $YUI"

# End of input validation.

cd $YUI

YUI_TESTS=$(php <<'EOPHP'
<?php
$txt = file_get_contents("src/common/tests/unit.xml");

$xml = new SimpleXMLElement($txt);

foreach ($xml->tests->url as $item) {
    print "src/" . (string) $item . "\n";
}
?>
EOPHP)

if [ "x$QUERY" != "x" ]; then
    # Only tests matching $QUERY.
    TESTS=($(echo "$YUI_TESTS" | grep $QUERY))
else
    # Run everything.
    TESTS=($YUI_TESTS)
fi

[ ${#TESTS} -gt 0 ] || die "No tests found for query: $QUERY"

echo "Starting Yeti for YUI tests:\n${TESTS[@]}"

node $YETI --query "filter=coverage" "${TESTS[@]}"
