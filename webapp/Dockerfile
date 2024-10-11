# Dockerfile

# # # # # # # # # # # # # # # # # # # # # # # # # #
# 1: building the go app
FROM golang:1.23-alpine AS build

# install git and build tools
RUN apk add --no-cache git build-base

# templ install
RUN go install github.com/a-h/templ/cmd/templ@latest

# set the workdir within the container
WORKDIR /app

# copy go mod files and download dependencies
COPY go.mod go.sum ./
RUN go mod download && go mod tidy

# copy the code
COPY . .


# generate Go code from templ files and clean up
RUN templ generate
RUN go mod tidy

# build the Go app
RUN go build -o main ./cmd/server

# # # # # # # # # # # # # # # # # # # # # # # # # #
# 2: create smaller image that will run the webserver
FROM alpine:latest

# set the workdir within the container
WORKDIR /app

# copy the compiled Go binary from the build stage
COPY --from=build /app/main ./

# copy the static assets from public
COPY --from=build /app/public ./public

# copy the markdown assets
COPY --from=build /app/md ./md

# expose the port the webserver will run on
EXPOSE 4444

# run the Go binary
CMD ["./main"]

