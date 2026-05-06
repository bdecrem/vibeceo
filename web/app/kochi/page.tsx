"use client";

import { useEffect } from "react";

export default function KochiLanding() {
  useEffect(() => {
    const clockEl = document.getElementById("clock");
    const msgEl = document.getElementById("incident-message");

    const pad = (n: number) => String(n).padStart(2, "0");
    const tickClock = () => {
      if (!clockEl) return;
      const d = new Date();
      clockEl.textContent =
        pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
    };
    tickClock();
    const clockInterval = setInterval(tickClock, 1000);

    const lines = [
      "standing by",
      "no incidents to report",
      "handled it",
      "your mother says hi",
      "matter resolved",
      "on your behalf",
      "i've taken the liberty",
      "nothing to worry about",
      "a small adjustment was made",
      "you're welcome",
    ];
    let i = 0;
    let fadeTimeout: ReturnType<typeof setTimeout> | null = null;
    const tickerInterval = setInterval(() => {
      if (!msgEl) return;
      msgEl.classList.add("fading");
      fadeTimeout = setTimeout(() => {
        i = (i + 1) % lines.length;
        msgEl.textContent = lines[i];
        msgEl.classList.remove("fading");
      }, 360);
    }, 5000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(tickerInterval);
      if (fadeTimeout) clearTimeout(fadeTimeout);
    };
  }, []);

  return (
    <>
      <style jsx global>{`
        @font-face {
          font-family: "Apfel Grotezk";
          src: url("/kochi-proactive/fonts/ApfelGrotezk-Regular.woff2") format("woff2");
          font-weight: 400;
          font-display: swap;
        }
        @font-face {
          font-family: "Apfel Grotezk";
          src: url("/kochi-proactive/fonts/ApfelGrotezk-Mittel.woff2") format("woff2");
          font-weight: 500;
          font-display: swap;
        }
        @font-face {
          font-family: "Apfel Grotezk";
          src: url("/kochi-proactive/fonts/ApfelGrotezk-Fett.woff2") format("woff2");
          font-weight: 700;
          font-display: swap;
        }
        @font-face {
          font-family: "Departure Mono";
          src: url("/kochi-proactive/fonts/DepartureMono-Regular.woff2") format("woff2");
          font-weight: 400;
          font-display: swap;
        }

        :root {
          --kochi-bg: #f2ebdf;
          --kochi-ink: #1a1a1a;
          --kochi-soft: #8c8276;
          --kochi-rule: rgba(26, 26, 26, 0.12);
          --kochi-accent: #e55b26;
        }

        html,
        body {
          background: var(--kochi-bg);
          color: var(--kochi-ink);
          margin: 0;
          padding: 0;
          font-family: "Apfel Grotezk", -apple-system, system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        .kochi-page * {
          box-sizing: border-box;
        }

        .kochi-page {
          min-height: 100vh;
          display: grid;
          grid-template-rows: auto 1fr auto;
          padding: 28px 40px;
          gap: 32px;
        }

        .kochi-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-family: "Departure Mono", ui-monospace, monospace;
          font-size: 13px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .kochi-wordmark {
          display: flex;
          align-items: center;
          gap: 9px;
        }
        .kochi-wordmark-dot {
          width: 8px;
          height: 8px;
          background: var(--kochi-ink);
          border-radius: 50%;
        }

        .kochi-nav {
          display: flex;
          gap: 24px;
          color: var(--kochi-soft);
        }
        .kochi-nav a {
          color: var(--kochi-soft);
          text-decoration: none;
          transition: color 0.15s ease;
        }
        .kochi-nav a:hover {
          color: var(--kochi-ink);
        }

        .kochi-main {
          display: grid;
          grid-template-columns: 5fr 7fr;
          align-items: center;
          gap: 60px;
          max-width: 1180px;
          width: 100%;
          margin: 0 auto;
          padding: 24px 0;
        }

        .kochi-robot-cell {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .kochi-robot {
          width: 100%;
          max-width: 360px;
          height: auto;
          filter: drop-shadow(0 14px 28px rgba(26, 26, 26, 0.1));
          animation: kochi-twitch 25s ease-in-out infinite;
          transform-origin: 50% 60%;
        }

        @keyframes kochi-twitch {
          0%,
          95.5%,
          100% {
            transform: translateX(0) rotate(0);
          }
          96% {
            transform: translateX(2px) rotate(0.4deg);
          }
          96.4% {
            transform: translateX(-1px) rotate(-0.3deg);
          }
          96.8% {
            transform: translateX(0) rotate(0);
          }
        }

        .kochi-h1 {
          font-family: "Apfel Grotezk", sans-serif;
          font-weight: 700;
          font-size: clamp(52px, 8.6vw, 104px);
          line-height: 0.93;
          letter-spacing: -0.035em;
          margin: 0 0 26px 0;
        }
        .kochi-dot {
          color: var(--kochi-accent);
        }

        .kochi-subhead {
          font-size: 21px;
          line-height: 1.45;
          max-width: 34ch;
          margin: 0 0 32px 0;
        }

        .kochi-cta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 14px 22px;
          background: var(--kochi-ink);
          color: var(--kochi-bg);
          text-decoration: none;
          font-family: "Departure Mono", monospace;
          font-size: 13px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          border-radius: 999px;
          transition: transform 0.15s ease;
        }
        .kochi-cta:hover {
          transform: translateY(-1px);
        }
        .kochi-cta-arrow {
          display: inline-block;
          transition: transform 0.15s ease;
        }
        .kochi-cta:hover .kochi-cta-arrow {
          transform: translateX(4px);
        }

        .kochi-meta {
          margin: 18px 0 0 0;
          font-family: "Departure Mono", monospace;
          font-size: 12px;
          color: var(--kochi-soft);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .kochi-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-family: "Departure Mono", monospace;
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--kochi-soft);
          padding-top: 18px;
          border-top: 1px solid var(--kochi-rule);
        }

        .kochi-incident {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .kochi-blink {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--kochi-accent);
          animation: kochi-blink 1.6s steps(2) infinite;
        }
        @keyframes kochi-blink {
          50% {
            opacity: 0.25;
          }
        }

        #incident-message {
          display: inline-block;
          transition: opacity 0.35s ease;
        }
        #incident-message.fading {
          opacity: 0;
        }

        @media (max-width: 760px) {
          .kochi-page {
            padding: 20px;
            gap: 24px;
          }
          .kochi-main {
            grid-template-columns: 1fr;
            gap: 28px;
            padding: 12px 0;
          }
          .kochi-robot-cell {
            order: 2;
          }
          .kochi-robot {
            max-width: 220px;
          }
          .kochi-h1 {
            font-size: 56px;
          }
          .kochi-subhead {
            font-size: 17px;
          }
          .kochi-footer {
            flex-direction: column;
            gap: 10px;
            align-items: flex-start;
          }
          .kochi-nav {
            gap: 16px;
          }
        }
      `}</style>

      <div className="kochi-page">
        <header className="kochi-header">
          <div className="kochi-wordmark">
            <span className="kochi-wordmark-dot" />
            <span>kochi.to</span>
          </div>
          <nav className="kochi-nav">
            <a href="#">about</a>
            <a href="#">incidents</a>
            <a href="#">testflight</a>
          </nav>
        </header>

        <main className="kochi-main">
          <div className="kochi-robot-cell">
            <img
              className="kochi-robot"
              src="/kochi-proactive/kochi-robot.png"
              alt="Kochi"
            />
          </div>
          <div>
            <h1 className="kochi-h1">
              Proactive
              <br />
              agent<span className="kochi-dot">.</span>
            </h1>
            <p className="kochi-subhead">The AI agent that never rests.</p>
            <a className="kochi-cta" href="#">
              <span>get on testflight</span>
              <span className="kochi-cta-arrow">→</span>
            </a>
            <p className="kochi-meta">openclaw chat client · ios 26 · invite only</p>
          </div>
        </main>

        <footer className="kochi-footer">
          <div className="kochi-incident">
            <span className="kochi-blink" />
            <span>
              kochi // <span id="clock">--:--:--</span> //{" "}
              <span id="incident-message">standing by</span>
            </span>
          </div>
          <div>— you&apos;re welcome.</div>
        </footer>
      </div>
    </>
  );
}
