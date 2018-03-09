#!/bin/bash
# Copyright (c) General Electric Company, 2017.  All rights reserved.

echo ""
echo "Removing web container."
docker rm rt106_web_1

echo ""
echo "Removing web image."
docker rmi thriveitcr/rt106-frontend

echo ""
echo "Building web image."
docker build -t thriveitcr/rt106-frontend  --build-arg http_proxy=$http_proxy --build-arg https_proxy=$https_proxy  .

echo ""
docker images
