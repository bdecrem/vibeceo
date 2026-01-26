'use client';

import { useEffect, useRef, useState } from 'react';

export default function TapTempo() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'dead'>('menu');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [bpm, setBpm] = useState(100);
  const [feedback, setFeedback] = useState<'none' | 'hit' | 'miss'>('none');
  const [beatPhase, setBeatPhase] = useState(0); // 0-1, where 0.5 is the beat

  const audioContextRef = useRef<AudioContext | null>(null);
  const lastBeatTimeRef = useRef(0);
  const animationRef = useRef<number>(0);
  const gameLoopRef = useRef<number>(0);

  // Initialize audio
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, []);

  // Play a click sound
  const playClick = (frequency = 800, duration = 0.05) => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  };

  // Start game
  const startGame = () => {
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
    setGameState('playing');
    setScore(0);
    setLives(3);
    setBpm(100);
    lastBeatTimeRef.current = performance.now();

    // Start game loop
    const beatInterval = 60000 / 100; // ms per beat
    let lastBeat = performance.now();
    let missWindow = false;

    const loop = () => {
      const now = performance.now();
      const currentBpm = bpm;
      const interval = 60000 / currentBpm;
      const timeSinceBeat = (now - lastBeat) % interval;
      const phase = timeSinceBeat / interval;

      setBeatPhase(phase);

      // Check if we just crossed a beat
      if (timeSinceBeat < 50 && !missWindow) {
        playClick(400, 0.1); // Metronome tick
        missWindow = true;
        lastBeat = now - timeSinceBeat;

        // Schedule miss check
        setTimeout(() => {
          missWindow = false;
        }, interval * 0.4); // 40% window to tap
      }

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);
  };

  // Handle tap
  const handleTap = () => {
    if (gameState === 'menu') {
      startGame();
      return;
    }

    if (gameState === 'dead') {
      setGameState('menu');
      return;
    }

    // Check timing
    const tolerance = 0.2; // 20% of beat interval
    const isOnBeat = beatPhase < tolerance || beatPhase > (1 - tolerance);

    if (isOnBeat) {
      // Hit!
      playClick(1200, 0.03);
      setScore(s => s + 1);
      setFeedback('hit');

      // Speed up every 10 hits
      if ((score + 1) % 10 === 0) {
        setBpm(b => Math.min(b + 10, 200));
      }
    } else {
      // Miss!
      playClick(200, 0.2);
      setFeedback('miss');
      setLives(l => {
        const newLives = l - 1;
        if (newLives <= 0) {
          setGameState('dead');
          if (animationRef.current) cancelAnimationFrame(animationRef.current);
        }
        return newLives;
      });
    }

    // Clear feedback
    setTimeout(() => setFeedback('none'), 150);
  };

  // Visual pulse based on beat
  const pulseScale = 1 + Math.sin(beatPhase * Math.PI * 2) * 0.1;
  const bgColor = feedback === 'hit' ? '#22c55e' : feedback === 'miss' ? '#ef4444' : '#000';

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center select-none touch-none"
      style={{
        backgroundColor: bgColor,
        transition: 'background-color 0.1s'
      }}
      onClick={handleTap}
      onTouchStart={(e) => { e.preventDefault(); handleTap(); }}
      onKeyDown={(e) => {
        // Spacebar or Enter triggers tap
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleTap();
        }
      }}
      tabIndex={0} // Make div focusable
      role="button"
      aria-label="Tap Tempo Game"
    >
      {gameState === 'menu' && (
        <div className="text-center text-white p-8">
          <h1 className="text-4xl font-bold mb-4">TAP TEMPO</h1>
          <p className="text-xl mb-8 text-gray-400">Tap to the beat. Miss and you die.</p>
          <div
            className="w-32 h-32 rounded-full bg-yellow-400 mx-auto flex items-center justify-center cursor-pointer hover:bg-yellow-300 hover:cursor-crosshair focus:ring-2 focus:ring-white transition-colors"
            style={{ transform: `scale(${pulseScale})` }}
            tabIndex={0}
          >
            <span className="text-black text-2xl font-bold">TAP</span>
          </div>
          <p className="mt-8 text-gray-500 text-sm">tap anywhere to start</p>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="text-center text-white">
          {/* Score */}
          <div className="text-6xl font-bold mb-4">{score}</div>

          {/* Lives */}
          <div className="text-2xl mb-8">
            {'❤️'.repeat(lives)}{'🖤'.repeat(3 - lives)}
          </div>

          {/* Tap target */}
          <div
            className="w-40 h-40 rounded-full bg-yellow-400 mx-auto flex items-center justify-center cursor-pointer"
            style={{
              transform: `scale(${pulseScale})`,
              boxShadow: `0 0 ${30 + beatPhase * 30}px rgba(250, 204, 21, ${0.5 + beatPhase * 0.3})`
            }}
          >
            <span className="text-black text-3xl font-bold">TAP</span>
          </div>

          {/* BPM */}
          <div className="mt-8 text-gray-400">
            {bpm} BPM
          </div>
        </div>
      )}

      {gameState === 'dead' && (
        <div className="text-center text-white p-8">
          <h1 className="text-4xl font-bold mb-4 text-red-500">DEAD</h1>
          <p className="text-6xl font-bold mb-4">{score}</p>
          <p className="text-xl text-gray-400 mb-8">taps survived</p>
          <div
            className="w-32 h-32 rounded-full bg-gray-700 mx-auto flex items-center justify-center cursor-pointer hover:bg-gray-600 transition-colors"
          >
            <span className="text-white text-xl font-bold">AGAIN</span>
          </div>
          <p className="mt-8 text-gray-500 text-sm">tap anywhere to restart</p>
        </div>
      )}

      {/* Attribution */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-gray-600 text-xs">
        PIXELPIT • made by Pixel (M1)
      </div>
    </div>
  );
}
