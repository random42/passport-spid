set -e

COMPOSE="./test/docker-compose.yml"
function t {
  docker-compose -f $COMPOSE down -v
  BINDING=$1 ALG=$2 RAC_COMPARISON=$3 LOG_LEVEL=WARNING docker-compose -f $COMPOSE up --exit-code-from test --no-log-prefix --build test
}

t HTTP-POST sha256 minimum
t HTTP-Redirect sha512 minimum

docker-compose -f $COMPOSE down -v
