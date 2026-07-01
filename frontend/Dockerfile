# Multi-stage build for DeveloperOS Frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code and config files
COPY . .

# Build Vite SPA bundle
ARG VITE_API_URL=http://localhost:6500
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Production server stage using Nginx
FROM nginx:alpine AS runner

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy built bundle from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
