import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Peel - AI Image Layer Separation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #faf8f5 0%, #f5f0e8 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {/* Rainbow icon - layered circles */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 80,
            right: 120,
          }}
        >
          {["#ff6b35", "#f7931e", "#ffcc02", "#4ecdc4", "#a855f7"].map(
            (color, i) => (
              <div
                key={i}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: color,
                  marginLeft: i === 0 ? 0 : -15,
                  boxShadow: `0 4px 20px ${color}66`,
                }}
              />
            )
          )}
        </div>

        {/* Decorative layers behind text */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            opacity: 0.15,
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                fontSize: 220,
                fontWeight: 800,
                color: "#ff6b35",
                position: "absolute",
                left: i * 8,
                top: i * 8,
              }}
            >
              PEEL
            </div>
          ))}
        </div>

        {/* Main title */}
        <div
          style={{
            fontSize: 200,
            fontWeight: 800,
            background: "linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #ffcc02 100%)",
            backgroundClip: "text",
            color: "transparent",
            letterSpacing: "-0.02em",
            display: "flex",
          }}
        >
          PEEL
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 36,
            color: "#666",
            marginTop: 20,
            display: "flex",
          }}
        >
          Unwrap the layers in your image
        </div>

        {/* Kochi.to branding */}
        <div
          style={{
            position: "absolute",
            bottom: 50,
            fontSize: 24,
            color: "#999",
            display: "flex",
          }}
        >
          kochi.to/peel
        </div>
      </div>
    ),
    { ...size }
  );
}
