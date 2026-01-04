# Multi-stage Dockerfile for Radio Calico
# Supports both development and production environments

# Base stage - common dependencies
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies needed for native modules (sqlite3)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite

# Copy package files
COPY package*.json ./

# Development stage
FROM base AS development

# Install all dependencies including devDependencies
RUN npm ci

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Set NODE_ENV
ENV NODE_ENV=development

# Use nodemon for hot reloading in development
RUN npm install -g nodemon

# Start command with nodemon
CMD ["nodemon", "server.js"]

# Production dependencies stage
FROM base AS prod-deps

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install sqlite runtime
RUN apk add --no-cache sqlite

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy production dependencies
COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs . .

# Create data directory for database with proper permissions
RUN mkdir -p /app/data && \
    chown nodejs:nodejs /app/data

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Set NODE_ENV
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/test-db', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "server.js"]
