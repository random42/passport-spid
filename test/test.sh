set -e

COMPOSE="./test/docker-compose.yml"

function t {
  docker-compose -f $COMPOSE down -v
  BINDING=$1 ALG=$2 RAC_COMPARISON=$3 AUTHN_CONTEXT=$4 LOG_LEVEL=DEBUG docker-compose -f $COMPOSE up --exit-code-from test --no-log-prefix test
  # BINDING=$1 ALG=$2 RAC_COMPARISON=$3 AUTHN_CONTEXT=$4 LOG_LEVEL=WARNING docker-compose -f $COMPOSE up
}

docker-compose -f $COMPOSE build -q

t HTTP-POST sha256 exact 1
t HTTP-Redirect sha256 minimum 1
t HTTP-POST sha256 maximum 1
t HTTP-Redirect sha256 better 1
t HTTP-Redirect sha256 exact 2
t HTTP-POST sha256 minimum 2
t HTTP-Redirect sha256 maximum 2
t HTTP-POST sha256 better 2
t HTTP-Redirect sha256 exact 3
t HTTP-POST sha256 minimum 3
t HTTP-Redirect sha256 maximum 3
t HTTP-POST sha256 better 3

docker-compose -f $COMPOSE down -v
