#!/bin/sh
TEST_TYPE=${1:-unit}
SRC_DIR=${SRC_DIR:-.}
COVERAGE_DIR=${COVERAGE_DIR:-tmp}
TEST_RESULTS_DIR=${TEST_RESULTS_DIR:-tmp}
cd ${SRC_DIR}
./node_modules/.bin/istanbul cover \
    --dir ${COVERAGE_DIR} --print none \
    ./node_modules/.bin/vows -- --xunit \
    test/${TEST_TYPE}/*.js > ${TEST_RESULTS_DIR}/${TEST_TYPE}.xml
