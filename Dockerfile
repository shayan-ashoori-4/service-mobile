# ============================================
# 🏗️ Base Stage — system + SDK setup
# ============================================
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
    unzip \
    ca-certificates && \
    update-ca-certificates

# ---------- Fixed Android SDK setup ----------
ENV ANDROID_HOME=/opt/android-sdk
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV ANDROID_NDK_HOME=/opt/android-sdk/ndk/27.1.12297006
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk
ENV PATH=$PATH:$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator

# Create proper folder structure for cmdline-tools
RUN mkdir -p $ANDROID_HOME/cmdline-tools && \
    cd /tmp && \
    curl -o sdk.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip && \
    unzip -q sdk.zip && rm sdk.zip && \
    mv cmdline-tools $ANDROID_HOME/cmdline-tools/latest && \
    chmod +x $ANDROID_HOME/cmdline-tools/latest/bin/*

# Accept licenses and install required SDK components
RUN yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses || true && \
    $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager \
      "platform-tools" \
      "platforms;android-35" \
      "build-tools;35.0.0" \
      "ndk;27.1.12297006"

# Give Gradle write access
RUN chmod -R 777 $ANDROID_HOME

# Set working directory
WORKDIR /app


# ============================================
# 📦 lite-service dependencies
# ============================================
FROM base AS lite-service-deps

COPY lite-service/package.json lite-service/package-lock.json* lite-service/yarn.lock* ./lite-service/
WORKDIR /app/lite-service
RUN npm install || yarn install


# ============================================
# 🌐 web-builder dependencies
# ============================================
FROM base AS web-builder-deps

COPY web-builder/package.json ./web-builder/
WORKDIR /app/web-builder
RUN npm install


# ============================================
# 🚀 Final Stage — production container
# ============================================
FROM base AS final

# Copy lite-service
COPY lite-service ./lite-service
COPY --from=lite-service-deps /app/lite-service/node_modules ./lite-service/node_modules

# Copy web-builder
COPY web-builder ./web-builder
COPY --from=web-builder-deps /app/web-builder/node_modules ./web-builder/node_modules

# Copy optional build script
COPY build-apk.js ./

# Create uploads directory
RUN mkdir -p /tmp/uploads && chmod 777 /tmp/uploads

# Set working directory to web-builder
WORKDIR /app/web-builder

# Expose port
EXPOSE 3000

# Environment
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Default command
CMD ["node", "server.js"]
