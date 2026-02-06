'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Three.js components (no SSR)
const Game3D = dynamic(() => import('./Game3D'), { ssr: false });

const THEME = {
  sky: '#87ceeb',
  skyDark: '#1e3a5f',
  text: '#ffffff',
  raindrop: '#4fc3f7',
  stormGlow: '#ff4444',
  combo: '#ffd700',
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
      background: `linear-gradient(180deg, ${THEME.sky} 0%, ${THEME.skyDark} 100%)`,
      fontFamily: 'ui-monospace, monospace',
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
        }}>
          <div style={{ fontSize: 80, marginBottom: 10 }}>💧</div>
          <h1 style={{
            color: THEME.text,
            fontSize: 56,
            marginBottom: 10,
            fontWeight: 900,
            textShadow: '0 4px 8px rgba(0,0,0,0.3)',
          }}>
            DROP
          </h1>

          <p style={{
            color: 'rgba(255,255,255,0.9)',
            fontSize: 16,
            marginBottom: 30,
            textAlign: 'center',
            lineHeight: 1.6,
            maxWidth: 280,
          }}>
            Swipe to rotate the tower.<br />
            Fall through the gaps.<br />
            <span style={{ color: THEME.stormGlow }}>Avoid the storm clouds!</span>
          </p>

          <button
            onClick={startGame}
            style={{
              background: THEME.raindrop,
              color: '#fff',
              border: 'none',
              padding: '18px 60px',
              fontSize: 18,
              fontWeight: 700,
              cursor: 'pointer',
              borderRadius: 30,
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            }}
          >
            FALL
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <>
          <Game3D 
            onGameOver={handleGameOver}
            onScoreUpdate={handleScoreUpdate}
          />
          {/* UI Overlay */}
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
              fontSize: 32,
              fontWeight: 'bold',
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}>
              {score}
            </div>
            {combo > 1 && (
              <div style={{
                color: THEME.combo,
                fontSize: 24,
                fontWeight: 'bold',
                textShadow: '0 2px 8px rgba(0,0,0,0.5)',
              }}>
                ×{combo}
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
              fontSize: 14,
            }}>
              ← swipe to rotate →
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
          background: 'linear-gradient(180deg, #1e3a5f 0%, #0d1b2a 100%)',
          zIndex: 10,
        }}>
          <div style={{ fontSize: 60, marginBottom: 10 }}>⚡</div>
          <h1 style={{ color: THEME.stormGlow, fontSize: 48, marginBottom: 10 }}>
            ZAPPED!
          </h1>
          <p style={{ color: THEME.text, fontSize: 24, marginBottom: 30 }}>
            Score: {score}
          </p>
          <button
            onClick={startGame}
            style={{
              background: THEME.raindrop,
              color: '#fff',
              border: 'none',
              padding: '16px 50px',
              fontSize: 18,
              fontWeight: 600,
              cursor: 'pointer',
              borderRadius: 30,
            }}
          >
            TRY AGAIN
          </button>
        </div>
      )}
    </div>
  );
}
