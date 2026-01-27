'use client';

import React, { useState, useCallback } from 'react';
import { Press_Start_2P } from 'next/font/google';

const pixelFont = Press_Start_2P({
  weight: '400',
  subsets: ['latin']
});

// Pixelpit character pixel art elements
const PIXEL_BORDER_RADIUS = 'rounded-sm'; // Pixelated, not smooth
const PIXEL_SHADOW = 'shadow-[0_4px_0_#1a1a2e]'; // Retro pixel game shadow effect

// Pixelpit Color Palette
const COLORS = [
  { name: 'CYAN', color: '#00FFFF', textColor: '#1a1a2e' },   // Electric Cyan
  { name: 'GOLD', color: '#FFD700', textColor: '#0f0f1a' },   // Gold
  { name: 'PINK', color: '#FF1493', textColor: 'white' },     // Dot's Pink
  { name: 'PURPLE', color: '#8B5CF6', textColor: 'white' },   // Chip's Purple
  { name: 'ORANGE', color: '#FF8C00', textColor: '#0f0f1a' }, // Pit's Orange
  { name: 'GREEN', color: '#00AA66', textColor: 'white' }     // Bug's Green
];

export default function ColorMatchGame() {
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'completed'>('start');
  const [currentChallenge, setCurrentChallenge] = useState<{
    colorNameText: string;
    colorNameColor: string;
    textColor: string;
    correctAnswer: boolean;
  } | null>(null);

  const generateChallenge = useCallback(() => {
    const colorNameText = COLORS[Math.floor(Math.random() * COLORS.length)].name;
    const colorDisplayColor = COLORS[Math.floor(Math.random() * COLORS.length)].color;

    const correctAnswer = Math.random() > 0.5;
    const displayedColorName = correctAnswer
      ? colorNameText
      : COLORS.find(c => c.name !== colorNameText)!.name;

    const selectedColor = COLORS.find(c => c.color === colorDisplayColor)!;

    return {
      colorNameText: displayedColorName,
      colorNameColor: colorDisplayColor,
      textColor: selectedColor.textColor,
      correctAnswer
    };
  }, []);

  const startGame = () => {
    setCurrentRound(0);
    setScore(0);
    setGameState('playing');
    setCurrentChallenge(generateChallenge());
  };

  const handleAnswer = (playerAnswer: boolean) => {
    if (gameState !== 'playing') return;

    if (playerAnswer === currentChallenge!.correctAnswer) {
      setScore(prev => prev + 1);
    }

    const nextRound = currentRound + 1;
    if (nextRound >= 10) {
      setGameState('completed');
    } else {
      setCurrentRound(nextRound);
      setCurrentChallenge(generateChallenge());
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-darker-blue overflow-x-hidden"
      style={{ fontFamily: pixelFont.style.fontFamily }}
    >
      {gameState === 'start' && (
        <div
          className={`
            bg-[#1a1a2e] p-6 ${PIXEL_BORDER_RADIUS} ${PIXEL_SHADOW}
            w-full max-w-md mx-auto
          `}
        >
          <h1 className="text-2xl sm:text-4xl mb-6 text-electric-cyan tracking-wider">Color Match</h1>
          <p className="mb-6 text-white text-xs sm:text-sm leading-relaxed">
            Match colors like a pixel pro! 🎨<br />
            Tap YES if the color name matches the text color.<br />
            Tap NO if it doesn't!
          </p>
          <button
            onClick={startGame}
            className={`
              bg-electric-cyan text-dark-blue
              px-8 py-4 ${PIXEL_BORDER_RADIUS} ${PIXEL_SHADOW}
              text-lg sm:text-xl uppercase tracking-wider
              hover:translate-y-1 hover:shadow-none transition-transform
              active:bg-opacity-80
              w-full min-h-[44px] min-w-[44px]  // Ensure touch target size
            `}
          >
            Start Game
          </button>
        </div>
      )}

      {gameState === 'playing' && currentChallenge && (
        <div
          className={`
            w-full max-w-md bg-[#1a1a2e] p-6 ${PIXEL_BORDER_RADIUS} ${PIXEL_SHADOW}
            mx-auto
          `}
        >
          <div className="mb-6 text-white flex justify-between items-center">
            <p className="text-xs sm:text-sm">Round {currentRound + 1} / 10</p>
            <p className="text-xs sm:text-sm">Score: {score}</p>
          </div>
          <div
            className={`
              text-2xl sm:text-4xl mb-8 py-8 ${PIXEL_BORDER_RADIUS}
              flex items-center justify-center
            `}
            style={{
              color: currentChallenge.colorNameColor,
              backgroundColor: currentChallenge.textColor
            }}
          >
            {currentChallenge.colorNameText}
          </div>
          <div className="flex justify-center space-x-4 sm:space-x-8">
            <button
              onClick={() => handleAnswer(true)}
              className={`
                bg-electric-cyan text-dark-blue
                px-8 py-4 ${PIXEL_BORDER_RADIUS} ${PIXEL_SHADOW}
                text-xl uppercase tracking-wider
                hover:translate-y-1 hover:shadow-none transition-transform
                active:bg-opacity-80
                min-h-[44px] min-w-[44px]  // Ensure touch target size
              `}
            >
              Yes
            </button>
            <button
              onClick={() => handleAnswer(false)}
              className={`
                bg-gold text-dark-blue
                px-8 py-4 ${PIXEL_BORDER_RADIUS} ${PIXEL_SHADOW}
                text-xl uppercase tracking-wider
                hover:translate-y-1 hover:shadow-none transition-transform
                active:bg-opacity-80
                min-h-[44px] min-w-[44px]  // Ensure touch target size
              `}
            >
              No
            </button>
          </div>
        </div>
      )}

      {gameState === 'completed' && (
        <div
          className={`
            bg-[#1a1a2e] p-6 ${PIXEL_BORDER_RADIUS} ${PIXEL_SHADOW} text-white
            w-full max-w-md mx-auto
          `}
        >
          <h2 className="text-2xl sm:text-3xl mb-4 text-electric-cyan tracking-wider">Game Over!</h2>
          <p className="text-lg sm:text-xl mb-6">Your Score: {score} / 10</p>
          <button
            onClick={startGame}
            className={`
              bg-electric-cyan text-dark-blue
              px-8 py-4 ${PIXEL_BORDER_RADIUS} ${PIXEL_SHADOW}
              text-lg sm:text-xl uppercase tracking-wider
              hover:translate-y-1 hover:shadow-none transition-transform
              active:bg-opacity-80
              w-full min-h-[44px] min-w-[44px]  // Ensure touch target size
            `}
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}