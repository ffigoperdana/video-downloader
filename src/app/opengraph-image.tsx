import { ImageResponse } from "next/og";

export const alt = "SaveIt — Download videos and images";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#08080a",
          color: "#ffffff",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          overflow: "hidden",
          padding: "64px",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            background:
              "radial-gradient(circle at 20% 30%, rgba(124, 58, 237, 0.52), transparent 34%), radial-gradient(circle at 85% 75%, rgba(79, 70, 229, 0.42), transparent 33%)",
            inset: 0,
            position: "absolute",
          }}
        />
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 32,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            justifyContent: "space-between",
            padding: "48px",
            position: "relative",
            width: "100%",
          }}
        >
          <div style={{ alignItems: "center", display: "flex", gap: 18 }}>
            <div
              style={{
                alignItems: "center",
                background: "linear-gradient(135deg, #6366f1, #7c3aed)",
                borderRadius: 18,
                display: "flex",
                fontSize: 16,
                fontWeight: 800,
                height: 64,
                justifyContent: "center",
                width: 64,
              }}
            >
              PLAY
            </div>
            <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>
              SaveIt
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <span
              style={{
                color: "#c4b5fd",
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: 4,
                textTransform: "uppercase",
              }}
            >
              Video &amp; image downloader
            </span>
            <span
              style={{
                fontSize: 68,
                fontWeight: 800,
                letterSpacing: -3,
                lineHeight: 1.05,
              }}
            >
              Download in seconds.
            </span>
            <span style={{ color: "#a1a1aa", fontSize: 28 }}>
              Public posts from YouTube, TikTok, Instagram, Facebook, X,
              Threads, and Reddit.
            </span>
          </div>

          <div style={{ display: "flex", gap: 14 }}>
            {["YouTube", "TikTok", "Instagram", "Facebook", "X", "Threads", "Reddit"].map(
              (platform) => (
                <span
                  key={platform}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 999,
                    color: "#d4d4d8",
                    fontSize: 20,
                    padding: "10px 16px",
                  }}
                >
                  {platform}
                </span>
              ),
            )}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
