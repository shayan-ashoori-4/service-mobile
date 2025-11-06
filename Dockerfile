# Multi-stage Dockerfile for APK Builder Web Service
FROM node:22-alpine AS base

# Install system dependencies for building Android APKs
RUN apk add --no-cache \
    openjdk17-jdk \
    bash \
    git \
    python3 \
    make \
    g++ \
    curl \
    zip \
    unzip

# Set JAVA_HOME
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk
ENV PATH=$PATH:$JAVA_HOME/bin

# Set working directory
WORKDIR /app

# Stage 1: Install lite-service dependencies
FROM base AS lite-service-deps

# Copy lite-service package files
COPY lite-service/package.json lite-service/package-lock.json* lite-service/yarn.lock* ./lite-service/

# Install lite-service dependencies
WORKDIR /app/lite-service
RUN npm install || yarn install

# Stage 2: Install web-builder dependencies
FROM base AS web-builder-deps

# Copy web-builder package files
COPY web-builder/package.json ./web-builder/

# Install web-builder dependencies
WORKDIR /app/web-builder
RUN npm install

# Final stage: Combine everything
FROM base AS final

# Copy lite-service source files first
COPY lite-service ./lite-service

# Copy installed lite-service dependencies (overwrites node_modules if source had it)
COPY --from=lite-service-deps /app/lite-service/node_modules ./lite-service/node_modules

# Copy web-builder source files
COPY web-builder ./web-builder

# Copy installed web-builder dependencies
COPY --from=web-builder-deps /app/web-builder/node_modules ./web-builder/node_modules

# Copy build script
COPY build-apk.js ./

# Create directory for temporary uploads
RUN mkdir -p /tmp/uploads && \
    chmod 777 /tmp/uploads

# Set working directory to web-builder
WORKDIR /app/web-builder

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV ANDROID_HOME=/opt/android-sdk
ENV PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the web-builder server
CMD ["node", "server.js"]

