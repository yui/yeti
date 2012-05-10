#!/bin/sh
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
"$DIR/profile/profile.sh" "$DIR/../cli.js" $@
