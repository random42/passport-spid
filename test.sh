#!/usr/bin/env bash
set -e

C="./test/docker-compose.yml"

DEBUG=${DEBUG:-"WARNING"}

function down {
  docker compose -f $C down -v
}

function t {
  BINDING=$1 ALG=$2 RAC_COMPARISON=$3 AUTHN_CONTEXT=$4 DEBUG=$DEBUG docker compose -f $C up -d
  docker compose -f $C logs -f test &
  LOGS_PID=$!
  docker compose -f $C wait test
  TEST_EXIT_CODE=$?
  kill $LOGS_PID 2>/dev/null || true
  down
  return $TEST_EXIT_CODE
}

down
docker compose -f $C build

# t HTTP-POST sha256 exact 1
t HTTP-Redirect sha512 minimum 1
# t HTTP-POST sha256 maximum 1
# t HTTP-Redirect sha512 better 1 # not working atm
# t HTTP-Redirect sha512 exact 2
t HTTP-POST sha256 minimum 2
# t HTTP-Redirect sha512 maximum 2
# t HTTP-POST sha256 better 2 # not working atm
# t HTTP-Redirect sha512 exact 3
# t HTTP-POST sha256 minimum 3
t HTTP-Redirect sha512 maximum 3
