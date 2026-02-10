'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Script from 'next/script';
import {
  ScoreFlow,
  Leaderboard,
  ShareButtonContainer,
  usePixelpitSocial,
  type ScoreFlowColors,
  type LeaderboardColors,
} from '@/app/pixelpit/components';

const GAME_ID = 'yertle';

// PLAYROOM theme colors
const THEME = {
  sky1: '#f0f9ff',
  sky2: '#ffffff',
  water: '#22d3ee',
  waterWave: '#0ea5e9',
  sand: '#fef3c7',
  text: '#18181b',
  // Turtle shell colors
  mint: '#34d399',
  coral: '#f472b6',
  sunshine: '#facc15',
  lavender: '#a78bfa',
};

const SHELL_COLORS = [THEME.mint, THEME.coral, THEME.sunshine, THEME.lavender];

// Social colors
const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: '#f8fafc',
  surface: '#ffffff',
  primary: '#34d399',
  secondary: '#22d3ee',
  text: '#18181b',
  muted: '#64748b',
  error: '#ef4444',
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: '#f8fafc',
  surface: '#ffffff',
  primary: '#34d399',
  secondary: '#22d3ee',
  text: '#18181b',
  muted: '#64748b',
};

// Timing constants (from Loop's spec)
const FALL_DURATION = 150; // ms
const SQUASH_DURATION = 50; // ms
const SLIDE_DURATION = 200; // ms
const TUMBLE_DURATION = 400; // ms
const DEATH_DURATION = 1500; // ms max

// Audio
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let musicPlaying = false;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.4;
  masterGain.connect(audioCtx.destination);
  musicGain = audioCtx.createGain();
  musicGain.gain.value = 0.15;
  musicGain.connect(masterGain);
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

// Ukulele-style plucky loop (C major, 100 BPM)
function startMusic() {
  if (!audioCtx || !musicGain || musicPlaying) return;
  musicPlaying = true;
  
  const bpm = 100;
  const beatMs = 60000 / bpm;
  
  // Simple C major arpeggiated pattern
  const notes = [261.63, 329.63, 392, 523.25]; // C4, E4, G4, C5
  let noteIndex = 0;
  
  function playNote() {
    if (!audioCtx || !musicGain || !musicPlaying) return;
    
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = notes[noteIndex % notes.length];
    
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    
    osc.connect(gain);
    gain.connect(musicGain!);
    osc.start(t);
    osc.stop(t + 0.35);
    
    noteIndex++;
    if (musicPlaying) {
      setTimeout(playNote, beatMs / 2);
    }
  }
  
  playNote();
}

function stopMusic() {
  musicPlaying = false;
}

function playSwimBloop() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, t);
  osc.frequency.exponentialRampToValueAtTime(200, t + 0.08);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.1);
}

function playDrop() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  // Hollow "tok" sound
  const osc = audioCtx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = 180;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.25, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.1);
}

function playPerfect() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  // Ascending marimba-like notes
  [392, 523.25, 659.25].forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = audioCtx!.createGain();
    gain.gain.setValueAtTime(0, t + i * 0.08);
    gain.gain.linearRampToValueAtTime(0.2, t + i * 0.08 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.2);
    osc.connect(gain);
    gain.connect(masterGain!);
    osc.start(t + i * 0.08);
    osc.stop(t + i * 0.08 + 0.25);
  });
}

function playSlideOff() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  // Slide whistle down
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, t);
  osc.frequency.exponentialRampToValueAtTime(100, t + 0.4);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.5);
}

function playSplash() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  // White noise burst for splash
  const bufferSize = audioCtx.sampleRate * 0.2;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  source.start(t);
}

function playCollapse() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  // Cascading shell clatter
  for (let i = 0; i < 8; i++) {
    const osc = audioCtx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 150 + Math.random() * 100;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.1, t + i * 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.15);
    osc.connect(gain);
    gain.connect(masterGain!);
    osc.start(t + i * 0.05);
    osc.stop(t + i * 0.05 + 0.2);
  }
  // Final splash
  setTimeout(playSplash, 400);
}

interface Turtle {
  x: number;
  y: number;
  width: number;
  shellColor: string;
  eyeDirection: number; // -1 left, 1 right
  blinkTimer: number;
  isBlinking: boolean;
  legFrame: number;
  bobOffset: number;
}

interface FallingTurtle extends Turtle {
  state: 'falling' | 'squashing' | 'landed' | 'sliding' | 'tumbling' | 'splashed';
  timer: number;
  startX: number;
  targetY: number;
  slideDirection: number;
  overlapAmount: number;
}

interface StackedTurtle extends Turtle {
  lookUpTimer: number;
  isLookingUp: boolean;
}

export default function YertleGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'dying' | 'end'>('start');
  const [canvasSize, setCanvasSize] = useState({ w: 400, h: 700 });
  
  // Social
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  usePixelpitSocial(socialLoaded);

  // Game constants
  const TURTLE_HEIGHT = 24;
  const BASE_TURTLE_WIDTH = 120;
  const WATER_HEIGHT = 80;
  const SWIM_Y = 60;

  const gameRef = useRef({
    running: false,
    score: 0,
    perfectStreak: 0,
    // Swimming turtle
    swimmer: null as (Turtle & { direction: number; speed: number }) | null,
    // Falling/animating turtle
    falling: null as FallingTurtle | null,
    // Stack of landed turtles
    stack: [] as StackedTurtle[],
    // Current stack width (shrinks on imperfect drops)
    stackWidth: BASE_TURTLE_WIDTH,
    stackX: 0, // Center of stack
    // Difficulty
    swimSpeed: 80,
    // Animation
    wavePhase: 0,
    // Death animation
    collapsingTurtles: [] as { x: number; y: number; vy: number; rotation: number; shellColor: string }[],
    deathTimer: 0,
    // Particles
    particles: [] as { x: number; y: number; vy: number; life: number; type: 'ripple' | 'sparkle' }[],
    // Bloop timer
    bloopTimer: 0,
  });

  const getStackTop = useCallback(() => {
    const game = gameRef.current;
    const waterY = canvasSize.h - WATER_HEIGHT;
    return waterY - game.stack.length * TURTLE_HEIGHT;
  }, [canvasSize.h, WATER_HEIGHT, TURTLE_HEIGHT]);

  const spawnSwimmer = useCallback(() => {
    const game = gameRef.current;
    const direction = game.stack.length % 2 === 0 ? 1 : -1; // Alternate
    const startX = direction === 1 ? -BASE_TURTLE_WIDTH : canvasSize.w + BASE_TURTLE_WIDTH;
    
    game.swimmer = {
      x: startX,
      y: SWIM_Y,
      width: game.stackWidth,
      shellColor: SHELL_COLORS[game.stack.length % SHELL_COLORS.length],
      eyeDirection: direction,
      blinkTimer: 2 + Math.random() * 2,
      isBlinking: false,
      legFrame: 0,
      bobOffset: 0,
      direction,
      speed: game.swimSpeed,
    };
  }, [canvasSize.w, SWIM_Y, BASE_TURTLE_WIDTH]);

  const startGame = useCallback(() => {
    initAudio();
    startMusic();
    
    const game = gameRef.current;
    game.running = true;
    game.score = 0;
    game.perfectStreak = 0;
    game.stack = [];
    game.stackWidth = BASE_TURTLE_WIDTH;
    game.stackX = canvasSize.w / 2;
    game.swimSpeed = 80;
    game.falling = null;
    game.swimmer = null;
    game.collapsingTurtles = [];
    game.deathTimer = 0;
    game.particles = [];
    
    spawnSwimmer();
    setGameState('playing');
  }, [canvasSize.w, spawnSwimmer, BASE_TURTLE_WIDTH]);

  const dropTurtle = useCallback(() => {
    const game = gameRef.current;
    if (!game.swimmer || game.falling) return;
    
    playDrop();
    
    const swimmer = game.swimmer;
    game.falling = {
      ...swimmer,
      state: 'falling',
      timer: 0,
      startX: swimmer.x,
      targetY: getStackTop() - TURTLE_HEIGHT,
      slideDirection: 0,
      overlapAmount: 0,
    };
    game.swimmer = null;
  }, [getStackTop, TURTLE_HEIGHT]);

  // Handle resize
  useEffect(() => {
    const updateSize = () => {
      setCanvasSize({
        w: Math.min(window.innerWidth, 500),
        h: window.innerHeight,
      });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvasSize.w;
    canvas.height = canvasSize.h;

    let animationId: number;
    let lastTime = 0;

    const drawTurtle = (
      x: number, 
      y: number, 
      width: number, 
      shellColor: string, 
      eyeDir: number, 
      isBlinking: boolean,
      legFrame: number,
      swimming: boolean,
      bobOffset: number = 0
    ) => {
      const h = TURTLE_HEIGHT;
      const actualY = y + bobOffset;
      
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.ellipse(x, actualY + h + 4, width / 2, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Shell
      ctx.fillStyle = shellColor;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      
      // Shell body (rounded rect)
      const shellX = x - width / 2;
      const shellY = actualY;
      const shellW = width;
      const shellH = h * 0.75;
      const radius = 8;
      
      ctx.beginPath();
      ctx.moveTo(shellX + radius, shellY);
      ctx.lineTo(shellX + shellW - radius, shellY);
      ctx.quadraticCurveTo(shellX + shellW, shellY, shellX + shellW, shellY + radius);
      ctx.lineTo(shellX + shellW, shellY + shellH - radius);
      ctx.quadraticCurveTo(shellX + shellW, shellY + shellH, shellX + shellW - radius, shellY + shellH);
      ctx.lineTo(shellX + radius, shellY + shellH);
      ctx.quadraticCurveTo(shellX, shellY + shellH, shellX, shellY + shellH - radius);
      ctx.lineTo(shellX, shellY + radius);
      ctx.quadraticCurveTo(shellX, shellY, shellX + radius, shellY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Shell pattern (dots)
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      const dotCount = Math.floor(width / 20);
      for (let i = 0; i < dotCount; i++) {
        const dotX = shellX + 15 + i * 20;
        ctx.beginPath();
        ctx.arc(dotX, shellY + shellH / 2, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Head
      const headX = x + eyeDir * (width / 2 + 8);
      const headY = actualY + shellH / 2;
      ctx.fillStyle = '#a3d9a5'; // Lighter green for skin
      ctx.beginPath();
      ctx.ellipse(headX, headY, 10, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Eyes (BIG - 40% of face)
      const eyeSize = 6;
      const pupilSize = 3;
      const eyeY = headY - 2;
      
      // Eye whites
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(headX + eyeDir * 2, eyeY, eyeSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Pupil (tracks direction)
      if (!isBlinking) {
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(headX + eyeDir * 4, eyeY, pupilSize, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Blink - closed eye
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(headX + eyeDir * 2 - eyeSize, eyeY);
        ctx.lineTo(headX + eyeDir * 2 + eyeSize, eyeY);
        ctx.stroke();
      }
      
      // Legs
      ctx.fillStyle = '#a3d9a5';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      
      if (swimming) {
        // Paddling animation
        const legOffset = legFrame % 2 === 0 ? 3 : -3;
        // Front legs
        ctx.beginPath();
        ctx.ellipse(shellX + 15, shellY + shellH + legOffset, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(shellX + shellW - 15, shellY + shellH - legOffset, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        // Tucked legs (on stack)
        ctx.beginPath();
        ctx.ellipse(shellX + 12, shellY + shellH, 5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(shellX + shellW - 12, shellY + shellH, 5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    };

    const update = (dt: number) => {
      const game = gameRef.current;
      if (!game.running && gameState !== 'dying') return;

      game.wavePhase += dt * 2;
      game.bloopTimer -= dt;

      // Update swimmer
      if (game.swimmer) {
        game.swimmer.x += game.swimmer.direction * game.swimmer.speed * dt;
        game.swimmer.legFrame += dt * 10;
        game.swimmer.bobOffset = Math.sin(game.wavePhase * 3) * 3;
        
        // Blink timer
        game.swimmer.blinkTimer -= dt;
        if (game.swimmer.blinkTimer <= 0) {
          game.swimmer.isBlinking = !game.swimmer.isBlinking;
          game.swimmer.blinkTimer = game.swimmer.isBlinking ? 0.15 : (2 + Math.random() * 2);
        }
        
        // Bloop sound
        if (game.bloopTimer <= 0) {
          playSwimBloop();
          game.bloopTimer = 0.4;
        }
        
        // If swims off screen = GAME OVER
        if (game.swimmer.direction === 1 && game.swimmer.x > canvasSize.w + BASE_TURTLE_WIDTH) {
          triggerDeath();
        } else if (game.swimmer.direction === -1 && game.swimmer.x < -BASE_TURTLE_WIDTH) {
          triggerDeath();
        }
      }

      // Update falling turtle
      if (game.falling) {
        const f = game.falling;
        f.timer += dt * 1000;
        
        if (f.state === 'falling') {
          const progress = Math.min(f.timer / FALL_DURATION, 1);
          f.y = SWIM_Y + (f.targetY - SWIM_Y) * progress;
          
          if (progress >= 1) {
            // Check alignment
            const stackLeft = game.stackX - game.stackWidth / 2;
            const stackRight = game.stackX + game.stackWidth / 2;
            const turtleLeft = f.x - f.width / 2;
            const turtleRight = f.x + f.width / 2;
            
            // Calculate overlap
            const overlapLeft = Math.max(stackLeft, turtleLeft);
            const overlapRight = Math.min(stackRight, turtleRight);
            const overlapWidth = overlapRight - overlapLeft;
            
            if (overlapWidth <= 0) {
              // Complete miss!
              triggerDeath();
              return;
            }
            
            // Check if perfect (within 5px)
            const leftDiff = Math.abs(turtleLeft - stackLeft);
            const rightDiff = Math.abs(turtleRight - stackRight);
            const isPerfect = leftDiff < 5 && rightDiff < 5;
            
            if (isPerfect) {
              // Perfect landing!
              game.perfectStreak++;
              playPerfect();
              
              // Restore width if streak >= 3
              if (game.perfectStreak >= 3 && game.stackWidth < BASE_TURTLE_WIDTH) {
                game.stackWidth = Math.min(BASE_TURTLE_WIDTH, game.stackWidth + 10);
                // Sparkle particles
                for (let i = 0; i < 5; i++) {
                  game.particles.push({
                    x: f.x + (Math.random() - 0.5) * f.width,
                    y: f.y,
                    vy: -50 - Math.random() * 50,
                    life: 0.5,
                    type: 'sparkle',
                  });
                }
              }
              
              f.state = 'squashing';
              f.timer = 0;
            } else {
              // Imperfect - trim overhang
              game.perfectStreak = 0;
              
              // Determine which side has overhang
              if (turtleLeft < stackLeft) {
                f.slideDirection = -1;
                f.overlapAmount = stackLeft - turtleLeft;
              } else if (turtleRight > stackRight) {
                f.slideDirection = 1;
                f.overlapAmount = turtleRight - stackRight;
              }
              
              if (f.overlapAmount > f.width * 0.8) {
                // Too much overhang = game over
                triggerDeath();
                return;
              }
              
              // Shrink stack width
              game.stackWidth = overlapWidth;
              game.stackX = overlapLeft + overlapWidth / 2;
              
              f.state = 'sliding';
              f.timer = 0;
              playSlideOff();
            }
          }
        } else if (f.state === 'squashing') {
          if (f.timer >= SQUASH_DURATION) {
            // Land on stack
            landTurtle(f);
          }
        } else if (f.state === 'sliding') {
          if (f.timer >= SLIDE_DURATION) {
            f.state = 'tumbling';
            f.timer = 0;
          }
        } else if (f.state === 'tumbling') {
          const progress = f.timer / TUMBLE_DURATION;
          if (progress >= 1) {
            f.state = 'splashed';
            playSplash();
            // Ripple particles
            for (let i = 0; i < 3; i++) {
              game.particles.push({
                x: f.slideDirection === -1 ? f.x - f.overlapAmount / 2 : f.x + f.width / 2,
                y: canvasSize.h - WATER_HEIGHT,
                vy: 0,
                life: 0.6,
                type: 'ripple',
              });
            }
            // Actually land the remaining turtle
            landTurtle(f);
          }
        }
      }

      // Update stacked turtles
      for (const turtle of game.stack) {
        turtle.blinkTimer -= dt;
        if (turtle.blinkTimer <= 0) {
          turtle.isBlinking = !turtle.isBlinking;
          turtle.blinkTimer = turtle.isBlinking ? 0.15 : (2 + Math.random() * 3);
        }
        
        turtle.lookUpTimer -= dt;
        if (turtle.lookUpTimer <= 0) {
          turtle.isLookingUp = !turtle.isLookingUp;
          turtle.lookUpTimer = turtle.isLookingUp ? 0.5 : (3 + Math.random() * 3);
        }
      }

      // Death animation
      if (gameState === 'dying') {
        game.deathTimer += dt * 1000;
        for (const t of game.collapsingTurtles) {
          t.vy += 800 * dt;
          t.y += t.vy * dt;
          t.rotation += dt * 5;
        }
        if (game.deathTimer >= DEATH_DURATION) {
          endGame();
        }
      }

      // Update particles
      game.particles = game.particles.filter(p => {
        p.life -= dt;
        if (p.type === 'sparkle') {
          p.y += p.vy * dt;
        }
        return p.life > 0;
      });
    };

    const landTurtle = (f: FallingTurtle) => {
      const game = gameRef.current;
      
      game.stack.push({
        x: game.stackX,
        y: getStackTop(),
        width: game.stackWidth,
        shellColor: f.shellColor,
        eyeDirection: 0,
        blinkTimer: 2 + Math.random() * 2,
        isBlinking: false,
        legFrame: 0,
        bobOffset: 0,
        lookUpTimer: 1,
        isLookingUp: false,
      });
      
      game.score = game.stack.length;
      game.falling = null;
      
      // Increase difficulty
      if (game.score >= 50) {
        game.swimSpeed = 200;
      } else if (game.score >= 25) {
        game.swimSpeed = 150;
      } else if (game.score >= 10) {
        game.swimSpeed = 120;
      }
      
      // Spawn next swimmer
      if (game.running) {
        spawnSwimmer();
      }
    };

    const triggerDeath = () => {
      const game = gameRef.current;
      game.running = false;
      stopMusic();
      playCollapse();
      
      // Convert stack to collapsing turtles
      game.collapsingTurtles = game.stack.map((t, i) => ({
        x: t.x + (Math.random() - 0.5) * 20,
        y: t.y,
        vy: -100 - Math.random() * 100,
        rotation: 0,
        shellColor: t.shellColor,
      }));
      
      game.deathTimer = 0;
      setGameState('dying');
    };

    const endGame = () => {
      const game = gameRef.current;
      setFinalScore(game.score);
      setSubmittedEntryId(null);
      setShowLeaderboard(false);
      setGameState('end');
      
      fetch('/api/pixelpit/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_ID }),
      }).catch(() => {});
    };

    const getLandmark = (score: number) => {
      if (score >= 75) return { name: "YERTLE'S DREAM", skyTint: 'rgba(255,200,100,0.2)' };
      if (score >= 50) return { name: 'OCEAN STACK', skyTint: 'rgba(0,50,100,0.2)' };
      if (score >= 25) return { name: 'RIVER STACK', skyTint: 'rgba(0,100,200,0.1)' };
      if (score >= 10) return { name: 'POND STACK', skyTint: 'rgba(100,200,100,0.1)' };
      return null;
    };

    const draw = () => {
      const game = gameRef.current;
      const waterY = canvasSize.h - WATER_HEIGHT;
      
      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, waterY);
      skyGrad.addColorStop(0, THEME.sky1);
      skyGrad.addColorStop(1, THEME.sky2);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvasSize.w, waterY);
      
      // Landmark tint
      const landmark = getLandmark(game.score);
      if (landmark) {
        ctx.fillStyle = landmark.skyTint;
        ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);
      }
      
      // Water
      ctx.fillStyle = THEME.water;
      ctx.fillRect(0, waterY, canvasSize.w, WATER_HEIGHT);
      
      // Water waves
      ctx.strokeStyle = THEME.waterWave;
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const waveY = waterY + 10 + i * 20;
        for (let x = 0; x <= canvasSize.w; x += 20) {
          const y = waveY + Math.sin((x + game.wavePhase * 50 + i * 30) * 0.05) * 3;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      
      // Draw stack (bottom to top)
      for (let i = 0; i < game.stack.length; i++) {
        const t = game.stack[i];
        const eyeDir = t.isLookingUp ? 0 : (i % 2 === 0 ? 1 : -1);
        drawTurtle(t.x, t.y, t.width, t.shellColor, eyeDir, t.isBlinking, 0, false);
      }
      
      // Draw falling turtle
      if (game.falling) {
        const f = game.falling;
        let drawX = f.x;
        let drawY = f.y;
        let drawWidth = f.width;
        
        if (f.state === 'squashing') {
          // Squash animation
          const progress = f.timer / SQUASH_DURATION;
          drawY += Math.sin(progress * Math.PI) * 3;
        } else if (f.state === 'sliding') {
          // Split into two: staying part and sliding part
          const progress = f.timer / SLIDE_DURATION;
          // Draw staying part
          const stayWidth = f.width - f.overlapAmount;
          const stayX = f.slideDirection === -1 
            ? f.x + f.overlapAmount / 2 
            : f.x - f.overlapAmount / 2;
          drawTurtle(stayX, drawY, stayWidth, f.shellColor, 0, false, 0, false);
          
          // Draw sliding part (moving away)
          const slideX = f.slideDirection === -1 
            ? f.x - f.width / 2 + f.overlapAmount / 2 - progress * 30
            : f.x + f.width / 2 - f.overlapAmount / 2 + progress * 30;
          ctx.globalAlpha = 1 - progress * 0.3;
          // Draw the sliding piece as just a shell fragment
          ctx.fillStyle = f.shellColor;
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          const fragW = f.overlapAmount;
          const fragH = TURTLE_HEIGHT * 0.75;
          ctx.fillRect(slideX - fragW / 2, drawY, fragW, fragH);
          ctx.strokeRect(slideX - fragW / 2, drawY, fragW, fragH);
          // Eyes on the fragment (scared!)
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(slideX, drawY + fragH / 2, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(slideX, drawY + fragH / 2, 4, 0, Math.PI * 2);
          ctx.fill();
          // "!" exclamation
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('!', slideX, drawY - 5);
          ctx.globalAlpha = 1;
          return; // Don't draw the main turtle
        } else if (f.state === 'tumbling') {
          // Tumbling fragment
          const progress = f.timer / TUMBLE_DURATION;
          const slideX = f.slideDirection === -1 
            ? f.x - f.width / 2 - 30 - progress * 20
            : f.x + f.width / 2 + 30 + progress * 20;
          const tumbleY = f.y + progress * (waterY - f.y);
          const rotation = progress * Math.PI * 2;
          
          ctx.save();
          ctx.translate(slideX, tumbleY);
          ctx.rotate(rotation);
          ctx.fillStyle = f.shellColor;
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          ctx.fillRect(-f.overlapAmount / 2, -TURTLE_HEIGHT / 2, f.overlapAmount, TURTLE_HEIGHT * 0.75);
          ctx.strokeRect(-f.overlapAmount / 2, -TURTLE_HEIGHT / 2, f.overlapAmount, TURTLE_HEIGHT * 0.75);
          ctx.restore();
          
          // Draw staying part
          const stayWidth = f.width - f.overlapAmount;
          const stayX = f.slideDirection === -1 
            ? f.x + f.overlapAmount / 2 
            : f.x - f.overlapAmount / 2;
          drawTurtle(stayX, f.y, stayWidth, f.shellColor, 0, false, 0, false);
          return;
        } else {
          drawTurtle(drawX, drawY, drawWidth, f.shellColor, f.eyeDirection, false, 0, false);
        }
      }
      
      // Draw swimmer
      if (game.swimmer) {
        const s = game.swimmer;
        drawTurtle(s.x, s.y, s.width, s.shellColor, s.eyeDirection, s.isBlinking, Math.floor(s.legFrame), true, s.bobOffset);
      }
      
      // Draw collapsing turtles (death animation)
      if (gameState === 'dying') {
        for (const t of game.collapsingTurtles) {
          if (t.y < canvasSize.h) {
            ctx.save();
            ctx.translate(t.x, t.y);
            ctx.rotate(t.rotation);
            ctx.fillStyle = t.shellColor;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            const w = game.stackWidth;
            ctx.fillRect(-w / 2, -TURTLE_HEIGHT / 2, w, TURTLE_HEIGHT * 0.75);
            ctx.strokeRect(-w / 2, -TURTLE_HEIGHT / 2, w, TURTLE_HEIGHT * 0.75);
            ctx.restore();
          }
        }
      }
      
      // Particles
      for (const p of game.particles) {
        if (p.type === 'sparkle') {
          ctx.fillStyle = `rgba(250, 204, 21, ${p.life * 2})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'ripple') {
          ctx.strokeStyle = `rgba(255, 255, 255, ${p.life})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, (0.6 - p.life) * 40, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      
      // UI
      ctx.fillStyle = THEME.text;
      ctx.font = 'bold 48px ui-rounded, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(game.score.toString(), canvasSize.w / 2, 50);
      
      // Landmark label
      if (landmark) {
        ctx.font = 'bold 14px ui-rounded, system-ui, sans-serif';
        ctx.fillStyle = THEME.lavender;
        ctx.fillText(landmark.name, canvasSize.w / 2, 75);
      }
      
      // Perfect streak
      if (game.perfectStreak >= 2) {
        ctx.font = 'bold 16px ui-rounded, system-ui, sans-serif';
        ctx.fillStyle = THEME.sunshine;
        ctx.fillText(`🔥 ${game.perfectStreak} PERFECT`, canvasSize.w / 2, 100);
      }
      
      // Width indicator
      const widthPercent = Math.round((game.stackWidth / BASE_TURTLE_WIDTH) * 100);
      if (widthPercent < 100) {
        ctx.fillStyle = widthPercent < 30 ? '#ef4444' : THEME.text;
        ctx.font = '12px ui-rounded, system-ui, sans-serif';
        ctx.fillText(`${widthPercent}%`, canvasSize.w / 2, canvasSize.h - WATER_HEIGHT - game.stack.length * TURTLE_HEIGHT - 30);
      }
    };

    const gameLoop = (timestamp: number) => {
      const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
      lastTime = timestamp;
      update(dt);
      draw();
      animationId = requestAnimationFrame(gameLoop);
    };
    animationId = requestAnimationFrame(gameLoop);

    // Input
    const handleTap = () => {
      if (gameState === 'playing' && gameRef.current.swimmer && !gameRef.current.falling) {
        dropTurtle();
      }
    };

    canvas.addEventListener('click', handleTap);
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handleTap();
    }, { passive: false });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleTap();
      }
    });

    return () => {
      cancelAnimationFrame(animationId);
      stopMusic();
    };
  }, [gameState, canvasSize, dropTurtle, spawnSwimmer, getStackTop, TURTLE_HEIGHT, WATER_HEIGHT, BASE_TURTLE_WIDTH]);

  return (
    <>
      <Script
        src="/pixelpit/social.js"
        strategy="afterInteractive"
        onLoad={() => setSocialLoaded(true)}
      />

      <div style={{
        position: 'fixed',
        inset: 0,
        background: THEME.sky1,
        fontFamily: 'ui-rounded, system-ui, sans-serif',
        display: 'flex',
        justifyContent: 'center',
      }}>
        {gameState === 'start' && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            background: `linear-gradient(${THEME.sky1}, ${THEME.water})`,
          }}>
            <div style={{ fontSize: 80, marginBottom: 10 }}>🐢</div>
            <h1 style={{
              color: THEME.text,
              fontSize: 48,
              marginBottom: 10,
              fontWeight: 900,
            }}>
              YERTLE
            </h1>

            <p style={{
              color: '#64748b',
              fontSize: 16,
              marginBottom: 30,
              textAlign: 'center',
              lineHeight: 1.6,
              maxWidth: 280,
            }}>
              Tap to drop turtles onto the stack.<br />
              Miss the edge and they slide off!<br />
              How high can you build?
            </p>

            <button
              onClick={startGame}
              style={{
                background: THEME.mint,
                color: THEME.text,
                border: '3px solid #000',
                padding: '18px 60px',
                fontSize: 18,
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: 30,
                boxShadow: '4px 4px 0 #000',
              }}
            >
              START
            </button>

            <button
              onClick={() => setShowLeaderboard(true)}
              style={{
                marginTop: 30,
                background: 'transparent',
                color: THEME.mint,
                border: `2px solid ${THEME.mint}`,
                padding: '10px 24px',
                fontSize: 14,
                cursor: 'pointer',
                borderRadius: 20,
              }}
            >
              View Leaderboard
            </button>
          </div>
        )}

        {showLeaderboard && gameState !== 'playing' && gameState !== 'dying' && (
          <div
            onClick={() => setShowLeaderboard(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(255,255,255,0.95)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: 20,
            }}
          >
            <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 400 }}>
              <Leaderboard
                gameId={GAME_ID}
                limit={10}
                entryId={submittedEntryId ?? undefined}
                colors={LEADERBOARD_COLORS}
              />
            </div>
            <button
              onClick={() => setShowLeaderboard(false)}
              style={{
                marginTop: 20,
                background: THEME.mint,
                color: THEME.text,
                border: '2px solid #000',
                padding: '12px 30px',
                fontSize: 14,
                cursor: 'pointer',
                borderRadius: 20,
              }}
            >
              Close
            </button>
          </div>
        )}

        {(gameState === 'playing' || gameState === 'dying') && (
          <canvas
            ref={canvasRef}
            style={{
              display: 'block',
              touchAction: 'none',
            }}
          />
        )}

        {gameState === 'end' && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(${THEME.sky1}, ${THEME.water})`,
            overflowY: 'auto',
            padding: 20,
          }}>
            <div style={{ fontSize: 60, marginBottom: 10 }}>🐢</div>
            <h1 style={{ 
              color: THEME.text, 
              fontSize: 36, 
              marginBottom: 5,
              fontWeight: 900,
            }}>
              SPLASH!
            </h1>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>
              Your tower collapsed into the water!
            </p>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              marginBottom: 20,
            }}>
              <div style={{ color: THEME.mint, fontSize: 14, letterSpacing: 2 }}>TURTLES STACKED</div>
              <div style={{ color: THEME.text, fontSize: 64, fontWeight: 'bold' }}>
                {finalScore}
              </div>
            </div>

            <div style={{ width: '100%', maxWidth: 350 }}>
              <ScoreFlow
                score={finalScore}
                gameId={GAME_ID}
                colors={SCORE_FLOW_COLORS}
                onRankReceived={(rank, entryId) => setSubmittedEntryId(entryId ?? null)}
              />
            </div>

            <div style={{ marginTop: 15 }}>
              <ShareButtonContainer
                id="share-btn-yertle"
                url={`${typeof window !== 'undefined' ? window.location.origin : ''}/pixelpit/arcade/yertle/share/${finalScore}`}
                text={`I stacked ${finalScore} turtles on YERTLE! 🐢`}
                style="minimal"
                socialLoaded={socialLoaded}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
              <button
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                style={{
                  background: 'transparent',
                  color: THEME.mint,
                  border: `2px solid ${THEME.mint}`,
                  padding: '12px 20px',
                  fontSize: 14,
                  cursor: 'pointer',
                  borderRadius: 20,
                }}
              >
                {showLeaderboard ? 'Hide' : 'Leaderboard'}
              </button>
              <button
                onClick={startGame}
                style={{
                  background: THEME.mint,
                  color: THEME.text,
                  border: '2px solid #000',
                  padding: '12px 30px',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  borderRadius: 20,
                }}
              >
                PLAY AGAIN
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
