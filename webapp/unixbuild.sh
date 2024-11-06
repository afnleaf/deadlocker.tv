#!/bin/bash

# exit immediately if a command exits with a non-zero status
set -e

# recreat templ files
if ! templ generate; then
  echo "Failed to generate templ files"
  exit 1
fi

if ! go mod tidy; then
  echo "Failed to clean"
  exit 1
fi

# build the Go
if ! go build -o main ./cmd/server; then
  echo "Failed to build go app"
  exit 1
fi

# run the server
if ! ./main; then
  echo "Failed to build run"
  exit 1
fi

