# =========================
# Stage 1: Builder
# =========================
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat

RUN corepack enable && corepack prepare pnpm@11.3.0 --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Strip workspaces field to prevent pnpm treating this as monorepo
RUN node -e " \
  const fs = require('fs'); \
  const p = JSON.parse(fs.readFileSync('package.json', 'utf8')); \
  delete p.workspaces; \
  fs.writeFileSync('package.json', JSON.stringify(p, null, 2)); \
"

# Remove workspace config if present (pnpm 11 has no --ignore-workspace flag)
RUN rm -f pnpm-workspace.yaml

RUN pnpm install --frozen-lockfile || pnpm install --no-frozen-lockfile

# Copy seluruh project
COPY . .

# Strip workspaces again after COPY (package.json overwritten)
RUN node -e " \
  const fs = require('fs'); \
  const p = JSON.parse(fs.readFileSync('package.json', 'utf8')); \
  delete p.workspaces; \
  fs.writeFileSync('package.json', JSON.stringify(p, null, 2)); \
"
RUN rm -f pnpm-workspace.yaml

ENV NEXT_TELEMETRY_DISABLED=1

RUN ./node_modules/.bin/next build

# =========================
# Stage 2: Runner
# =========================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=7860
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Install ffmpeg + curl
RUN apk add --no-cache \
    ffmpeg \
    curl \
    ca-certificates \
    python3

# Install yt-dlp as standalone binary (more reliable than pip on Alpine)
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp \
    && chmod +x /usr/local/bin/yt-dlp \
    && yt-dlp --version

# Set explicit binary path so YTDlpWrap finds it regardless of PATH
ENV YTDLP_BINARY_PATH=/usr/local/bin/yt-dlp

# Copy hasil build
COPY --from=builder /app/package.json .
COPY --from=builder /app/pnpm-lock.yaml .
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 7860
CMD ["node", "./server.js"]