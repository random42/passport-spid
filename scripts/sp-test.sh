#!/usr/bin/env bash

set -e
NAME="italia/spid-sp-test"
docker build -t "${NAME}" https://github.com/italia/spid-sp-test.git#main
docker run --user 0 -ti --rm \
  -v "$(pwd)/var/sp-test:/spid:rw" \
  ${NAME} $@