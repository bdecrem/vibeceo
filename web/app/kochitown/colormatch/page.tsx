'use client';

import React, { useState, useEffect } from 'react';
import { Press_Start_2P } from 'next/font/google';

const pixelFont = Press_Start_2P({
  weight: '400',
  subsets: ['latin']
});

// Color mapping to ensure color names match their representation
const COLORS = {
  'RED': '#FF0000',
  'BLUE': '#0000FF',
  'GREEN': '#00FF00',
  'YELLOW': '#FFFF00',
  'PURPLE': '#800080',
  'ORANGE': '#FFA500'
};

const TOTAL_ROUNDS = 10;

export default function ColorMatchGame() {
  const [currentRound, setCurrentRound] = useState(1);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [currentColor, setCurrentColor] = useState('');

  // Generate a random color and word
  const generateColorChallenge = () => {
    const colorNames = Object.keys(COLORS);
    const wordColor = colorNames[Math.floor(Math.random() * colorNames.length)];
    const textColor = colorNames[Math.floor(Math.random() * colorNames.length)];

    setCurrentWord(wordColor);
    setCurrentColor(textColor);
  };

  // Handle player's answer
  const handleAnswer = (isMatch: boolean) => {
    if (gameOver) return;

    // Check if the answer is correct
    const isCorrect = currentWord === currentColor;

    if (isMatch === isCorrect) {
      setScore(prevScore => prevScore + 1);
    }

    // Move to next round or end game
    if (currentRound < TOTAL_ROUNDS) {
      setCurrentRound(prevRound => prevRound + 1);
      generateColorChallenge();
    } else {
      setGameOver(true);
    }
  };

  // Reset game
  const resetGame = () => {
    setCurrentRound(1);
    setScore(0);
    setGameOver(false);
    generateColorChallenge();
  };

  // Initialize first round
  useEffect(() => {
    generateColorChallenge();
  }, []);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-black text-white"
      style={{ fontFamily: pixelFont.style.fontFamily }}
    >
      {!gameOver ? (
        <div className="text-center">
          <h1 className="text-2xl mb-4">Color Match</h1>
          <div
            className="text-4xl mb-8"
            style={{ color: COLORS[currentColor as keyof typeof COLORS] }}
          >
            {currentWord}
          </div>
          <p className="mb-4">Does the color match the word?</p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => handleAnswer(true)}
              className="px-4 py-2 bg-green-500 rounded"
            >
              YES
            </button>
            <button
              onClick={() => handleAnswer(false)}
              className="px-4 py-2 bg-red-500 rounded"
            >
              NO
            </button>
          </div>
          <p className="mt-4">Round: {currentRound} / {TOTAL_ROUNDS}</p>
          <p>Score: {score}</p>
        </div>
      ) : (
        <div className="text-center">
          <h1 className="text-3xl mb-4">Game Over!</h1>
          <p className="text-2xl mb-4">Your Score: {score} / {TOTAL_ROUNDS}</p>
          <button
            onClick={resetGame}
            className="px-4 py-2 bg-blue-500 rounded"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}