import { ImageResponse } from "next/og";

export const alt = "SaveIt Reddit Downloader";
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
          background: "#100b08",
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
              "radial-gradient(circle at 18% 20%, rgba(255, 69, 0, 0.45), transparent 34%), radial-gradient(circle at 86% 76%, rgba(239, 68, 68, 0.3), transparent 32%)",
            inset: 0,
            position: "absolute",
          }}
        />
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.14)",
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
                background: "linear-gradient(135deg, #ff7a00, #ff3d3d)",
                borderRadius: 18,
                display: "flex",
                fontSize: 22,
                fontWeight: 800,
                height: 68,
                justifyContent: "center",
                width: 68,
              }}
            >
              r/
            </div>
            <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>
              SaveIt
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <span
              style={{
                color: "#fdba74",
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: 4,
                textTransform: "uppercase",
              }}
            >
              Reddit downloader
            </span>
            <span
              style={{
                fontSize: 68,
                fontWeight: 800,
                letterSpacing: -3,
                lineHeight: 1.05,
              }}
            >
              Videos, images &amp; galleries.
            </span>
            <span style={{ color: "#d6d3d1", fontSize: 28 }}>
              Save public Reddit videos with audio, image posts, and photo
              galleries.
            </span>
          </div>

          <div style={{ display: "flex", gap: 14 }}>
            {["Public posts", "Share links", "Video + audio", "Galleries"].map(
              (feature) => (
                <span
                  key={feature}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 999,
                    color: "#fed7aa",
                    fontSize: 20,
                    padding: "10px 16px",
                  }}
                >
                  {feature}
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
