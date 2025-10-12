#!/usr/bin/env bash
set -e #-x

C="./test/docker-compose.yml"

DEBUG=${DEBUG:-"WARNING"}

# Bring down any previous containers and build images
docker compose -f $C build

# Define test cases as an array
declare -a TESTS=(
  "HTTP-Redirect sha512 minimum 1"
  "HTTP-Redirect sha512 exact 2"
  "HTTP-POST sha256 minimum 2"
  "HTTP-Redirect sha512 maximum 3"
)

# Function to run a test in a subshell with a unique project name
function run_test {
  local TEST_ARGS=( $@ )
  local BINDING=${TEST_ARGS[0]}
  local ALG=${TEST_ARGS[1]}
  local RAC_COMPARISON=${TEST_ARGS[2]}
  local AUTHN_CONTEXT=${TEST_ARGS[3]}
  local PROJECT="spidtest$RANDOM"
  BINDING=$BINDING ALG=$ALG RAC_COMPARISON=$RAC_COMPARISON AUTHN_CONTEXT=$AUTHN_CONTEXT DEBUG=$DEBUG docker compose -f $C -p $PROJECT up -d > /dev/null 2>&1
  docker compose -f $C -p $PROJECT logs -f test 2>/dev/null &
  LOGS_PID=$!
  docker compose -f $C -p $PROJECT wait test 2>/dev/null
  TEST_EXIT_CODE=$?
  kill $LOGS_PID 2>/dev/null || true
  docker compose -f $C -p $PROJECT down -v > /dev/null 2>&1
  if [ $TEST_EXIT_CODE -ne 0 ]; then
    echo "FAILED test: BINDING=$BINDING ALG=$ALG RAC_COMPARISON=$RAC_COMPARISON AUTHN_CONTEXT=$AUTHN_CONTEXT"
  fi
  return $TEST_EXIT_CODE
}

# Run all tests in parallel
PIDS=()
for TEST in "${TESTS[@]}"; do
  run_test $TEST &
  PIDS+=( $! )
done

# Wait for all tests and collect exit codes
FAIL=0
for PID in "${PIDS[@]}"; do
  wait $PID || FAIL=1
done

exit $FAIL
