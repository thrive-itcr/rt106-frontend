#!/bin/sh

# Docker for Mac (docker-compose) tries to route local container traffic
# through the proxy.  Add the local hostname to no_proxy to circumvent any
# references this container makes to itself.
export no_proxy="$no_proxy,$HOSTNAME"
echo "no_proxy=$no_proxy"

#
# Environment variable MSG_SYSTEM controls whether amqp or sqs messaging is used.
# amqp is the default.
#

if test ${TEST:-false} = 'test-server'; then
  sleep 20s
  echo "Testing rt106-server"
  npm run test-server
elif test ${TEST:-false} = 'coverage-server'; then
  sleep 20s
  echo "Coverage on rt106-server"
  npm run coverage-server
elif test ${TEST:-false} = 'coverage-app'; then
  sleep 20s
  echo "Coverage on rt106-app"
  npm run coverage-app
else
  echo "Starting rt106-server"
  npm start
fi
