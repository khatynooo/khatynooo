# ==============================================================================
# Multi-Stage Dockerfile for Khatinoo
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app
RUN apk add --no-cache libc6-compat

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ------------------------------------------------------------------------------
# Production runtime
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache curl tzdata \
    && cp /usr/share/zoneinfo/Asia/Tehran /etc/localtime \
    && echo "Asia/Tehran" > /etc/timezone

ENV NODE_ENV=production \
    PORT=3000 \
    TZ=Asia/Tehran

COPY package*.json ./
RUN npm install --only=production --ignore-scripts && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/schema.sql ./schema.sql
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/server ./server
COPY --from=builder /app/security-bootstrap.cjs ./security-bootstrap.cjs

# The application writes uploaded files here. Make the directory writable by
# the unprivileged Node user and never run the production process as root.
RUN mkdir -p /app/uploads && chown -R node:node /app
USER node

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:3000/api/health || exit 1

# Security bootstrap is mandatory in production; it must not be bypassed.
CMD ["node", "-r", "./security-bootstrap.cjs", "dist/server.cjs"]
