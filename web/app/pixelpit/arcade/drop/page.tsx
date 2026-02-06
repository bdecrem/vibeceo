'use client';

import React, { useEffect, useState, useCallback, Suspense, lazy } from 'react';
import Script from 'next/script';
import {
  ScoreFlow,
  Leaderboard,
  ShareButtonContainer,
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
  primary: '#FF2244',
  secondary: '#FFA94D',
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.6)',
  error: '#ef4444',
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: '#4A8DB7',
  surface: '#3A7DA7',
  primary: '#FF2244',
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
    setSubmittedEntryId(null);
    setProgression(null);
    setShowShareModal(false);
    setGameState('playing');
  }, []);

  const handleGameOver = useCallback((finalScore: number) => {
    setScore(finalScore);
    setGameState('gameover');
    fetch('/api/pixelpit/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: GAME_ID }),
    }).catch(() => {});
  }, []);

  const handleScoreUpdate = useCallback((newScore: number, newCombo: number) => {
    setScore(newScore);
    setCombo(newCombo);
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
              color: '#ffffff',
              fontSize: 80,
              marginBottom: 8,
              fontWeight: 900,
              letterSpacing: '-2px',
              textShadow: '0 4px 0 rgba(0,0,0,0.1), 0 8px 20px rgba(0,0,0,0.08)',
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
              Swipe to rotate the tower.<br />
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
              textAlign: 'center',
              zIndex: 10,
              pointerEvents: 'none',
            }}>
              <div style={{
                color: '#ffffff',
                fontSize: 44,
                fontWeight: 900,
                textShadow: '0 2px 0 rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.08)',
                letterSpacing: '-1px',
              }}>
                {score}
              </div>
              {combo > 1 && (
                <div style={{
                  color: THEME.gold,
                  fontSize: Math.min(22 + combo * 2, 40),
                  fontWeight: 900,
                  textShadow: '0 2px 0 rgba(0,0,0,0.1), 0 4px 12px rgba(255,212,59,0.3)',
                }}>
                  x{combo}
                </div>
              )}
            </div>
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
          </>
        )}

        {gameState === 'gameover' && (
          <div style={{
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
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              maxWidth: 400,
              width: '100%',
            }}>
              <h1 style={{
                color: '#ffffff',
                fontSize: 48,
                fontWeight: 900,
                marginBottom: 4,
                textShadow: '0 4px 0 rgba(0,0,0,0.1), 0 8px 20px rgba(0,0,0,0.08)',
                letterSpacing: '-1px',
              }}>
                OOPS!
              </h1>
              <p style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: 13,
                marginBottom: 4,
                letterSpacing: '2px',
                fontWeight: 700,
                textTransform: 'uppercase' as const,
              }}>
                Score
              </p>
              <p style={{
                color: '#ffffff',
                fontSize: 48,
                fontWeight: 900,
                marginBottom: 8,
                textShadow: '0 2px 0 rgba(0,0,0,0.1)',
              }}>
                {score}
              </p>

              {/* Progression display */}
              {progression && (
                <div style={{
                  background: 'rgba(0,0,0,0.15)',
                  borderRadius: 12,
                  padding: '12px 24px',
                  marginBottom: 16,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 18, color: '#ffffff', marginBottom: 4, fontWeight: 800 }}>
                    +{progression.xpEarned} XP
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                    Level {progression.level}{progression.streak > 1 ? ` • ${progression.multiplier}x streak` : ''}
                  </div>
                </div>
              )}

              {/* Score submission */}
              <ScoreFlow
                score={score}
                gameId={GAME_ID}
                colors={SCORE_FLOW_COLORS}
                maxScore={20}
                onRankReceived={(rank, entryId) => {
                  setSubmittedEntryId(entryId ?? null);
                }}
                onProgression={(prog) => setProgression(prog)}
              />

              {/* Action buttons */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                alignItems: 'center',
                marginTop: 16,
                width: '100%',
              }}>
                <button
                  onClick={startGame}
                  style={{
                    background: THEME.orange,
                    color: '#fff',
                    border: 'none',
                    padding: '14px 48px',
                    fontSize: 15,
                    fontWeight: 800,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    borderRadius: 50,
                    letterSpacing: '2px',
                    textTransform: 'uppercase' as const,
                    boxShadow: '0 4px 0 #e08930, 0 8px 20px rgba(255,169,77,0.3)',
                    transform: 'translateY(-2px)',
                  }}
                >
                  AGAIN
                </button>
                <button
                  onClick={() => setGameState('leaderboard')}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 50,
                    color: 'rgba(255,255,255,0.7)',
                    padding: '12px 30px',
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    letterSpacing: '2px',
                    textTransform: 'uppercase' as const,
                  }}
                >
                  LEADERBOARD
                </button>
                {user ? (
                  <button
                    onClick={() => setShowShareModal(true)}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 50,
                      color: 'rgba(255,255,255,0.7)',
                      padding: '12px 30px',
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      letterSpacing: '2px',
                      textTransform: 'uppercase' as const,
                    }}
                  >
                    SHARE / GROUPS
                  </button>
                ) : (
                  <ShareButtonContainer
                    id="share-btn-container"
                    url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/${GAME_ID}/share/${score}` : ''}
                    text={`I scored ${score} on DROP! Can you beat me?`}
                    style="minimal"
                    socialLoaded={socialLoaded}
                  />
                )}
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
        {showShareModal && user && (
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
