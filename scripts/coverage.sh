#!/bin/sh

istanbul=./node_modules/.bin/istanbul

if [ -x $istanbul ]; then
    echo "Running unit test coverage with Istanbul at $istanbul"
    $istanbul cover \
        --report html --dir build_docs/coverage/unit \
        ./node_modules/.bin/vows -- test/unit/*.js
    echo "Coverage report written to build_docs/coverage/unit/index.html"
    hash open 2>&- && open build_docs/coverage/unit/index.html

    echo "Running functional test coverage with Istanbul at $istanbul"
    $istanbul cover \
        --report html --dir build_docs/coverage/functional \
        ./node_modules/.bin/vows -- test/functional/*.js
    echo "Coverage report written to build_docs/coverage/functional/index.html"
    hash open 2>&- && open build_docs/coverage/functional/index.html
else
    echo "Istanbul not found. Please run npm install first."
fi
