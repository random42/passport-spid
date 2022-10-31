set -e

ENV_FILE="test/config/.env"
source $ENV_FILE
rimraf var/test
mkdir -p var/test/keys
# load idp metadata
echo '<?xml version="1.0"?>' > var/test/idp.xml
bash scripts/sp-test.sh var/test/sp-test --idp-metadata >> var/test/idp.xml
# generate key and certificate
bash scripts/keygen.sh var/test/keys \
  --key-size 3072 \
  --common-name "example" \
  --days 365 \
  --entity-id http://localhost:4000 \
  --locality-name Roma \
  --org-id "PA:IT-c_h501" \
  --org-name "example" \
  --sector public
# start server
ts-node test/main.ts ${ENV_FILE} > var/test/server.log &
SERVER_PID=$!
echo "server pid: $SERVER_PID"
# wait for server to be online
sleep 3
# test spid implementation
bash scripts/sp-test.sh var/test/sp-test \
  -pr spid-sp-public \
  --metadata-url "http://host.docker.internal:4000/metadata" \
  --authn-url "http://host.docker.internal:4000/login" \
  --request-method GET \
  --extra \
  --report_format html \
  -d WARNING
kill $SERVER_PID
