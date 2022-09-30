#!/usr/bin/env bash

set -e
URL=$1
if [ ! $URL ] 
then echo "Pass metadata url as argument"; exit 1;
fi
NAME="italia/spid-sp-test"
docker build -t "${NAME}" https://github.com/italia/spid-sp-test.git#main
docker run -ti --rm \
italia/spid-sp-test --metadata-url "${URL}"
