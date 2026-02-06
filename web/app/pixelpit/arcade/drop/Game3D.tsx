'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const PLATFORM_COUNT = 25;
const PLATFORM_SPACING = 2;
const TOWER_RADIUS = 0.4;
const PLATFORM_OUTER_RADIUS = 2;
const PLATFORM_THICKNESS = 0.5;
const BALL_RADIUS = 0.15;

// C minor pentatonic — the game's musical key
const PENTATONIC = [261.63, 311.13, 349.23, 392.00, 466.16, 523.25, 622.25, 698.46];

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

// Musical pluck — pitch follows score up the pentatonic
function playBounce(score = 0) {
  if (!audioCtx || !masterGain) return;
  const noteIndex = Math.min(score % PENTATONIC.length, PENTATONIC.length - 1);
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = PENTATONIC[noteIndex];
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.08);
}

// Satisfying downward sweep — pitch rises with combo
function playFallThrough(combo = 1) {
  if (!audioCtx || !masterGain) return;
  const startFreq = 300 + Math.min(combo, 8) * 80;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(startFreq, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
}

// Low boom + noise crash — dramatic death
function playThunder() {
  if (!audioCtx || !masterGain) return;
  // Sub boom
  const boom = audioCtx.createOscillator();
  const boomGain = audioCtx.createGain();
  boom.type = 'sine';
  boom.frequency.setValueAtTime(60, audioCtx.currentTime);
  boom.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.4);
  boomGain.gain.setValueAtTime(0.4, audioCtx.currentTime);
  boomGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
  boom.connect(boomGain);
  boomGain.connect(masterGain);
  boom.start();
  boom.stop(audioCtx.currentTime + 0.5);
  // Noise crash
  const bufferSize = audioCtx.sampleRate * 0.6;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, audioCtx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.4);
  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(masterGain);
  noise.start();
}

interface PlatformData {
  y: number;
  gapAngle: number;
  gapSize: number;
  hasStorm: boolean;
  stormAngle: number;
  stormSize: number;
  passed: boolean;
}

interface GameState {
  ballY: number;
  ballVY: number;
  rotation: number;
  rotationVel: number;
  platforms: PlatformData[];
  score: number;
  combo: number;
  gameOver: boolean;
  started: boolean;
}

function Tower({ rotation }: { rotation: number }) {
  return (
    <mesh rotation={[0, rotation, 0]}>
      <cylinderGeometry args={[TOWER_RADIUS, TOWER_RADIUS, 100, 16]} />
      <meshStandardMaterial color="#1e293b" emissive="#22d3ee" emissiveIntensity={0.05} />
    </mesh>
  );
}

// Smooth arc ring segment using ExtrudeGeometry
function createArcGeo(innerR: number, outerR: number, thetaStart: number, thetaLength: number, thickness: number) {
  const segs = Math.max(6, Math.round((thetaLength / (Math.PI * 2)) * 48));
  const shape = new THREE.Shape();
  shape.moveTo(Math.cos(thetaStart) * outerR, Math.sin(thetaStart) * outerR);
  for (let i = 1; i <= segs; i++) {
    const a = thetaStart + (i / segs) * thetaLength;
    shape.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
  }
  for (let i = segs; i >= 0; i--) {
    const a = thetaStart + (i / segs) * thetaLength;
    shape.lineTo(Math.cos(a) * innerR, Math.sin(a) * innerR);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  geo.translate(0, 0, -thickness / 2);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

const norm2PI = (a: number) => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

function Platform({
  y, gapAngle, gapSize, hasStorm, stormAngle, stormSize, rotation
}: {
  y: number; gapAngle: number; gapSize: number;
  hasStorm: boolean; stormAngle: number; stormSize: number;
  rotation: number;
}) {
  const arcs = useMemo(() => {
    const innerR = TOWER_RADIUS;
    const outerR = PLATFORM_OUTER_RADIUS;
    const solidStart = gapAngle + gapSize / 2;
    const solidLength = Math.PI * 2 - gapSize;

    type Arc = { geo: THREE.BufferGeometry; isStorm: boolean };
    const result: Arc[] = [];

    if (!hasStorm || stormSize < 0.01) {
      result.push({ geo: createArcGeo(innerR, outerR, solidStart, solidLength, PLATFORM_THICKNESS), isStorm: false });
    } else {
      const off0 = norm2PI((stormAngle - stormSize / 2) - solidStart);
      const off1 = norm2PI((stormAngle + stormSize / 2) - solidStart);

      if (off0 >= solidLength && off1 >= solidLength) {
        result.push({ geo: createArcGeo(innerR, outerR, solidStart, solidLength, PLATFORM_THICKNESS), isStorm: false });
      } else if (off0 < off1 && off1 <= solidLength) {
        if (off0 > 0.02)
          result.push({ geo: createArcGeo(innerR, outerR, solidStart, off0, PLATFORM_THICKNESS), isStorm: false });
        result.push({ geo: createArcGeo(innerR, outerR, solidStart + off0, off1 - off0, PLATFORM_THICKNESS), isStorm: true });
        if (solidLength - off1 > 0.02)
          result.push({ geo: createArcGeo(innerR, outerR, solidStart + off1, solidLength - off1, PLATFORM_THICKNESS), isStorm: false });
      } else {
        result.push({ geo: createArcGeo(innerR, outerR, solidStart, solidLength, PLATFORM_THICKNESS), isStorm: false });
      }
    }
    return result;
  }, [gapAngle, gapSize, hasStorm, stormAngle, stormSize]);

  useEffect(() => {
    return () => { arcs.forEach(a => a.geo.dispose()); };
  }, [arcs]);

  return (
    <group position={[0, y, 0]} rotation={[0, rotation, 0]}>
      {arcs.map((a, i) => (
        <mesh key={i} geometry={a.geo}>
          <meshStandardMaterial
            color={a.isStorm ? '#1a0a2e' : '#e2e8f0'}
            emissive={a.isStorm ? '#ef4444' : '#22d3ee'}
            emissiveIntensity={a.isStorm ? 0.5 : 0.08}
          />
        </mesh>
      ))}
    </group>
  );
}

function Ball({ y }: { y: number }) {
  const x = (TOWER_RADIUS + PLATFORM_OUTER_RADIUS) / 2;
  return (
    <mesh position={[x, y, 0]}>
      <sphereGeometry args={[BALL_RADIUS, 16, 16]} />
      <meshStandardMaterial color="#FF1493" emissive="#FF1493" emissiveIntensity={0.6} />
    </mesh>
  );
}

function GameScene({
  onGameOver,
  onScoreUpdate
}: {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number, combo: number) => void;
}) {
  const { camera } = useThree();
  const gameState = useRef<GameState>({
    ballY: PLATFORM_THICKNESS / 2 + BALL_RADIUS,
    ballVY: 0,
    rotation: 0,
    rotationVel: 0,
    platforms: [],
    score: 0,
    combo: 0,
    gameOver: false,
    started: false,
  });

  const [, forceUpdate] = useState(0);
  const dragRef = useRef({ isDragging: false, lastX: 0 });

  // Initialize platforms
  useEffect(() => {
    initAudio();
    const platforms: PlatformData[] = [];
    platforms.push({
      y: 0,
      gapAngle: Math.PI,
      gapSize: 1.0,
      hasStorm: false,
      stormAngle: 0,
      stormSize: 0,
      passed: false,
    });
    for (let i = 1; i < PLATFORM_COUNT; i++) {
      const hasStorm = i > 2 && Math.random() < 0.4;
      platforms.push({
        y: -i * PLATFORM_SPACING,
        gapAngle: Math.random() * Math.PI * 2,
        gapSize: 1.2 - Math.min(i * 0.02, 0.4),
        hasStorm,
        stormAngle: hasStorm ? Math.random() * Math.PI * 2 : 0,
        stormSize: hasStorm ? 0.8 + Math.random() * 0.4 : 0,
        passed: false,
      });
    }
    gameState.current.platforms = platforms;
    gameState.current.ballY = PLATFORM_THICKNESS / 2 + BALL_RADIUS;
    gameState.current.ballVY = 0;
    gameState.current.rotation = 0;
    gameState.current.score = 0;
    gameState.current.combo = 0;
    gameState.current.gameOver = false;
    gameState.current.started = false;
  }, []);

  // Input handling
  useEffect(() => {
    const handleStart = (x: number) => {
      dragRef.current.isDragging = true;
      dragRef.current.lastX = x;
    };
    const handleMove = (x: number) => {
      if (!dragRef.current.isDragging) return;
      const dx = x - dragRef.current.lastX;
      gameState.current.rotationVel += dx * 0.005;
      dragRef.current.lastX = x;
      if (!gameState.current.started && Math.abs(dx) > 2) {
        gameState.current.started = true;
      }
    };
    const handleEnd = () => {
      dragRef.current.isDragging = false;
    };

    const mouseDown = (e: MouseEvent) => handleStart(e.clientX);
    const mouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const mouseUp = () => handleEnd();
    const touchStart = (e: TouchEvent) => { e.preventDefault(); handleStart(e.touches[0].clientX); };
    const touchMove = (e: TouchEvent) => { e.preventDefault(); handleMove(e.touches[0].clientX); };
    const touchEnd = () => handleEnd();

    window.addEventListener('mousedown', mouseDown);
    window.addEventListener('mousemove', mouseMove);
    window.addEventListener('mouseup', mouseUp);
    window.addEventListener('touchstart', touchStart, { passive: false });
    window.addEventListener('touchmove', touchMove, { passive: false });
    window.addEventListener('touchend', touchEnd);

    return () => {
      window.removeEventListener('mousedown', mouseDown);
      window.removeEventListener('mousemove', mouseMove);
      window.removeEventListener('mouseup', mouseUp);
      window.removeEventListener('touchstart', touchStart);
      window.removeEventListener('touchmove', touchMove);
      window.removeEventListener('touchend', touchEnd);
    };
  }, []);

  // Collision helpers
  const checkGap = (angle: number, p: PlatformData) => {
    let d = Math.abs(angle - p.gapAngle);
    if (d > Math.PI) d = Math.PI * 2 - d;
    return d < p.gapSize / 2;
  };
  const checkStorm = (angle: number, p: PlatformData) => {
    if (!p.hasStorm) return false;
    let d = Math.abs(angle - p.stormAngle);
    if (d > Math.PI) d = Math.PI * 2 - d;
    return d < p.stormSize / 2;
  };

  // Game loop
  useFrame(() => {
    const gs = gameState.current;
    if (gs.gameOver) return;

    gs.rotation += gs.rotationVel;
    gs.rotationVel *= 0.92;

    if (gs.started) {
      const ballAngle = norm2PI(-gs.rotation);

      if (gs.ballVY === 0) {
        let stillSupported = false;
        for (const platform of gs.platforms) {
          if (platform.passed) continue;
          const platformTop = platform.y + PLATFORM_THICKNESS / 2;
          if (Math.abs((gs.ballY - BALL_RADIUS) - platformTop) < 0.1) {
            if (checkGap(ballAngle, platform)) {
              platform.passed = true;
              gs.combo++;
              gs.score += gs.combo;
              onScoreUpdate(gs.score, gs.combo);
              playFallThrough(gs.combo);
              gs.ballVY = -0.01;
            } else if (checkStorm(ballAngle, platform)) {
              gs.gameOver = true;
              playThunder();
              onGameOver(gs.score);
              return;
            } else {
              stillSupported = true;
              gs.ballY = platformTop + BALL_RADIUS;
            }
            break;
          }
        }
        if (!stillSupported && gs.ballVY === 0) {
          gs.ballVY = -0.01;
        }
      }

      if (gs.ballVY !== 0) {
        const prevY = gs.ballY;
        gs.ballVY -= 0.015;
        gs.ballVY = Math.max(gs.ballVY, -0.3);
        gs.ballY += gs.ballVY;

        for (const platform of gs.platforms) {
          if (platform.passed) continue;
          const platformTop = platform.y + PLATFORM_THICKNESS / 2;

          if (prevY - BALL_RADIUS > platformTop && gs.ballY - BALL_RADIUS <= platformTop) {
            if (checkGap(ballAngle, platform)) {
              platform.passed = true;
              gs.combo++;
              gs.score += gs.combo;
              onScoreUpdate(gs.score, gs.combo);
              playFallThrough(gs.combo);
            } else if (checkStorm(ballAngle, platform)) {
              gs.gameOver = true;
              playThunder();
              onGameOver(gs.score);
              return;
            } else {
              gs.ballY = platformTop + BALL_RADIUS;
              gs.ballVY = 0;
              gs.combo = 0;
              gs.score += 1;
              onScoreUpdate(gs.score, gs.combo);
              playBounce(gs.score);
              break;
            }
          }
        }
      }
    }

    camera.position.y = gs.ballY + 3;
    camera.lookAt(0, gs.ballY, 0);

    const lowestPlatform = gs.platforms[gs.platforms.length - 1];
    if (lowestPlatform && gs.ballY < lowestPlatform.y + 10) {
      const newY = lowestPlatform.y - PLATFORM_SPACING;
      const hasStorm = Math.random() < 0.45;
      gs.platforms.push({
        y: newY,
        gapAngle: Math.random() * Math.PI * 2,
        gapSize: Math.max(0.7, 1.2 - gs.platforms.length * 0.01),
        hasStorm,
        stormAngle: hasStorm ? Math.random() * Math.PI * 2 : 0,
        stormSize: hasStorm ? 0.8 + Math.random() * 0.5 : 0,
        passed: false,
      });
    }

    gs.platforms = gs.platforms.filter(p => p.y < gs.ballY + 20);
    forceUpdate(n => n + 1);
  });

  const gs = gameState.current;

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 10, 5]} intensity={0.6} color="#94a3b8" />
      <pointLight position={[0, gs.ballY + 2, 3]} intensity={0.8} color="#FF1493" distance={8} />

      <Tower rotation={gs.rotation} />

      {gs.platforms.map((p, i) => (
        <Platform
          key={`${i}-${p.y}`}
          y={p.y}
          gapAngle={p.gapAngle}
          gapSize={p.gapSize}
          hasStorm={p.hasStorm}
          stormAngle={p.stormAngle}
          stormSize={p.stormSize}
          rotation={gs.rotation}
        />
      ))}

      <Ball y={gs.ballY} />

      <color attach="background" args={['#0f172a']} />
      <fog attach="fog" args={['#0f172a', 8, 22]} />
    </>
  );
}

export default function Game3D({
  onGameOver,
  onScoreUpdate
}: {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number, combo: number) => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div style={{ position: 'absolute', inset: 0, background: '#0f172a' }} />;
  }

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Canvas
        camera={{ position: [6, 5, 6], fov: 50 }}
        style={{ touchAction: 'none' }}
      >
        <GameScene onGameOver={onGameOver} onScoreUpdate={onScoreUpdate} />
      </Canvas>
    </div>
  );
}
