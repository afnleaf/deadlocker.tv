# Stop onfirst error
$ErrorActionPreference = "Stop"

# Function to handle errors and exit
function Handle-Error {
    param(
        [string]$errorMessage
    )
    Write-Host $errorMessage -ForegroundColor Red
    exit 1
}

# Recreate templ files
Write-Host "Generating templ files..." -ForegroundColor Yellow
try {
    templ generate
}
catch {
    Handle-Error "Failed to generate templ files"
}

# Run go mod tidy
Write-Host "Running go mod tidy..." -ForegroundColor Yellow
try {
    go mod tidy
}
catch {
    Handle-Error "Failed to clean"
}

# Build the Go application
Write-Host "Building Go application..." -ForegroundColor Yellow
try {
    go build -o main.exe ./cmd/server
}
catch {
    Handle-Error "Failed to build go app"
}

# Run the server
Write-Host "Starting server..." -ForegroundColor Yellow
try {
    .\main.exe
}
catch {
    Handle-Error "Failed to run server"
}

Write-Host "Script completed successfully" -ForegroundColor Green 
