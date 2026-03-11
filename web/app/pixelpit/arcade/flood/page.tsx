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
  '#FF6B6B', // red
  '#FECA57', // yellow
  '#48DBFB', // sky blue
  '#A55EEA', // purple
  '#FF9FF3', // pink
  '#1DD1A1', // green
];

const COLORS = {
  bg: '#FFF8F0',
  surface: '#FFF0E0',
  primary: '#FF6B6B',
  secondary: '#A55EEA',
  text: '#2D3436',
  muted: '#999999',
  error: '#FF4757',
  gold: '#FECA57',
  accent: '#48DBFB',
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

function floodFill(grid: string[][], newColor: string): { grid: string[][]; tilesChanged: number; order: [number, number][] } {
  const oldColor = grid[0][0];
  if (oldColor === newColor) return { grid, tilesChanged: 0, order: [] };
  const newGrid = grid.map(row => [...row]);
  // BFS so tiles radiate outward from the flood front
  const queue: [number, number][] = [[0, 0]];
  const visited = new Set<string>();
  const order: [number, number][] = [];
  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) continue;
    if (newGrid[r][c] !== oldColor) continue;
    visited.add(key);
    newGrid[r][c] = newColor;
    order.push([r, c]);
    queue.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
  }
  return { grid: newGrid, tilesChanged: order.length, order };
}

// Scoring: 100 base for completing in 20 moves, +50 bonus per move saved (cumulative)
// 20 moves = 100, 19 = 150, 18 = 250, 17 = 400, 16 = 600, ...
function calcScore(movesUsed: number): number {
  if (movesUsed > MAX_MOVES) return 0;
  let total = 100;
  const movesSaved = MAX_MOVES - movesUsed;
  let bonus = 50;
  for (let i = 0; i < movesSaved; i++) {
    total += bonus;
    bonus += 50;
  }
  return total;
}

const STREAK_KEY = 'flood_streak';
const CUMULATIVE_KEY = 'flood_cumulative';

function loadStreak(): { streak: number; cumulative: number } {
  if (typeof window === 'undefined') return { streak: 0, cumulative: 0 };
  try {
    return {
      streak: parseInt(localStorage.getItem(STREAK_KEY) || '0', 10),
      cumulative: parseInt(localStorage.getItem(CUMULATIVE_KEY) || '0', 10),
    };
  } catch { return { streak: 0, cumulative: 0 }; }
}

function saveStreak(streak: number, cumulative: number) {
  try {
    localStorage.setItem(STREAK_KEY, String(streak));
    localStorage.setItem(CUMULATIVE_KEY, String(cumulative));
  } catch {}
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
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const [blinkOn, setBlinkOn] = useState(true);
  const [streak, setStreak] = useState(0);
  const [cumulative, setCumulative] = useState(0);
  const [magicColor, setMagicColor] = useState<string>('');
  const [gotMagicBonus, setGotMagicBonus] = useState(false);
  const [scoreToSubmit, setScoreToSubmit] = useState(0);
  const [animating, setAnimating] = useState(false);
  const animTimeouts = useRef<NodeJS.Timeout[]>([]);

  const { user } = usePixelpitSocial(socialLoaded);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Load streak on mount
  useEffect(() => {
    const s = loadStreak();
    setStreak(s.streak);
    setCumulative(s.cumulative);
  }, []);

  // Blink the top-left cell until user picks a color
  useEffect(() => {
    if (gameState !== 'playing' || hasStartedPlaying) return;
    const interval = setInterval(() => setBlinkOn(b => !b), 500);
    return () => clearInterval(interval);
  }, [gameState, hasStartedPlaying]);

  const GAME_URL = typeof window !== 'undefined'
    ? `${window.location.origin}/pixelpit/arcade/${GAME_ID}`
    : `https://pixelpit.gg/pixelpit/arcade/${GAME_ID}`;

  // Audio — iOS-safe: resume context on user gesture
  function getAudioCtx(): AudioContext {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // Simple pop sound — same style as emoji game's playSoftSound
  function playPop(ctx: AudioContext, freq: number, duration: number, type: OscillatorType = 'sine', vol = 0.15) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  // Cascade: poppy ascending pops, one per tile
  function playCascade(tileCount: number) {
    const ctx = getAudioCtx();
    const count = Math.min(tileCount, 30);
    if (count === 0) return;
    for (let i = 0; i < count; i++) {
      const t = i / Math.max(count - 1, 1);
      // Pitch climbs from 880 to 1600
      const freq = 880 + 720 * t;
      const delay = i * 50; // 50ms between each pop
      setTimeout(() => {
        playPop(ctx, freq, 0.08, 'sine', 0.12);
      }, delay);
    }
  }

  // Win: emoji-style ascending fanfare
  function playWinSound() {
    const ctx = getAudioCtx();
    [784, 988, 1175, 1568].forEach((freq, i) => {
      setTimeout(() => playPop(ctx, freq, 0.15, 'sine', 0.15), i * 80);
    });
  }

  // Lose: descending buzz
  function playLoseSound() {
    const ctx = getAudioCtx();
    [200, 120].forEach((freq, i) => {
      setTimeout(() => playPop(ctx, freq, 0.15, 'square', 0.1), i * 50);
    });
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
    setHasStartedPlaying(false);
    setBlinkOn(true);
    setGotMagicBonus(false);
    setScoreToSubmit(0);
    setAnimating(false);
    animTimeouts.current.forEach(clearTimeout);
    animTimeouts.current = [];
    // Pick a random magic color (different from starting color)
    const available = PALETTE.filter(c => c !== newGrid[0][0]);
    setMagicColor(available[Math.floor(Math.random() * available.length)]);
    setGameState('playing');
  }, []);

  const handleColorPick = useCallback((color: string) => {
    if (gameState !== 'playing' || animating) return;
    if (color === grid[0][0]) return;

    if (!hasStartedPlaying) setHasStartedPlaying(true);

    const { grid: newGrid, tilesChanged, order } = floodFill(grid, color);
    const newMovesLeft = movesLeft - 1;
    setMovesLeft(newMovesLeft);

    // Animate tiles one by one at 50ms intervals
    setAnimating(true);
    animTimeouts.current.forEach(clearTimeout);
    animTimeouts.current = [];
    const count = Math.min(order.length, 30);
    // Set grid progressively
    let currentGrid = grid.map(row => [...row]);
    for (let i = 0; i < order.length; i++) {
      const delay = i < count ? i * 50 : (count - 1) * 50; // overflow tiles finish with last pop
      const t = animTimeouts.current.length;
      animTimeouts.current.push(setTimeout(() => {
        currentGrid = currentGrid.map(row => [...row]);
        currentGrid[order[i][0]][order[i][1]] = color;
        setGrid(currentGrid.map(row => [...row]));
      }, delay));
    }
    // Sound cascade in sync
    playCascade(tilesChanged);

    // After animation completes, finalize and check win/lose
    const totalDuration = Math.min(order.length, count) * 50 + 60;
    animTimeouts.current.push(setTimeout(() => {
      setGrid(newGrid);
      setAnimating(false);

      const flooded = getFloodedSet(newGrid);
      const pct = Math.round((flooded.size / (GRID_SIZE * GRID_SIZE)) * 100);

      if (pct === 100) {
        const movesUsed = MAX_MOVES - newMovesLeft;
        let finalScore = calcScore(movesUsed);
        const isMagic = color === magicColor;
        if (isMagic) {
          finalScore += 500;
          setGotMagicBonus(true);
        }
        const newStreak = streak + 1;
        const newCumulative = cumulative + finalScore;
        setScore(finalScore);
        setStreak(newStreak);
        setCumulative(newCumulative);
        setScoreToSubmit(newCumulative);
        saveStreak(newStreak, newCumulative);
        setMessage(`Solved in ${movesUsed} moves!`);
        setMessageType('win');
        setTimeout(() => playWinSound(), 200);
        fetch('/api/pixelpit/stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ game: GAME_ID }),
        }).catch(() => {});
        setGameState('gameover');
      } else if (newMovesLeft === 0) {
        setScore(0);
        setScoreToSubmit(cumulative); // preserve streak score for leaderboard
        setStreak(0);
        setCumulative(0);
        saveStreak(0, 0);
        setMessage(`Out of moves! ${pct}% filled`);
        setMessageType('lose');
        playLoseSound();
        fetch('/api/pixelpit/stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ game: GAME_ID }),
        }).catch(() => {});
        setGameState('gameover');
      }
    }, totalDuration));
  }, [gameState, grid, movesLeft, animating, hasStartedPlaying, magicColor, streak, cumulative]);

  return (
    <>
      <Script
        src="/pixelpit/social.js"
        onLoad={() => setSocialLoaded(true)}
      />

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: ${COLORS.bg};
          font-family: 'Nunito', -apple-system, sans-serif;
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
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* START SCREEN */}
        {gameState === 'start' && (
          <div style={{ textAlign: 'center' }}>
            <h1 style={{
              fontSize: 56,
              fontWeight: 900,
              color: COLORS.primary,
              letterSpacing: 2,
              marginBottom: 8,
            }}>
              {GAME_NAME}
            </h1>
            <p style={{
              fontSize: 16,
              color: COLORS.secondary,
              fontWeight: 700,
              marginBottom: 40,
            }}>
              Flood the zone.
            </p>
            {streak > 0 && (
              <div style={{
                marginBottom: 24,
                padding: '12px 24px',
                background: '#FFFFFF',
                borderRadius: 16,
                display: 'flex',
                gap: 24,
                justifyContent: 'center',
                boxShadow: '0 2px 12px #00000010',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, letterSpacing: 1 }}>STREAK</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#1DD1A1' }}>{streak}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, letterSpacing: 1 }}>TOTAL</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: COLORS.primary }}>{cumulative}</div>
                </div>
              </div>
            )}
            <button
              onClick={() => { getAudioCtx(); startGame(); }}
              style={{
                background: COLORS.primary,
                color: '#FFFFFF',
                border: 'none',
                padding: '18px 56px',
                fontSize: 20,
                fontFamily: "'Nunito', sans-serif",
                fontWeight: 900,
                cursor: 'pointer',
                borderRadius: 50,
                letterSpacing: 1,
                boxShadow: '0 4px 16px #FF6B6B40',
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
              gap: 20,
              marginBottom: 20,
              alignItems: 'flex-end',
              width: '100%',
              justifyContent: 'center',
              position: 'relative',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 2 }}>MOVES</div>
                <div style={{
                  fontSize: 28,
                  fontWeight: 900,
                  color: movesLeft <= 3 ? COLORS.error : COLORS.text,
                  transition: 'color 0.3s',
                }}>
                  {movesLeft}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 2 }}>FILLED</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: COLORS.secondary }}>
                  {filledPct}%
                </div>
              </div>
              {streak > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 2 }}>STREAK</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#1DD1A1' }}>
                    {streak}
                  </div>
                </div>
              )}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#FFFFFF',
                borderRadius: 50,
                padding: '6px 12px',
                boxShadow: '0 2px 8px #00000010',
                position: 'absolute',
                right: 0,
                bottom: 4,
              }}>
                <span style={{ fontSize: 16 }}>🔥</span>
                <div style={{
                  width: 22,
                  height: 22,
                  background: magicColor,
                  borderRadius: 50,
                  boxShadow: `0 2px 6px ${magicColor}50`,
                }} />
              </div>
            </div>

            {/* Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
              gap: 3,
              background: '#FFFFFF',
              padding: 3,
              borderRadius: 16,
              width: '100%',
              aspectRatio: '1',
              marginBottom: 20,
              boxShadow: '0 2px 16px #00000010',
            }}>
              {grid.flat().map((color, i) => {
                const isTopLeft = i === 0;
                const shouldBlink = isTopLeft && !hasStartedPlaying;
                return (
                  <div
                    key={i}
                    style={{
                      background: shouldBlink && !blinkOn ? '#FFFFFF' : color,
                      aspectRatio: '1',
                      borderRadius: 4,
                      transition: 'background 0.15s ease',
                      boxShadow: shouldBlink ? '0 0 12px #A55EEA80' : 'none',
                    }}
                  />
                );
              })}
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
                      border: isCurrent ? '3px solid #2D3436' : '3px solid transparent',
                      borderRadius: 50,
                      cursor: isCurrent ? 'not-allowed' : 'pointer',
                      opacity: isCurrent ? 0.3 : 1,
                      boxShadow: isCurrent ? 'none' : '0 3px 10px #00000015',
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
              fontSize: 22,
              fontWeight: 900,
              color: messageType === 'win' ? '#1DD1A1' : COLORS.error,
              letterSpacing: 2,
              marginBottom: 12,
            }}>
              {messageType === 'win' ? 'YOU WIN!' : 'GAME OVER'}
            </div>

            <div style={{
              fontSize: 80,
              fontWeight: 900,
              color: COLORS.primary,
              marginBottom: 8,
              lineHeight: 1,
            }}>
              {scoreToSubmit}
            </div>

            <div style={{
              fontSize: 14,
              color: COLORS.muted,
              fontWeight: 700,
              marginBottom: 8,
            }}>
              {message}
            </div>

            {gotMagicBonus && (
              <div style={{
                fontSize: 15,
                fontWeight: 900,
                color: magicColor,
                marginBottom: 8,
                letterSpacing: 1,
              }}>
                +500 MAGIC COLOR BONUS!
              </div>
            )}

            {streak > 0 && (
              <div style={{
                display: 'flex',
                gap: 16,
                justifyContent: 'center',
                marginBottom: 12,
                padding: '10px 20px',
                background: '#FFFFFF',
                borderRadius: 50,
                boxShadow: '0 2px 8px #00000010',
              }}>
                <span style={{ fontSize: 14, fontWeight: 900, color: '#1DD1A1' }}>
                  STREAK {streak}
                </span>
                <span style={{ fontSize: 14, fontWeight: 900, color: COLORS.secondary }}>
                  TOTAL {cumulative}
                </span>
              </div>
            )}

            {/* Progression */}
            {progression && (
              <div style={{
                background: '#FFFFFF',
                borderRadius: 16,
                padding: '16px 24px',
                marginBottom: 20,
                textAlign: 'center',
                boxShadow: '0 2px 8px #00000010',
              }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: COLORS.secondary, marginBottom: 4 }}>
                  +{progression.xpEarned} XP
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted }}>
                  Level {progression.level}{progression.streak > 1 ? ` · ${progression.multiplier}x streak` : ''}
                </div>
              </div>
            )}

            {/* Score submission — only show if there's a score worth submitting */}
            {scoreToSubmit > 0 && (
              <ScoreFlow
                score={scoreToSubmit}
                gameId={GAME_ID}
                colors={SCORE_FLOW_COLORS}
                maxScore={2000}
                onRankReceived={(rank, entryId) => {
                  setSubmittedEntryId(entryId ?? null);
                }}
                onProgression={(prog) => setProgression(prog)}
              />
            )}

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
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 50,
                  padding: '16px 48px',
                  fontSize: 16,
                  fontFamily: "'Nunito', sans-serif",
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px #FF6B6B40',
                }}
              >
                play again
              </button>
              <button
                onClick={() => setGameState('leaderboard')}
                style={{
                  background: '#FFFFFF',
                  border: 'none',
                  borderRadius: 50,
                  color: COLORS.muted,
                  padding: '12px 30px',
                  fontSize: 13,
                  fontFamily: "'Nunito', sans-serif",
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px #00000008',
                }}
              >
                leaderboard
              </button>
              {user ? (
                <button
                  onClick={() => setShowShareModal(true)}
                  style={{
                    background: '#FFFFFF',
                    border: 'none',
                    borderRadius: 50,
                    color: COLORS.muted,
                    padding: '12px 30px',
                    fontSize: 13,
                    fontFamily: "'Nunito', sans-serif",
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px #00000008',
                  }}
                >
                  share / groups
                </button>
              ) : (
                <ShareButtonContainer
                  id="share-btn-container"
                  url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/${GAME_ID}/share/${scoreToSubmit}` : ''}
                  text={`I scored ${scoreToSubmit} on FLOOD! 🎨`}
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
            score={scoreToSubmit}
            colors={LEADERBOARD_COLORS}
            onClose={() => setShowShareModal(false)}
          />
        )}
      </div>
    </>
  );
}
