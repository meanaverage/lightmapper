#!/bin/bash

# LightMapper - Build Script
# Builds Docker image for local testing

set -e

# Configuration
IMAGE_NAME="lightmapper"
VERSION="3.0.55"
PLATFORMS="linux/amd64,linux/arm64,linux/arm/v7"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏗️  LightMapper Build Script${NC}"
echo -e "${BLUE}================================================${NC}"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Build options
BUILD_TYPE=${1:-local}

case $BUILD_TYPE in
    "local")
        echo -e "${YELLOW}🔨 Building local image for testing...${NC}"
        docker build -t $IMAGE_NAME:$VERSION .
        docker tag $IMAGE_NAME:$VERSION $IMAGE_NAME:latest
        echo -e "${GREEN}✅ Local build complete!${NC}"
        echo -e "${BLUE}💡 To test: docker run -p 3000:3000 $IMAGE_NAME:latest${NC}"
        ;;
    
    "multi")
        echo -e "${YELLOW}🔨 Building multi-architecture image...${NC}"
        if ! docker buildx version >/dev/null 2>&1; then
            echo -e "${RED}❌ Docker Buildx not available. Please enable experimental features.${NC}"
            exit 1
        fi
        
        # Create builder if it doesn't exist
        docker buildx create --name ha-builder --use 2>/dev/null || docker buildx use ha-builder
        
        # Build for multiple architectures
        docker buildx build \
            --platform $PLATFORMS \
            --tag $IMAGE_NAME:$VERSION \
            --tag $IMAGE_NAME:latest \
            --push \
            .
        
        echo -e "${GREEN}✅ Multi-architecture build complete!${NC}"
        ;;
    
    "clean")
        echo -e "${YELLOW}🧹 Cleaning up build artifacts...${NC}"
        docker rmi $IMAGE_NAME:$VERSION $IMAGE_NAME:latest 2>/dev/null || true
        docker buildx rm ha-builder 2>/dev/null || true
        docker system prune -f
        echo -e "${GREEN}✅ Cleanup complete!${NC}"
        ;;
    
    "dev")
        echo -e "${YELLOW}🚀 Starting development environment...${NC}"
        cd src
        if [ ! -d "node_modules" ]; then
            echo -e "${BLUE}📦 Installing dependencies...${NC}"
            npm install
        fi
        echo -e "${BLUE}🔧 Starting development server...${NC}"
        echo -e "${BLUE}💡 Access at: http://localhost:3000${NC}"
        npm run dev
        ;;
    
    *)
        echo -e "${RED}❌ Unknown build type: $BUILD_TYPE${NC}"
        echo ""
        echo -e "${BLUE}Usage:${NC}"
        echo -e "  ${GREEN}./build.sh local${NC}    - Build local Docker image"
        echo -e "  ${GREEN}./build.sh multi${NC}    - Build multi-architecture image"
        echo -e "  ${GREEN}./build.sh dev${NC}      - Start development server"
        echo -e "  ${GREEN}./build.sh clean${NC}    - Clean up build artifacts"
        exit 1
        ;;
esac

echo -e "${GREEN}🎉 Done!${NC}" 