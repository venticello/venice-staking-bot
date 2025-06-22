# 🐳 Advanced Docker documentation
## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Encrypted private key file (`.env.encrypted`)

## Quick Start

### Option 1: Using the Start Script (Recommended)

The easiest way to get started:

```bash
# Make the script executable
chmod +x start-detached.sh

# Run the script
./start-detached.sh
```

The script will:
1. Build the Docker image if needed
2. Create and start the container
3. Provide clear instructions for password input and detaching

### Option 2: Manual Docker Commands

```bash
# Build the Docker image
docker build -t venice-staking-bot .

# Run the container interactively
docker run -it --name venice-staking-bot \
  -v $(pwd)/.env.encrypted:/app/.env.encrypted:ro \
  venice-staking-bot

# After entering password and seeing "✅ Wallet and contracts initialized"
# Press: Ctrl+P, then Ctrl+Q to detach
```

### Option 3: Docker Compose

```bash
# Start with docker-compose
docker-compose run --name venice-staking-bot-bg venice-staking-bot

# Or using up command
docker-compose up -d
docker exec -it venice-staking-bot-bg /bin/sh
```

## Usage Instructions

### 1. Interactive Mode with Background Execution

This is the most common use case:

```bash
# Start the container
docker run -it --name venice-staking-bot venice-staking-bot

# Follow the prompts:
# 1. Enter your password when prompted (hidden with *)
# 2. Wait for "✅ Wallet and contracts initialized "
# 3. Press Ctrl+P, then Ctrl+Q to detach

# Container continues running in background
```

### 2. One-time Setup and Management

```bash
# Check if container is running
docker ps

# View real-time logs
docker logs -f venice-staking-bot

# Check container status
docker stats venice-staking-bot

# Reattach to container (if needed)
docker attach venice-staking-bot
```

### 3. Using Screen Session (Alternative)

Build with screen support:

```bash
# Build alternative Dockerfile with screen
docker build -f Dockerfile.screen -t venice-staking-bot-screen .

# Run with screen session
docker run -it --name venice-staking-bot-screen venice-staking-bot-screen

# Inside container, detach from screen with: Ctrl+A, D
```

## Container Management

### Starting and Stopping

```bash
# Start existing container
docker start venice-staking-bot

# Stop container gracefully
docker stop venice-staking-bot

# Restart container
docker restart venice-staking-bot

# Force stop (if needed)
docker kill venice-staking-bot
```

### Monitoring and Debugging

```bash
# View logs (real-time)
docker logs -f venice-staking-bot

# View last 100 lines
docker logs --tail 100 venice-staking-bot

# Check container stats
docker stats venice-staking-bot

# Execute commands in running container
docker exec -it venice-staking-bot /bin/sh

# Inspect container configuration
docker inspect venice-staking-bot
```

### Cleanup

```bash
# Remove stopped container
docker rm venice-staking-bot

# Remove container and associated volumes
docker rm -v venice-staking-bot

# Remove Docker image
docker rmi venice-staking-bot

# Complete cleanup
docker system prune -a
```

## Environment Configuration

### Required Files

1. **`.env.encrypted`** - Encrypted private key file (JSON format):
   ```json
   {
     "encrypted": "...",
     "iv": "...",
     "salt": "...",
     "algorithm": "..."
   }
   ```

2. **Docker Environment Variables** (optional):
   ```bash
   # In docker-compose.yml or docker run
   NODE_ENV=production
   LOG_LEVEL=info
   ```

### Volume Mounts

The application requires mounting the encrypted private key:

```bash
# Required mount
-v $(pwd)/.env.encrypted:/app/.env.encrypted:ro

# Optional: Mount logs directory
-v $(pwd)/logs:/app/logs
```

## Docker Compose Configurations

### Basic Configuration

```yaml
version: '3.8'
services:
  venice-staking-bot:
    build: .
    container_name: venice-staking-bot
    stdin_open: true
    tty: true
    volumes:
      - ./.env.encrypted:/app/.env.encrypted:ro
    restart: unless-stopped
```

### Production Configuration

```yaml
version: '3.8'
services:
  venice-staking-bot:
    build: .
    container_name: venice-staking-bot
    stdin_open: true
    tty: true
    volumes:
      - ./.env.encrypted:/app/.env.encrypted:ro
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "process.exit(0)"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Troubleshooting

### Common Issues

**1. Password Input Not Working**
```bash
# Ensure container has TTY and stdin
docker run -it --name venice-staking-bot venice-staking-bot
# Not: docker run -d
```

**2. Container Exits After Password Input**
```bash
# Check logs for errors
docker logs venice-staking-bot

# Verify encrypted file format
cat .env.encrypted | jq .
```

**3. Cannot Detach from Container**
```bash
# Use correct key combination: Ctrl+P, then Ctrl+Q
# If stuck, open new terminal and run:
docker ps  # verify container is running
```

**4. Permission Denied Errors**
```bash
# Check file permissions
ls -la .env.encrypted

# Fix permissions if needed
chmod 644 .env.encrypted
```

### Debug Mode

Run with debug logging:

```bash
# Enable debug output
docker run -it --name venice-staking-bot \
  -e LOG_LEVEL=debug \
  venice-staking-bot
```

### Container Health Check

```bash
# Check if container is healthy
docker inspect --format='{{.State.Health.Status}}' venice-staking-bot

# View health check logs
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' venice-staking-bot
```

## Security Considerations

1. **File Permissions**: Ensure `.env.encrypted` has appropriate permissions (644 or 600)
2. **Container Security**: Application runs as non-root user (`nodejs`)
3. **Network Security**: No ports exposed by default
4. **Volume Security**: Encrypted file mounted as read-only

## Development

### Building Custom Images

```bash
# Build with custom tag
docker build -t my-venice-staking-bot:v1.0 .

# Build with no cache
docker build --no-cache -t venice-staking-bot .

# Build with build args
docker build --build-arg NODE_VERSION=22 -t venice-staking-bot .
```

### Testing

```bash
# Run tests in container
docker run --rm -v $(pwd):/app -w /app node:22 npm test

# Interactive development
docker run -it --rm -v $(pwd):/app -w /app node:22 /bin/bash
```

## Support

For issues and questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review container logs: `docker logs venice-staking-bot`
3. Verify your `.env.encrypted` file format
4. Ensure Docker and Docker Compose are up to date
