'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Press_Start_2P } from 'next/font/google';

// Pixel font
const pressStart2P = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
});

const COLORS = [
  '#FF1493',   // Hot Pink
  '#00FFFF',   // Electric Blue
  '#FF6347',   // Tomato Red (for variety)
  '#00FF00'    // Neon Green
];

const BUTTON_SIZE = 100;
const FLASH_DURATION = 300;
const PAUSE_DURATION = 500;

export default function MemoryGame() {
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerSequence, setPlayerSequence] = useState<number[]>([]);
  const [isShowingSequence, setIsShowingSequence] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(0);

  const generateNextSequence = useCallback(() => {
    const nextColor = Math.floor(Math.random() * COLORS.length);
    return [...sequence, nextColor];
  }, [sequence]);

  const startGame = useCallback(() => {
    setSequence([Math.floor(Math.random() * COLORS.length)]);
    setPlayerSequence([]);
    setIsShowingSequence(true);
    setGameOver(false);
  }, []);

  const flashSequence = useCallback(() => {
    sequence.forEach((colorIndex, i) => {
      setTimeout(() => {
        const button = document.getElementById(`button-${colorIndex}`);
        if (button) {
          button.style.boxShadow = `0 0 20px ${COLORS[colorIndex]}`;
          setTimeout(() => {
            button.style.boxShadow = 'none';
            if (i === sequence.length - 1) {
              setTimeout(() => setIsShowingSequence(false), PAUSE_DURATION);
            }
          }, FLASH_DURATION);
        }
      }, (FLASH_DURATION + PAUSE_DURATION) * i);
    });
  }, [sequence]);

  useEffect(() => {
    if (isShowingSequence) {
      flashSequence();
    }
  }, [isShowingSequence, flashSequence]);

  const handleButtonClick = (colorIndex: number) => {
    if (isShowingSequence || gameOver) return;

    const newPlayerSequence = [...playerSequence, colorIndex];
    setPlayerSequence(newPlayerSequence);

    const isCorrectSoFar = newPlayerSequence.every(
      (color, index) => color === sequence[index]
    );

    if (!isCorrectSoFar) {
      setGameOver(true);
      if (sequence.length - 1 > highScore) {
        setHighScore(sequence.length - 1);
      }
      return;
    }

    if (newPlayerSequence.length === sequence.length) {
      setTimeout(() => {
        const nextSequence = generateNextSequence();
        setSequence(nextSequence);
        setPlayerSequence([]);
        setIsShowingSequence(true);
      }, PAUSE_DURATION);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#0D0D0D',
      fontFamily: pressStart2P.style.fontFamily
    }}>
      <h1 style={{
        color: '#FF1493',
        marginBottom: '20px',
        fontSize: '2rem',
        textShadow: '2px 2px #00FFFF'
      }}>
        Color Memory
      </h1>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
        filter: 'contrast(120%) brightness(110%)'
      }}>
        {COLORS.map((color, index) => (
          <button
            key={color}
            id={`button-${index}`}
            onClick={() => handleButtonClick(index)}
            style={{
              width: `${BUTTON_SIZE}px`,
              height: `${BUTTON_SIZE}px`,
              backgroundColor: color,
              border: '4px solid #00FFFF',
              opacity: 0.8,
              cursor: 'pointer',
              transition: 'all 0.2s',
              imageRendering: 'pixelated'
            }}
          />
        ))}
      </div>
      {gameOver && (
        <div style={{
          color: '#FFFFFF',
          marginTop: '20px',
          textAlign: 'center',
          fontFamily: pressStart2P.style.fontFamily
        }}>
          <p>Game Over!</p>
          <p>High Score: {highScore}</p>
          <button
            onClick={startGame}
            style={{
              backgroundColor: '#00FFFF',
              color: '#0D0D0D',
              border: '2px solid #FF1493',
              padding: '10px 20px',
              cursor: 'pointer',
              fontFamily: pressStart2P.style.fontFamily
            }}
          >
            Restart
          </button>
        </div>
      )}
      {!gameOver && sequence.length > 1 && (
        <p style={{
          color: '#FFFFFF',
          marginTop: '20px',
          fontFamily: pressStart2P.style.fontFamily
        }}>
          Round: {sequence.length - 1}
        </p>
      )}
    </div>
  );
}