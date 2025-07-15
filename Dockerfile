ARG BUILD_FROM=ghcr.io/hassio-addons/base:15.0.1
# hadolint ignore=DL3006
FROM ${BUILD_FROM}

# Set shell
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Set working directory first
WORKDIR /app

# Copy package files for npm install
COPY src/package*.json ./

# Setup base and install dependencies in one step
# hadolint ignore=DL3003,DL3042
RUN \
    apk add --no-cache --virtual .build-dependencies \
        build-base \
        git \
        npm \
        python3-dev \
    \
    && apk add --no-cache \
        nodejs \
        sqlite \
    \
    && npm install --omit=dev \
    && npm cache clean --force \
    \
    && rm -fr \
        /tmp/* \
        /var/{cache,log}/* \
        /var/lib/apt/lists/* \
    \
    && apk del --no-cache --purge .build-dependencies

# Copy application source (server.js and public directory)
COPY src/ ./

# Download Fabric.js library during build
RUN mkdir -p public/js && \
    curl -o public/js/fabric.min.js \
    https://cdn.jsdelivr.net/npm/fabric@6.7.0/dist/index.min.js && \
    curl -o public/js/index.min.js.map \
    https://cdn.jsdelivr.net/npm/fabric@6.7.0/dist/index.min.js.map

# Copy root filesystem
COPY rootfs /

# Fix permissions on run script
RUN chmod +x /etc/services.d/lightmapper/run

# Build arguments
ARG BUILD_ARCH
ARG BUILD_DATE
ARG BUILD_DESCRIPTION
ARG BUILD_NAME
ARG BUILD_REF
ARG BUILD_REPOSITORY
ARG BUILD_VERSION

# Labels
LABEL \
    io.hass.name="${BUILD_NAME}" \
    io.hass.description="${BUILD_DESCRIPTION}" \
    io.hass.arch="${BUILD_ARCH}" \
    io.hass.type="addon" \
    io.hass.version=${BUILD_VERSION} \
    maintainer="SayHi <aaron@sayhi.io>" \
    org.opencontainers.image.title="${BUILD_NAME}" \
    org.opencontainers.image.description="${BUILD_DESCRIPTION}" \
    org.opencontainers.image.vendor="Home Assistant Community Add-ons" \
    org.opencontainers.image.authors="SayHi <aaron@sayhi.io" \
    org.opencontainers.image.licenses="MIT" \
    org.opencontainers.image.url="https://addons.community" \
    org.opencontainers.image.source="https://github.com/${BUILD_REPOSITORY}" \
    org.opencontainers.image.documentation="https://github.com/${BUILD_REPOSITORY}/blob/main/README.md" \
    org.opencontainers.image.created=${BUILD_DATE} \
    org.opencontainers.image.revision=${BUILD_REF} \
    org.opencontainers.image.version=${BUILD_VERSION} 