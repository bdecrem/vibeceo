'use client';

import React, { useEffect, useRef, useState } from 'react';

// VERSION 4: REAL STACK MECHANICS + DROP PHYSICS + AUDIO
// - Smooth drop animation with gravity
// - Satisfying landing + slice
// - 5 perfect placements = block grows back
// - Escalating flash feedback on streaks
// - Music and sound effects

// ============ AUDIO SYSTEM ============
class GameAudio {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  musicGain: GainNode | null = null;
  sfxGain: GainNode | null = null;
  musicPlaying = false;
  musicInterval: NodeJS.Timeout | null = null;
  musicStep = 0;
  enabled = true;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = 1;

      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.masterGain);
      this.musicGain.gain.value = 0.4;

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.masterGain);
      this.sfxGain.gain.value = 0.6;
    }
    // Always try to resume (browser requires user gesture)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (this.masterGain) {
      this.masterGain.gain.value = enabled ? 1 : 0;
    }
  }

  // Simple filtered oscillator
  playTone(freq: number, duration: number, type: OscillatorType, volume: number, target: 'music' | 'sfx' = 'sfx') {
    if (!this.ctx || !this.enabled) return;
    const gain = target === 'music' ? this.musicGain : this.sfxGain;
    if (!gain) return;

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.connect(filter);
    filter.connect(g);
    g.connect(gain);

    osc.type = type;
    osc.frequency.value = freq;
    filter.type = 'lowpass';
    filter.frequency.value = 2000;

    g.gain.setValueAtTime(volume, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // Sound effects
  playDrop() {
    this.playTone(200, 0.1, 'sine', 0.3);
    setTimeout(() => this.playTone(150, 0.08, 'sine', 0.2), 30);
  }

  playLand() {
    if (!this.ctx || !this.sfxGain) return;
    // Thud sound
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.1);
    g.gain.setValueAtTime(0.4, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playPerfect(streak: number) {
    // Rising chime based on streak
    const baseFreq = 440 + streak * 50;
    this.playTone(baseFreq, 0.15, 'sine', 0.25);
    setTimeout(() => this.playTone(baseFreq * 1.25, 0.15, 'sine', 0.2), 80);
    setTimeout(() => this.playTone(baseFreq * 1.5, 0.2, 'sine', 0.15), 160);
  }

  playSlice() {
    if (!this.ctx || !this.sfxGain) return;
    // Quick noise burst
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.15, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
    noise.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    noise.start();
  }

  playGrow() {
    // Sparkly ascending
    [0, 50, 100, 150].forEach((delay, i) => {
      setTimeout(() => {
        this.playTone(600 + i * 100, 0.12, 'sine', 0.15);
      }, delay);
    });
  }

  playGameOver() {
    // Sad descending
    this.playTone(300, 0.2, 'triangle', 0.3);
    setTimeout(() => this.playTone(250, 0.2, 'triangle', 0.25), 150);
    setTimeout(() => this.playTone(200, 0.3, 'triangle', 0.2), 300);
  }

  // Music - chill lofi vibes
  startMusic() {
    if (this.musicPlaying || !this.ctx) return;
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    this.musicPlaying = true;
    this.musicStep = 0;

    const bpm = 95;
    const stepTime = (60 / bpm) * 1000 / 4;

    // Chord progression (lofi jazzy)
    const chords = [
      [261, 329, 392], // C maj
      [293, 369, 440], // D maj
      [329, 415, 493], // E maj
      [261, 329, 392], // C maj
    ];

    // Bass notes
    const bass = [130, 146, 164, 130];

    this.musicInterval = setInterval(() => {
      if (!this.musicPlaying || !this.ctx) return;

      const bar = Math.floor(this.musicStep / 16) % 4;
      const beat = this.musicStep % 16;

      // Kick on 1 and 9
      if (beat === 0 || beat === 8) {
        this.playKick();
      }

      // Hi-hat on off-beats
      if (beat % 4 === 2) {
        this.playHat();
      }

      // Bass on 1
      if (beat === 0) {
        this.playBass(bass[bar]);
      }

      // Chord stabs
      if (beat === 0 || beat === 6 || beat === 10) {
        const chord = chords[bar];
        chord.forEach(freq => {
          this.playTone(freq, 0.3, 'triangle', 0.06, 'music');
        });
      }

      this.musicStep++;
    }, stepTime);
  }

  playKick() {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.connect(g);
    g.connect(this.musicGain);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.1);
    g.gain.setValueAtTime(0.5, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playHat() {
    if (!this.ctx || !this.musicGain) return;
    const bufferSize = this.ctx.sampleRate * 0.03;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 8000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.08, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);
    noise.connect(hp);
    hp.connect(g);
    g.connect(this.musicGain);
    noise.start();
  }

  playBass(freq: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.connect(filter);
    filter.connect(g);
    g.connect(this.musicGain);
    osc.type = 'triangle';
    osc.frequency.value = freq;
    filter.type = 'lowpass';
    filter.frequency.value = 300;
    g.gain.setValueAtTime(0.35, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

const gameAudio = new GameAudio();

// ============ GAME CODE ============

const CAT_COLORS = [
  { body: '#FF6B6B', stripe: '#E85555' },  // Red
  { body: '#FFB347', stripe: '#E8941A' },  // Orange
  { body: '#FFE66D', stripe: '#E8D14A' },  // Yellow
  { body: '#7BED9F', stripe: '#5ED17F' },  // Green
  { body: '#70A1FF', stripe: '#5588E8' },  // Blue
  { body: '#9B59B6', stripe: '#7D3C98' },  // Purple
  { body: '#FF85C0', stripe: '#E86AA8' },  // Pink
];

const CAT_FACES = ['=^.^=', '>^.^<', '=^o^=', '>^w^<', '=^_^='];

interface StackedCat {
  x: number;
  y: number;
  width: number;
  colorIndex: number;
  // Landing animation
  squash: number;
}

interface FallingPiece {
  x: number;
  y: number;
  width: number;
  height: number;
  colorIndex: number;
  vy: number;
  vx: number;
  rotation: number;
  rotationSpeed: number;
}

export default function CatStack4Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Load best score from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('catstack_best');
    if (saved) setBestScore(parseInt(saved, 10));
  }, []);

  const gameRef = useRef({
    running: false,
    score: 0,
    perfectStreak: 0,
    colorIndex: 0,

    // Current cat state
    currentCat: {
      x: 0,
      y: 0,
      width: 120,
      vy: 0,           // vertical velocity
      direction: 1,
      speed: 3,
      state: 'sliding' as 'sliding' | 'dropping' | 'landed',
    },

    // The stack
    stack: [] as StackedCat[],
    ghostStack: [] as StackedCat[], // Starting base cats (visual only)
    fallingPieces: [] as FallingPiece[],

    // Visual effects
    flashIntensity: 0,
    shake: 0,

    // Layout - FIXED play area, tower sinks down
    slideY: 0,         // Fixed Y where cat slides (set in startGame)
    landingY: 0,       // Fixed Y where cats land on top of stack
    baseWidth: 120,
    catHeight: 35,

    // Game over state
    gameOverPending: false,
  });

  const PERFECT_THRESHOLD = 8;
  const PERFECTS_TO_GROW = 5;
  const GROW_AMOUNT = 3;
  const MIN_WIDTH = 15;
  const GRAVITY = 0.8;
  const DROP_GAP = 20; // Small gap - cat slides just above stack

  const getColor = (index: number) => CAT_COLORS[index % CAT_COLORS.length];

  const startGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = gameRef.current;
    game.baseWidth = 120;
    game.stack = [];
    game.fallingPieces = [];
    game.score = 0;
    game.perfectStreak = 0;
    game.colorIndex = 0;
    game.flashIntensity = 0;
    game.shake = 0;
    game.gameOverPending = false;

    // FIXED layout - play area stays centered on screen
    // landingY is where the TOP of the stack always is (cats stack down from here)
    game.landingY = canvas.height * 0.55; // slightly below center
    game.slideY = game.landingY - game.catHeight - DROP_GAP; // cat slides just above

    // Create ghost stack - fill from landingY to bottom of viewport
    const baseX = (canvas.width - game.baseWidth) / 2;
    const ghostStackCount = Math.ceil((canvas.height - game.landingY) / game.catHeight) + 1;
    game.ghostStack = [];
    for (let i = 0; i < ghostStackCount; i++) {
      game.ghostStack.push({
        x: baseX,
        y: game.landingY + (i * game.catHeight), // Stack downward from landing position
        width: game.baseWidth,
        colorIndex: i,
        squash: 1,
      });
    }

    // First cat starts sliding
    game.currentCat = {
      x: baseX,
      y: game.slideY,
      width: game.baseWidth,
      vy: 0,
      direction: 1,
      speed: 3,
      state: 'sliding',
    };

    game.running = true;
    setScore(0);
    setGameState('playing');

    // Start audio
    gameAudio.init();
    gameAudio.startMusic();
  };

  const dropCat = () => {
    const game = gameRef.current;
    if (!game.running || game.currentCat.state !== 'sliding') return;

    // Start dropping from current position
    game.currentCat.state = 'dropping';
    game.currentCat.vy = 0;
    gameAudio.playDrop();
  };

  const handleLanding = () => {
    const game = gameRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cat = game.currentCat;
    const catHeight = game.catHeight;

    // Target position - top of stack, or top ghost cat if stack is empty
    let targetX: number;
    let targetWidth: number;

    if (game.stack.length === 0) {
      // First landing - target the top ghost cat
      const topGhost = game.ghostStack[0]; // Top ghost is first in array
      targetX = topGhost.x;
      targetWidth = topGhost.width;
    } else {
      const topCat = game.stack[game.stack.length - 1];
      targetX = topCat.x;
      targetWidth = topCat.width;
    }

    // Calculate overlap
    const catLeft = cat.x;
    const catRight = cat.x + cat.width;
    const targetLeft = targetX;
    const targetRight = targetX + targetWidth;

    const overlapLeft = Math.max(catLeft, targetLeft);
    const overlapRight = Math.min(catRight, targetRight);
    const overlapWidth = overlapRight - overlapLeft;

    // Helper to trigger game over
    const triggerGameOver = () => {
      game.shake = 15;
      game.gameOverPending = true;
      game.currentCat.state = 'landed';
      setScore(game.score);
      // Update best score
      if (game.score > bestScore) {
        setBestScore(game.score);
        localStorage.setItem('catstack_best', game.score.toString());
      }
      gameAudio.playGameOver();
      gameAudio.stopMusic();
      setTimeout(() => {
        game.running = false;
        setGameState('gameover');
      }, 800);
    };

    // Complete miss?
    if (overlapWidth <= 0) {
      // Whole cat falls off
      game.fallingPieces.push({
        x: cat.x,
        y: game.landingY,
        width: cat.width,
        height: catHeight,
        colorIndex: game.colorIndex,
        vy: cat.vy * 0.5,
        vx: cat.x < targetX ? -4 : 4,
        rotation: 0,
        rotationSpeed: (cat.x < targetX ? -1 : 1) * 0.15,
      });
      triggerGameOver();
      return;
    }

    // Check if perfect
    const offset = Math.abs(cat.x - targetX);
    const isPerfect = offset <= PERFECT_THRESHOLD;

    let newCatX: number;
    let newCatWidth: number;

    if (isPerfect) {
      // PERFECT! Snap to exact position
      game.perfectStreak++;
      game.flashIntensity = Math.min(1, 0.3 + game.perfectStreak * 0.15);

      newCatWidth = targetWidth;
      if (game.perfectStreak >= PERFECTS_TO_GROW) {
        newCatWidth = Math.min(game.baseWidth, targetWidth + GROW_AMOUNT);
        if (newCatWidth > targetWidth) {
          gameAudio.playGrow();
        }
      }
      newCatX = targetX - (newCatWidth - targetWidth) / 2;

      gameAudio.playPerfect(game.perfectStreak);
      gameAudio.playLand();

    } else {
      // NOT PERFECT - slice off overhang
      game.perfectStreak = 0;
      game.flashIntensity = 0;
      gameAudio.playLand();
      gameAudio.playSlice();

      // Create falling pieces for overhang
      if (catLeft < targetLeft) {
        const pieceWidth = targetLeft - catLeft;
        game.fallingPieces.push({
          x: catLeft,
          y: game.landingY,
          width: pieceWidth,
          height: catHeight,
          colorIndex: game.colorIndex,
          vy: -2 - Math.random() * 2,
          vx: -3 - Math.random() * 2,
          rotation: 0,
          rotationSpeed: -0.1 - Math.random() * 0.1,
        });
      }
      if (catRight > targetRight) {
        const pieceWidth = catRight - targetRight;
        game.fallingPieces.push({
          x: targetRight,
          y: game.landingY,
          width: pieceWidth,
          height: catHeight,
          colorIndex: game.colorIndex,
          vy: -2 - Math.random() * 2,
          vx: 3 + Math.random() * 2,
          rotation: 0,
          rotationSpeed: 0.1 + Math.random() * 0.1,
        });
      }

      game.shake = 4;

      if (overlapWidth < MIN_WIDTH) {
        triggerGameOver();
        return;
      }

      newCatX = overlapLeft;
      newCatWidth = overlapWidth;
    }

    // TOWER SINKS DOWN: Push all existing cats down by catHeight
    game.stack.forEach(stackedCat => {
      stackedCat.y += catHeight;
    });
    // Push ghost stack down too
    game.ghostStack.forEach(ghostCat => {
      ghostCat.y += catHeight;
    });
    // Also push falling pieces down
    game.fallingPieces.forEach(piece => {
      piece.y += catHeight;
    });

    // Add the new cat at the FIXED landing position (top of visible stack)
    game.stack.push({
      x: newCatX,
      y: game.landingY,
      width: newCatWidth,
      colorIndex: game.colorIndex,
      squash: 0.7,
    });

    game.currentCat.width = newCatWidth;

    // Score!
    game.score++;
    setScore(game.score);
    game.colorIndex++;

    // Speed up every 15 blocks
    if (game.score % 15 === 0 && game.currentCat.speed < 7) {
      game.currentCat.speed += 0.5;
    }

    // Spawn next cat at fixed travel bound (invisible walls ~one baseWidth from center)
    const startFromLeft = game.score % 2 === 0;

    const centerX = canvas.width / 2;
    const travelRange = game.baseWidth * 1.2;
    const leftBound = centerX - travelRange;
    const rightBound = centerX + travelRange - game.currentCat.width;

    game.currentCat.x = startFromLeft ? leftBound : rightBound;
    game.currentCat.y = game.slideY;
    game.currentCat.vy = 0;
    game.currentCat.direction = startFromLeft ? 1 : -1;
    game.currentCat.state = 'sliding';
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = Math.min(window.innerWidth, 420);
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let animationId: number;

    const update = () => {
      const game = gameRef.current;
      if (!game.running || game.gameOverPending) return;

      const cat = game.currentCat;

      if (cat.state === 'sliding') {
        // Move horizontally
        cat.x += cat.speed * cat.direction;

        // Fixed travel bounds - always ~one baseWidth from center (like invisible walls)
        const centerX = canvas.width / 2;
        const travelRange = game.baseWidth * 1.2; // Fixed distance, doesn't shrink with cat
        const leftBound = centerX - travelRange;
        const rightBound = centerX + travelRange - cat.width;

        if (cat.x <= leftBound) {
          cat.direction = 1;
        } else if (cat.x >= rightBound) {
          cat.direction = -1;
        }

      } else if (cat.state === 'dropping') {
        // Apply gravity
        cat.vy += GRAVITY;
        cat.y += cat.vy;

        // Landing Y is always the fixed position
        const landingY = game.landingY;

        // Check for landing
        if (cat.y >= landingY) {
          cat.y = landingY;
          cat.state = 'landed';
          handleLanding();
        }
      }
    };

    const updateEffects = () => {
      const game = gameRef.current;

      // Update falling pieces
      game.fallingPieces = game.fallingPieces.filter(piece => {
        piece.vy += GRAVITY;
        piece.y += piece.vy;
        piece.x += piece.vx;
        piece.vx *= 0.99; // Air resistance
        piece.rotation += piece.rotationSpeed;
        return piece.y < canvas.height + 300;
      });

      // Animate squash recovery on stacked cats
      game.stack.forEach(cat => {
        if (cat.squash < 1) {
          cat.squash += (1 - cat.squash) * 0.2;
          if (cat.squash > 0.99) cat.squash = 1;
        }
      });

      // Decay effects
      game.flashIntensity *= 0.92;
      game.shake *= 0.88;
    };

    const drawCat = (
      x: number,
      y: number,
      width: number,
      height: number,
      colorIndex: number,
      rotation = 0,
      squash = 1,
      drawFace = true
    ) => {
      if (width < 3) return;
      const color = getColor(colorIndex);

      ctx.save();
      ctx.translate(x + width / 2, y + height);
      ctx.rotate(rotation);
      ctx.scale(1 + (1 - squash) * 0.3, squash); // Squash and stretch

      const drawHeight = height;

      // Shadow
      if (squash === 1 && rotation === 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(0, 2, width / 2 - 2, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Body
      ctx.fillStyle = color.body;
      ctx.beginPath();
      ctx.roundRect(-width / 2, -drawHeight, width, drawHeight, Math.min(10, width / 5));
      ctx.fill();

      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.roundRect(-width / 2 + 3, -drawHeight + 3, width - 6, drawHeight / 3, 5);
      ctx.fill();

      // Stripes
      if (width > 20) {
        ctx.fillStyle = color.stripe;
        const stripeCount = Math.max(1, Math.floor(width / 30));
        for (let i = 0; i < stripeCount; i++) {
          const sx = -width / 2 + (i + 1) * (width / (stripeCount + 1));
          ctx.beginPath();
          ctx.ellipse(sx, -drawHeight / 2, 2, drawHeight / 3, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Face and ears
      if (drawFace && width > 40) {
        const earSize = Math.min(8, width / 10);
        ctx.fillStyle = color.body;
        ctx.beginPath();
        ctx.moveTo(-width / 2 + 4, -drawHeight);
        ctx.lineTo(-width / 2 + 4 + earSize / 2, -drawHeight - earSize);
        ctx.lineTo(-width / 2 + 4 + earSize, -drawHeight);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(width / 2 - 4 - earSize, -drawHeight);
        ctx.lineTo(width / 2 - 4 - earSize / 2, -drawHeight - earSize);
        ctx.lineTo(width / 2 - 4, -drawHeight);
        ctx.fill();

        ctx.fillStyle = '#FFB6C1';
        const ie = earSize * 0.5;
        ctx.beginPath();
        ctx.moveTo(-width / 2 + 6, -drawHeight);
        ctx.lineTo(-width / 2 + 4 + earSize / 2, -drawHeight - ie);
        ctx.lineTo(-width / 2 + 4 + earSize - 2, -drawHeight);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(width / 2 - 4 - earSize + 2, -drawHeight);
        ctx.lineTo(width / 2 - 4 - earSize / 2, -drawHeight - ie);
        ctx.lineTo(width / 2 - 6, -drawHeight);
        ctx.fill();

        ctx.fillStyle = '#333';
        const fontSize = Math.min(11, width / 8);
        ctx.font = `${fontSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const face = CAT_FACES[colorIndex % CAT_FACES.length];
        ctx.fillText(face, 0, -drawHeight / 2 + 2);
      }

      ctx.restore();
    };

    const draw = () => {
      const game = gameRef.current;
      const catHeight = game.catHeight;

      ctx.save();

      // Screen shake
      if (game.shake > 0.5) {
        ctx.translate(
          (Math.random() - 0.5) * game.shake * 2,
          (Math.random() - 0.5) * game.shake * 2
        );
      }

      // Background gradient
      const bgHue = (game.colorIndex * 12) % 360;
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, `hsl(${bgHue}, 25%, 15%)`);
      grad.addColorStop(1, `hsl(${(bgHue + 30) % 360}, 20%, 10%)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Perfect flash
      if (game.flashIntensity > 0.05) {
        ctx.fillStyle = `rgba(255, 255, 255, ${game.flashIntensity * 0.5})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw ghost stack (starting base - darkened/faded)
      ctx.globalAlpha = 0.25;
      game.ghostStack.forEach((cat) => {
        if (cat.y < canvas.height + catHeight && cat.y > -catHeight) {
          drawCat(cat.x, cat.y, cat.width, catHeight, cat.colorIndex, 0, 1, true);
        }
      });
      ctx.globalAlpha = 1;

      // Draw stacked cats (they sink down from the fixed landing position)
      game.stack.forEach((cat) => {
        // Only draw if visible on screen
        if (cat.y < canvas.height + catHeight && cat.y > -catHeight) {
          drawCat(cat.x, cat.y, cat.width, catHeight, cat.colorIndex, 0, cat.squash, true);
        }
      });

      // Draw falling pieces
      game.fallingPieces.forEach(piece => {
        drawCat(piece.x, piece.y, piece.width, piece.height, piece.colorIndex, piece.rotation, 1, false);
      });

      // Draw current cat (sliding or dropping)
      if (game.running && !game.gameOverPending) {
        const cat = game.currentCat;
        if (cat.state === 'sliding' || cat.state === 'dropping') {
          // Draw drop shadow when dropping
          if (cat.state === 'dropping') {
            const landingY = game.landingY;
            const shadowScale = Math.max(0.3, 1 - (landingY - cat.y) / 200);
            ctx.fillStyle = `rgba(0,0,0,${0.15 * shadowScale})`;
            ctx.beginPath();
            ctx.ellipse(
              cat.x + cat.width / 2,
              landingY + catHeight, // Shadow at bottom of landing spot
              (cat.width / 2) * shadowScale,
              4 * shadowScale,
              0, 0, Math.PI * 2
            );
            ctx.fill();
          }

          drawCat(cat.x, cat.y, cat.width, catHeight, game.colorIndex, 0, 1, true);
        }
      }

      // UI - Perfect streak indicator
      if (game.perfectStreak > 0 && game.running && !game.gameOverPending) {
        const streakY = 95;

        if (game.perfectStreak >= PERFECTS_TO_GROW) {
          ctx.fillStyle = '#FFD700';
          ctx.font = 'bold 18px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`PERFECT x${game.perfectStreak}`, canvas.width / 2, streakY);
          ctx.fillStyle = '#4ade80';
          ctx.font = 'bold 14px monospace';
          ctx.fillText('+GROWING!', canvas.width / 2, streakY + 20);
        } else {
          ctx.font = 'bold 14px monospace';
          ctx.textAlign = 'center';
          // Progress dots
          for (let i = 0; i < PERFECTS_TO_GROW; i++) {
            const dotX = canvas.width / 2 - (PERFECTS_TO_GROW - 1) * 10 + i * 20;
            ctx.fillStyle = i < game.perfectStreak ? '#FFD700' : '#444';
            ctx.beginPath();
            ctx.arc(dotX, streakY, 5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = '#888';
          ctx.fillText('PERFECT', canvas.width / 2, streakY + 20);
        }
      }

      ctx.restore();
    };

    const gameLoop = () => {
      update();
      updateEffects();
      draw();
      animationId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    // Input handlers
    const handleInput = (e?: Event) => {
      e?.preventDefault();
      if (gameRef.current.running && !gameRef.current.gameOverPending) {
        dropCat();
      }
    };

    canvas.addEventListener('touchstart', handleInput, { passive: false });
    canvas.addEventListener('mousedown', handleInput);
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleInput();
      }
    };
    document.addEventListener('keydown', handleKey);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('touchstart', handleInput);
      canvas.removeEventListener('mousedown', handleInput);
      document.removeEventListener('keydown', handleKey);
      gameAudio.stopMusic();
    };
  }, []);

  return (
    <>
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: #1a1a2e;
          overflow: hidden;
          touch-action: none;
          user-select: none;
          display: flex;
          justify-content: center;
        }
      `}</style>

      <canvas ref={canvasRef} style={{ display: 'block', maxWidth: 420 }} />

      {/* Sound Toggle */}
      <button
        onClick={() => {
          const newEnabled = !soundEnabled;
          setSoundEnabled(newEnabled);
          gameAudio.setEnabled(newEnabled);
        }}
        style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 150,
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          padding: '10px 14px',
          color: '#fff',
          fontFamily: 'monospace',
          fontSize: 16,
          cursor: 'pointer',
          opacity: soundEnabled ? 0.8 : 0.4,
        }}
      >
        {soundEnabled ? '♪' : '♪̶'}
      </button>

      {/* Score */}
      {gameState === 'playing' && (
        <div style={{
          position: 'fixed',
          top: 25,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: 'monospace',
          pointerEvents: 'none',
        }}>
          <div style={{
            fontSize: 56,
            fontWeight: 'bold',
            color: '#fff',
            textShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}>
            {score}
          </div>
        </div>
      )}

      {/* Start Screen */}
      {gameState === 'start' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
          textAlign: 'center',
          fontFamily: 'monospace',
          color: '#fff',
          padding: 30,
        }}>
          <div style={{ fontSize: 80, marginBottom: 15 }}>🐱</div>
          <h1 style={{
            fontSize: 48,
            color: '#FFB347',
            marginBottom: 25,
            textShadow: '0 0 40px rgba(255,179,71,0.4)',
            letterSpacing: 4,
          }}>
            CAT TOWER
          </h1>
          <p style={{
            color: '#888',
            marginBottom: 35,
            fontSize: 16,
            lineHeight: 2,
          }}>
            tap to drop<br />
            align perfectly<br />
            <span style={{ color: '#FFD700' }}>5 perfects = grow back!</span>
          </p>
          <button
            onClick={startGame}
            style={{
              background: 'linear-gradient(180deg, #FFB347 0%, #E8941A 100%)',
              color: '#1a1a2e',
              border: 'none',
              padding: '22px 70px',
              fontSize: 24,
              fontFamily: 'monospace',
              fontWeight: 'bold',
              borderRadius: 14,
              cursor: 'pointer',
              boxShadow: '0 10px 40px rgba(255,179,71,0.4)',
            }}
          >
            PLAY
          </button>
          <div style={{
            marginTop: 60,
            fontSize: 12,
            letterSpacing: 4,
            color: '#444',
          }}>
            <span style={{ color: '#FFB347' }}>pixel</span>
            <span style={{ color: '#70A1FF' }}>pit</span>
          </div>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'gameover' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(20,20,40,0.97)',
          textAlign: 'center',
          fontFamily: 'monospace',
          color: '#fff',
          padding: 30,
        }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>😿</div>
          <div style={{
            fontSize: 80,
            fontWeight: 'bold',
            color: '#FFB347',
            marginBottom: 8,
            textShadow: '0 0 30px rgba(255,179,71,0.3)',
          }}>
            {score}
          </div>
          <div style={{ fontSize: 16, color: '#666', marginBottom: 20 }}>
            cats stacked
          </div>
          {/* Best score */}
          <div style={{
            fontSize: 14,
            color: score >= bestScore && score > 0 ? '#FFD700' : '#888',
            marginBottom: 40,
          }}>
            {score >= bestScore && score > 0 ? (
              'NEW BEST!'
            ) : (
              `BEST: ${bestScore}`
            )}
          </div>
          <button
            onClick={startGame}
            style={{
              background: 'linear-gradient(180deg, #FFB347 0%, #E8941A 100%)',
              color: '#1a1a2e',
              border: 'none',
              padding: '22px 70px',
              fontSize: 24,
              fontFamily: 'monospace',
              fontWeight: 'bold',
              borderRadius: 14,
              cursor: 'pointer',
              boxShadow: '0 10px 40px rgba(255,179,71,0.4)',
            }}
          >
            TRY AGAIN
          </button>
        </div>
      )}
    </>
  );
}
