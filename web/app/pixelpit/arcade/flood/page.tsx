'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
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

const GAME_ID = 'flood';
const GAME_NAME = 'FLOOD';
const GRID_SIZE = 10;
const MAX_MOVES = 20;

const PALETTE = [
  '#D4A574', // amber
  '#FFD700', // gold
  '#2D9596', // teal
  '#7B68EE', // violet
  '#FF69B4', // pink
  '#FF7F50', // coral
];

const COLORS = {
  bg: '#000000',
  surface: '#0D0D0D',
  primary: '#D4A574',
  secondary: '#2D9596',
  text: '#D4A574',
  muted: '#71717a',
  error: '#FF6B6B',
  gold: '#FFD700',
};

const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: COLORS.bg,
  surface: COLORS.surface,
  primary: COLORS.primary,
  secondary: COLORS.secondary,
  text: COLORS.text,
  muted: COLORS.muted,
  error: COLORS.error,
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: COLORS.bg,
  surface: COLORS.surface,
  primary: COLORS.primary,
  secondary: COLORS.secondary,
  text: COLORS.text,
  muted: COLORS.muted,
};

function generateGrid(): string[][] {
  const grid: string[][] = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    grid[i] = [];
    for (let j = 0; j < GRID_SIZE; j++) {
      grid[i][j] = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    }
  }
  return grid;
}

function getFloodedSet(grid: string[][]): Set<string> {
  const color = grid[0][0];
  const visited = new Set<string>();
  const stack = [[0, 0]];
  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) continue;
    if (grid[r][c] !== color) continue;
    visited.add(key);
    stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
  }
  return visited;
}

function floodFill(grid: string[][], newColor: string): string[][] {
  const oldColor = grid[0][0];
  if (oldColor === newColor) return grid;
  const newGrid = grid.map(row => [...row]);
  const stack = [[0, 0]];
  const visited = new Set<string>();
  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) continue;
    if (newGrid[r][c] !== oldColor) continue;
    visited.add(key);
    newGrid[r][c] = newColor;
    stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
  }
  return newGrid;
}

export default function FloodGame() {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'leaderboard'>('start');
  const [grid, setGrid] = useState<string[][]>(() => generateGrid());
  const [movesLeft, setMovesLeft] = useState(MAX_MOVES);
  const [score, setScore] = useState(0);
  const [filledPct, setFilledPct] = useState(0);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'win' | 'lose' | ''>('');

  const { user } = usePixelpitSocial(socialLoaded);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const GAME_URL = typeof window !== 'undefined'
    ? `${window.location.origin}/pixelpit/arcade/${GAME_ID}`
    : `https://pixelpit.gg/pixelpit/arcade/${GAME_ID}`;

  // Audio
  function playTone(freq: number, duration: number, type: OscillatorType = 'sine') {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  // Group code detection
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
    if (groupCode) window.PixelpitSocial.storeGroupCode(groupCode);
  }, [socialLoaded]);

  // Recalc filled percentage
  useEffect(() => {
    const flooded = getFloodedSet(grid);
    const pct = Math.round((flooded.size / (GRID_SIZE * GRID_SIZE)) * 100);
    setFilledPct(pct);
  }, [grid]);

  const startGame = useCallback(() => {
    const newGrid = generateGrid();
    setGrid(newGrid);
    setMovesLeft(MAX_MOVES);
    setScore(0);
    setMessage('');
    setMessageType('');
    setSubmittedEntryId(null);
    setProgression(null);
    setShowShareModal(false);
    setGameState('playing');
  }, []);

  const handleColorPick = useCallback((color: string) => {
    if (gameState !== 'playing') return;
    if (color === grid[0][0]) return;

    const newGrid = floodFill(grid, color);
    const newMovesLeft = movesLeft - 1;
    setGrid(newGrid);
    setMovesLeft(newMovesLeft);
    playTone(440, 0.2);

    const flooded = getFloodedSet(newGrid);
    const pct = Math.round((flooded.size / (GRID_SIZE * GRID_SIZE)) * 100);

    if (pct === 100) {
      // Win! Score = moves remaining (higher = better)
      const finalScore = newMovesLeft;
      setScore(finalScore);
      setMessage(`Solved in ${MAX_MOVES - newMovesLeft} moves!`);
      setMessageType('win');
      playTone(523, 0.1);
      setTimeout(() => playTone(659, 0.1), 100);
      setTimeout(() => playTone(784, 0.1), 200);
      setTimeout(() => playTone(1047, 0.3), 300);
      fetch('/api/pixelpit/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_ID }),
      }).catch(() => {});
      setGameState('gameover');
    } else if (newMovesLeft === 0) {
      // Lose — score 0
      setScore(0);
      setMessage(`Out of moves! ${pct}% filled`);
      setMessageType('lose');
      playTone(300, 0.15, 'sawtooth');
      setTimeout(() => playTone(200, 0.15, 'sawtooth'), 150);
      setTimeout(() => playTone(100, 0.3, 'sawtooth'), 300);
      fetch('/api/pixelpit/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_ID }),
      }).catch(() => {});
      setGameState('gameover');
    }
  }, [gameState, grid, movesLeft]);

  return (
    <>
      <Script
        src="/pixelpit/social.js"
        onLoad={() => setSocialLoaded(true)}
      />

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: ${COLORS.bg};
          font-family: 'Space Mono', ui-monospace, monospace;
          color: ${COLORS.text};
          user-select: none;
          -webkit-user-select: none;
          touch-action: manipulation;
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}>

        {/* START SCREEN */}
        {gameState === 'start' && (
          <div style={{ textAlign: 'center' }}>
            <h1 style={{
              fontSize: 48,
              fontWeight: 700,
              color: COLORS.primary,
              letterSpacing: 4,
              marginBottom: 10,
              textShadow: '0 0 20px #D4A57480',
            }}>
              {GAME_NAME}
            </h1>
            <p style={{
              fontSize: 14,
              color: COLORS.secondary,
              marginBottom: 40,
            }}>
              Fill the grid with one color
            </p>
            <button
              onClick={startGame}
              style={{
                background: COLORS.primary,
                color: COLORS.bg,
                border: 'none',
                padding: '16px 50px',
                fontSize: 18,
                fontFamily: "'Space Mono', monospace",
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: 8,
                letterSpacing: 2,
              }}
            >
              START
            </button>
            <div style={{
              marginTop: 40,
              fontSize: 12,
              letterSpacing: 3,
            }}>
              <span style={{ color: '#22d3ee' }}>pixel</span>
              <span style={{ color: '#a855f7' }}>pit</span>
              <span style={{ color: '#ffffff60' }}> arcade</span>
            </div>
          </div>
        )}

        {/* PLAYING SCREEN */}
        {gameState === 'playing' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            maxWidth: 500,
          }}>
            {/* Stats */}
            <div style={{
              display: 'flex',
              gap: 30,
              marginBottom: 20,
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: COLORS.secondary, letterSpacing: 2, marginBottom: 4 }}>MOVES LEFT</div>
                <div style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: movesLeft <= 3 ? COLORS.error : COLORS.gold,
                  transition: 'color 0.3s',
                }}>
                  {movesLeft}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: COLORS.secondary, letterSpacing: 2, marginBottom: 4 }}>FILLED</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.gold }}>
                  {filledPct}%
                </div>
              </div>
            </div>

            {/* Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
              gap: 2,
              background: COLORS.surface,
              padding: 2,
              width: '100%',
              aspectRatio: '1',
              marginBottom: 20,
            }}>
              {grid.flat().map((color, i) => (
                <div
                  key={i}
                  style={{
                    background: color,
                    aspectRatio: '1',
                    borderRadius: 2,
                    transition: 'background 0.15s ease',
                  }}
                />
              ))}
            </div>

            {/* Color buttons */}
            <div style={{
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}>
              {PALETTE.map((color) => {
                const isCurrent = color === grid[0][0];
                return (
                  <button
                    key={color}
                    onClick={() => handleColorPick(color)}
                    disabled={isCurrent}
                    style={{
                      width: 50,
                      height: 50,
                      background: color,
                      border: isCurrent ? '3px solid #FFD700' : '3px solid transparent',
                      borderRadius: 8,
                      cursor: isCurrent ? 'not-allowed' : 'pointer',
                      opacity: isCurrent ? 0.4 : 1,
                      boxShadow: isCurrent ? '0 0 20px #FFD70060' : 'none',
                      transition: 'all 0.2s ease',
                      minWidth: 44,
                      minHeight: 44,
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* GAME OVER SCREEN */}
        {gameState === 'gameover' && (
          <div style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: 400,
            width: '100%',
          }}>
            <div style={{
              fontSize: 20,
              color: messageType === 'win' ? '#4ADE80' : COLORS.error,
              letterSpacing: 4,
              marginBottom: 12,
              textShadow: messageType === 'win'
                ? '0 0 20px #4ADE8080'
                : '0 0 20px #FF6B6B80',
            }}>
              {messageType === 'win' ? 'YOU WIN!' : 'GAME OVER'}
            </div>

            <div style={{
              fontSize: 80,
              fontWeight: 200,
              color: COLORS.primary,
              marginBottom: 8,
              lineHeight: 1,
            }}>
              {score}
            </div>

            <div style={{
              fontSize: 12,
              color: COLORS.muted,
              letterSpacing: 2,
              marginBottom: 8,
            }}>
              {message}
            </div>

            <div style={{
              fontSize: 12,
              color: COLORS.muted,
              marginBottom: 30,
            }}>
              score = moves remaining
            </div>

            {/* Progression */}
            {progression && (
              <div style={{
                background: COLORS.surface,
                borderRadius: 12,
                padding: '16px 24px',
                marginBottom: 20,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 18, color: COLORS.primary, marginBottom: 8 }}>
                  +{progression.xpEarned} XP
                </div>
                <div style={{ fontSize: 12, color: COLORS.muted }}>
                  Level {progression.level}{progression.streak > 1 ? ` · ${progression.multiplier}x streak` : ''}
                </div>
              </div>
            )}

            {/* Score submission */}
            <ScoreFlow
              score={score}
              gameId={GAME_ID}
              colors={SCORE_FLOW_COLORS}
              maxScore={15}
              onRankReceived={(rank, entryId) => {
                setSubmittedEntryId(entryId ?? null);
              }}
              onProgression={(prog) => setProgression(prog)}
            />

            {/* Actions */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              alignItems: 'center',
              marginTop: 20,
              width: '100%',
            }}>
              <button
                onClick={startGame}
                style={{
                  background: COLORS.primary,
                  color: COLORS.bg,
                  border: 'none',
                  borderRadius: 8,
                  padding: '14px 40px',
                  fontSize: 15,
                  fontFamily: "'Space Mono', monospace",
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: 2,
                }}
              >
                play again
              </button>
              <button
                onClick={() => setGameState('leaderboard')}
                style={{
                  background: 'transparent',
                  border: `1px solid ${COLORS.surface}`,
                  borderRadius: 6,
                  color: COLORS.muted,
                  padding: '12px 30px',
                  fontSize: 11,
                  fontFamily: "'Space Mono', monospace",
                  cursor: 'pointer',
                  letterSpacing: 2,
                }}
              >
                leaderboard
              </button>
              {user ? (
                <button
                  onClick={() => setShowShareModal(true)}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${COLORS.surface}`,
                    borderRadius: 6,
                    color: COLORS.muted,
                    padding: '12px 30px',
                    fontSize: 11,
                    fontFamily: "'Space Mono', monospace",
                    cursor: 'pointer',
                    letterSpacing: 2,
                  }}
                >
                  share / groups
                </button>
              ) : (
                <ShareButtonContainer
                  id="share-btn-container"
                  url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/${GAME_ID}/share/${score}` : ''}
                  text={`I scored ${score} on FLOOD! Can you beat me? 🎨`}
                  style="minimal"
                  socialLoaded={socialLoaded}
                />
              )}
            </div>
          </div>
        )}

        {/* LEADERBOARD */}
        {gameState === 'leaderboard' && (
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
        )}

        {/* SHARE MODAL */}
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
