# Node.js 22 Alpine for Vite dev server
FROM node:22-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S reactapp -u 1001

# Copy package files and install dependencies
COPY package*.json ./
RUN if [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi && npm cache clean --force

# Copy all source code
COPY . .

# Change ownership to non-root user
RUN chown -R reactapp:nodejs /app
USER reactapp

# Expose Vite dev server port
EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5173/ || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start Vite dev server with host binding
CMD ["npm", "run", "dev"]