#!/bin/bash

# Script for quickstart with detach
# Use: ./start-detached.sh

set -e

CONTAINER_NAME="vsb-container"
IMAGE_NAME="venice-staking-bot"

echo "🚀 Starting Transaction Sender..."

# Check container exist
if docker ps -a --format 'table {{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "📦 Container ${CONTAINER_NAME} already exists"

    # Check container running
    if docker ps --format 'table {{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        echo "✅ Container is already running"
        echo "🔗 Attaching to existing container..."
        docker attach ${CONTAINER_NAME}
    else
        echo "🔄 Starting existing container..."
        docker start ${CONTAINER_NAME}
        echo "🔗 Attaching to container..."
        docker attach ${CONTAINER_NAME}
    fi
else
    echo "🏗️  Creating new container..."

    # Check image exists
    if ! docker images --format 'table {{.Repository}}' | grep -q "^${IMAGE_NAME}$"; then
        echo "🔨 Building Docker image..."
        docker build -t ${IMAGE_NAME} .
    fi

    echo "🎯 Starting new container..."
    echo ""
    echo "📋 INSTRUCTIONS:"
    echo "1. Enter your password when prompted"
    echo "2. After successful initialization, press Ctrl+P then Ctrl+Q to detach"
    echo "3. The container will continue running in background"
    echo ""
    echo "🔧 Useful commands after detach:"
    echo "   docker logs -f ${CONTAINER_NAME}     # View logs"
    echo "   docker attach ${CONTAINER_NAME}      # Reattach"
    echo "   docker stop ${CONTAINER_NAME}        # Stop container"
    echo ""
    echo "Press Enter to continue..."
    read

    # Start container in interactive mode
    docker run -it --name ${CONTAINER_NAME} \
        -v "$(pwd)/.env.encrypted:/app/.env.encrypted:ro" \
        ${IMAGE_NAME}
fi

echo ""
echo "📊 Container status:"
docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "💡 To view logs: docker logs -f ${CONTAINER_NAME}"
echo "🔄 To restart: docker restart ${CONTAINER_NAME}"
echo "🛑 To stop: docker stop ${CONTAINER_NAME}"