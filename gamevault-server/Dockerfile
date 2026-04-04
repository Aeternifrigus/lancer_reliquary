FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production=false

COPY . .
RUN npm run build

# ─── Production image ────────────────────────────────────────────────────────

FROM node:20-alpine AS production

WORKDIR /app

# Only install production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy compiled output and swagger spec
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/swagger.yaml ./swagger.yaml

# Non-root user for security
RUN addgroup -S gamevault && adduser -S gamevault -G gamevault
USER gamevault

EXPOSE 3000

CMD ["node", "dist/index.js"]
