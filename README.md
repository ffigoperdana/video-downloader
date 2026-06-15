---
title: SaveIt Video Downloader
emoji: 📥
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: false
---

# SaveIt — Open Source Video Downloader

**SaveIt** is a free, open-source web application for downloading videos from YouTube, TikTok, and Instagram — with more platforms on the way. Built with Next.js App Router, it uses `yt-dlp` under the hood to deliver fast, high-quality downloads with no watermarks and no registration required.

> 🚧 **Platform status:** YouTube ✅ · TikTok ✅ · Instagram ✅ · Facebook 🔜 · Threads 🔜 · X/Twitter 🔜

---

## Features

- **YouTube** — Download up to 1080p HD, audio-only (MP3), Shorts. CDN-proxied for ≤720p (near-instant speed). 1080p uses server-side ffmpeg merge.
- **TikTok** — Download without watermark, with watermark, or audio-only. Supports all regions and `vm.tiktok.com` short links.
- **Instagram** — Download Reels, feed posts, IGTV, and carousel slides individually. Proxied thumbnails bypass CDN CORS restrictions.
- **SEO-optimized** — Full Open Graph, Twitter Card, canonical URLs, and structured metadata on every page.
- **Dark UI** — Clean, modern interface built with Tailwind CSS and shadcn/ui.
- **Mobile-first** — Fully responsive, works great on iOS and Android browsers.
- **Privacy-first** — No video storage, no URL logging, no tracking.

---

## Tech Stack

| Layer           | Technology                                 |
| --------------- | ------------------------------------------ |
| Framework       | Next.js 14+ (App Router)                   |
| Styling         | Tailwind CSS + shadcn/ui                   |
| Fonts           | Syne + DM Sans (Google Fonts)              |
| Video engine    | [yt-dlp](https://github.com/yt-dlp/yt-dlp) |
| Merging         | ffmpeg (for 1080p YouTube)                 |
| Runtime         | Node.js 20                                 |
| Package manager | pnpm                                       |

---

## Requirements

### Manual installation

| Requirement | Version    | Notes                                  |
| ----------- | ---------- | -------------------------------------- |
| Node.js     | ≥ 20       |                                        |
| pnpm        | 9.x        | `npm i -g pnpm`                        |
| **yt-dlp**  | latest     | **Required** — see install below       |
| **ffmpeg**  | any recent | **Required** — for 1080p YouTube merge |

### Docker

- Docker ≥ 24
- Docker Compose ≥ 2 (optional but recommended)

> yt-dlp and ffmpeg are automatically installed inside the Docker image — no manual setup needed.

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/abdulrdev-ar/video-downloader.git
cd saveit
```

### 2. Install yt-dlp

**Linux / macOS**

```bash
# via pip (recommended — always latest)
pip install yt-dlp

# or via curl (binary)
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
  -o /usr/local/bin/yt-dlp
sudo chmod +x /usr/local/bin/yt-dlp
```

**Windows**

```powershell
# via winget
winget install yt-dlp

# or via pip
pip install yt-dlp
```

### 3. Install ffmpeg

**Linux (Ubuntu/Debian)**

```bash
sudo apt install ffmpeg
```

**macOS**

```bash
brew install ffmpeg
```

**Windows**

```powershell
winget install ffmpeg
```

### 4. Verify installations

```bash
yt-dlp --version
ffmpeg -version
```

---

## Running Manually

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env.local
# (edit .env.local if needed)

# Development
pnpm dev
# → http://localhost:3000

# Production build
pnpm build
pnpm start
# → http://localhost:3000
```

### Environment variables

| Variable            | Default  | Description                  |
| ------------------- | -------- | ---------------------------- |
| `YTDLP_BINARY_PATH` | `yt-dlp` | Custom path to yt-dlp binary |
| `PORT`              | `3000`   | Server port                  |

If `yt-dlp` is in your system `PATH`, no configuration is needed.

---

## Running with Docker

### Option A — Docker Compose (recommended)

```bash
# Build and start
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

App will be available at **http://localhost:8080**

### Option B — Docker CLI

```bash
# Build the image
docker build -t saveit .

# Run the container
docker run -d \
  --name saveit \
  -p 8080:8080 \
  --restart unless-stopped \
  saveit
```

---

## Project Structure

```
src/
├── actions/
│   ├── youtube-downloader.action.ts # Server actions for YouTube
│   ├── tiktok-downloader.action.ts  # Server actions for TikTok
│   └── instagram-downloader.action.ts # Server actions for Instagram
├── app/
│   ├── page.tsx                    # Landing page (/)
│   ├── layout.tsx                  # Root layout + global SEO metadata
│   ├── globals.css                 # Global styles + custom utilities
│   ├── youtube/
│   │   ├── page.tsx                 # /youtube — SEO metadata
│   │   └── youtube-downloader.tsx   # YouTube downloader UI
│   ├── tiktok/
│   │   ├── page.tsx                 # /tiktok — SEO metadata
│   │   └── tiktok-downloader.tsx    # TikTok downloader UI
│   ├── instagram/
│   │   ├── page.tsx                 # /instagram — SEO metadata
│   │   └── instagram-downloader.tsx # Instagram downloader UI
│   └── internal/
│       ├── download/               # Streaming route handlers
│       │   ├── youtube/            # YouTube download handler
│       │   ├── tiktok/             # TikTok download handler
│       │   └── instagram/          # Instagram download handler
│       └── preview/                # Thumbnail proxy for Instagram
│           └── instagram/          # Instagram thumbnail proxy
├── core/
│   ├── services/
│   │   ├── youtube.service.ts      # YouTube service layer
│   │   ├── tiktok.service.ts       # TikTok service layer
│   │   └── instagram.service.ts    # Instagram service layer
└── components/
    ├── navbar.tsx                  # Shared navigation bar
    └── downloader-shell.tsx        # Shared page layout wrapper
```

---

## Download Architecture

```
User clicks Download
  → Server Action (controller)
  → Service.getDirectUrls() — yt-dlp -g (~1-2s)
  → Route Handler /internal/download/{platform}

  ┌─ YouTube ≤720p  → CDN proxy  → full CDN speed ⚡
  ├─ YouTube 1080p  → yt-dlp pipe + ffmpeg merge  (slower)
  ├─ TikTok         → yt-dlp pipe (CDN URLs are session-bound)
  └─ Instagram      → yt-dlp pipe
```

---

## Roadmap

- [x] YouTube (up to 1080p, audio, shorts)
- [x] TikTok (no watermark, audio)
- [x] Instagram (reels, posts, carousels, IGTV)
- [ ] Facebook (public videos and reels)
- [ ] Threads (video posts)
- [ ] X / Twitter (videos and GIFs)
- [ ] Batch download
- [ ] Download history (local storage)
- [ ] Progress bar for large downloads
- [ ] PWA support

---

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

```bash
# Fork, clone, then:
git checkout -b feature/platform-facebook
pnpm dev
```

---

## Legal Notice

SaveIt is intended for **personal use only**. Always respect:

- Platform Terms of Service
- Copyright laws in your jurisdiction
- Content creators' rights

Do not use this tool to download and redistribute copyrighted content.

---

## License

MIT © SaveIt contributors
