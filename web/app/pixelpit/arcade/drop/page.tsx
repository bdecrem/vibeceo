'use client';

import React, { useState, useCallback, Suspense, lazy } from 'react';

const Game3D = lazy(() => import('./Game3D'));

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
        }}>
          <h1 style={{
            color: '#ffffff',
            fontSize: 60,
            fontWeight: 900,
            marginBottom: 8,
            textShadow: '0 4px 0 rgba(0,0,0,0.1), 0 8px 20px rgba(0,0,0,0.08)',
            letterSpacing: '-1px',
          }}>
            OOPS!
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: 15,
            marginBottom: 8,
            letterSpacing: '2px',
            fontWeight: 700,
            textTransform: 'uppercase' as const,
          }}>
            Score
          </p>
          <p style={{
            color: '#ffffff',
            fontSize: 52,
            fontWeight: 900,
            marginBottom: 40,
            textShadow: '0 2px 0 rgba(0,0,0,0.1)',
          }}>
            {score}
          </p>
          <button
            onClick={startGame}
            style={{
              background: THEME.orange,
              color: '#fff',
              border: 'none',
              padding: '16px 52px',
              fontSize: 16,
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
        </div>
      )}
    </div>
  );
}
