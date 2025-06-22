# Use the official Node.js 22 image
FROM node:22-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json (if present)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./
COPY .env.encrypted ./

# Install TypeScript types for Node.js (dev dependency)
RUN npm i --save-dev @types/node
# Install TypeScript globally for compilation
RUN npm install -g typescript

# Compile TypeScript
RUN tsc

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of files
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port (if needed)
# EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]