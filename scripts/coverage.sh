#!/bin/sh

istanbul=./node_modules/.bin/istanbul

if [ -x $istanbul ]; then
    echo "Running coverage with Istanbul at $istanbul"
    $istanbul cover \
        --report html --dir build_docs/coverage \
        ./node_modules/.bin/vows -- test/*.js
    echo "Coverage report written to build_docs/coverage/index.html"
    hash open 2>&- && open build_docs/coverage/index.html
else
    echo "Istanbul not found. Please run npm install first."
fi
