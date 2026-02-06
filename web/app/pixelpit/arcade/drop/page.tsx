'use client';

import React, { useState, useCallback, Suspense, lazy } from 'react';

const Game3D = lazy(() => import('./Game3D'));

const THEME = {
  bg: '#0f172a',
  bgDeep: '#09090b',
  text: '#f8fafc',
  pink: '#FF1493',
  cyan: '#22d3ee',
  red: '#ef4444',
  gold: '#facc15',
};

const GAME_ID = 'drop';

export default function DropGame() {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);

  const startGame = useCallback(() => {
    setScore(0);
    setCombo(0);
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
    <div style={{
      position: 'fixed',
      inset: 0,
      background: THEME.bg,
      fontFamily: 'ui-monospace, "Cascadia Code", "Fira Code", monospace',
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
          background: `radial-gradient(ellipse at 50% 60%, ${THEME.bg} 0%, ${THEME.bgDeep} 100%)`,
        }}>
          <h1 style={{
            color: THEME.cyan,
            fontSize: 72,
            marginBottom: 8,
            fontWeight: 900,
            letterSpacing: '-2px',
            textShadow: `0 0 40px ${THEME.cyan}44, 0 0 80px ${THEME.cyan}22`,
          }}>
            DROP
          </h1>

          <p style={{
            color: `${THEME.text}bb`,
            fontSize: 14,
            marginBottom: 40,
            textAlign: 'center',
            lineHeight: 1.8,
            maxWidth: 260,
            letterSpacing: '0.5px',
          }}>
            Swipe to rotate the tower.<br />
            Fall through the gaps.<br />
            <span style={{ color: THEME.red }}>Avoid the red zones.</span>
          </p>

          <button
            onClick={startGame}
            style={{
              background: THEME.pink,
              color: '#fff',
              border: 'none',
              padding: '16px 56px',
              fontSize: 16,
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: 'pointer',
              borderRadius: 4,
              letterSpacing: '2px',
              textTransform: 'uppercase' as const,
              boxShadow: `0 0 30px ${THEME.pink}66`,
            }}
          >
            FALL
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
              color: THEME.text,
              fontSize: 40,
              fontWeight: 900,
              textShadow: `0 0 20px ${THEME.cyan}66`,
              letterSpacing: '-1px',
            }}>
              {score}
            </div>
            {combo > 1 && (
              <div style={{
                color: THEME.gold,
                fontSize: Math.min(20 + combo * 2, 36),
                fontWeight: 900,
                textShadow: `0 0 20px ${THEME.gold}88`,
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
              color: `${THEME.text}44`,
              fontSize: 12,
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
          background: THEME.bgDeep,
          zIndex: 10,
        }}>
          <h1 style={{
            color: THEME.red,
            fontSize: 56,
            fontWeight: 900,
            marginBottom: 8,
            textShadow: `0 0 40px ${THEME.red}66`,
            letterSpacing: '-1px',
          }}>
            ZAPPED
          </h1>
          <p style={{
            color: `${THEME.text}88`,
            fontSize: 14,
            marginBottom: 8,
            letterSpacing: '2px',
            textTransform: 'uppercase' as const,
          }}>
            Score
          </p>
          <p style={{
            color: THEME.text,
            fontSize: 48,
            fontWeight: 900,
            marginBottom: 40,
            textShadow: `0 0 20px ${THEME.cyan}44`,
          }}>
            {score}
          </p>
          <button
            onClick={startGame}
            style={{
              background: 'transparent',
              color: THEME.pink,
              border: `2px solid ${THEME.pink}`,
              padding: '14px 48px',
              fontSize: 14,
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: 'pointer',
              borderRadius: 4,
              letterSpacing: '2px',
              textTransform: 'uppercase' as const,
              boxShadow: `0 0 20px ${THEME.pink}33`,
            }}
          >
            AGAIN
          </button>
        </div>
      )}
    </div>
  );
}
