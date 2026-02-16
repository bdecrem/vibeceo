"use client";

import { useState, useEffect } from "react";

export default function MutablLogo() {
  const [tick, setTick] = useState(0);
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 50);
    return () => clearInterval(id);
  }, []);

  const letters = ["M", "U", "T", "A", "B", "L"];
  const speeds = [0.7, 0.9, 0.6, 0.8, 1.0, 0.75];
  const phases = [0, 1.2, 2.4, 0.8, 3.1, 1.7];
  const dotColors = ["#6C5CE7", "#00CEC9", "#FD79A8", "#FDCB6E"];
  const ci = Math.floor((tick / 80) % dotColors.length);

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
      <div style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
        {letters.map((letter, i) => {
          const t = tick * 0.05 * speeds[i] + phases[i];
          const y = Math.sin(t) * 3;
          const r = Math.sin(t * 0.7 + i) * 1.2;
          return (
            <span key={i} style={{
              display: "inline-block",
              fontSize: "96px", fontWeight: 700, lineHeight: 1,
              color: letterColor,
              transform: `translateY(${y}px) rotate(${r}deg)`,
              transition: "color 0.4s ease",
            }}>{letter}</span>
          );
        })}
        <div style={{
          width: 14, height: 14, borderRadius: "50%",
          background: dotColors[ci], marginLeft: 8, marginBottom: 8,
          alignSelf: "flex-end",
          transform: `scale(${1 + Math.sin(tick * 0.08) * 0.15})`,
          boxShadow: `0 0 ${12 + Math.sin(tick * 0.08) * 6}px ${dotColors[ci]}44`,
          transition: "background 0.5s ease"
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
        ].map((app, i) => {
          const pulse = Math.sin(tick * 0.04 + i * 2) * 0.5 + 0.5;
          return (
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
                  opacity: 0.5 + pulse * 0.5,
                  boxShadow: `0 0 ${4 + pulse * 4}px ${app.color}66`,
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
          );
        })}
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
