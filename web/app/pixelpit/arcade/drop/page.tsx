'use client';

import React, { useEffect, useState, useCallback, Suspense, lazy } from 'react';
import Script from 'next/script';
import {
  ScoreFlow,
  Leaderboard,
  ShareModal,
  usePixelpitSocial,
  type ScoreFlowColors,
  type LeaderboardColors,
  type ProgressionResult,
} from '@/app/pixelpit/components';

const Game3D = lazy(() => import('./Game3D'));

const GAME_ID = 'drop';

const THEME = {
  bg: '#87CEEB',
  bgDeep: '#5BA3D9',
  text: '#2d3436',
  textLight: '#ffffff',
  red: '#FF2244',
  orange: '#FFA94D',
  gold: '#FFD43B',
  green: '#69DB7C',
  button: '#FF2244',
};

const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: '#4A8DB7',
  surface: '#3A7DA7',
  primary: '#ffffff',
  secondary: '#FFA94D',
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.8)',
  error: '#ef4444',
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: '#4A8DB7',
  surface: '#3A7DA7',
  primary: '#ffffff',
  secondary: '#FFA94D',
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.6)',
};

export default function DropGame() {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'leaderboard'>('start');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [playCount, setPlayCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);

  const { user } = usePixelpitSocial(socialLoaded);

  const GAME_URL = typeof window !== 'undefined'
    ? `${window.location.origin}/pixelpit/arcade/${GAME_ID}`
    : `https://pixelpit.io/pixelpit/arcade/${GAME_ID}`;

  // Group code detection on mount
  useEffect(() => {
    if (!socialLoaded || typeof window === 'undefined') return;
    if (!window.PixelpitSocial) return;

    const params = new URLSearchParams(window.location.search);
    if (params.has('logout')) {
      window.PixelpitSocial.logout();
      params.delete('logout');
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      window.location.reload();
      return;
    }

    const groupCode = window.PixelpitSocial.getGroupCodeFromUrl();
    if (groupCode) {
      window.PixelpitSocial.storeGroupCode(groupCode);
    }
  }, [socialLoaded]);

  const startGame = useCallback(() => {
    setScore(0);
    setCombo(0);
    setTimeLeft(60);
    setSubmittedEntryId(null);
    setProgression(null);
    setShowShareModal(false);
    setShowHint(true);
    setPlayCount(c => c + 1);
    setGameState('playing');
  }, []);

  // Hide "swipe to rotate" hint after 2 seconds of gameplay
  useEffect(() => {
    if (gameState !== 'playing') return;
    const t = setTimeout(() => setShowHint(false), 2000);
    return () => clearTimeout(t);
  }, [playCount]);

  const handleGameOver = useCallback((finalScore: number) => {
    setScore(finalScore);
    setGameState('gameover');
    fetch('/api/pixelpit/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: GAME_ID }),
    }).catch(() => {});
  }, []);

  const handleScoreUpdate = useCallback((newScore: number, newCombo: number, newTimeLeft: number) => {
    setScore(newScore);
    setCombo(newCombo);
    setTimeLeft(newTimeLeft);
  }, []);

  return (
    <>
      <Script
        src="/pixelpit/social.js"
        onLoad={() => setSocialLoaded(true)}
      />

      <div style={{
        position: 'fixed',
        inset: 0,
        background: THEME.bg,
        fontFamily: '"SF Pro Rounded", "Nunito", "Quicksand", system-ui, -apple-system, sans-serif',
      }}>
        {gameState === 'start' && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 10,
            background: `linear-gradient(180deg, #87CEEB 0%, #5BA3D9 100%)`,
          }}>
            <h1 style={{
              fontSize: 100,
              marginBottom: 8,
              fontWeight: 900,
              letterSpacing: '6px',
              background: 'linear-gradient(180deg, #FFD700 0%, #FF6B00 50%, #FF2244 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 4px 0 rgba(0,0,0,0.2)) drop-shadow(0 8px 25px rgba(255,100,0,0.4))',
            }}>
              DROP
            </h1>

            <p style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: 15,
              marginBottom: 40,
              textAlign: 'center',
              lineHeight: 1.9,
              maxWidth: 260,
              fontWeight: 600,
            }}>
              60 seconds. Swipe to rotate.<br />
              Fall through the gaps.<br />
              <span style={{ color: THEME.red, fontWeight: 800 }}>Avoid the dark zones!</span>
            </p>

            <button
              onClick={startGame}
              style={{
                background: THEME.button,
                color: '#fff',
                border: 'none',
                padding: '18px 60px',
                fontSize: 18,
                fontWeight: 800,
                fontFamily: 'inherit',
                cursor: 'pointer',
                borderRadius: 50,
                letterSpacing: '2px',
                textTransform: 'uppercase' as const,
                boxShadow: '0 4px 0 #cc1133, 0 8px 20px rgba(255,34,68,0.3)',
                transform: 'translateY(-2px)',
              }}
            >
              PLAY
            </button>
          </div>
        )}

        {gameState === 'playing' && (
          <>
            <Suspense fallback={<div style={{ position: 'absolute', inset: 0, background: THEME.bg }} />}>
              <Game3D
                onGameOver={handleGameOver}
                onScoreUpdate={handleScoreUpdate}
              />
            </Suspense>
            <div style={{
              position: 'absolute',
              top: 20,
              left: 0,
              right: 0,
              zIndex: 10,
              pointerEvents: 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: '0 24px',
            }}>
              {/* Score — left side */}
              <div style={{ textAlign: 'left' }}>
                <div style={{
                  fontSize: 48,
                  fontWeight: 900,
                  letterSpacing: '-1px',
                  lineHeight: 1,
                  background: 'linear-gradient(180deg, #ffffff 0%, #FFD700 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 2px 0 rgba(0,0,0,0.15)) drop-shadow(0 4px 12px rgba(0,0,0,0.1))',
                }}>
                  {score}
                </div>
                {combo > 1 && (
                  <div style={{
                    color: THEME.gold,
                    fontSize: Math.min(22 + combo * 2, 40),
                    fontWeight: 900,
                    textShadow: '0 2px 0 rgba(0,0,0,0.1), 0 4px 12px rgba(255,212,59,0.3)',
                    lineHeight: 1,
                  }}>
                    x{combo}
                  </div>
                )}
              </div>
              {/* Timer — right side */}
              <div style={{
                color: timeLeft <= 10 ? THEME.red : 'rgba(255,255,255,0.8)',
                fontSize: timeLeft <= 10 ? 48 : 36,
                fontWeight: 900,
                textShadow: timeLeft <= 10
                  ? '0 0 20px rgba(255,34,68,0.5), 0 2px 0 rgba(0,0,0,0.1)'
                  : '0 2px 0 rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.08)',
                letterSpacing: '-1px',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
                transition: 'font-size 0.2s, color 0.2s',
              }}>
                {timeLeft}
              </div>
            </div>
            {showHint && (
              <div style={{
                position: 'absolute',
                bottom: 30,
                left: 0,
                right: 0,
                textAlign: 'center',
                zIndex: 10,
                pointerEvents: 'none',
              }}>
                <div style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '2px',
                  textTransform: 'uppercase' as const,
                }}>
                  swipe to rotate
                </div>
              </div>
            )}
          </>
        )}

        {gameState === 'gameover' && (
          <div
            onClick={(e) => {
              // Tap anywhere to restart — zero friction failure (Key #2)
              // But not if they clicked a button/link inside
              if ((e.target as HTMLElement).closest('button, a, input, textarea, [role="button"]')) return;
              startGame();
            }}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(180deg, ${THEME.bgDeep} 0%, #4A8DB7 100%)`,
              zIndex: 10,
              overflow: 'auto',
              padding: '40px 20px',
              cursor: 'pointer',
            }}
          >
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              maxWidth: 400,
              width: '100%',
            }}>
              {timeLeft <= 0 && (
                <p style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: '4px',
                  textTransform: 'uppercase' as const,
                  marginBottom: 4,
                }}>
                  TIME&apos;S UP
                </p>
              )}
              <p style={{
                fontSize: 64,
                fontWeight: 900,
                marginBottom: 4,
                letterSpacing: '2px',
                background: 'linear-gradient(180deg, #FFD700 0%, #FFA94D 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 3px 0 rgba(0,0,0,0.2)) drop-shadow(0 6px 15px rgba(255,169,77,0.4))',
              }}>
                {score}
              </p>

              {/* AGAIN button — immediately visible, biggest element (Key #2) */}
              <button
                onClick={startGame}
                style={{
                  background: THEME.orange,
                  color: '#fff',
                  border: 'none',
                  padding: '18px 60px',
                  fontSize: 18,
                  fontWeight: 800,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  borderRadius: 50,
                  letterSpacing: '2px',
                  textTransform: 'uppercase' as const,
                  boxShadow: '0 4px 0 #e08930, 0 8px 20px rgba(255,169,77,0.3)',
                  transform: 'translateY(-2px)',
                  marginBottom: 20,
                }}
              >
                AGAIN
              </button>

              <p style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: 11,
                marginBottom: 20,
                letterSpacing: '1px',
              }}>
                tap anywhere to retry
              </p>

              {/* Progression display */}
              {progression && (
                <div style={{
                  background: 'rgba(0,0,0,0.15)',
                  borderRadius: 12,
                  padding: '10px 20px',
                  marginBottom: 12,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 16, color: '#ffffff', marginBottom: 2, fontWeight: 800 }}>
                    +{progression.xpEarned} XP
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                    Level {progression.level}{progression.streak > 1 ? ` • ${progression.multiplier}x streak` : ''}
                  </div>
                </div>
              )}

              {/* Score submission */}
              <ScoreFlow
                score={score}
                gameId={GAME_ID}
                colors={SCORE_FLOW_COLORS}
                maxScore={500}
                onRankReceived={(rank, entryId) => {
                  setSubmittedEntryId(entryId ?? null);
                }}
                onProgression={(prog) => setProgression(prog)}
              />

              {/* Secondary actions */}
              <div style={{
                display: 'flex',
                gap: 14,
                alignItems: 'center',
                marginTop: 14,
              }}>
                <button
                  onClick={() => setGameState('leaderboard')}
                  style={{
                    background: 'linear-gradient(180deg, #FFD700 0%, #FF8C00 100%)',
                    border: 'none',
                    borderRadius: 50,
                    color: '#ffffff',
                    padding: '14px 28px',
                    fontSize: 14,
                    fontWeight: 900,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    letterSpacing: '3px',
                    textTransform: 'uppercase' as const,
                    boxShadow: '0 4px 0 #CC6600, 0 6px 15px rgba(255,140,0,0.4)',
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                    transform: 'translateY(-2px)',
                  }}
                >
                  RANKS
                </button>
                <button
                  onClick={() => setShowShareModal(true)}
                  style={{
                    background: 'linear-gradient(180deg, #4ECDC4 0%, #2BA8A0 100%)',
                    border: 'none',
                    borderRadius: 50,
                    color: '#ffffff',
                    padding: '14px 28px',
                    fontSize: 14,
                    fontWeight: 900,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    letterSpacing: '3px',
                    textTransform: 'uppercase' as const,
                    boxShadow: '0 4px 0 #1E8C85, 0 6px 15px rgba(78,205,196,0.4)',
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                    transform: 'translateY(-2px)',
                  }}
                >
                  SHARE
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard screen */}
        {gameState === 'leaderboard' && (
          <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            background: `linear-gradient(180deg, ${THEME.bgDeep} 0%, #4A8DB7 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Leaderboard
              gameId={GAME_ID}
              limit={10}
              entryId={submittedEntryId ?? undefined}
              colors={LEADERBOARD_COLORS}
              onClose={() => setGameState('gameover')}
              groupsEnabled={true}
              gameUrl={GAME_URL}
              socialLoaded={socialLoaded}
            />
          </div>
        )}

        {/* Share modal */}
        {showShareModal && (
          <ShareModal
            gameUrl={GAME_URL}
            score={score}
            colors={LEADERBOARD_COLORS}
            onClose={() => setShowShareModal(false)}
          />
        )}
      </div>
    </>
  );
}
