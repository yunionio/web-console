#!/bin/bash

pushd $(dirname $(dirname "$BASH_SOURCE")) > /dev/null
CUR_DIR=$(pwd)
SRC_DIR=$CUR_DIR
popd > /dev/null

docker run --rm \
    -v $SRC_DIR:/app \
    registry.cn-beijing.aliyuncs.com/swordqiu/node:20-alpine-git-python-2 \
    /bin/sh -c "set -ex;
git config --global --add safe.directory /app;
cd /app;
yarn cache clean
rm -fr node_modules
yarn install;
yarn run build;
chown -R $(id -u):$(id -g) dist node_modules;
"
