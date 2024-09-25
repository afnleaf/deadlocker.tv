# Stage 1: Build the Go aplication
FROM golang:1.19-alpine AS build

# Set the working directory inside the container
WORKDIR /app

# Copy the source code to the container
COPY src/ .

# Initialize Go module and tidy dependencies
RUN go mod init weblock || true && go mod tidy || true

# Build the Go application
RUN go build -o main .

# Stage 2: Create a smaller image with only the built app and static files
FROM alpine:latest

# Set the working directory for the final image
WORKDIR /app

# Copy the built Go binary from the build stage
COPY --from=build /app/main ./

# Copy the static assets (index.html, script.js, styles.css) from /public
COPY public ./public

# Expose the port the app will run on
EXPOSE 4444

# Run the Go binary
CMD ["./main"]

