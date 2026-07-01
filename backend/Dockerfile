# Multi-stage production build for DeveloperOS Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies cleanly
RUN npm ci

# Copy source files
COPY src/ ./src/

# Build TypeScript to Javascript
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy built code and dependencies from builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# Install only production dependencies
RUN npm ci --only=production

EXPOSE 6500

CMD ["node", "dist/server.js"]
