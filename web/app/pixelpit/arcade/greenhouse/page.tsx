'use client';

import React, { useEffect, useRef, useState } from 'react';

const GAME_ID = 'greenhouse';
const GAME_NAME = 'GREENHOUSE';

const COLORS = {
  amber: '#D4A574',
  gold: '#FFD700',
  teal: '#2D9596',
  blue: '#3b82f6',
  pink: '#ec4899',
  purple: '#8b5cf6',
  coral: '#f97316',
  lime: '#84cc16',
};

const PLANT_TYPES = [
  { stem: COLORS.lime, leaf: COLORS.teal, flower: COLORS.pink, height: 80 },
  { stem: COLORS.teal, leaf: COLORS.lime, flower: COLORS.coral, height: 100 },
  { stem: COLORS.amber, leaf: COLORS.teal, flower: COLORS.purple, height: 70 },
  { stem: COLORS.lime, leaf: COLORS.blue, flower: COLORS.gold, height: 90 },
  { stem: COLORS.teal, leaf: COLORS.lime, flower: COLORS.blue, height: 110 },
];

interface Plot {
  x: number;
  y: number;
  width: number;
  height: number;
  planted: boolean;
}

interface Leaf {
  y: number;
  side: number;
  size: number;
  angle: number;
}

interface Flower {
  y: number;
  size: number;
  petals: number;
}

interface PlantData {
  x: number;
  y: number;
  type: typeof PLANT_TYPES[number];
  stage: number;
  growth: number;
  height: number;
  targetHeight: number;
  leaves: Leaf[];
  flowers: Flower[];
  age: number;
  swayOffset: number;
}

interface SteamP {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
}

interface Sunbeam {
  x: number;
  y: number;
  vy: number;
  size: number;
  alpha: number;
}

export default function GreenhouseGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [plantCount, setPlantCount] = useState(0);
  const [bloomCount, setBloomCount] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  function initAudio() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  function playTone(freq: number, duration = 0.1, type: OscillatorType = 'sine') {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Plots — 6 plots in 2 rows of 3
    const plotWidth = 120;
    const plotHeight = 40;
    const plotSpacing = 20;
    const plotsPerRow = 3;
    const plots: Plot[] = [];
    const plants: PlantData[] = [];
    const steamParticles: SteamP[] = [];
    const sunbeams: Sunbeam[] = [];

    function rebuildPlots() {
      plots.length = 0;
      const startX = canvas!.width / 2 - (plotsPerRow * (plotWidth + plotSpacing)) / 2;
      const startY = canvas!.height - 180;
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < plotsPerRow; col++) {
          plots.push({
            x: startX + col * (plotWidth + plotSpacing),
            y: startY + row * (plotHeight + plotSpacing),
            width: plotWidth,
            height: plotHeight,
            planted: false,
          });
        }
      }
    }
    rebuildPlots();

    // Sunbeams
    for (let i = 0; i < 30; i++) {
      sunbeams.push({
        x: Math.random() * canvas!.width,
        y: Math.random() * canvas!.height,
        vy: 0.3 + Math.random() * 0.5,
        size: 1 + Math.random() * 2,
        alpha: 0.1 + Math.random() * 0.2,
      });
    }

    function createLeaves(plant: PlantData) {
      const leafCount = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < leafCount; i++) {
        plant.leaves.push({
          y: (i / leafCount) * plant.targetHeight,
          side: i % 2 === 0 ? 1 : -1,
          size: 15 + Math.random() * 10,
          angle: 0,
        });
      }
    }

    function createFlowers(plant: PlantData) {
      const flowerCount = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < flowerCount; i++) {
        plant.flowers.push({
          y: plant.targetHeight - 20 - Math.random() * 20,
          size: 8 + Math.random() * 6,
          petals: 5 + Math.floor(Math.random() * 3),
        });
      }
    }

    function tryPlant(x: number, y: number) {
      for (const plot of plots) {
        if (
          x >= plot.x && x <= plot.x + plot.width &&
          y >= plot.y && y <= plot.y + plot.height &&
          !plot.planted
        ) {
          plot.planted = true;
          const type = PLANT_TYPES[Math.floor(Math.random() * PLANT_TYPES.length)];
          plants.push({
            x: plot.x + plot.width / 2,
            y: plot.y,
            type,
            stage: 0,
            growth: 0,
            height: 0,
            targetHeight: type.height,
            leaves: [],
            flowers: [],
            age: 0,
            swayOffset: Math.random() * Math.PI * 2,
          });
          playTone(330, 0.15);

          // Particle burst
          for (let i = 0; i < 10; i++) {
            steamParticles.push({
              x: plot.x + plot.width / 2 + (Math.random() - 0.5) * 20,
              y: plot.y,
              vx: (Math.random() - 0.5) * 0.5,
              vy: -0.5 - Math.random() * 0.5,
              size: 2 + Math.random() * 4,
              alpha: 0.1 + Math.random() * 0.2,
              life: 1,
            });
          }
          break;
        }
      }
    }

    function handleClick(e: MouseEvent) {
      initAudio();
      const rect = canvas!.getBoundingClientRect();
      tryPlant(e.clientX - rect.left, e.clientY - rect.top);
    }

    function handleTouch(e: TouchEvent) {
      initAudio();
      e.preventDefault();
      const rect = canvas!.getBoundingClientRect();
      tryPlant(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
    }

    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchstart', handleTouch, { passive: false });

    function drawGreenhouse() {
      const paneWidth = canvas!.width / 5;
      const paneHeight = canvas!.height * 0.6;

      for (let i = 0; i < 5; i++) {
        const x = i * paneWidth;
        ctx!.strokeStyle = 'rgba(212, 165, 116, 0.3)';
        ctx!.lineWidth = 2;
        ctx!.beginPath();
        ctx!.moveTo(x, 0);
        ctx!.lineTo(x, paneHeight);
        ctx!.stroke();

        const gradient = ctx!.createLinearGradient(x, 0, x + paneWidth, paneHeight);
        gradient.addColorStop(0, 'rgba(255, 215, 0, 0.03)');
        gradient.addColorStop(0.5, 'rgba(45, 149, 150, 0.02)');
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0.03)');
        ctx!.fillStyle = gradient;
        ctx!.fillRect(x, 0, paneWidth, paneHeight);
      }

      for (let i = 0; i <= 3; i++) {
        const y = (i / 3) * paneHeight;
        ctx!.strokeStyle = 'rgba(212, 165, 116, 0.2)';
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.moveTo(0, y);
        ctx!.lineTo(canvas!.width, y);
        ctx!.stroke();
      }

      ctx!.fillStyle = '#1a1a1a';
      ctx!.fillRect(0, canvas!.height - 200, canvas!.width, 200);
    }

    function drawPlant(plant: PlantData) {
      const sway = Math.sin(Date.now() / 1000 + plant.swayOffset) * 2;

      if (plant.stage === 0) {
        ctx!.fillStyle = COLORS.amber;
        ctx!.beginPath();
        ctx!.arc(plant.x, plant.y - 2, 3, 0, Math.PI * 2);
        ctx!.fill();
        return;
      }

      if (plant.stage === 1) {
        const sproutHeight = Math.min(15, (plant.age - 60) / 4);
        ctx!.strokeStyle = plant.type.stem;
        ctx!.lineWidth = 2;
        ctx!.beginPath();
        ctx!.moveTo(plant.x, plant.y);
        ctx!.lineTo(plant.x, plant.y - sproutHeight);
        ctx!.stroke();
        return;
      }

      if (plant.stage >= 2) {
        ctx!.strokeStyle = plant.type.stem;
        ctx!.lineWidth = 3;
        ctx!.beginPath();
        ctx!.moveTo(plant.x, plant.y);
        ctx!.lineTo(plant.x + sway, plant.y - plant.height);
        ctx!.stroke();
      }

      if (plant.stage >= 3) {
        plant.leaves.forEach(leaf => {
          if (leaf.y < plant.height) {
            const leafX = plant.x + sway + leaf.side * 15;
            const leafY = plant.y - leaf.y;
            ctx!.fillStyle = plant.type.leaf;
            ctx!.beginPath();
            ctx!.ellipse(leafX, leafY, leaf.size, leaf.size * 0.6, leaf.side > 0 ? -0.3 : 0.3, 0, Math.PI * 2);
            ctx!.fill();
          }
        });
      }

      if (plant.stage >= 4) {
        plant.flowers.forEach(flower => {
          const flowerX = plant.x + sway;
          const flowerY = plant.y - flower.y;
          ctx!.fillStyle = plant.type.flower;
          for (let i = 0; i < flower.petals; i++) {
            const angle = (i / flower.petals) * Math.PI * 2;
            const px = flowerX + Math.cos(angle) * flower.size;
            const py = flowerY + Math.sin(angle) * flower.size;
            ctx!.beginPath();
            ctx!.arc(px, py, flower.size * 0.5, 0, Math.PI * 2);
            ctx!.fill();
          }
          ctx!.fillStyle = COLORS.gold;
          ctx!.beginPath();
          ctx!.arc(flowerX, flowerY, flower.size * 0.4, 0, Math.PI * 2);
          ctx!.fill();
        });
      }
    }

    let animId: number;

    function animate() {
      // Fade trail
      ctx!.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);

      drawGreenhouse();

      // Sunbeams
      sunbeams.forEach(beam => {
        beam.y += beam.vy;
        if (beam.y > canvas!.height) {
          beam.y = -10;
          beam.x = Math.random() * canvas!.width;
        }
        ctx!.fillStyle = `rgba(255, 215, 0, ${beam.alpha})`;
        ctx!.beginPath();
        ctx!.arc(beam.x, beam.y, beam.size, 0, Math.PI * 2);
        ctx!.fill();
      });

      // Spawn ambient steam
      if (Math.random() < 0.3) {
        const plot = plots[Math.floor(Math.random() * plots.length)];
        steamParticles.push({
          x: plot.x + Math.random() * plot.width,
          y: plot.y,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -0.5 - Math.random() * 0.5,
          size: 2 + Math.random() * 4,
          alpha: 0.1 + Math.random() * 0.2,
          life: 1,
        });
      }

      // Steam particles
      for (let i = steamParticles.length - 1; i >= 0; i--) {
        const p = steamParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.005;
        p.alpha = p.life * 0.3;
        ctx!.fillStyle = `rgba(212, 165, 116, ${p.alpha})`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fill();
        if (p.life <= 0) steamParticles.splice(i, 1);
      }

      // Soil plots
      plots.forEach(plot => {
        ctx!.fillStyle = plot.planted ? '#3a2a1a' : '#4a3a2a';
        ctx!.fillRect(plot.x, plot.y, plot.width, plot.height);
        ctx!.strokeStyle = COLORS.amber;
        ctx!.lineWidth = 2;
        ctx!.strokeRect(plot.x, plot.y, plot.width, plot.height);
        if (!plot.planted) {
          ctx!.fillStyle = 'rgba(212, 165, 116, 0.2)';
          ctx!.fillRect(plot.x, plot.y, plot.width, plot.height);
        }
      });

      // Update & draw plants
      plants.forEach(plant => {
        plant.age++;

        if (plant.stage === 0 && plant.age > 60) {
          plant.stage = 1;
          playTone(440, 0.05);
        } else if (plant.stage === 1 && plant.age > 180) {
          plant.stage = 2;
        } else if (plant.stage === 2 && plant.height >= plant.targetHeight * 0.5) {
          plant.stage = 3;
          createLeaves(plant);
          playTone(550, 0.05);
        } else if (plant.stage === 3 && plant.height >= plant.targetHeight * 0.9) {
          plant.stage = 4;
          createFlowers(plant);
          playTone(660, 0.1);
        }

        if (plant.stage >= 2 && plant.height < plant.targetHeight) {
          plant.height += 0.3;
        }

        drawPlant(plant);
      });

      // Update HUD counts
      setPlantCount(plants.length);
      setBloomCount(plants.filter(p => p.stage === 4).length);

      animId = requestAnimationFrame(animate);
    }

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('touchstart', handleTouch);
    };
  }, []);

  return (
    <div style={{ background: '#000', width: '100vw', height: '100vh', overflow: 'hidden', fontFamily: "'Courier New', monospace" }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100vw', height: '100vh' }} />

      {/* Title */}
      <div style={{
        position: 'fixed', top: 20, right: 20,
        fontSize: 18, fontWeight: 'bold', color: COLORS.gold,
        textShadow: `0 0 20px rgba(255, 215, 0, 0.6)`,
        pointerEvents: 'none',
      }}>
        GREENHOUSE
      </div>

      {/* HUD */}
      <div style={{
        position: 'fixed', top: 20, left: 20,
        fontSize: 14, pointerEvents: 'none',
        textShadow: `0 0 10px rgba(212, 165, 116, 0.5)`,
      }}>
        <div style={{ marginBottom: 8 }}>
          <span style={{ color: COLORS.teal, fontSize: 12 }}>PLANTS: </span>
          <span style={{ color: COLORS.gold, fontWeight: 'bold' }}>{plantCount}</span>
        </div>
        <div style={{ marginBottom: 8 }}>
          <span style={{ color: COLORS.teal, fontSize: 12 }}>BLOOMING: </span>
          <span style={{ color: COLORS.gold, fontWeight: 'bold' }}>{bloomCount}</span>
        </div>
        <div>
          <span style={{ color: COLORS.teal, fontSize: 12 }}>HUMIDITY: </span>
          <span style={{ color: COLORS.gold, fontWeight: 'bold' }}>78%</span>
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        textAlign: 'center', fontSize: 13, color: COLORS.amber,
        textShadow: `0 0 10px rgba(212, 165, 116, 0.8)`,
        pointerEvents: 'none',
        animation: 'pulse 2s ease-in-out infinite',
      }}>
        TAP SOIL TO PLANT · WATCH THEM GROW
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
