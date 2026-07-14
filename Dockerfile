# =========================
# Stage 1: Builder
# =========================
FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    pkgconfig \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev \
    pixman-dev

RUN corepack enable && corepack prepare pnpm@11.3.0 --activate

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile --reporter=append-only

# Copy full project
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build

# =========================
# Stage 2: Runner
# =========================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=7860
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Install runtime dependencies
RUN apk add --no-cache \
    ffmpeg \
    curl \
    ca-certificates \
    python3 \
    py3-pip \
    cairo \
    pango \
    jpeg \
    giflib \
    librsvg \
    pixman

RUN python3 -m pip install \
    --no-cache-dir \
    --break-system-packages \
    gallery-dl==1.32.4 \
    instaloader==4.15.1 \
    && gallery-dl --version \
    && instaloader --version

ENV YTDLP_BINARY_PATH=/usr/local/bin/yt-dlp
ENV GALLERY_DL_BINARY_PATH=/usr/bin/gallery-dl
ENV PYTHON_BINARY_PATH=/usr/bin/python3

# Copy build output
COPY --from=builder /app/package.json .
COPY --from=builder /app/pnpm-lock.yaml .
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Keep yt-dlp fresh when application code is deployed. This layer must stay
# after the copied build output; otherwise BuildKit can reuse an old "latest"
# binary even when a new source revision is being deployed.
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp \
    && chmod +x /usr/local/bin/yt-dlp \
    && yt-dlp --version

EXPOSE 7860
CMD ["node", "./server.js"]
