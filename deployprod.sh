#!/bin/bash

# exit immediately if a command exits with a non-zero status
set -e

if ! cd /home/x230/prod/weblock; then
  echo "Failed to find directory"
  exit 1
fi

# pull from repo
if ! git pull origin main; then
  echo "Failed to pull latest changes"
  exit 1
fi

# build and run containers
if ! docker compose up -d --build; then
  echo "Failed to build and start containers"
  exit 1
fi

echo "Deployed!"

# cleanup old images
docker image prune -f

# env variables?
#docker compose -f docker-compose.prod.yml up -d --build
