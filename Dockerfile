# Multi-stage Dockerfile for Air Drop+ on Vercel

FROM node:20-alpine AS builder
WORKDIR /app

# Install deps (including dev) for build
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# List what was built for debugging
RUN ls -la dist/
RUN ls -la dist/public/ || echo "No dist/public directory"

# Production image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install only production deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built artifacts (both server and client)
COPY --from=builder /app/dist ./dist

# Debug: List what was copied
RUN ls -la dist/
RUN ls -la dist/public/ || echo "No dist/public directory in production image"

# Vercel will inject PORT; just expose a default
EXPOSE 3000

CMD ["node", "dist/index.js"]
