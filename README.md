---
title: SaveIt Media Downloader
emoji: "📥"
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: false
---

# SaveIt Media Downloader

SaveIt is a self-hosted web application for downloading public videos, audio,
GIFs, and image posts from major social platforms. It uses Next.js server
actions and streaming route handlers so media can be downloaded without being
permanently stored by the application.

## Supported platforms

| Platform | Video | Audio | Images | Notes |
| --- | --- | --- | --- | --- |
| YouTube | Up to 1080p, Shorts | MP3 | - | Some videos require YouTube cookies |
| TikTok | No-watermark and original variants | MP3 | Photo posts and slideshows | Short links supported |
| Instagram | Reels, feed video, IGTV | When available | Photos and carousels | Public posts; cookies improve reliability |
| Facebook | Videos and Reels | MP3 | Image posts and multi-image posts | Direct permalinks and cookies are recommended |
| X / Twitter | Videos and GIFs | When available | Image posts | Public posts only |
| Threads | Video posts | MP3 | Image posts | Experimental; interrupted video downloads can be resumed |

The application also includes URL/platform validation, links to the correct
downloader when a URL is pasted on the wrong page, responsive image previews,
download history stored in the browser, and platform-specific error messages.

## Important limitations

- Platform extractors can break when a website changes its markup or API.
- Private, deleted, region-blocked, age-restricted, or login-only content may
  require valid cookies and may still be unavailable.
- YouTube may reject data-center IP addresses with `Sign in to confirm you are
  not a bot`. Configure `YTDLP_COOKIES_BASE64` when this happens.
- Facebook share links are resolved to their canonical post automatically, but
  logged-out Facebook HTML may expose only the first carousel preview. Configure
  `SOCIAL_COOKIES_BASE64` to expose all public images visible to that account.
- TikTok photo CDN URLs are temporary. Click **Fetch** again if a preview has
  expired or fails to load.
- If a Threads video download is interrupted, use the browser's **Resume**
  action. The video proxy forwards HTTP Range requests.

## How extraction works

SaveIt uses several extraction paths because no single tool supports every
media type:

- [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) extracts video and audio.
- [`gallery-dl`](https://github.com/mikf/gallery-dl) extracts supported image
  posts and carousels.
- Open Graph and embedded page metadata provide additional image fallbacks.
- `ffmpeg` merges YouTube streams and converts supported audio to MP3.
- Cheerio parses fallback HTML responses.

When local extractors cannot read a public URL, the application may send that
URL to these external extraction services:

- TikTok photo posts: TikWM
- Facebook public share links: SnapSave
- Threads public posts: LoveThreads

Authentication cookies remain inside the SaveIt container and are never
forwarded to those fallback services. Do not use SaveIt for sensitive or
private URLs unless you understand the privacy implications.

## Tech stack

| Component | Technology |
| --- | --- |
| Web framework | Next.js 16 App Router, React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Runtime | Node.js 22 Alpine |
| Package manager | pnpm 11.3.0 |
| Video extraction | yt-dlp |
| Image extraction | gallery-dl, page metadata, Cheerio |
| Media processing | ffmpeg |
| Deployment | Docker, Docker Compose, Coolify |

## Quick start with Docker Compose

Docker is the recommended installation method because the image already
contains `yt-dlp`, `gallery-dl`, `ffmpeg`, Python, and runtime dependencies.

```bash
git clone https://github.com/ffigoperdana/video-downloader.git
cd video-downloader
docker compose up -d --build
docker compose logs -f
```

The Compose service exposes container port `7860` only to its Docker network.
It intentionally does not bind a host port, which avoids port conflicts on
Coolify and other reverse-proxy platforms.

For plain Docker outside Coolify:

```bash
docker build -t saveit .
docker run -d \
  --name saveit \
  -p 8080:7860 \
  --restart unless-stopped \
  saveit
```

Open `http://localhost:8080`.

## Coolify deployment

1. Create a Docker Compose resource from this repository.
2. Keep `docker-compose.yml` as the Compose file.
3. Configure the public domain for service `saveit` on container port `7860`.
4. Do not add a host mapping such as `8080:7860`; Coolify routes traffic over
   its Docker network.
5. Add cookie variables as secrets when authentication is required.
6. Deploy. The included health check calls `http://localhost:7860/`.

The GitHub workflow in `.github/workflows/docker-ci.yml` validates Compose,
builds the Docker image, starts it, and waits for the container health check.

## Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `7860` in Docker | Next.js listening port |
| `YTDLP_BINARY_PATH` | `/usr/local/bin/yt-dlp` in Docker | Custom yt-dlp path |
| `GALLERY_DL_BINARY_PATH` | `/usr/bin/gallery-dl` in Docker | Custom gallery-dl path |
| `YTDLP_COOKIES_PATH` | empty | Netscape cookies file path for YouTube |
| `YTDLP_COOKIES_BASE64` | empty | Base64 Netscape cookies for YouTube |
| `GALLERY_DL_COOKIES_PATH` | empty | Netscape cookies file path for social platforms |
| `SOCIAL_COOKIES_BASE64` | empty | Base64 Netscape cookies for Instagram, Facebook, and TikTok |

### Creating cookie secrets on Windows

Export cookies as Netscape `cookies.txt` using a local browser extension. Use
a dedicated account and never commit the cookie file or Base64 value.

Convert YouTube cookies to Base64 in PowerShell:

```powershell
[Convert]::ToBase64String(
  [IO.File]::ReadAllBytes("$HOME\Downloads\youtube-cookies.txt")
)
```

Store the output as `YTDLP_COOKIES_BASE64` in Coolify.

To combine Instagram, Facebook, and TikTok cookies:

```powershell
$files = @(
  "$HOME\Downloads\instagram-cookies.txt",
  "$HOME\Downloads\facebook-cookies.txt",
  "$HOME\Downloads\tiktok-cookies.txt"
)

$output = "$HOME\Downloads\social-cookies.txt"
"# Netscape HTTP Cookie File" | Set-Content $output -Encoding ASCII

foreach ($file in $files) {
  Get-Content $file |
    Where-Object {
      $_.Trim() -ne "" -and
      $_ -notmatch "^# Netscape HTTP Cookie File"
    } |
    Add-Content $output -Encoding ASCII
}

[Convert]::ToBase64String([IO.File]::ReadAllBytes($output))
```

Store the output as `SOCIAL_COOKIES_BASE64`. Cookies expire and must be
exported again periodically.

## Local development

Requirements:

- Node.js 22 or newer
- pnpm 11
- yt-dlp
- gallery-dl
- ffmpeg

```bash
pnpm install
pnpm dev
```

The development server runs at `http://localhost:3000` unless `PORT` is set.

Quality checks:

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

## Media download architecture

```text
Browser
  -> platform Server Action validates and normalizes the URL
  -> yt-dlp, gallery-dl, page metadata, or a public fallback extracts media
  -> /internal/download/* streams video and audio
  -> /internal/media/image proxies image previews and attachments
  -> /internal/media/video proxies Threads video and supports HTTP Range
  -> ffmpeg merges streams or converts supported audio to MP3
```

Media URLs from social CDNs are often signed and short-lived. The internal
routes re-extract or proxy them so browser downloads receive the required
headers without exposing authentication cookies.

## Project layout

```text
.github/workflows/       Docker build and deployment checks
src/actions/             Server actions for each platform
src/app/                 Pages and internal streaming routes
src/components/          Shared downloader and media UI
src/core/hooks/          Download history and batch state
src/core/services/       Platform extraction and streaming services
src/core/utils/          URL validation and formatting helpers
Dockerfile               Multi-stage production image
docker-compose.yml       Coolify-friendly Compose service
```

## Troubleshooting

### YouTube says the visitor is a bot

Export fresh YouTube cookies and configure `YTDLP_COOKIES_BASE64`. Use a
dedicated account because cookies grant access to the active login session.

### Facebook returns only one image

Share links such as `/share/p/...` are resolved automatically. Confirm the post
is visible to the cookie account and configure `SOCIAL_COOKIES_BASE64`.
Logged-out Facebook HTML often contains only the carousel cover.

### TikTok photo preview fails

Click **Fetch** again. TikTok signs image URLs and they can expire quickly.

### Threads download is interrupted

Choose **Resume** in the browser download manager. Starting from the beginning
is usually unnecessary because the proxy supports byte-range requests.

### Docker reports that a host port is already allocated

Do not publish a fixed host port in Coolify. Keep Compose `expose: 7860` and
let Coolify's reverse proxy route the domain to that container port.

## Legal notice

SaveIt is intended for personal use with content you are authorized to access
and download. Respect platform terms, copyright law, privacy, and content
creators' rights. The maintainers do not endorse unauthorized redistribution.
