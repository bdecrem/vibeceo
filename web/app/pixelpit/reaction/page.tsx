'use client';

import React, { useState, useEffect, useRef } from 'react';

export default function ReactionTimer() {
  const [gameState, setGameState] = useState<'ready' | 'waiting' | 'green' | 'result'>('ready');
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const startGame = () => {
    setGameState('waiting');

    // Random delay between 1000-5000 ms (1-5 seconds)
    const delay = Math.floor(Math.random() * 4000) + 1000;

    timerRef.current = window.setTimeout(() => {
      setGameState('green');
      startTimeRef.current = Date.now();
    }, delay);
  };

  const handleTap = () => {
    switch (gameState) {
      case 'ready':
        startGame();
        break;
      case 'waiting':
        // Tapped too early
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        setGameState('ready');
        break;
      case 'green':
        if (startTimeRef.current) {
          const time = Date.now() - startTimeRef.current;
          setReactionTime(time);
          setGameState('result');
        }
        break;
      case 'result':
        // Restart the game
        setGameState('ready');
        setReactionTime(null);
        break;
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Determine background color based on game state
  const getBackgroundColor = () => {
    switch (gameState) {
      case 'ready': return 'bg-red-500';
      case 'waiting': return 'bg-red-500';
      case 'green': return 'bg-green-500';
      case 'result': return 'bg-blue-500';
    }
  };

  // Determine display text based on game state
  const getDisplayText = () => {
    switch (gameState) {
      case 'ready': return 'Tap to Start';
      case 'waiting': return 'Wait for Green...';
      case 'green': return 'Tap Now!';
      case 'result': return `Your Time: ${reactionTime} ms\nTap to Restart`;
    }
  };

  return (
    <div
      className={`h-screen w-full flex items-center justify-center ${getBackgroundColor()} text-white text-2xl font-bold`}
      onTouchStart={handleTap}
      onClick={handleTap}
    >
      <div className="text-center">
        {getDisplayText()}
      </div>
    </div>
  );
}