set -e

docker run --user 0 -ti --rm \
-v "$(pwd)/${1}:/certs:rw" \
"italia/spid-compliant-certificates:latest" generator ${@:2} #\
# --key-size 3072 \
# --common-name "example" \
# --days 365 \
# --entity-id http://localhost:4000 \
# --locality-name Roma \
# --org-id "PA:IT-c_h501" \
# --org-name "example" \
# --sector public
