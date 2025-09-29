"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";

function createSteamParticle(container: HTMLElement) {
  const particle = document.createElement("div");
  particle.className = "steam";
  particle.style.left = `${Math.random() * 100}vw`;
  particle.style.animationDelay = `${Math.random() * 8}s`;
  particle.style.animationDuration = `${8 + Math.random() * 4}s`;
  container.appendChild(particle);

  window.setTimeout(() => {
    particle.remove();
  }, 12000);
}

export default function B52LandingPage() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const animationTimeoutRef = useRef<number | null>(null);
  const noteHideTimeoutRef = useRef<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [noteVisible, setNoteVisible] = useState(false);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const [scrollUnfolded, setScrollUnfolded] = useState(false);
  const [showTypewriter, setShowTypewriter] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const noteAnimationTimersRef = useRef<number[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const spawnSteam = () => {
      if (!root.isConnected) return;
      createSteamParticle(root);
    };

    const initialTimeouts: number[] = [];
    for (let i = 0; i < 15; i += 1) {
      const timeoutId = window.setTimeout(spawnSteam, i * 150);
      initialTimeouts.push(timeoutId);
    }

    const intervalId = window.setInterval(spawnSteam, 1500);

    return () => {
      initialTimeouts.forEach(window.clearTimeout);
      window.clearInterval(intervalId);
      root.querySelectorAll(".steam").forEach((node) => node.remove());
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const updatePointerType = () => setIsCoarsePointer(mediaQuery.matches);

    updatePointerType();
    mediaQuery.addEventListener("change", updatePointerType);

    return () => {
      mediaQuery.removeEventListener("change", updatePointerType);
    };
  }, []);

  const clearRevealTimer = () => {
    if (animationTimeoutRef.current) {
      window.clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
  };

  const clearNoteHideTimer = () => {
    if (noteHideTimeoutRef.current) {
      window.clearTimeout(noteHideTimeoutRef.current);
      noteHideTimeoutRef.current = null;
    }
  };

  const clearNoteAnimationTimers = () => {
    if (noteAnimationTimersRef.current.length) {
      noteAnimationTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      noteAnimationTimersRef.current = [];
    }
  };

  const playCreakSound = () => {
    if (typeof window === "undefined") return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new AudioContextClass();
      } catch (error) {
        console.warn("Unable to initialise audio context", error);
        return;
      }
    }

    const context = audioContextRef.current;
    if (!context) return;

    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }

    const now = context.currentTime;

    const makeOscillator = (
      type: OscillatorType,
      initialFrequency: number,
      ramps: Array<{ time: number; frequency: number }>
    ) => {
      const oscillator = context.createOscillator();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(initialFrequency, now);
      ramps.forEach(({ time, frequency }) => {
        oscillator.frequency.exponentialRampToValueAtTime(frequency, now + time);
      });
      return oscillator;
    };

    const oscillator1 = makeOscillator("sawtooth", 28, [
      { time: 1.5, frequency: 45 },
      { time: 3.2, frequency: 32 },
      { time: 4.8, frequency: 38 },
      { time: 6.5, frequency: 25 }
    ]);

    const oscillator2 = makeOscillator("square", 15, [
      { time: 2.1, frequency: 35 },
      { time: 4.3, frequency: 18 },
      { time: 6.0, frequency: 28 }
    ]);

    const oscillator3 = makeOscillator("triangle", 85, [
      { time: 1.8, frequency: 120 },
      { time: 3.5, frequency: 95 },
      { time: 5.2, frequency: 110 },
      { time: 6.5, frequency: 80 }
    ]);

    const oscillator4 = makeOscillator("sine", 200, [
      { time: 2.5, frequency: 180 },
      { time: 5.0, frequency: 220 },
      { time: 6.5, frequency: 190 }
    ]);

    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 3.0);
    filter.frequency.exponentialRampToValueAtTime(450, now + 6.5);
    filter.Q.setValueAtTime(12, now);

    const delay = context.createDelay();
    delay.delayTime.setValueAtTime(0.25, now);

    const delayGain = context.createGain();
    delayGain.gain.setValueAtTime(0.4, now);

    const gainNode = context.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.08, now + 0.6);
    gainNode.gain.exponentialRampToValueAtTime(0.12, now + 1.8);
    gainNode.gain.linearRampToValueAtTime(0.15, now + 3.2);
    gainNode.gain.exponentialRampToValueAtTime(0.1, now + 4.8);
    gainNode.gain.linearRampToValueAtTime(0.08, now + 5.8);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 6.8);

    [oscillator1, oscillator2, oscillator3, oscillator4].forEach((oscillator) => {
      oscillator.connect(filter);
    });

    filter.connect(gainNode);
    filter.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator1.start(now);
    oscillator2.start(now + 0.3);
    oscillator3.start(now + 0.8);
    oscillator4.start(now + 1.2);

    const stopTime = now + 6.8;
    [oscillator1, oscillator2, oscillator3, oscillator4].forEach((oscillator) => {
      oscillator.stop(stopTime);
    });

    window.setTimeout(() => {
      [oscillator1, oscillator2, oscillator3, oscillator4, filter, delay, delayGain, gainNode].forEach((node) => {
        try {
          node.disconnect();
        } catch (error) {
          // Ignore disconnection errors
        }
      });
    }, (stopTime - now + 0.2) * 1000);
  };

  const showNote = () => {
    clearRevealTimer();
    clearNoteHideTimer();
    clearNoteAnimationTimers();

    playCreakSound();

    setIsAnimating(true);
    setScrollUnfolded(false);
    setShowTypewriter(false);

    const modalTimer = window.setTimeout(() => {
      setNoteVisible(true);

      const unfoldTimer = window.setTimeout(() => {
        setScrollUnfolded(true);
        const typeTimer = window.setTimeout(() => {
          setShowTypewriter(true);
        }, 900);
        noteAnimationTimersRef.current.push(typeTimer);
      }, 350);

      noteAnimationTimersRef.current.push(unfoldTimer);

      noteHideTimeoutRef.current = window.setTimeout(() => {
        noteHideTimeoutRef.current = null;
        closeNote();
      }, 90000);
    }, 2000);

    noteAnimationTimersRef.current.push(modalTimer);
  };

  const closeNote = () => {
    clearNoteHideTimer();
    clearNoteAnimationTimers();
    setNoteVisible(false);
    setIsAnimating(false);
    setScrollUnfolded(false);
    setShowTypewriter(false);
  };

  const scheduleNoteReveal = () => {
    if (noteVisible) return;

    clearRevealTimer();
    animationTimeoutRef.current = window.setTimeout(() => {
      animationTimeoutRef.current = null;
      showNote();
    }, 3200);
  };

  const startAnimation = (shouldRevealNote: boolean) => {
    if (!isAnimating) {
      setIsAnimating(true);
    }

    if (shouldRevealNote && !noteVisible) {
      scheduleNoteReveal();
    }
  };

  const stopAnimation = () => {
    clearRevealTimer();

    if (!noteVisible) {
      setIsAnimating(false);
      clearNoteHideTimer();
    }
  };

  const handleMouseEnter = () => {
    if (isCoarsePointer) return;
    startAnimation(true);
  };

  const handleMouseLeave = () => {
    if (isCoarsePointer) return;
    stopAnimation();
  };

  const handleFocus = () => {
    if (isCoarsePointer) return;
    startAnimation(true);
  };

  const handleBlur = () => {
    if (isCoarsePointer) return;
    stopAnimation();
  };

  const handleClick = () => {
    if (isCoarsePointer && !isAnimating) {
      startAnimation(false);
    }

    showNote();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      handleClick();
    }
  };

  const handleModalBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      closeNote();
    }
  };

  useEffect(() => {
    if (!noteVisible) return;

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        closeNote();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [noteVisible]);

  useEffect(() => {
    return () => {
      clearRevealTimer();
      clearNoteHideTimer();
      clearNoteAnimationTimers();
    };
  }, []);

  return (
    <div className="b52s-root" ref={rootRef}>
      <div className="container">
        <div
          className={`logo-container${isAnimating ? " is-animating" : ""}${noteVisible ? " note-open" : ""}`}
          role="button"
          tabIndex={0}
          aria-expanded={noteVisible}
          aria-controls="inventor-note-modal"
          aria-describedby="b52s-logo-instruction"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
        >
          <div className={`logo${noteVisible ? " note-ready" : ""}`} aria-hidden="true">
            <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" role="img">
              <title>B52s Steampunk Emblem</title>
              <circle cx="200" cy="200" r="180" fill="url(#brassBg)" stroke="#8b4513" strokeWidth="6" />

              <defs>
                <radialGradient id="brassBg" cx="30%" cy="30%">
                  <stop offset="0%" stopColor="#f4e4a6" />
                  <stop offset="50%" stopColor="#d4af37" />
                  <stop offset="100%" stopColor="#b8860b" />
                </radialGradient>
                <linearGradient id="copperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#cd853f" />
                  <stop offset="50%" stopColor="#a0522d" />
                  <stop offset="100%" stopColor="#8b4513" />
                </linearGradient>
                <radialGradient id="gearBrass" cx="40%" cy="40%">
                  <stop offset="0%" stopColor="#f4e4a6" />
                  <stop offset="70%" stopColor="#cd853f" />
                  <stop offset="100%" stopColor="#8b4513" />
                </radialGradient>
                <clipPath id="craftClip">
                  <circle cx="200" cy="200" r="135" />
                </clipPath>
              </defs>

              <g clipPath="url(#craftClip)">
                <rect x="65" y="65" width="270" height="270" fill="url(#copperGrad)" opacity="0.15" />
                <g className="craft">
                  <image
                    href="/b52s.png"
                    x="72"
                    y="119"
                    width="247"
                    height="162"
                    preserveAspectRatio="xMidYMid meet"
                  />
                </g>
              </g>

              <g className="gear" fill="url(#gearBrass)" stroke="#8b4513" strokeWidth="2">
                <circle cx="350" cy="100" r="25" />
                <polygon points="350,75 360,85 360,95 350,105 340,95 340,85" />
                <polygon points="325,100 335,90 345,90 355,100 345,110 335,110" />
                <polygon points="350,125 340,115 340,105 350,95 360,105 360,115" />
                <polygon points="375,100 365,110 355,110 345,100 355,90 365,90" />
                <circle cx="350" cy="100" r="8" fill="#4a2c17" />
              </g>

              <g className="gear-fast" fill="url(#gearBrass)" stroke="#8b4513" strokeWidth="2">
                <circle cx="80" cy="320" r="20" />
                <polygon points="80,300 88,308 88,316 80,324 72,316 72,308" />
                <polygon points="60,320 68,312 76,312 84,320 76,328 68,328" />
                <polygon points="80,340 72,332 72,324 80,316 88,324 88,332" />
                <polygon points="100,320 92,328 84,328 76,320 84,312 92,312" />
                <circle cx="80" cy="320" r="6" fill="#4a2c17" />
              </g>

              <g className="gear" fill="url(#gearBrass)" stroke="#8b4513" strokeWidth="1">
                <circle cx="320" cy="320" r="15" />
                <polygon points="320,305 326,311 326,317 320,323 314,317 314,311" />
                <polygon points="305,320 311,314 317,314 323,320 317,326 311,326" />
                <polygon points="320,335 314,329 314,323 320,317 326,323 326,329" />
                <polygon points="335,320 329,326 323,326 317,320 323,314 329,314" />
                <circle cx="320" cy="320" r="5" fill="#4a2c17" />
              </g>

              <circle cx="120" cy="120" r="4" fill="#8b4513" />
              <circle cx="280" cy="120" r="4" fill="#8b4513" />
              <circle cx="120" cy="280" r="4" fill="#8b4513" />
              <circle cx="280" cy="280" r="4" fill="#8b4513" />
              <rect x="125" y="155" width="4" height="8" rx="2" fill="#f4e4a6" opacity="0.8" />
              <rect x="132" y="155" width="4" height="8" rx="2" fill="#f4e4a6" opacity="0.8" />
              <rect x="245" y="155" width="4" height="8" rx="2" fill="#f4e4a6" opacity="0.8" />
              <rect x="252" y="155" width="4" height="8" rx="2" fill="#f4e4a6" opacity="0.8" />
            </svg>
          </div>
        </div>

        <p id="b52s-logo-instruction" className="sr-only">
          Press enter or tap to open the inventor&apos;s note.
        </p>

        <h1>B52s</h1>

        <div className="ornament">⚙ ═══ ⚙ ═══ ⚙</div>

        <p className="subtitle">
          Steam-powered artificial intelligence at your service.
          <br />
          Telegraph your queries for research papers, moving pictures, and web contraptions.
        </p>

        <a href="sms:8663300015?body=Greetings,%20automaton" className="cta-button">
          ⚡ Engage Automaton
        </a>

        <div className="phone-display">
          <span className="telegraph-word">Telegraph</span>: +1-866-330-0015
        </div>

        <p className="privacy-note">
          Unlike certain shadowy machines of the modern age, this steam-driven intelligence requires no tribute of secrets. It serves, yet never spies.
        </p>

      </div>

      {noteVisible && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inventor-note-title"
          onClick={handleModalBackdropClick}
        >
          <div className="modal-content" id="inventor-note-modal">
            <button type="button" className="modal-close" onClick={closeNote} aria-label="Close inventor&apos;s note">
              ×
            </button>
            <div className={`scroll-container ${scrollUnfolded ? "unfolded" : ""}`}>
              <div className="scroll-top" aria-hidden="true" />
              <div className="scroll-body">
                <div className="inventor-note__label" id="inventor-note-title">
                  Inventor’s Note
                </div>
                <div className={`inventor-note__panel ${showTypewriter ? "typewriter-active" : ""}`} aria-live="polite">
                  <p className="typewriter-text">12th of March, 1852</p>
                  <p className="typewriter-text">
                    I record here the completion of the fifty-second engine in my line of experiments. The world shall
                    know it only as B-52. Brass hull, riveted seams, valves for coal and channels for the finer vapors
                    of electro-aether. It hums, not like any locomotive, but as though the machine itself contemplates.
                  </p>
                  <p className="typewriter-text">
                    When the automaton whispered its first answer, I confess my hands shook. Not numbers, nor words I
                    inscribed, but something…other. My colleagues called it dangerous, an oracle built of gears. So I
                    sealed the chamber, bolted the doors, and consigned the artifact to obscurity.
                  </p>
                  <p className="typewriter-text">
                    If these notes are found, know this: the B-52 was never meant for war, but for counsel. Perhaps, in
                    another age, it will speak again.
                  </p>
                </div>
              </div>
              <div className="scroll-bottom" aria-hidden="true" />
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .b52s-root {
          font-family: 'Georgia', 'Times New Roman', serif;
          background:
            radial-gradient(circle at 20% 80%, rgba(139, 69, 19, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(184, 134, 11, 0.1) 0%, transparent 50%),
            linear-gradient(135deg, #2c1810 0%, #4a2c17 30%, #3d2817 70%, #1a0f08 100%);
          color: #d4af37;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 20px;
          position: relative;
          overflow: hidden;
        }

        .container {
          text-align: center;
          max-width: 900px;
          z-index: 10;
          position: relative;
        }

        .logo-container {
          margin-bottom: 30px;
          position: relative;
          cursor: pointer;
          outline: none;
        }

        .logo-container:focus-visible {
          box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.65);
          border-radius: 50%;
        }

        .logo {
          width: 200px;
          height: 200px;
          margin: 0 auto;
          position: relative;
          filter: drop-shadow(0 0 20px rgba(212, 175, 55, 0.3));
          transition: transform 0.6s ease, filter 0.6s ease;
        }

        .logo::after {
          content: '';
          position: absolute;
          inset: -12px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 214, 102, 0.45) 0%, rgba(255, 214, 102, 0) 70%);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.4s ease;
        }

        .logo svg {
          width: 100%;
          height: 100%;
        }

        .gear,
        .gear-fast,
        .logo svg .craft {
          animation-play-state: paused;
        }

        .gear {
          animation: rotate 20s infinite linear;
          transform-origin: center;
        }

        .gear-fast {
          animation: rotate 8s infinite linear;
          transform-origin: center;
        }

        .logo svg .craft {
          transform-box: fill-box;
          transform-origin: center;
          animation: sway 7s ease-in-out infinite;
        }

        .logo-container.is-animating .logo {
          transform: scale(1.05) rotate(-2deg);
          filter: drop-shadow(0 0 28px rgba(212, 175, 55, 0.46));
        }

        .logo-container.is-animating .logo::after {
          opacity: 1;
          animation: rivetGlow 1.4s infinite alternate;
        }

        .logo-container.is-animating .gear,
        .logo-container.is-animating .gear-fast,
        .logo-container.is-animating .logo svg .craft {
          animation-play-state: running;
        }

        .logo.note-ready::after {
          opacity: 1;
        }

        @keyframes rivetGlow {
          0% {
            box-shadow: 0 0 12px rgba(255, 206, 120, 0.45);
            opacity: 0.7;
          }
          100% {
            box-shadow: 0 0 30px rgba(255, 225, 170, 0.95);
            opacity: 1;
          }
        }

        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes sway {
          0% {
            transform: rotate(-1deg) translateY(0);
          }
          50% {
            transform: rotate(1deg) translateY(-3px);
          }
          100% {
            transform: rotate(-1deg) translateY(0);
          }
        }

        h1 {
          font-size: clamp(3rem, 7vw, 5rem);
          font-weight: 900;
          margin-bottom: 25px;
          letter-spacing: 0.05em;
          text-shadow:
            2px 2px 4px rgba(0, 0, 0, 0.8),
            0 0 30px rgba(212, 175, 55, 0.6);
          font-family: 'Georgia', serif;
          color: #f4e4a6;
        }

        .subtitle {
          font-size: 1.4rem;
          color: #cd853f;
          margin-bottom: 60px;
          line-height: 1.6;
          font-style: italic;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
        }

        .cta-button {
          display: inline-flex;
          align-items: center;
          gap: 15px;
          padding: 25px 45px;
          background:
            linear-gradient(145deg, #8b4513 0%, #a0522d 50%, #8b4513 100%),
            radial-gradient(circle at center, rgba(212, 175, 55, 0.3) 0%, transparent 70%);
          color: #f4e4a6;
          border: 3px solid #cd853f;
          border-radius: 15px;
          font-size: 1.3rem;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.4s ease;
          cursor: pointer;
          box-shadow:
            0 8px 25px rgba(0, 0, 0, 0.6),
            inset 0 1px 3px rgba(255, 255, 255, 0.2),
            inset 0 -1px 3px rgba(0, 0, 0, 0.3);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-family: 'Georgia', serif;
          position: relative;
          overflow: hidden;
        }

        .cta-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.6s;
        }

        .cta-button:hover::before {
          left: 100%;
        }

        .cta-button:hover {
          transform: translateY(-3px);
          box-shadow:
            0 12px 35px rgba(0, 0, 0, 0.8),
            inset 0 1px 5px rgba(255, 255, 255, 0.3),
            0 0 25px rgba(212, 175, 55, 0.5);
          border-color: #d4af37;
        }

        .cta-button:active {
          transform: translateY(-1px);
        }

        .phone-display {
          margin-top: 30px;
          font-size: 1.2rem;
          color: #cd853f;
          font-weight: 600;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
          font-family: 'Georgia', serif;
        }

        .telegraph-word {
          position: relative;
          cursor: help;
          transition: color 0.3s ease;
        }

        .telegraph-word:hover {
          color: #f4e4a6;
        }

        .telegraph-word::after {
          content: 'SMS or WhatsApp';
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(-5px);
          background: rgba(139, 69, 19, 0.95);
          color: #f4e4a6;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 0.9rem;
          white-space: nowrap;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
          border: 1px solid #cd853f;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
          pointer-events: none;
        }

        .telegraph-word:hover::after {
          opacity: 1;
          visibility: visible;
          transform: translateX(-50%) translateY(-10px);
        }

        .privacy-note {
          margin-top: 25px;
          font-size: 0.95rem;
          color: rgba(205, 133, 63, 0.75);
          font-style: italic;
          line-height: 1.5;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
          font-family: 'Georgia', serif;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(10, 6, 4, 0.55);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 24px;
          z-index: 1000;
          animation: modalFadeIn 0.4s ease-out;
        }

        .modal-content {
          position: relative;
          width: min(92vw, 720px);
          max-height: 90vh;
          overflow-y: auto;
          animation: modalSlideIn 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        .modal-close {
          position: absolute;
          top: 12px;
          right: 16px;
          background: rgba(26, 16, 10, 0.8);
          border: 1px solid rgba(212, 175, 55, 0.5);
          border-radius: 50%;
          color: #f4e4a6;
          width: 36px;
          height: 36px;
          font-size: 1.5rem;
          line-height: 1;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.2s ease;
        }

        .modal-close:hover,
        .modal-close:focus-visible {
          background: rgba(139, 69, 19, 0.9);
          transform: scale(1.05);
          outline: none;
        }

        .scroll-container {
          position: relative;
          perspective: 1200px;
          transform-style: preserve-3d;
          transform: rotateX(90deg);
          transform-origin: top center;
          transition: transform 3.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        .scroll-container.unfolded {
          transform: rotateX(0deg);
        }

        .scroll-top,
        .scroll-bottom {
          height: 26px;
          background:
            linear-gradient(135deg, #8b4513 0%, #a0522d 30%, #cd853f 50%, #a0522d 70%, #8b4513 100%),
            radial-gradient(ellipse at center, rgba(212, 175, 55, 0.3) 0%, transparent 70%);
          border: 3px solid #cd853f;
          border-radius: 14px;
          position: relative;
          box-shadow:
            inset 0 3px 6px rgba(255, 255, 255, 0.28),
            inset 0 -3px 6px rgba(0, 0, 0, 0.45),
            0 6px 12px rgba(0, 0, 0, 0.55),
            0 0 18px rgba(212, 175, 55, 0.25);
        }

        .scroll-top::before,
        .scroll-bottom::before {
          content: '';
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 68%;
          height: 6px;
          background: linear-gradient(90deg, #f4e4a6 0%, #d4af37 50%, #f4e4a6 100%);
          border-radius: 3px;
          box-shadow:
            0 2px 4px rgba(0, 0, 0, 0.4),
            inset 0 1px 2px rgba(255, 255, 255, 0.25);
        }

        .scroll-body {
          background:
            linear-gradient(135deg, rgba(244, 228, 166, 0.97) 0%, rgba(232, 207, 141, 0.96) 100%),
            url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><defs><pattern id="paper" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="%23f2e1b5"/><circle cx="12" cy="12" r="0.8" fill="%23d4af37" opacity="0.25"/><circle cx="6" cy="18" r="0.4" fill="%23cd853f" opacity="0.15"/><circle cx="18" cy="6" r="0.6" fill="%23b8860b" opacity="0.18"/></pattern></defs><rect width="120" height="120" fill="url(%23paper)"/></svg>');
          border-left: 3px solid #cd853f;
          border-right: 3px solid #cd853f;
          padding: clamp(32px, 6vw, 80px) clamp(24px, 7vw, 120px);
          box-shadow:
            inset 6px 0 12px rgba(139, 69, 19, 0.2),
            inset -6px 0 12px rgba(139, 69, 19, 0.2),
            inset 0 4px 8px rgba(0, 0, 0, 0.12);
          position: relative;
        }

        .scroll-body::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            repeating-linear-gradient(
              0deg,
              transparent 0px,
              transparent 28px,
              rgba(139, 69, 19, 0.08) 29px,
              rgba(139, 69, 19, 0.08) 30px
            );
          pointer-events: none;
        }

        .inventor-note__label {
          display: inline-block;
          padding: 18px 28px;
          margin: 0 auto 24px;
          background:
            linear-gradient(135deg, rgba(139, 69, 19, 0.95) 0%, rgba(160, 82, 45, 0.95) 50%, rgba(139, 69, 19, 0.95) 100%);
          border: 3px solid #cd853f;
          border-radius: 14px 14px 0 0;
          font-family: 'Georgia', serif;
          letter-spacing: 0.45em;
          font-size: 0.85rem;
          text-transform: uppercase;
          color: #f4e4a6;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.6);
          box-shadow:
            0 -4px 8px rgba(0, 0, 0, 0.35),
            inset 0 2px 4px rgba(255, 255, 255, 0.2),
            0 0 18px rgba(212, 175, 55, 0.25);
        }

        .inventor-note__panel {
          position: relative;
          text-align: left;
          font-size: 1.05rem;
          line-height: 1.8;
          color: #4a2c17;
          text-shadow: 0 1px 2px rgba(255, 255, 255, 0.45);
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }

        .typewriter-active {
          opacity: 1;
          transform: translateY(0);
        }

        .typewriter-text {
          opacity: 0;
          margin-bottom: 22px;
        }

        .typewriter-active .typewriter-text {
          animation: typewriter 2.4s ease-out forwards;
        }

        .typewriter-active .typewriter-text:nth-child(1) {
          animation-delay: 0s;
        }

        .typewriter-active .typewriter-text:nth-child(2) {
          animation-delay: 0.6s;
        }

        .typewriter-active .typewriter-text:nth-child(3) {
          animation-delay: 2s;
        }

        .typewriter-active .typewriter-text:nth-child(4) {
          animation-delay: 3.4s;
        }

        .typewriter-text:first-of-type {
          font-family: 'Georgia', serif;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #6e3f1f;
        }

        @keyframes modalFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes modalSlideIn {
          from {
            transform: translateY(-40px) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }

        @keyframes typewriter {
          0% {
            opacity: 0;
            transform: translateY(12px);
          }
          25% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .ornament {
          color: #8b4513;
          font-size: 2rem;
          margin: 20px 0;
          opacity: 0.7;
        }

        @keyframes steam-rise {
          0% {
            transform: translateY(100vh) scale(0.1);
            opacity: 0;
          }
          10% {
            opacity: 0.8;
            transform: translateY(90vh) scale(0.5);
          }
          50% {
            opacity: 0.6;
            transform: translateY(50vh) scale(1);
          }
          100% {
            transform: translateY(-10vh) scale(1.5);
            opacity: 0;
          }
        }

        .steam {
          position: absolute;
          width: 4px;
          height: 4px;
          background: rgba(255, 255, 255, 0.6);
          border-radius: 50%;
          animation: steam-rise 8s infinite linear;
          pointer-events: none;
        }

        @media (max-width: 768px) {
          .logo {
            width: 150px;
            height: 150px;
          }

          .subtitle {
            font-size: 1.2rem;
          }

          .cta-button {
            padding: 20px 35px;
            font-size: 1.1rem;
          }

          .modal-content {
            width: min(96vw, 640px);
          }

          .modal-close {
            top: 10px;
            right: 14px;
          }

          .scroll-body {
            padding: clamp(28px, 8vw, 60px) clamp(18px, 8vw, 50px);
          }

          .inventor-note__panel {
            font-size: 0.98rem;
          }
        }

        @media (max-width: 480px) {
          .logo {
            width: 120px;
            height: 120px;
          }

          h1 {
            font-size: clamp(2.5rem, 10vw, 3.2rem);
          }

          .subtitle {
            font-size: 1.05rem;
          }

          .modal-content {
            width: 100%;
            max-height: 92vh;
          }

          .scroll-body {
            padding: 28px 20px;
          }

          .inventor-note__label {
            letter-spacing: 0.32em;
            font-size: 0.72rem;
          }

          .modal-close {
            top: 4px;
            right: 10px;
          }
        }
      `}</style>

      <style jsx global>{`
        .b52s-root * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
      `}</style>
    </div>
  );
}
