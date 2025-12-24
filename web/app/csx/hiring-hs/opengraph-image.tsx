import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "CTRL SHIFT LAB - AI Product Research Residency";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#000",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "monospace",
        }}
      >
        {/* CTRL SHIFT LAB */}
        <div
          style={{
            display: "flex",
            fontSize: 48,
            letterSpacing: "0.05em",
          }}
        >
          <span style={{ color: "#fff" }}>CTRL SHIFT</span>
          <span style={{ color: "#aaa", marginLeft: 10 }}>LAB</span>
        </div>

        {/* AI Product Research Residency */}
        <div
          style={{
            fontSize: 44,
            color: "#fff",
            marginTop: 24,
            letterSpacing: "-0.01em",
            display: "flex",
          }}
        >
          AI Product Research Residency
        </div>
      </div>
    ),
    { ...size }
  );
}
