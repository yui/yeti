#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
CHROME="Google Chrome Canary"
CHROME_BIN="/Applications/$CHROME.app/Contents/MacOS/$CHROME"
CHROME_PORT=9222
CHROME_ERROR=$(cat <<EOF


$CHROME provides a frontend to the profiler.

You must install it and ** run it once ** before proceeding.

Visit https://tools.google.com/dlpage/chromesxs to download $CHROME.
EOF)
NODE_PID=
CHROME_PID=
URL="http://localhost:$CHROME_PORT/devtools/devtools.html?host=localhost:1337&page=0"

NODE_SCRIPT=$1
shift # Remove the first argument.
NODE_ARGS=$@

die () {
    echo "$@"
    printf "\nusage: %s script-file (must be fully qualified)" $0
    exit 1
} >&2

try () {
    hash npm 2>&- || die "Could not find npm. Upgrade Node.js?"
    npm i $1 || die "Unable to install $1"
}

alive () {
    kill -0 $1 2>&-
    return $?
}

try_kill () {
    alive $1 && kill $1
}

clean () {
    printf "%b" "\nStopping processes..."
    try_kill $NODE_PID
    try_kill $CHROME_PID
}

trap clean SIGHUP SIGINT SIGTERM

[ "x$NODE_SCRIPT" == "x" ] && die "Provide a Node.js script to run."

# XXX: Make sure $NODE_SCRIPT is fully qualified.
# In order to fix this, we need to resolve relative paths
# inside boot.js. Instead, we do these hacks.
LAST_PWD=`pwd`
cd /tmp # Test for $NODE_SCRIPT without relying on `pwd`, very hacky.
[ -e "$NODE_SCRIPT" ] || die $(cat <<EOF
Could not find $NODE_SCRIPT.
Make sure the script name is fully qualified.
EOF)
cd $LAST_PWD # Must be restored to install npm modules in the correct location!

hash node 2>&- || die "Could not find Node.js."

node -e 'require("webkit-devtools-agent")' 2>&- || try webkit-devtools-agent

[ -e "$CHROME_BIN" ] || die "Unable to find $CHROME_BIN $CHROME_ERROR"

`ps | grep "$CHROME_BIN" | grep -v grep &> /dev/null` && \
    die "Shutdown the running $CHROME first. $CHROME_ERROR"

echo "Starting $CHROME in the background..."
"$CHROME_BIN" --remote-debugging-port=$CHROME_PORT &> /dev/null &
CHROME_PID=$!

# Start the Node.js process.
#
# We need boot.js to include the webkit-devtools-agent.
# We can't such a script to Node.js inline using
# a heredoc, because then certain variables involving
# file paths are not set.
#
# We also want to maintain process.argv, so we pass
# the script name to require() using a pipe.
echo "$NODE_SCRIPT" | node --debug "$DIR/boot.js" $NODE_ARGS &
NODE_PID=$!
echo "Waiting for profiler to become ready..."
sleep 2 # Wait for profiler's SIGUSR2 handler to attach.

if ! alive $NODE_PID; then
    try_kill $CHROME_PID
    die "Node.js program at $NODE_SCRIPT failed to start."
fi

echo "Starting profiler..."
kill -s SIGUSR2 $NODE_PID
sleep 1

if ! alive $CHROME_PID; then
    try_kill $NODE_PID
    die "Chrome failed to start. $CHROME_ERROR"
fi

cat <<EOF
Ready!

Visit $URL
and select the Profiles tab.

EOF
hash open 2>&- && open $URL
wait %2 # Wait on Node.js process to finish.
