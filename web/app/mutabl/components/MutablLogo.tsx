"use client";

import { useState, useEffect } from "react";

export default function MutablLogo() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 50);
    return () => clearInterval(id);
  }, []);

  const letters = ["M", "U", "T", "A", "B", "L"];
  const speeds = [0.7, 0.9, 0.6, 0.8, 1.0, 0.75];
  const phases = [0, 1.2, 2.4, 0.8, 3.1, 1.7];
  const dotColors = ["#6C5CE7", "#00CEC9", "#FD79A8", "#FDCB6E"];
  const ci = Math.floor((tick / 80) % dotColors.length);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50"
         style={{ fontFamily: "SF Mono, Fira Code, Courier New, monospace" }}>
      <div className="flex items-baseline" style={{ gap: "2px" }}>
        {letters.map((letter, i) => {
          const t = tick * 0.05 * speeds[i] + phases[i];
          const y = Math.sin(t) * 3;
          const r = Math.sin(t * 0.7 + i) * 1.2;
          return (
            <span key={i} className="inline-block text-gray-900" style={{
              fontSize: "96px", fontWeight: 700, lineHeight: 1,
              transform: `translateY(${y}px) rotate(${r}deg)`
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
      <div className="mt-4 text-gray-400 uppercase"
           style={{ letterSpacing: "4px", fontSize: 13 }}>
        apps you make yours
      </div>

      <div className="flex mt-16" style={{ gap: 32 }}>
        {[
          { name: "TODOIT", desc: "tasks, shaped by you", href: "/mutabl/todoit", color: "#6C5CE7" },
          { name: "CONTXT", desc: "relationships, never forgotten", href: "/mutabl/contxt", color: "#00CEC9" },
        ].map((app, i) => {
          const pulse = Math.sin(tick * 0.04 + i * 2) * 0.5 + 0.5;
          return (
            <a key={app.name} href={app.href}
               className="group relative"
               style={{
                 display: "flex", flexDirection: "column", alignItems: "flex-start",
                 padding: "20px 28px", borderRadius: 10, textDecoration: "none",
                 border: `1px solid ${app.color}18`,
                 background: `${app.color}06`,
                 transition: "border-color 0.3s, background 0.3s",
                 width: 200,
               }}
               onMouseEnter={e => {
                 e.currentTarget.style.borderColor = `${app.color}40`;
                 e.currentTarget.style.background = `${app.color}0d`;
               }}
               onMouseLeave={e => {
                 e.currentTarget.style.borderColor = `${app.color}18`;
                 e.currentTarget.style.background = `${app.color}06`;
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
                  fontSize: 18, fontWeight: 700, color: "#1a1a1a",
                  letterSpacing: "1.5px",
                }}>{app.name}</span>
              </div>
              <span style={{ fontSize: 12, color: "#999", letterSpacing: "0.5px" }}>
                {app.desc}
              </span>
            </a>
          );
        })}
      </div>

      <div className="mt-16 text-gray-300"
           style={{ letterSpacing: "2px", fontSize: 11 }}>
        mutabl.io
      </div>
    </div>
  );
}
