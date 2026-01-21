# syntax=docker/dockerfile:1

# ================================
# Base image with Node.js 22
# ================================
FROM node:22-alpine AS base

RUN apk add --no-cache libc6-compat

WORKDIR /app

# ================================
# Dependencies stage
# ================================
FROM base AS deps

COPY package.json package-lock.json* ./

RUN npm ci

# ================================
# Builder stage
# ================================
FROM base AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build TypeScript
RUN npm run build

# ================================
# Production runner stage
# ================================
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 socketio

# Copy built files
COPY --from=builder --chown=socketio:nodejs /app/dist ./dist
COPY --from=builder --chown=socketio:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=socketio:nodejs /app/package.json ./package.json

USER socketio

EXPOSE 3001

ENV PORT=3001

CMD ["node", "dist/index.js"]
