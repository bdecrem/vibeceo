"use client";

export default function MutableLanding() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a1a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui",
        padding: 24,
      }}
    >
      <h1
        style={{
          fontSize: 56,
          fontWeight: 800,
          color: "#eee",
          letterSpacing: -1,
          marginBottom: 8,
        }}
      >
        mutabl
      </h1>
      <p style={{ color: "#888", fontSize: 18, marginBottom: 48 }}>
        apps that grow new features as you chat with them
      </p>

      <a
        href="/mutabl/todoit"
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "24px 32px",
          borderRadius: 12,
          border: "1px solid #2a2a4a",
          background: "#12122a",
          textDecoration: "none",
          width: 320,
          cursor: "pointer",
        }}
      >
        <span
          style={{ fontSize: 22, fontWeight: 700, color: "#eee", marginBottom: 6 }}
        >
          todoit
        </span>
        <span style={{ fontSize: 14, color: "#888" }}>
          your personal todo app — shaped by AI
        </span>
      </a>
    </div>
  );
}
