# APK Builder Web Interface

A simple web interface to build Android APKs by providing URL, app name, and package name.

## Setup

### Local Development

1. Install dependencies:
```bash
cd web-builder
npm install
```

2. Start the server:
```bash
npm start
```

3. Open your browser and go to:
```
http://localhost:3004
```

## Docker Deployment

### Option 1: Using Docker Compose (Recommended)

1. Build and start the container:
```bash
cd web-builder
docker-compose up -d
```

2. The service will be available at:
```
http://localhost:3004
```

3. To stop:
```bash
docker-compose down
```

### Option 2: Using Dockerfile directly

1. Build the image:
```bash
cd web-builder
docker build -f Dockerfile.standalone -t apk-builder-web:latest ..
```

2. Run the container:
```bash
docker run -d \
  -p 3004:3004 \
  -v $(pwd)/../lite-service:/app/lite-service \
  -v $(pwd)/../build-apk.js:/app/build-apk.js \
  --name apk-builder-web \
  apk-builder-web:latest
```

## Features

- Simple web interface
- Real-time build output streaming
- Automatic APK download when build completes
- Upload custom `google-services.json` file
- Validates package name format
- Handles all the same configurations as the command-line script

## Environment Variables

- `PORT` - Server port (default: 3004)
- `NODE_ENV` - Environment (default: production)

## File Structure

```
web-builder/
├── server.js           # Express server
├── public/
│   └── index.html      # Web interface
├── package.json        # Dependencies
├── Dockerfile          # Docker image (with volumes)
├── Dockerfile.standalone # Standalone Docker image
├── docker-compose.yml  # Docker Compose configuration
└── .gitignore          # Git ignore rules
```

## Notes

- The Docker setup assumes the `lite-service` directory and `build-apk.js` are available in the parent directory
- For production, consider using volumes for the `lite-service` directory to avoid rebuilding the image when updating the template
- Make sure you have enough disk space for building APKs (Android builds can require several GB)
