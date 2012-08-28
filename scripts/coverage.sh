#!/bin/sh

istanbul=./node_modules/.bin/istanbul

if [ ! -x $istanbul ]; then
    if hash istanbul 2>&-; then
        istanbul=`type -P istanbul`
    fi
fi

if [ -x $istanbul ]; then
    echo "Running coverage with Istanbul at $istanbul"
    $istanbul cover \
        --report html --dir build_docs/coverage \
        ./node_modules/.bin/vows -- test/*.js
    echo "Coverage report written to build_docs/coverage/index.html"
    hash open 2>&- && open build_docs/coverage/index.html
    exit 0
fi

if [ ! -d tools/jscoverage ]; then
    mkdir -p tools/jscoverage
fi

if [ ! -x tools/jscoverage/jscoverage ]; then
    echo "Installing JSCoverage for Node.js to tools/jscoverage."
    rm -rf tools/jscoverage/*
    git clone --quiet https://github.com/visionmedia/node-jscoverage.git tools/jscoverage
    cd tools/jscoverage
    ./configure
    make
    cd ../..
fi

rm -rf lib-raw
cp -R lib lib-raw
rm -rf lib
tools/jscoverage/jscoverage lib-raw lib
./node_modules/.bin/vows --cover-html test/*.js
rm -rf lib
mv lib-raw lib
mkdir -p build_docs
mv coverage.html build_docs/jscoverage.html

echo "Coverage report written to build_docs/jscoverage.html."

# Open the report on OS X.
hash open 2>&- && open build_docs/jscoverage.html
