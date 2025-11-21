FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache \
    libc6-compat \
    fontconfig \
    ttf-dejavu \
    font-noto \
    font-noto-cjk \
    font-noto-emoji \
    cairo \
    pango \
    exiftool \
    perl \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build application
RUN npm run build

# Ensure public directory structure exists
RUN mkdir -p /app/public/uploads /app/public/generated

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Install runtime dependencies for Sharp, SVG text rendering, exiftool, and Puppeteer
RUN apk add --no-cache \
    fontconfig \
    ttf-dejavu \
    font-noto \
    font-noto-cjk \
    font-noto-emoji \
    cairo \
    pango \
    exiftool \
    perl \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder /app/node_modules/.bin ./node_modules/.bin
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy initialization script
COPY scripts/init.sh /app/init.sh
RUN chmod +x /app/init.sh

# Create upload directories with proper permissions
RUN mkdir -p /app/public/uploads /app/public/generated && \
    chown -R nextjs:nodejs /app/public/uploads /app/public/generated && \
    chmod -R 755 /app/public/uploads /app/public/generated

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run as root to allow init script to set permissions on volume mounts
# The init script will exec node as nextjs user
CMD ["/app/init.sh"]
