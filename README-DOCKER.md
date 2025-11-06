# Docker Setup for APK Builder

This Docker setup builds and runs the APK Builder web service with both `lite-service` and `web-builder` dependencies installed.

## Quick Start

### Using Docker Compose (Recommended)

```bash
docker-compose up -d
```

The service will be available at `http://localhost:3004`

### Using Docker directly

```bash
# Build the image
docker build -t apk-builder:latest .

# Run the container
docker run -d \
  -p 3004:3004 \
  --name apk-builder-web \
  apk-builder:latest
```

## Build Process

The Dockerfile uses a multi-stage build:

1. **Base stage**: Sets up Node.js and system dependencies (JDK, Android tools, etc.)
2. **lite-service-deps stage**: Installs `lite-service` dependencies
3. **web-builder-deps stage**: Installs `web-builder` dependencies
4. **Final stage**: Combines everything and runs the web-builder server

## Dependencies Installed

- **lite-service**: All React Native and Android build dependencies
- **web-builder**: Express server and web interface dependencies
- **System**: OpenJDK 17, Android tools, build tools (make, g++, etc.)

## Volumes

The docker-compose.yml includes optional volumes:

- `./web-builder/uploads:/tmp/uploads` - Persistent storage for file uploads

For development, you can uncomment the lite-service volume mount to sync changes without rebuilding.

## Environment Variables

- `NODE_ENV=production` - Node environment
- `PORT=3004` - Server port
- `UPLOAD_DIR=/tmp/uploads` - Directory for temporary file uploads

## Health Check

The container includes a health check that verifies the web server is responding on port 3004.

## Stopping the Service

```bash
docker-compose down
```

Or for direct Docker:

```bash
docker stop apk-builder-web
docker rm apk-builder-web
```

## Building APKs

Once the container is running:

1. Open `http://localhost:3004` in your browser
2. Enter your website URL, app name, and package name
3. Optionally upload a custom `google-services.json` file
4. Click "Build APK"
5. Wait for the build to complete (may take 10-15 minutes)
6. Download your APK

## Notes

- The first build may take longer as Docker downloads and caches dependencies
- Ensure you have enough disk space (Android builds can require several GB)
- The build process runs inside the container, so all Android SDK and build tools are included

