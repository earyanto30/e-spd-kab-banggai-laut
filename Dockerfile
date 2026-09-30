# ==========================================
# Stage 1: Build Frontend & Backend
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm matching project version
RUN npm install -g pnpm@12.4.2

# Copy workspace configuration & package manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/

# Install all dependencies for build
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared-types/ ./packages/shared-types/
COPY apps/api/ ./apps/api/
COPY apps/web/ ./apps/web/

# Build all packages
RUN pnpm --filter @si-setda/shared-types build
RUN pnpm --filter @si-setda/api prisma:generate
RUN pnpm --filter @si-setda/api build
RUN pnpm --filter @si-setda/web build

# ==========================================
# Stage 2: Production Runner (Node + Nginx)
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

# Install Nginx and required runtime utilities
RUN apk add --no-cache nginx wget

# Set environment defaults for production
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL="file:/app/data/dev.db"
ENV UPLOAD_DIR="/app/uploads/kop-surat"

# Copy workspace configuration, dependencies, and built code from builder
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/turbo.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps ./apps

# Configure Nginx for SPA & API reverse proxy
RUN rm -rf /etc/nginx/http.d/* /etc/nginx/conf.d/* /usr/share/nginx/html/*
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy and setup entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Create initial persistent directories
RUN mkdir -p /app/data /app/uploads/kop-surat /var/log/nginx /var/run/nginx

EXPOSE 80

CMD ["/app/docker-entrypoint.sh"]
