set -e

NAME="ghcr.io/italia/spid-sp-test"
docker run --user 0 -ti --rm \
  -v "$(pwd)/${1}:/spid:rw" \
  "${NAME}:latest" ${@:2}