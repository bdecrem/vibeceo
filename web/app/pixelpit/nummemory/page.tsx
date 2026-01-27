'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Press_Start_2P } from 'next/font/google';

const pixelFont = Press_Start_2P({
  weight: '400',
  subsets: ['latin']
});

type GameState = 'SHOW_NUMBER' | 'INPUT_NUMBER' | 'GAME_OVER';

export default function NumberMemoryGame() {
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [gameState, setGameState] = useState<GameState>('SHOW_NUMBER');
  const [userInput, setUserInput] = useState<string>('');
  const [difficulty, setDifficulty] = useState<number>(2); // Starting with 2 digits
  const [score, setScore] = useState<number>(0);

  // Generate a random number with specified number of digits
  const generateNumber = useCallback((digits: number): number => {
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }, []);

  // Start a new round
  const startRound = useCallback(() => {
    const number = generateNumber(difficulty);
    setCurrentNumber(number);
    setUserInput('');
    setGameState('SHOW_NUMBER');

    // Hide number after 2 seconds
    const timer = setTimeout(() => {
      setCurrentNumber(null);
      setGameState('INPUT_NUMBER');
    }, 2000);

    return () => clearTimeout(timer);
  }, [difficulty, generateNumber]);

  // Handle user input submission
  const handleSubmit = () => {
    if (gameState !== 'INPUT_NUMBER') return;

    // Check if user input matches current number
    if (parseInt(userInput) === currentNumber) {
      // Correct answer - increase difficulty and score
      setDifficulty(prev => prev + 1);
      setScore(prev => prev + 1);
      startRound();
    } else {
      // Wrong answer - game over
      setGameState('GAME_OVER');
    }
  };

  // Handle keyboard/touch input
  const handleKeyPress = (key: string) => {
    if (gameState === 'INPUT_NUMBER') {
      if (key === 'Backspace') {
        setUserInput(prev => prev.slice(0, -1));
      } else if (/^\d$/.test(key)) {
        // Limit input to current difficulty
        if (userInput.length < difficulty) {
          setUserInput(prev => prev + key);
        }
      } else if (key === 'Enter' && userInput.length === difficulty) {
        handleSubmit();
      }
    } else if (gameState === 'GAME_OVER' && key === 'Enter') {
      // Restart game
      setDifficulty(2);
      setScore(0);
      startRound();
    }
  };

  // Start first round when component mounts
  useEffect(() => {
    startRound();
  }, [startRound]);

  // Add event listeners for keyboard
  useEffect(() => {
    const keyDownHandler = (e: KeyboardEvent) => {
      handleKeyPress(e.key);
    };

    window.addEventListener('keydown', keyDownHandler);
    return () => window.removeEventListener('keydown', keyDownHandler);
  }, [gameState, difficulty, userInput]);

  return (
    <div
      className={`${pixelFont.className} min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a] text-[#00FFFF] text-center p-4 select-none`}
    >
      <h1 className="text-4xl mb-8 tracking-wide text-[#FFD700] drop-shadow-[0_0_5px_#00FFFF]">Number Memory</h1>

      {/* Game Display Stages */}
      {gameState === 'SHOW_NUMBER' && currentNumber !== null && (
        <div className="text-6xl font-bold text-[#FFD700] animate-pulse">
          {currentNumber}
        </div>
      )}

      {gameState === 'INPUT_NUMBER' && (
        <div>
          <div className="text-2xl mb-6 text-[#00FFFF]">Remember the number!</div>
          <div className="text-4xl mb-8 tracking-widest text-[#FFD700]">
            {userInput.padEnd(difficulty, '_')}
          </div>
          <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'Bksp', 0, 'Enter'].map((btn) => (
              <button
                key={btn}
                onClick={() => handleKeyPress(btn.toString())}
                className="bg-[#00FFFF] text-[#1a1a2e] p-3 rounded-xl font-bold text-xl
                  hover:scale-105 transition-transform
                  active:bg-[#1a1a2e] active:text-[#00FFFF]
                  border-2 border-[#1a1a2e] shadow-md"
              >
                {btn}
              </button>
            ))}
          </div>
        </div>
      )}

      {gameState === 'GAME_OVER' && (
        <div>
          <h2 className="text-4xl mb-6 text-[#FF1493] drop-shadow-[0_0_3px_#00FFFF]">Game Over!</h2>
          <p className="text-3xl mb-4 text-[#FFD700]">Score: {score}</p>
          <p className="text-2xl mb-6 text-[#00FFFF]">Highest Difficulty: {difficulty - 1} digits</p>
          <button
            onClick={() => handleKeyPress('Enter')}
            className="bg-[#00FFFF] text-[#1a1a2e] px-6 py-3 rounded-xl text-xl font-bold
              hover:scale-105 transition-transform
              active:bg-[#1a1a2e] active:text-[#00FFFF]
              border-2 border-[#1a1a2e] shadow-md"
          >
            Play Again
          </button>
        </div>
      )}

      <div className="mt-6 text-xl text-[#FFD700]">
        Score: <span className="text-[#00FFFF]">{score}</span> | Difficulty: <span className="text-[#00FFFF]">{difficulty}</span> digits
      </div>
    </div>
  );
}