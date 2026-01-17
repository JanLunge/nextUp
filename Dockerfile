# Build stage for frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Build stage for backend
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

# Install production dependencies for backend
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy built backend
COPY --from=backend-builder /app/backend/dist ./dist

# Copy built frontend to be served statically
COPY --from=frontend-builder /app/frontend/dist ./public

# Create directories for persistent data
RUN mkdir -p /data /data/uploads

# Environment variables with defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/data/queue.db
ENV UPLOAD_PATH=/data/uploads

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the server
CMD ["node", "dist/index.js"]
