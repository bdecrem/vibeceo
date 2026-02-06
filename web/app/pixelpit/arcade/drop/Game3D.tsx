'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const PLATFORM_COUNT = 25;
const PLATFORM_SPACING = 2;
const TOWER_RADIUS = 0.4;
const PLATFORM_OUTER_RADIUS = 2;
const PLATFORM_THICKNESS = 0.3;
const BALL_RADIUS = 0.15;

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

function playBounce() {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 300 + Math.random() * 100;
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}

function playFallThrough() {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 600;
  osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.08);
}

function playThunder() {
  if (!audioCtx || !masterGain) return;
  const bufferSize = audioCtx.sampleRate * 0.5;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
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
  started: boolean; // Ball sits still until player rotates
}

function Tower({ rotation }: { rotation: number }) {
  return (
    <mesh rotation={[0, rotation, 0]}>
      <cylinderGeometry args={[TOWER_RADIUS, TOWER_RADIUS, 100, 16]} />
      <meshStandardMaterial color="#d4d4d8" />
    </mesh>
  );
}

function Platform({ 
  y, 
  gapAngle, 
  gapSize, 
  hasStorm, 
  stormAngle, 
  stormSize, 
  rotation 
}: { 
  y: number;
  gapAngle: number;
  gapSize: number;
  hasStorm: boolean;
  stormAngle: number;
  stormSize: number;
  rotation: number;
}) {
  const segments = 24;
  const segmentAngle = (Math.PI * 2) / segments;
  
  const meshes = useMemo(() => {
    const result: JSX.Element[] = [];
    
    for (let i = 0; i < segments; i++) {
      const angle = i * segmentAngle;
      const midAngle = angle + segmentAngle / 2;
      
      // Check if in gap
      let gapDiff = Math.abs(midAngle - gapAngle);
      if (gapDiff > Math.PI) gapDiff = Math.PI * 2 - gapDiff;
      if (gapDiff < gapSize / 2) continue;
      
      // Check if storm
      let isStorm = false;
      if (hasStorm) {
        let stormDiff = Math.abs(midAngle - stormAngle);
        if (stormDiff > Math.PI) stormDiff = Math.PI * 2 - stormDiff;
        isStorm = stormDiff < stormSize / 2;
      }
      
      const innerR = TOWER_RADIUS + 0.05;
      const outerR = PLATFORM_OUTER_RADIUS;
      const width = outerR - innerR;
      const midR = (innerR + outerR) / 2;
      
      result.push(
        <mesh 
          key={i}
          position={[
            Math.cos(angle + segmentAngle / 2) * midR,
            0,
            Math.sin(angle + segmentAngle / 2) * midR
          ]}
          rotation={[0, -(angle + segmentAngle / 2) + Math.PI / 2, 0]}
        >
          <boxGeometry args={[width, PLATFORM_THICKNESS, segmentAngle * midR * 0.95]} />
          <meshStandardMaterial 
            color={isStorm ? '#2d1b4e' : '#ffffff'} 
            emissive={isStorm ? '#ff0000' : '#000000'}
            emissiveIntensity={isStorm ? 0.3 : 0}
          />
        </mesh>
      );
    }
    
    return result;
  }, [gapAngle, gapSize, hasStorm, stormAngle, stormSize]);
  
  return (
    <group position={[0, y, 0]} rotation={[0, rotation, 0]}>
      {meshes}
    </group>
  );
}

function Ball({ y }: { y: number }) {
  return (
    <mesh position={[PLATFORM_OUTER_RADIUS - BALL_RADIUS - 0.1, y, 0]}>
      <sphereGeometry args={[BALL_RADIUS, 16, 16]} />
      <meshStandardMaterial color="#4fc3f7" emissive="#4fc3f7" emissiveIntensity={0.2} />
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
    ballY: PLATFORM_THICKNESS / 2 + BALL_RADIUS, // Start on first platform (y=0)
    ballVY: 0,
    rotation: 0,
    rotationVel: 0,
    platforms: [],
    score: 0,
    combo: 0,
    gameOver: false,
    started: false, // Wait for player input
  });
  
  const [, forceUpdate] = useState(0);
  const dragRef = useRef({ isDragging: false, lastX: 0 });
  
  // Initialize platforms
  useEffect(() => {
    initAudio();
    const platforms: PlatformData[] = [];
    
    // First platform at y=0 with NO gap where ball starts (ball starts at angle 0)
    // Make sure ball's starting position is on solid ground
    platforms.push({
      y: 0,
      gapAngle: Math.PI, // Gap on opposite side from ball
      gapSize: 1.0,
      hasStorm: false,
      stormAngle: 0,
      stormSize: 0,
      passed: false,
    });
    
    // Rest of platforms below
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
    gameState.current.ballY = PLATFORM_THICKNESS / 2 + BALL_RADIUS; // On top of first platform
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
      
      // Start the game on first rotation
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
    const touchStart = (e: TouchEvent) => {
      e.preventDefault();
      handleStart(e.touches[0].clientX);
    };
    const touchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleMove(e.touches[0].clientX);
    };
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
  
  // Game loop
  useFrame((state, delta) => {
    const gs = gameState.current;
    if (gs.gameOver) return;
    
    // Rotation with friction
    gs.rotation += gs.rotationVel;
    gs.rotationVel *= 0.92;
    
    // Only apply gravity once player has started rotating
    const prevY = gs.ballY;
    if (gs.started) {
      gs.ballVY -= 0.015;
      gs.ballVY = Math.max(gs.ballVY, -0.3);
      gs.ballY += gs.ballVY;
    }
    
    // Camera follows ball
    camera.position.y = gs.ballY + 3;
    camera.lookAt(0, gs.ballY, 0);
    
    // Collision with platforms
    for (const platform of gs.platforms) {
      if (platform.passed) continue;
      
      const platformTop = platform.y + PLATFORM_THICKNESS / 2;
      const platformBottom = platform.y - PLATFORM_THICKNESS / 2;
      
      // Ball passing through platform level
      if (prevY - BALL_RADIUS > platformTop && gs.ballY - BALL_RADIUS <= platformTop) {
        // Ball is at angle 0 (positive X), check if that's in gap relative to rotation
        const ballWorldAngle = -gs.rotation;
        let normalizedAngle = ballWorldAngle % (Math.PI * 2);
        if (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
        
        // Check gap
        let gapDiff = Math.abs(normalizedAngle - platform.gapAngle);
        if (gapDiff > Math.PI) gapDiff = Math.PI * 2 - gapDiff;
        const inGap = gapDiff < platform.gapSize / 2;
        
        // Check storm
        let hitStorm = false;
        if (platform.hasStorm && !inGap) {
          let stormDiff = Math.abs(normalizedAngle - platform.stormAngle);
          if (stormDiff > Math.PI) stormDiff = Math.PI * 2 - stormDiff;
          hitStorm = stormDiff < platform.stormSize / 2;
        }
        
        if (inGap) {
          // Fall through
          platform.passed = true;
          gs.combo++;
          gs.score += gs.combo;
          onScoreUpdate(gs.score, gs.combo);
          playFallThrough();
        } else if (hitStorm) {
          // Death!
          gs.gameOver = true;
          playThunder();
          onGameOver(gs.score);
          return;
        } else {
          // Bounce
          gs.ballY = platformTop + BALL_RADIUS;
          gs.ballVY = 0.15;
          gs.combo = 0;
          platform.passed = true;
          gs.score += 1;
          onScoreUpdate(gs.score, gs.combo);
          playBounce();
        }
      }
    }
    
    // Add more platforms
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
    
    // Remove far platforms
    gs.platforms = gs.platforms.filter(p => p.y < gs.ballY + 20);
    
    forceUpdate(n => n + 1);
  });
  
  const gs = gameState.current;
  
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />
      
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
      
      {/* Sky gradient background */}
      <mesh position={[0, 0, -20]}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial color="#87ceeb" />
      </mesh>
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
    return <div style={{ position: 'absolute', inset: 0, background: '#87ceeb' }} />;
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
