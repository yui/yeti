PWD=`pwd`
YETI=$PWD/../.

rm -rf build_tmp
mkdir build_tmp
cd build_tmp

ROOT=$PWD/root
BIN=$ROOT/usr/local/libexec/yeti
NODE=$BIN/node

mkdir -p $BIN
cp /usr/local/bin/node $NODE

_NPM_ROOT=$ROOT/usr/local/lib/node
_NPM_FAKE_ROOT=$PWD/npm

mkdir -p $_NPM_ROOT
mkdir -p $_NPM_FAKE_ROOT

$NODE ~/.node_libraries/.npm/npm/active/package/cli.js \
    --root $_NPM_FAKE_ROOT \
    --binroot $BIN \
    install $YETI

# flatten symlinks
# PackageManager chokes on npm's symlinks
rsync -Lavz --exclude "*.npm*" $_NPM_FAKE_ROOT/ $_NPM_ROOT

# fixup path:
ROOTBIN=$ROOT/usr/local/bin
mkdir -p $ROOTBIN
sed s#/Users/[a-z/]*/build_tmp/root## $BIN/yeti > $ROOTBIN/yeti

sudo chown -R root:admin $ROOT
sudo chmod -R g+w $ROOT

/Developer/usr/bin/packagemaker \
--title "Yeti" \
--version 0.1.0 \
--filter "\.DS_Store" \
--resources ../resources/ \
--root-volume-only \
--verbose \
--no-relocate \
-l "/" \
--target 10.5 \
--id com.yuilibrary.yeti \
--root $ROOT \
--out ../Yeti.pkg

cd ..
