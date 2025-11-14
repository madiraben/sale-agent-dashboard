#
# Multi-stage Dockerfile for Next.js on Cloud Run
#

# 1) Builder
FROM node:22-bookworm-slim AS builder

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Public envs that must be embedded at build time for client-side code
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}

WORKDIR /app

# Install dependencies first (better build cache)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev=false

# Copy the rest of the source
COPY . .

# Build Next.js (standalone output is configured in next.config.ts)
RUN npm run build

# 2) Runner
FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080

WORKDIR /app

# Copy the minimal standalone server output
COPY --from=builder /app/.next/standalone ./ 
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
RUN mkdir -p /app/.next/cache && chown -R node:node /app/.next

# Use non-root user for security
USER node

EXPOSE 8080

# Start the Next.js standalone server
CMD ["node", "server.js"]


