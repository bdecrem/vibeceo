'use client';

import React, { useState } from 'react';
import { Press_Start_2P } from 'next/font/google';
import Script from 'next/script';
import {
  ScoreFlow,
  Leaderboard,
  ShareButtonContainer,
  usePixelpitSocial,
  type ScoreFlowColors,
  type LeaderboardColors,
} from '@/app/pixelpit/components';

const pixelFont = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
});

// Pixelpit theme colors - "Neon Playroom" style
const COLORS = {
  // Background layers
  bg: {
    deep: '#0f172a',      // slate-900 — main background
    surface: '#1e293b',   // slate-800 — cards, panels
    elevated: '#334155',  // slate-700 — hover states
  },
  // Primary palette — SATURATED
  primary: {
    pink: '#ec4899',      // Hot pink — THE lead
    cyan: '#22d3ee',      // Electric cyan — secondary
    yellow: '#fbbf24',    // Amber — energy, coins
    green: '#34d399',     // Emerald — success
    purple: '#a78bfa',    // Violet — special
  },
  // Text
  text: {
    primary: '#f8fafc',   // slate-50
    secondary: '#94a3b8', // slate-400
    muted: '#64748b',     // slate-500
  },
};

const SHADOWS = {
  lg: '4px 4px 0px 0px rgba(0,0,0,0.8)',
  glow: {
    pink: '0 0 20px rgba(236,72,153,0.3)',
    cyan: '0 0 20px rgba(34,211,238,0.3)',
    yellow: '0 0 20px rgba(251,191,36,0.3)',
  },
};

// Color mappings for social components
const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: COLORS.bg.deep,
  surface: COLORS.bg.surface,
  primary: COLORS.primary.pink,
  secondary: COLORS.primary.cyan,
  text: COLORS.text.primary,
  muted: COLORS.text.muted,
  error: COLORS.primary.pink,
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: COLORS.bg.deep,
  surface: COLORS.bg.surface,
  primary: COLORS.primary.pink,
  secondary: COLORS.primary.cyan,
  text: COLORS.text.primary,
  muted: COLORS.text.muted,
};

const GAME_ID = 'clicker';

export default function ClickerGame() {
  const [clicks, setClicks] = useState(0);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'leaderboard'>('start');
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);

  // Use the social hook for user state
  const { user } = usePixelpitSocial(socialLoaded);

  const startGame = () => {
    setClicks(0);
    setGameState('playing');
    setSubmittedEntryId(null);
  };

  const handleClick = () => {
    setClicks(clicks + 1);
  };

  const endGame = () => {
    // Track play for analytics (fire-and-forget)
    if (clicks >= 1) {
      fetch('/api/pixelpit/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_ID }),
      }).catch(() => {}); // Silent fail
    }

    setGameState('gameover');
  };

  return (
    <>
      <Script
        src="/pixelpit/social.js"
        onLoad={() => setSocialLoaded(true)}
      />

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          background: ${COLORS.bg.deep};
          color: ${COLORS.text.primary};
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          overflow: hidden;
          touch-action: none;
          user-select: none;
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: COLORS.bg.deep,
          // Subtle grid background
          backgroundImage: `linear-gradient(${COLORS.primary.pink} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.primary.pink} 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
          backgroundPosition: '0 0, 0 0',
        }}
      >
        {/* Grid overlay with reduced opacity */}
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: COLORS.bg.deep,
            opacity: 0.95,
            pointerEvents: 'none',
          }}
        />

        {/* Start Screen */}
        {gameState === 'start' && (
          <div style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            zIndex: 100,
          }}>
            {/* Card */}
            <div style={{
              background: COLORS.bg.surface,
              border: `2px solid ${COLORS.primary.pink}`,
              borderRadius: '0',
              padding: '40px 60px',
              boxShadow: SHADOWS.lg,
            }}>
              <h1 style={{
                fontFamily: pixelFont.style.fontFamily,
                fontSize: '48px',
                color: COLORS.primary.pink,
                marginBottom: '20px',
                textShadow: '2px 2px 0px rgba(0,0,0,0.5)',
              }}>
                CLICKER
              </h1>
              <p style={{
                fontSize: '12px',
                fontFamily: 'ui-monospace, monospace',
                color: COLORS.text.secondary,
                marginBottom: '30px',
                lineHeight: '1.6',
                textTransform: 'uppercase',
                letterSpacing: '2px',
              }}>
                TAP ANYWHERE<br />
                NUMBER GOES UP
              </p>
              <button
                onClick={startGame}
                style={{
                  background: COLORS.primary.pink,
                  color: '#000000',
                  border: '2px solid #000000',
                  padding: '16px 32px',
                  fontSize: '14px',
                  fontFamily: 'ui-monospace, monospace',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: SHADOWS.lg,
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  transition: 'all 0.1s ease',
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translate(4px, 4px)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translate(0px, 0px)';
                  e.currentTarget.style.boxShadow = SHADOWS.lg;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translate(0px, 0px)';
                  e.currentTarget.style.boxShadow = SHADOWS.lg;
                }}
              >
                PLAY
              </button>
            </div>

            <div style={{
              marginTop: '30px',
              fontSize: '12px',
              fontFamily: 'ui-monospace, monospace',
              letterSpacing: '3px',
            }}>
              <span style={{ color: COLORS.primary.pink }}>PIXEL</span>
              <span style={{ color: COLORS.primary.cyan }}>PIT</span>
            </div>
          </div>
        )}

        {/* Game Screen */}
        {gameState === 'playing' && (
          <div
            onClick={handleClick}
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 50,
            }}
          >
            {/* Score Display */}
            <div style={{
              fontFamily: pixelFont.style.fontFamily,
              fontSize: '64px',
              color: COLORS.primary.pink,
              textShadow: '4px 4px 0px rgba(0,0,0,0.8)',
              marginBottom: '40px',
              textAlign: 'center',
            }}>
              {clicks.toString().padStart(6, '0')}
            </div>

            {/* Tap instruction */}
            <div style={{
              fontSize: '14px',
              fontFamily: 'ui-monospace, monospace',
              color: COLORS.text.secondary,
              textTransform: 'uppercase',
              letterSpacing: '4px',
              marginBottom: '40px',
            }}>
              TAP ANYWHERE
            </div>

            {/* End Game Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                endGame();
              }}
              style={{
                background: COLORS.primary.cyan,
                color: '#000000',
                border: '2px solid #000000',
                padding: '12px 24px',
                fontSize: '12px',
                fontFamily: 'ui-monospace, monospace',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: SHADOWS.lg,
                textTransform: 'uppercase',
                letterSpacing: '2px',
                transition: 'all 0.1s ease',
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translate(4px, 4px)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translate(0px, 0px)';
                e.currentTarget.style.boxShadow = SHADOWS.lg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translate(0px, 0px)';
                e.currentTarget.style.boxShadow = SHADOWS.lg;
              }}
            >
              FINISH
            </button>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState === 'gameover' && (
          <div style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            zIndex: 100,
          }}>
            <h1 style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: '24px',
              fontWeight: 'normal',
              color: COLORS.text.secondary,
              marginBottom: '20px',
              letterSpacing: '4px',
              textTransform: 'uppercase',
            }}>
              FINAL SCORE
            </h1>

            <div style={{
              fontFamily: pixelFont.style.fontFamily,
              fontSize: '72px',
              fontWeight: 'normal',
              color: COLORS.primary.pink,
              marginBottom: '40px',
              textShadow: '4px 4px 0px rgba(0,0,0,0.8)',
            }}>
              {clicks.toString().padStart(6, '0')}
            </div>

            {/* Score Submission */}
            <ScoreFlow
              score={clicks}
              gameId={GAME_ID}
              colors={SCORE_FLOW_COLORS}
              onRankReceived={(rank, entryId) => {
                setSubmittedEntryId(entryId ?? null);
              }}
            />

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '15px',
              alignItems: 'center',
              marginTop: '20px',
            }}>
              <button
                onClick={startGame}
                style={{
                  background: COLORS.primary.pink,
                  color: '#000000',
                  border: '2px solid #000000',
                  borderRadius: '0',
                  padding: '16px 32px',
                  fontSize: '14px',
                  fontFamily: 'ui-monospace, monospace',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: SHADOWS.lg,
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  transition: 'all 0.1s ease',
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translate(4px, 4px)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translate(0px, 0px)';
                  e.currentTarget.style.boxShadow = SHADOWS.lg;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translate(0px, 0px)';
                  e.currentTarget.style.boxShadow = SHADOWS.lg;
                }}
              >
                PLAY AGAIN
              </button>

              <button
                onClick={() => setGameState('leaderboard')}
                style={{
                  background: 'transparent',
                  border: `2px solid ${COLORS.text.secondary}`,
                  color: COLORS.text.secondary,
                  padding: '12px 24px',
                  fontSize: '12px',
                  fontFamily: 'ui-monospace, monospace',
                  cursor: 'pointer',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  transition: 'all 0.1s ease',
                  boxShadow: SHADOWS.lg,
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translate(4px, 4px)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translate(0px, 0px)';
                  e.currentTarget.style.boxShadow = SHADOWS.lg;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translate(0px, 0px)';
                  e.currentTarget.style.boxShadow = SHADOWS.lg;
                }}
              >
                LEADERBOARD
              </button>

              <ShareButtonContainer
                id="share-btn-container"
                url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/clicker/share/${clicks}` : ''}
                text={`I clicked ${clicks} times on CLICKER! Can you beat me?`}
                style="minimal"
                socialLoaded={socialLoaded}
              />
            </div>
          </div>
        )}

        {/* Leaderboard Screen */}
        {gameState === 'leaderboard' && (
          <Leaderboard
            gameId={GAME_ID}
            limit={10}
            entryId={submittedEntryId ?? undefined}
            colors={LEADERBOARD_COLORS}
            onClose={() => setGameState('gameover')}
          />
        )}
      </div>
    </>
  );
}