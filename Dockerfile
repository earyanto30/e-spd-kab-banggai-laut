# ==========================================
# Stage 1: Build Frontend Static Assets
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm matching project version
RUN npm install -g pnpm@12.4.2

# Copy monorepo workspace configuration & package manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/

# Install dependencies (only for web and shared-types)
RUN pnpm install --frozen-lockfile

# Copy source code required for building frontend
COPY packages/shared-types/ ./packages/shared-types/
COPY apps/web/ ./apps/web/

# Build shared types package and web frontend
RUN pnpm --filter @si-setda/shared-types build
RUN pnpm --filter @si-setda/web build

# ==========================================
# Stage 2: Serve Static Files with Nginx
# ==========================================
FROM nginx:alpine AS runner

# Remove default nginx html files
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration for Vue SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
