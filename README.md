# rt106-frontend

[![CircleCI](https://circleci.com/gh/rt106/rt106-frontend.svg?style=svg)](https://circleci.com/gh/rt106/rt106-frontend)

_Copyright (c) General Electric Company, 2017.  All rights reserved._

This front-end to Rt 106 contains both REST endpoints for Rt 106 and web application components
in AngularJS.

## Docker container

To build the docker container for the front-end:

    $ docker build -t rt106/rt106-frontend:latest .

If you use HTTP proxies in your environment, you may need to build using

    $ docker build -t rt106/rt106-frontend:latest  --build-arg http_proxy=$http_proxy --build-arg https_proxy=$https_proxy --build-arg no_proxy=$no_proxy .

Web pages and REST endpoints are served on port 80.
