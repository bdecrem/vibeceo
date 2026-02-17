"use client";

import { useState, useEffect } from "react";

export default function MutablLogo() {
  const [dark, setDark] = useState(true);
  const [colorIndex, setColorIndex] = useState(0);

  const dotColors = ["#6C5CE7", "#00CEC9", "#FD79A8", "#FDCB6E"];

  useEffect(() => {
    const id = setInterval(() => setColorIndex(i => (i + 1) % dotColors.length), 4000);
    return () => clearInterval(id);
  }, []);

  const bg = dark ? "#0a0a1a" : "#fafaf9";
  const letterColor = dark ? "#e8e8e8" : "#1a1a1a";
  const taglineColor = dark ? "#666" : "#a8a29e";
  const appNameColor = dark ? "#e0e0e0" : "#1a1a1a";
  const descColor = dark ? "#777" : "#999";
  const cardBgAlpha = dark ? "12" : "06";
  const cardBorderAlpha = dark ? "30" : "18";
  const cardHoverBgAlpha = dark ? "1a" : "0d";
  const cardHoverBorderAlpha = dark ? "50" : "40";
  const explainerColor = dark ? "#666" : "#a8a29e";
  const footerColor = dark ? "#444" : "#d6d3d1";
  const toggleColor = dark ? "#555" : "#bbb";

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", background: bg, fontFamily: "SF Mono, Fira Code, Courier New, monospace",
      transition: "background 0.4s ease",
    }}>
      <style>{`
        @keyframes mutabl-l-land {
          0% { transform: rotate(-18deg); }
          32% { transform: rotate(4deg); }
          54% { transform: rotate(-1.8deg); }
          71% { transform: rotate(0.6deg); }
          85% { transform: rotate(-0.2deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes mutabl-dot-breathe {
          0%, 100% { transform: translateX(calc(100% + 8px)) scale(1); }
          50% { transform: translateX(calc(100% + 8px)) scale(1.18); }
        }
        @keyframes mutabl-card-dot {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .mutabl-letter { font-size: 96px; }
        .mutabl-dot { width: 14px; height: 14px; }
        @media (max-width: 520px) {
          .mutabl-letter { font-size: 64px; }
          .mutabl-dot { width: 10px; height: 10px; }
        }
      `}</style>
      <div style={{ position: "relative", display: "inline-flex", alignItems: "baseline", gap: "2px" }}>
        {["M", "U", "T", "A", "B"].map((letter, i) => (
          <span key={i} className="mutabl-letter" style={{
            fontWeight: 700, lineHeight: 1,
            color: letterColor, transition: "color 0.4s ease",
          }}>{letter}</span>
        ))}
        <span className="mutabl-letter" style={{
          display: "inline-block",
          fontWeight: 700, lineHeight: 1,
          color: letterColor, transition: "color 0.4s ease",
          animation: "mutabl-l-land 0.8s ease-out 0.3s both",
          transformOrigin: "bottom center",
        }}>L</span>
        <div className="mutabl-dot" style={{
          position: "absolute",
          right: 0, bottom: 8,
          transform: "translateX(calc(100% + 8px))",
          borderRadius: "50%",
          background: dotColors[colorIndex],
          animation: "mutabl-dot-breathe 3s ease-in-out infinite",
          boxShadow: `0 0 12px ${dotColors[colorIndex]}44`,
          transition: "background 0.8s ease, box-shadow 0.8s ease",
        }} />
      </div>
      <div style={{
        marginTop: 16, textTransform: "uppercase" as const, letterSpacing: "4px", fontSize: 13,
        color: taglineColor, transition: "color 0.4s ease",
      }}>
        apps you make yours
      </div>

      <div style={{ display: "flex", marginTop: 64, gap: 32, flexWrap: "wrap", justifyContent: "center" }}>
        {[
          { name: "TODOIT", desc: "tasks, shaped by you", href: "/mutabl/todoit", color: "#6C5CE7" },
          { name: "CONTXT", desc: "relationships, never forgotten", href: "/mutabl/contxt", color: "#00CEC9" },
          { name: "NOTABL", desc: "pages, published your way", href: "/mutabl/notabl", color: "#FD79A8" },
        ].map((app, i) => (
            <a key={app.name} href={app.href}
               style={{
                 display: "flex", flexDirection: "column", alignItems: "flex-start",
                 padding: "20px 28px", borderRadius: 10, textDecoration: "none",
                 border: `1px solid ${app.color}${cardBorderAlpha}`,
                 background: `${app.color}${cardBgAlpha}`,
                 transition: "border-color 0.3s, background 0.3s",
                 width: 200,
               }}
               onMouseEnter={e => {
                 e.currentTarget.style.borderColor = `${app.color}${cardHoverBorderAlpha}`;
                 e.currentTarget.style.background = `${app.color}${cardHoverBgAlpha}`;
               }}
               onMouseLeave={e => {
                 e.currentTarget.style.borderColor = `${app.color}${cardBorderAlpha}`;
                 e.currentTarget.style.background = `${app.color}${cardBgAlpha}`;
               }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: app.color,
                  animation: `mutabl-card-dot 4s ease-in-out ${i * 1.3}s infinite`,
                  boxShadow: `0 0 6px ${app.color}66`,
                }} />
                <span style={{
                  fontSize: 18, fontWeight: 700, color: appNameColor,
                  letterSpacing: "1.5px", transition: "color 0.4s ease",
                }}>{app.name}</span>
              </div>
              <span style={{ fontSize: 12, color: descColor, letterSpacing: "0.5px", transition: "color 0.4s ease" }}>
                {app.desc}
              </span>
            </a>
        ))}
      </div>

      <div style={{
        marginTop: 48, textAlign: "center" as const, fontSize: 14, lineHeight: 1.7, maxWidth: 340,
        color: explainerColor, transition: "color 0.4s ease",
      }}>
        ai-built apps that evolve with you.<br />
        tell them what to change, and they change.<br />
        you own the code.
      </div>

      <div style={{
        marginTop: 48, display: "flex", alignItems: "center", gap: 16,
      }}>
        <span style={{ letterSpacing: "2px", fontSize: 11, color: footerColor, transition: "color 0.4s ease" }}>
          mutabl.io
        </span>
        <button
          onClick={() => setDark(d => !d)}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: 4,
            fontSize: 14, color: toggleColor, transition: "color 0.4s ease",
            lineHeight: 1,
          }}
        >
          {dark ? "\u263C" : "\u25CF"}
        </button>
      </div>
    </div>
  );
}
