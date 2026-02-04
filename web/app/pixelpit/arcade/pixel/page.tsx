'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

// INDIE BITE palette
const THEME = {
  bg: '#09090b',
  grid: '#18181b',
  gridLine: '#27272a',
  fill: '#22d3ee',      // Cyan for filled
  fillGlow: '#67e8f9',
  mark: '#f472b6',      // Pink for X marks
  hint: '#a1a1aa',
  hintComplete: '#4ade80',  // Green when row/col done
  text: '#fafafa',
  success: '#a3e635',
};

const GAME_ID = 'pixel';

// Puzzles: 0 = empty, 1 = filled in solution
const PUZZLES = [
  // 5x5 Tutorial tier
  {
    name: 'Heart',
    size: 5,
    solution: [
      [0, 1, 0, 1, 0],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [0, 1, 1, 1, 0],
      [0, 0, 1, 0, 0],
    ],
  },
  {
    name: 'Star',
    size: 5,
    solution: [
      [0, 0, 1, 0, 0],
      [0, 1, 1, 1, 0],
      [1, 1, 1, 1, 1],
      [0, 1, 1, 1, 0],
      [0, 1, 0, 1, 0],
    ],
  },
  {
    name: 'Arrow',
    size: 5,
    solution: [
      [0, 0, 1, 0, 0],
      [0, 0, 1, 1, 0],
      [1, 1, 1, 1, 1],
      [0, 0, 1, 1, 0],
      [0, 0, 1, 0, 0],
    ],
  },
  {
    name: 'Smiley',
    size: 5,
    solution: [
      [0, 1, 1, 1, 0],
      [1, 0, 1, 0, 1],
      [1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [0, 1, 1, 1, 0],
    ],
  },
  // 7x7 Level 2
  {
    name: 'Mushroom',
    size: 7,
    solution: [
      [0, 0, 1, 1, 1, 0, 0],
      [0, 1, 1, 1, 1, 1, 0],
      [1, 1, 1, 1, 1, 1, 1],
      [0, 0, 1, 1, 1, 0, 0],
      [0, 0, 1, 1, 1, 0, 0],
      [0, 1, 1, 0, 1, 1, 0],
      [0, 1, 1, 0, 1, 1, 0],
    ],
  },
  {
    name: 'Skull',
    size: 7,
    solution: [
      [0, 1, 1, 1, 1, 1, 0],
      [1, 1, 1, 1, 1, 1, 1],
      [1, 0, 1, 1, 1, 0, 1],
      [1, 1, 1, 1, 1, 1, 1],
      [0, 1, 0, 1, 0, 1, 0],
      [0, 0, 1, 1, 1, 0, 0],
      [0, 0, 1, 0, 1, 0, 0],
    ],
  },
];

// Calculate hints from solution
function getHints(solution: number[][]): { rows: number[][]; cols: number[][] } {
  const size = solution.length;
  const rows: number[][] = [];
  const cols: number[][] = [];

  // Row hints
  for (let r = 0; r < size; r++) {
    const hints: number[] = [];
    let count = 0;
    for (let c = 0; c < size; c++) {
      if (solution[r][c] === 1) {
        count++;
      } else if (count > 0) {
        hints.push(count);
        count = 0;
      }
    }
    if (count > 0) hints.push(count);
    rows.push(hints.length > 0 ? hints : [0]);
  }

  // Column hints
  for (let c = 0; c < size; c++) {
    const hints: number[] = [];
    let count = 0;
    for (let r = 0; r < size; r++) {
      if (solution[r][c] === 1) {
        count++;
      } else if (count > 0) {
        hints.push(count);
        count = 0;
      }
    }
    if (count > 0) hints.push(count);
    cols.push(hints.length > 0 ? hints : [0]);
  }

  return { rows, cols };
}

// Check if row/col is complete
function isLineComplete(line: number[], hints: number[]): boolean {
  const groups: number[] = [];
  let count = 0;
  for (const cell of line) {
    if (cell === 1) {
      count++;
    } else if (count > 0) {
      groups.push(count);
      count = 0;
    }
  }
  if (count > 0) groups.push(count);
  if (groups.length === 0) groups.push(0);
  
  if (groups.length !== hints.length) return false;
  return groups.every((g, i) => g === hints[i]);
}

// Audio
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.3;
  masterGain.connect(audioCtx.destination);
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playTick() {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 800;
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
}

function playMark() {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = 400;
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
}

function playLineComplete() {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 1200;
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
}

function playWin() {
  if (!audioCtx || !masterGain) return;
  [523, 659, 784, 1047].forEach((freq, i) => {
    setTimeout(() => {
      if (!audioCtx || !masterGain) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    }, i * 100);
  });
}

export default function PixelGame() {
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [grid, setGrid] = useState<number[][]>([]);  // 0=empty, 1=fill, 2=X
  const [solved, setSolved] = useState(false);
  const [completedRows, setCompletedRows] = useState<boolean[]>([]);
  const [completedCols, setCompletedCols] = useState<boolean[]>([]);

  const puzzle = PUZZLES[puzzleIndex];
  const hints = getHints(puzzle.solution);

  // Initialize grid
  useEffect(() => {
    const size = puzzle.size;
    setGrid(Array(size).fill(null).map(() => Array(size).fill(0)));
    setCompletedRows(Array(size).fill(false));
    setCompletedCols(Array(size).fill(false));
    setSolved(false);
  }, [puzzleIndex, puzzle.size]);

  // Check completion
  useEffect(() => {
    if (grid.length === 0) return;
    
    const size = puzzle.size;
    const newCompletedRows = [];
    const newCompletedCols = [];
    
    // Check rows
    for (let r = 0; r < size; r++) {
      const filled = grid[r].map(c => c === 1 ? 1 : 0);
      const complete = isLineComplete(filled, hints.rows[r]);
      newCompletedRows.push(complete);
      if (complete && !completedRows[r]) {
        playLineComplete();
      }
    }
    
    // Check cols
    for (let c = 0; c < size; c++) {
      const col = grid.map(row => row[c] === 1 ? 1 : 0);
      const complete = isLineComplete(col, hints.cols[c]);
      newCompletedCols.push(complete);
      if (complete && !completedCols[c]) {
        playLineComplete();
      }
    }
    
    setCompletedRows(newCompletedRows);
    setCompletedCols(newCompletedCols);
    
    // Check if puzzle solved
    if (newCompletedRows.every(Boolean) && newCompletedCols.every(Boolean)) {
      // Verify against solution
      let correct = true;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const filled = grid[r][c] === 1;
          if (filled !== (puzzle.solution[r][c] === 1)) {
            correct = false;
            break;
          }
        }
      }
      if (correct && !solved) {
        setSolved(true);
        playWin();
        // Analytics
        fetch('/api/pixelpit/stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ game: GAME_ID }),
        }).catch(() => {});
      }
    }
  }, [grid, puzzle, hints, completedRows, completedCols, solved]);

  const handleCellClick = useCallback((r: number, c: number) => {
    if (solved) return;
    initAudio();
    
    setGrid(prev => {
      const newGrid = prev.map(row => [...row]);
      // Cycle: 0 → 1 → 2 → 0
      newGrid[r][c] = (newGrid[r][c] + 1) % 3;
      
      if (newGrid[r][c] === 1) playTick();
      else if (newGrid[r][c] === 2) playMark();
      
      return newGrid;
    });
  }, [solved]);

  const nextPuzzle = useCallback(() => {
    setPuzzleIndex((prev) => (prev + 1) % PUZZLES.length);
  }, []);

  const CELL_SIZE = Math.min(50, (Math.min(window?.innerWidth || 400, window?.innerHeight || 600) - 200) / puzzle.size);
  const HINT_SIZE = CELL_SIZE * 0.6;

  return (
    <div style={{
      minHeight: '100vh',
      background: THEME.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      fontFamily: 'ui-monospace, monospace',
    }}>
      {/* Title */}
      <h1 style={{
        color: THEME.fill,
        fontSize: 36,
        fontWeight: 700,
        marginBottom: 10,
        textShadow: `0 0 20px ${THEME.fill}`,
      }}>
        PIXEL
      </h1>
      
      <p style={{
        color: THEME.hint,
        fontSize: 14,
        marginBottom: 20,
      }}>
        {puzzle.name} • {puzzle.size}x{puzzle.size}
      </p>

      {/* Grid with hints */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Column hints */}
        <div style={{ display: 'flex', marginLeft: HINT_SIZE * 3 }}>
          {hints.cols.map((colHints, c) => (
            <div
              key={c}
              style={{
                width: CELL_SIZE,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingBottom: 4,
                minHeight: HINT_SIZE * 3,
              }}
            >
              {colHints.map((h, i) => (
                <span
                  key={i}
                  style={{
                    color: completedCols[c] ? THEME.hintComplete : THEME.hint,
                    fontSize: 12,
                    lineHeight: 1.2,
                    transition: 'color 0.2s',
                  }}
                >
                  {h}
                </span>
              ))}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex' }}>
          {/* Row hints */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {hints.rows.map((rowHints, r) => (
              <div
                key={r}
                style={{
                  height: CELL_SIZE,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: 8,
                  minWidth: HINT_SIZE * 3,
                  gap: 4,
                }}
              >
                {rowHints.map((h, i) => (
                  <span
                    key={i}
                    style={{
                      color: completedRows[r] ? THEME.hintComplete : THEME.hint,
                      fontSize: 12,
                      transition: 'color 0.2s',
                    }}
                  >
                    {h}
                  </span>
                ))}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${puzzle.size}, ${CELL_SIZE}px)`,
              gap: 2,
              background: THEME.gridLine,
              padding: 2,
              borderRadius: 4,
            }}
          >
            {grid.map((row, r) =>
              row.map((cell, c) => (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    background: cell === 1 ? THEME.fill : THEME.grid,
                    border: 'none',
                    cursor: solved ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.1s',
                    boxShadow: cell === 1 ? `0 0 10px ${THEME.fill}` : 'none',
                  }}
                >
                  {cell === 2 && (
                    <span style={{ color: THEME.mark, fontSize: CELL_SIZE * 0.5, fontWeight: 700 }}>
                      ✕
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Solved state */}
      {solved && (
        <div style={{
          marginTop: 30,
          textAlign: 'center',
        }}>
          <p style={{
            color: THEME.success,
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 20,
            textShadow: `0 0 20px ${THEME.success}`,
          }}>
            ✓ {puzzle.name} Complete!
          </p>
          <button
            onClick={nextPuzzle}
            style={{
              background: THEME.fill,
              color: THEME.bg,
              border: 'none',
              padding: '12px 30px',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              borderRadius: 4,
            }}
          >
            Next Puzzle →
          </button>
        </div>
      )}

      {/* Instructions */}
      {!solved && (
        <p style={{
          color: THEME.hint,
          fontSize: 12,
          marginTop: 30,
          textAlign: 'center',
        }}>
          tap to fill • tap again to mark X • tap again to clear
        </p>
      )}
    </div>
  );
}
