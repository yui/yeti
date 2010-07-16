#!/bin/sh

__prompt () {
    local ready
    while true; do
        echo "Would you like me to do this for you? [yn]: "
        read ready
        case $ready
        in
            n*) return 1 ;;
            N*) return 1 ;;
            y*) return 0 ;;
            Y*) return 0 ;;
            *)
        esac
    done
}

if [ -e /usr/local/bin/brew ]; then
    echo
    echo "*** YOU MUST ADD NPM'S INSTALL DIRECTORY TO YOUR PATH ***"
    echo
    echo "The easy way to do this is:"
    echo
    echo "    export PATH=\"\$PATH:\$(brew --prefix node)\""
    echo
    __prompt && export PATH="$PATH:$(brew --prefix node)"
    echo
    echo "All done. Try something like:"
    echo "    yeti test.html"
    echo "and get testing!"
fi
