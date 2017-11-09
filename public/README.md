# Internal App

__Copyright (c) General Electric Company, 2017.  All rights reserved.__

The ```public``` folder serves a simple Rt 106 application to allow developers a
simple way to exercise Rt 106.  This application is not meant to be a full example
of Rt 106, nor is it meant to be a seed application that a user would extend.  Please see
the other Seed Applications available.  Rather, the app served under ```public``` is
exists so developers of Rt 106 can easily test key components of the system.

To configure rt106-FrontEnd to serve the simple demo application distributed with Rt 106, add
```
Rt106_SERVE_APP=public
```
to the ```.env``` file located with your ```docker-compose.yml``` file and modify your ```docker-compose.dev.yml``` file to include
```
version: '2'
services:
  web:
    environment:
      Rt106_SERVE_APP: ${Rt106_SERVE_APP}
```
To run Rt 106 with this configuration
```
$ docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```
