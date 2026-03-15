'use client';

import React, { useEffect, useRef, useCallback } from 'react';

// ─── TYPES ──────────────────────────────────────────────────────────
interface FlowerType {
  id: string;
  name: string;
  petalShape: 'rose' | 'lily' | 'sunflower' | 'orchid' | 'tulip' | 'dahlia';
  petalCount: number;
  petalLayers: number;
  colors: { petal: string; petalInner: string; center: string; stem: string; leaf: string };
  growthRate: number;
}

interface Plot {
  x: number; y: number; w: number; h: number;
  plant: Plant | null;
  moisture: number; // 0-1
}

interface Plant {
  type: FlowerType;
  age: number;
  stage: number; // 0=seed,1=sprout,2=stem,3=bud,4=bloom
  height: number;
  targetHeight: number;
  bloomProgress: number; // 0-1 for bloom unfurl
  swayOffset: number;
  wilting: boolean;
  wiltLevel: number; // 0-3, 3=dead
  missedWaters: number;
  leaves: { y: number; side: number; size: number }[];
  harvestReady: boolean;
}

interface GameState {
  petals: number;
  shelf: Set<string>; // discovered variety IDs
  plots: Plot[];
  upgrades: { extraPlot1: boolean; extraPlot2: boolean; dripLine: boolean; growLight: boolean; goldPot: boolean };
  seedChoices: FlowerType[] | null;
  crossMode: boolean;
  crossSelection: number[]; // plot indices
  showShelf: boolean;
  showUpgrades: boolean;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  size: number; alpha: number; life: number; color: string;
}

// ─── FLOWER VARIETIES ───────────────────────────────────────────────
const BASE_FLOWERS: FlowerType[] = [
  { id: 'rose', name: 'Rose', petalShape: 'rose', petalCount: 12, petalLayers: 3,
    colors: { petal: '#e11d48', petalInner: '#fb7185', center: '#fbbf24', stem: '#15803d', leaf: '#22c55e' }, growthRate: 1 },
  { id: 'lily', name: 'Lily', petalShape: 'lily', petalCount: 6, petalLayers: 2,
    colors: { petal: '#f9fafb', petalInner: '#fde68a', center: '#f59e0b', stem: '#166534', leaf: '#4ade80' }, growthRate: 1.1 },
  { id: 'sunflower', name: 'Sunflower', petalShape: 'sunflower', petalCount: 16, petalLayers: 2,
    colors: { petal: '#facc15', petalInner: '#fde047', center: '#78350f', stem: '#15803d', leaf: '#65a30d' }, growthRate: 0.9 },
  { id: 'orchid', name: 'Orchid', petalShape: 'orchid', petalCount: 5, petalLayers: 2,
    colors: { petal: '#c084fc', petalInner: '#e9d5ff', center: '#fbbf24', stem: '#166534', leaf: '#86efac' }, growthRate: 0.8 },
  { id: 'tulip', name: 'Tulip', petalShape: 'tulip', petalCount: 6, petalLayers: 2,
    colors: { petal: '#f43f5e', petalInner: '#fda4af', center: '#fde047', stem: '#15803d', leaf: '#4ade80' }, growthRate: 1.2 },
  { id: 'dahlia', name: 'Dahlia', petalShape: 'dahlia', petalCount: 20, petalLayers: 3,
    colors: { petal: '#f97316', petalInner: '#fdba74', center: '#92400e', stem: '#166534', leaf: '#22c55e' }, growthRate: 0.7 },
];

// Deterministic crossbreeding grid: parent A x parent B → hybrid
function getHybridId(a: string, b: string): string {
  const sorted = [a, b].sort();
  return `${sorted[0]}x${sorted[1]}`;
}

function blendColor(c1: string, c2: string, t = 0.5): string {
  const hex = (s: string) => [parseInt(s.slice(1,3),16), parseInt(s.slice(3,5),16), parseInt(s.slice(5,7),16)];
  const [r1,g1,b1] = hex(c1);
  const [r2,g2,b2] = hex(c2);
  const r = Math.round(r1 + (r2-r1)*t);
  const g = Math.round(g1 + (g2-g1)*t);
  const b = Math.round(b1 + (b2-b1)*t);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

const HYBRID_NAMES: Record<string, string> = {
  'lily×rose': 'Rosalily', 'orchid×rose': 'Roseorchid', 'rose×sunflower': 'Sunrose',
  'rose×tulip': 'Tuliprose', 'dahlia×rose': 'Rosedahlia',
  'lily×sunflower': 'Sunlily', 'lily×orchid': 'Orchidlily', 'lily×tulip': 'Tuliplily',
  'dahlia×lily': 'Lilydahlia', 'orchid×sunflower': 'Sunorchid',
  'sunflower×tulip': 'Suntulip', 'dahlia×sunflower': 'Sundahlia',
  'orchid×tulip': 'Orchidtulip', 'dahlia×orchid': 'Orchiddahlia',
  'dahlia×tulip': 'Tulipdahlia',
};

function createHybrid(a: FlowerType, b: FlowerType): FlowerType {
  const id = getHybridId(a.id, b.id);
  const sortedIds = [a.id, b.id].sort();
  const key = `${sortedIds[0]}×${sortedIds[1]}`;
  return {
    id,
    name: HYBRID_NAMES[key] || `${a.name}${b.name}`,
    petalShape: a.petalShape,
    petalCount: Math.round((a.petalCount + b.petalCount) / 2),
    petalLayers: Math.max(a.petalLayers, b.petalLayers),
    colors: {
      petal: blendColor(a.colors.petal, b.colors.petal),
      petalInner: blendColor(a.colors.petalInner, b.colors.petalInner),
      center: blendColor(a.colors.center, b.colors.center),
      stem: blendColor(a.colors.stem, b.colors.stem),
      leaf: blendColor(a.colors.leaf, b.colors.leaf),
    },
    growthRate: (a.growthRate + b.growthRate) / 2,
  };
}

// Generate all 21 varieties
const ALL_VARIETIES: FlowerType[] = [...BASE_FLOWERS];
for (let i = 0; i < BASE_FLOWERS.length; i++) {
  for (let j = i + 1; j < BASE_FLOWERS.length; j++) {
    ALL_VARIETIES.push(createHybrid(BASE_FLOWERS[i], BASE_FLOWERS[j]));
  }
}

// ─── PERSISTENCE ────────────────────────────────────────────────────
const SAVE_KEY = 'flowercraft_save';

function saveGame(state: GameState) {
  try {
    const data = {
      petals: state.petals,
      shelf: [...state.shelf],
      upgrades: state.upgrades,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

function loadGame(): { petals: number; shelf: string[]; upgrades: GameState['upgrades'] } | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────
export default function FlowercraftGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const stateRef = useRef<GameState | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastTimeRef = useRef(0);

  const playTone = useCallback((freq: number, duration = 0.1, type: OscillatorType = 'sine') => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    if (!ctx) return;

    let dpr = window.devicePixelRatio || 1;
    let W = 0, H = 0;

    function resize() {
      dpr = window.devicePixelRatio || 1;
      W = window.innerWidth;
      H = window.innerHeight;
      canvas!.width = W * dpr;
      canvas!.height = H * dpr;
      canvas!.style.width = W + 'px';
      canvas!.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (stateRef.current) rebuildPlotPositions(stateRef.current);
    }
    resize();
    window.addEventListener('resize', resize);

    // ─── INIT GAME STATE ──────────────────────────────────────────
    const saved = loadGame();
    const initialPlotCount = saved?.upgrades?.extraPlot2 ? 10 : saved?.upgrades?.extraPlot1 ? 8 : 6;
    const state: GameState = {
      petals: saved?.petals || 0,
      shelf: new Set(saved?.shelf || []),
      plots: [],
      upgrades: saved?.upgrades || { extraPlot1: false, extraPlot2: false, dripLine: false, growLight: false, goldPot: false },
      seedChoices: null,
      crossMode: false,
      crossSelection: [],
      showShelf: false,
      showUpgrades: false,
    };
    stateRef.current = state;

    function getPlotCount(): number {
      if (state.upgrades.extraPlot2) return 10;
      if (state.upgrades.extraPlot1) return 8;
      return 6;
    }

    function rebuildPlotPositions(s: GameState) {
      const count = getPlotCount();
      const cols = Math.min(count, 5);
      const rows = Math.ceil(count / cols);
      const plotW = Math.min(100, (W - 40) / cols - 10);
      const plotH = 50;
      const gap = 10;
      const totalW = cols * plotW + (cols - 1) * gap;
      const startX = (W - totalW) / 2;
      const startY = H - 80 - rows * (plotH + gap + 80);

      // Preserve existing plants
      const existingPlants: (Plant | null)[] = s.plots.map(p => p.plant);

      s.plots = [];
      for (let i = 0; i < count; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        s.plots.push({
          x: startX + col * (plotW + gap),
          y: startY + row * (plotH + gap + 80),
          w: plotW,
          h: plotH,
          plant: existingPlants[i] || null,
          moisture: 1,
        });
      }
    }
    rebuildPlotPositions(state);

    // ─── BEZIER PETAL RENDERING ─────────────────────────────────────
    function drawPetal(cx: number, cy: number, angle: number, length: number, width: number, color: string, alpha: number) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(width * 0.6, -length * 0.3, width * 0.8, -length * 0.7, 0, -length);
      ctx.bezierCurveTo(-width * 0.8, -length * 0.7, -width * 0.6, -length * 0.3, 0, 0);
      ctx.fill();
      ctx.restore();
    }

    function drawFlower(x: number, y: number, type: FlowerType, bloomProgress: number, size: number) {
      const bp = Math.max(0, Math.min(1, bloomProgress));
      const { petal, petalInner, center } = type.colors;
      const petalLen = size * 1.2 * bp;
      const petalW = size * 0.4 * bp;

      // Draw petal layers (outer to inner)
      for (let layer = type.petalLayers - 1; layer >= 0; layer--) {
        const layerScale = 1 - layer * 0.2;
        const layerColor = layer === 0 ? petal : blendColor(petal, petalInner, layer / type.petalLayers);
        const layerAlpha = 0.6 + layer * 0.15;
        const rotOffset = layer * 0.15;

        for (let i = 0; i < type.petalCount; i++) {
          const angle = (i / type.petalCount) * Math.PI * 2 + rotOffset;
          drawPetal(x, y, angle, petalLen * layerScale, petalW * layerScale, layerColor, layerAlpha * bp);
        }
      }

      // Center
      if (bp > 0.3) {
        ctx.globalAlpha = Math.min(1, (bp - 0.3) * 2);
        ctx.fillStyle = center;
        ctx.beginPath();
        ctx.arc(x, y, size * 0.3 * bp, 0, Math.PI * 2);
        ctx.fill();

        // Center dots
        ctx.fillStyle = blendColor(center, '#ffffff', 0.3);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          const r = size * 0.15 * bp;
          ctx.beginPath();
          ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // Pollen burst at full bloom
      if (bp >= 0.95) {
        const t = Date.now() / 800;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + t;
          const dist = size * 1.5 + Math.sin(t * 2 + i) * 3;
          ctx.globalAlpha = 0.3 + Math.sin(t + i) * 0.15;
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(x + Math.cos(a) * dist, y + Math.sin(a) * dist, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }

    function drawPlant(plot: Plot) {
      const plant = plot.plant;
      if (!plant) return;

      const baseX = plot.x + plot.w / 2;
      const baseY = plot.y;
      const sway = Math.sin(Date.now() / 1000 + plant.swayOffset) * (plant.wilting ? 5 : 2);
      const wiltDroop = plant.wilting ? plant.wiltLevel * 8 : 0;

      // Seed
      if (plant.stage === 0) {
        ctx.fillStyle = '#92400e';
        ctx.beginPath();
        ctx.ellipse(baseX, baseY - 4, 4, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      // Stem
      const stemTop = baseY - plant.height + wiltDroop;
      ctx.strokeStyle = plant.wilting ? blendColor(plant.type.colors.stem, '#6b5b3a', plant.wiltLevel / 3) : plant.type.colors.stem;
      ctx.lineWidth = plant.stage >= 3 ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      if (plant.wilting) {
        ctx.quadraticCurveTo(baseX + sway * 2, baseY - plant.height * 0.5, baseX + sway + wiltDroop * 2, stemTop);
      } else {
        ctx.quadraticCurveTo(baseX + sway * 0.5, baseY - plant.height * 0.5, baseX + sway, stemTop);
      }
      ctx.stroke();

      // Leaves
      if (plant.stage >= 3) {
        const leafColor = plant.wilting ? blendColor(plant.type.colors.leaf, '#8B7355', plant.wiltLevel / 3) : plant.type.colors.leaf;
        plant.leaves.forEach(leaf => {
          if (leaf.y > plant.height) return;
          const frac = leaf.y / plant.height;
          const lx = baseX + sway * frac + leaf.side * 12;
          const ly = baseY - leaf.y + wiltDroop * frac;
          ctx.fillStyle = leafColor;
          ctx.save();
          ctx.translate(lx, ly);
          ctx.rotate(leaf.side * -0.4 + (plant.wilting ? leaf.side * 0.5 : 0));
          ctx.beginPath();
          ctx.ellipse(0, 0, leaf.size, leaf.size * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      }

      // Bud
      if (plant.stage === 3) {
        const budX = baseX + sway;
        const budY = stemTop;
        ctx.fillStyle = plant.type.colors.petal;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.ellipse(budX, budY - 5, 6, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        // Sepals
        ctx.fillStyle = plant.type.colors.stem;
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI - Math.PI / 2;
          ctx.beginPath();
          ctx.ellipse(budX + Math.cos(a) * 4, budY - 2 + Math.sin(a) * 3, 3, 5, a, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Bloom
      if (plant.stage === 4) {
        const flowerX = baseX + sway + wiltDroop;
        const flowerY = stemTop - 4;
        const flowerSize = 14 + plant.type.petalCount * 0.3;
        if (plant.wilting) {
          ctx.globalAlpha = 1 - plant.wiltLevel * 0.25;
        }
        drawFlower(flowerX, flowerY, plant.type, plant.bloomProgress, flowerSize);
        ctx.globalAlpha = 1;

        // Harvest indicator
        if (plant.harvestReady && !plant.wilting) {
          const pulse = 0.6 + Math.sin(Date.now() / 300) * 0.4;
          ctx.globalAlpha = pulse;
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(flowerX, flowerY, flowerSize * 1.8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }

    // ─── MOISTURE & WATERING ────────────────────────────────────────
    const MOISTURE_DRAIN = 1 / (18 * 60); // drains fully in ~18 seconds at 60fps
    const MOISTURE_DRAIN_DRIP = MOISTURE_DRAIN * 0.5;

    function updateMoisture(plot: Plot) {
      if (!plot.plant) return;
      const drain = state.upgrades.dripLine ? MOISTURE_DRAIN_DRIP : MOISTURE_DRAIN;
      plot.moisture = Math.max(0, plot.moisture - drain);

      if (plot.moisture <= 0 && plot.plant.stage >= 1 && !plot.plant.wilting) {
        plot.plant.missedWaters++;
        plot.moisture = 0.1; // tiny reset to give a window
        if (plot.plant.missedWaters >= 3) {
          plot.plant.wilting = true;
        }
      }
    }

    function waterPlot(plotIdx: number) {
      const plot = state.plots[plotIdx];
      if (!plot || !plot.plant) return;
      plot.moisture = 1;
      playTone(523, 0.08);
      // Water splash particles
      for (let i = 0; i < 6; i++) {
        particlesRef.current.push({
          x: plot.x + plot.w / 2 + (Math.random() - 0.5) * plot.w * 0.6,
          y: plot.y - 5,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -1 - Math.random() * 2,
          size: 2 + Math.random() * 3,
          alpha: 0.5,
          life: 1,
          color: '#60a5fa',
        });
      }
    }

    // ─── PLANT GROWTH ───────────────────────────────────────────────
    const GROWTH_FRAMES = 2 * 60 * 60; // ~2 min at 60fps
    const SEED_FRAMES = 40;
    const SPROUT_FRAMES = 100;

    function updatePlant(plot: Plot) {
      const plant = plot.plant;
      if (!plant || plant.wilting) {
        if (plant?.wilting) {
          plant.wiltLevel = Math.min(3, plant.wiltLevel + 0.003);
        }
        return;
      }

      plant.age++;
      const rate = plant.type.growthRate * (state.upgrades.growLight ? 1.3 : 1);

      if (plant.stage === 0 && plant.age > SEED_FRAMES) {
        plant.stage = 1;
        playTone(440, 0.05);
      } else if (plant.stage === 1 && plant.age > SEED_FRAMES + SPROUT_FRAMES) {
        plant.stage = 2;
      } else if (plant.stage === 2 && plant.height >= plant.targetHeight * 0.6) {
        plant.stage = 3;
        // Generate leaves
        const leafCount = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < leafCount; i++) {
          plant.leaves.push({
            y: (i / leafCount) * plant.targetHeight * 0.8 + 10,
            side: i % 2 === 0 ? 1 : -1,
            size: 10 + Math.random() * 8,
          });
        }
        playTone(550, 0.05);
      } else if (plant.stage === 3 && plant.height >= plant.targetHeight * 0.95) {
        plant.stage = 4;
        plant.bloomProgress = 0;
        playTone(660, 0.15, 'triangle');
      }

      // Grow
      if (plant.stage >= 2 && plant.height < plant.targetHeight) {
        plant.height += (plant.targetHeight / (GROWTH_FRAMES * 0.6)) * rate * 60;
      }

      // Bloom unfurl (3 seconds)
      if (plant.stage === 4 && plant.bloomProgress < 1) {
        plant.bloomProgress += 1 / (3 * 60);
        if (plant.bloomProgress >= 1) {
          plant.bloomProgress = 1;
          plant.harvestReady = true;
          // Add to shelf
          if (!state.shelf.has(plant.type.id)) {
            state.shelf.add(plant.type.id);
            playTone(880, 0.2, 'triangle');
            saveGame(state);
          }
        }
      }
    }

    // ─── HARVEST ────────────────────────────────────────────────────
    function harvestPlant(plotIdx: number) {
      const plot = state.plots[plotIdx];
      if (!plot?.plant?.harvestReady || plot.plant.wilting) return;

      const petalReward = 3 + Math.floor(plot.plant.type.petalCount / 3);
      state.petals += petalReward;

      // Harvest particles
      for (let i = 0; i < 12; i++) {
        particlesRef.current.push({
          x: plot.x + plot.w / 2,
          y: plot.y - plot.plant!.height,
          vx: (Math.random() - 0.5) * 3,
          vy: -2 - Math.random() * 2,
          size: 3 + Math.random() * 3,
          alpha: 1,
          life: 1,
          color: plot.plant!.type.colors.petal,
        });
      }

      playTone(880, 0.15);
      plot.plant = null;
      plot.moisture = 1;

      // Show seed choices
      state.seedChoices = [];
      const available = ALL_VARIETIES.filter(() => true);
      for (let i = 0; i < 3; i++) {
        state.seedChoices.push(available[Math.floor(Math.random() * available.length)]);
      }

      saveGame(state);
    }

    // ─── PLANTING ───────────────────────────────────────────────────
    function plantSeed(plotIdx: number, type: FlowerType) {
      const plot = state.plots[plotIdx];
      if (!plot || plot.plant) return;

      plot.plant = {
        type,
        age: 0,
        stage: 0,
        height: 0,
        targetHeight: 70 + Math.random() * 40,
        bloomProgress: 0,
        swayOffset: Math.random() * Math.PI * 2,
        wilting: false,
        wiltLevel: 0,
        missedWaters: 0,
        leaves: [],
        harvestReady: false,
      };
      plot.moisture = 1;
      state.seedChoices = null;
      playTone(330, 0.12);

      // Planting particles
      for (let i = 0; i < 8; i++) {
        particlesRef.current.push({
          x: plot.x + plot.w / 2 + (Math.random() - 0.5) * 20,
          y: plot.y,
          vx: (Math.random() - 0.5) * 0.8,
          vy: -0.5 - Math.random() * 1,
          size: 2 + Math.random() * 3,
          alpha: 0.4,
          life: 1,
          color: '#D4A574',
        });
      }
    }

    // ─── CROSSBREEDING ──────────────────────────────────────────────
    function tryCross() {
      if (state.crossSelection.length !== 2) return;
      const [a, b] = state.crossSelection;
      const plotA = state.plots[a];
      const plotB = state.plots[b];
      if (!plotA?.plant?.harvestReady || !plotB?.plant?.harvestReady) return;

      const hybrid = createHybrid(plotA.plant.type, plotB.plant.type);

      // Consume parents
      plotA.plant = null;
      plotA.moisture = 1;
      plotB.plant = null;
      plotB.moisture = 1;

      // Find empty plot and plant hybrid
      const emptyPlot = state.plots.findIndex(p => !p.plant);
      if (emptyPlot >= 0) {
        plantSeed(emptyPlot, hybrid);
      } else {
        state.seedChoices = [hybrid];
      }

      state.crossMode = false;
      state.crossSelection = [];
      playTone(660, 0.2, 'triangle');
      playTone(880, 0.15);
    }

    // ─── UPGRADES ───────────────────────────────────────────────────
    function buyUpgrade(id: string) {
      const costs: Record<string, number> = { extraPlot1: 10, extraPlot2: 25, dripLine: 15, growLight: 20, goldPot: 30 };
      const cost = costs[id];
      if (!cost || state.petals < cost) return;
      if ((state.upgrades as any)[id]) return;
      if (id === 'extraPlot2' && !state.upgrades.extraPlot1) return;

      state.petals -= cost;
      (state.upgrades as any)[id] = true;

      if (id === 'extraPlot1' || id === 'extraPlot2') {
        rebuildPlotPositions(state);
      }

      playTone(440, 0.1);
      playTone(660, 0.1);
      saveGame(state);
    }

    // ─── INPUT HANDLING ─────────────────────────────────────────────
    function getTouch(e: MouseEvent | TouchEvent): { x: number; y: number } {
      if ('touches' in e) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      return { x: e.clientX, y: e.clientY };
    }

    function handleInput(e: MouseEvent | TouchEvent) {
      if ('touches' in e) e.preventDefault();
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const { x, y } = getTouch(e);

      // Check UI buttons first
      // Shelf button (top-left)
      if (x < 110 && y < 50) {
        state.showShelf = !state.showShelf;
        state.showUpgrades = false;
        return;
      }

      // Upgrades button (top-right area)
      if (x > W - 110 && y < 50) {
        state.showUpgrades = !state.showUpgrades;
        state.showShelf = false;
        return;
      }

      // Cross button
      const hasBloomedPlants = state.plots.filter(p => p.plant?.harvestReady && !p.plant.wilting).length >= 2;
      if (hasBloomedPlants) {
        const crossBtnX = W / 2;
        const crossBtnY = 42;
        if (Math.abs(x - crossBtnX) < 50 && Math.abs(y - crossBtnY) < 18) {
          state.crossMode = !state.crossMode;
          state.crossSelection = [];
          return;
        }
      }

      // Close overlays
      if (state.showShelf || state.showUpgrades) {
        // Check upgrade buy buttons
        if (state.showUpgrades) {
          const panelX = W / 2 - 140;
          const panelY = 60;
          const upgrades = [
            { id: 'extraPlot1', cost: 10 },
            { id: 'extraPlot2', cost: 25 },
            { id: 'dripLine', cost: 15 },
            { id: 'growLight', cost: 20 },
            { id: 'goldPot', cost: 30 },
          ];
          for (let i = 0; i < upgrades.length; i++) {
            const by = panelY + 40 + i * 40;
            if (y >= by && y <= by + 32 && x >= panelX && x <= panelX + 280) {
              buyUpgrade(upgrades[i].id);
              return;
            }
          }
        }
        state.showShelf = false;
        state.showUpgrades = false;
        return;
      }

      // Seed choices
      if (state.seedChoices) {
        const choiceY = H / 2 - 40;
        const choiceW = 90;
        const totalW = state.seedChoices.length * (choiceW + 10) - 10;
        const startX = (W - totalW) / 2;
        for (let i = 0; i < state.seedChoices.length; i++) {
          const cx = startX + i * (choiceW + 10);
          if (x >= cx && x <= cx + choiceW && y >= choiceY && y <= choiceY + 100) {
            const emptyPlot = state.plots.findIndex(p => !p.plant);
            if (emptyPlot >= 0) {
              plantSeed(emptyPlot, state.seedChoices[i]);
            }
            return;
          }
        }
        // Tap elsewhere to dismiss
        state.seedChoices = null;
        return;
      }

      // Plot interactions
      for (let i = 0; i < state.plots.length; i++) {
        const plot = state.plots[i];
        const px = plot.x - 5;
        const py = plot.y - (plot.plant ? plot.plant.height + 30 : 10);
        const pw = plot.w + 10;
        const ph = (plot.plant ? plot.plant.height + 30 : 10) + plot.h + 10;

        if (x >= px && x <= px + pw && y >= py && y <= py + ph) {
          if (state.crossMode) {
            if (plot.plant?.harvestReady && !plot.plant.wilting) {
              const idx = state.crossSelection.indexOf(i);
              if (idx >= 0) {
                state.crossSelection.splice(idx, 1);
              } else if (state.crossSelection.length < 2) {
                state.crossSelection.push(i);
                if (state.crossSelection.length === 2) {
                  tryCross();
                }
              }
            }
            return;
          }

          if (plot.plant?.harvestReady && !plot.plant.wilting) {
            harvestPlant(i);
            return;
          }

          if (plot.plant && plot.moisture < 0.8) {
            waterPlot(i);
            return;
          }

          if (!plot.plant) {
            const type = BASE_FLOWERS[Math.floor(Math.random() * BASE_FLOWERS.length)];
            plantSeed(i, type);
            return;
          }
          return;
        }
      }
    }

    canvas.addEventListener('click', handleInput as any);
    canvas.addEventListener('touchstart', handleInput as any, { passive: false });

    // ─── DRAWING HELPERS ────────────────────────────────────────────
    function drawMoistureBar(plot: Plot) {
      if (!plot.plant) return;
      const barW = plot.w * 0.8;
      const barH = 4;
      const barX = plot.x + (plot.w - barW) / 2;
      const barY = plot.y + plot.h + 4;

      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(barX, barY, barW, barH);

      const mColor = plot.moisture > 0.4 ? '#3b82f6' : plot.moisture > 0.15 ? '#f59e0b' : '#ef4444';
      ctx.fillStyle = mColor;
      ctx.fillRect(barX, barY, barW * plot.moisture, barH);

      if (plot.moisture < 0.25) {
        const pulse = 0.5 + Math.sin(Date.now() / 200) * 0.5;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#ef4444';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('💧', plot.x + plot.w / 2, barY + 16);
        ctx.globalAlpha = 1;
      }
    }

    function drawPlotBorder(plot: Plot, idx: number) {
      const isSelected = state.crossMode && state.crossSelection.includes(idx);
      const ornate = state.upgrades.goldPot;

      if (ornate) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.strokeRect(plot.x - 2, plot.y - 2, plot.w + 4, plot.h + 4);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1;
        ctx.strokeRect(plot.x - 4, plot.y - 4, plot.w + 8, plot.h + 8);
      } else {
        ctx.strokeStyle = isSelected ? '#fde047' : '#6b5b4b';
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.strokeRect(plot.x, plot.y, plot.w, plot.h);
      }
    }

    function drawHUD() {
      // Petals count (top center)
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`🌸 ${state.petals}`, W / 2, 22);

      // Shelf button (top left)
      ctx.fillStyle = state.showShelf ? '#fde047' : '#9ca3af';
      ctx.font = '13px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`SHELF ${state.shelf.size}/21`, 12, 22);

      // Upgrades button (top right)
      ctx.fillStyle = state.showUpgrades ? '#fde047' : '#9ca3af';
      ctx.textAlign = 'right';
      ctx.fillText('UPGRADES', W - 12, 22);

      // Cross button
      const bloomedCount = state.plots.filter(p => p.plant?.harvestReady && !p.plant.wilting).length;
      if (bloomedCount >= 2) {
        const btnX = W / 2;
        const btnY = 42;
        ctx.fillStyle = state.crossMode ? '#fde047' : '#a78bfa';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(state.crossMode ? '✕ CANCEL' : '🧬 CROSS', btnX, btnY + 5);
      }

      // Title
      ctx.fillStyle = '#4b5563';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('FLOWERCRAFT', W / 2, H - 8);
    }

    function drawShelfOverlay() {
      if (!state.showShelf) return;

      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('COLLECTION SHELF', W / 2, 40);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '12px monospace';
      ctx.fillText(`${state.shelf.size} / 21 discovered`, W / 2, 58);

      const cols = 7;
      const size = Math.min(40, (W - 60) / cols);
      const gap = 6;
      const totalW = cols * (size + gap) - gap;
      const startX = (W - totalW) / 2;
      const startY = 80;

      ALL_VARIETIES.forEach((v, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = startX + col * (size + gap);
        const y = startY + row * (size + gap + 18);
        const discovered = state.shelf.has(v.id);

        if (discovered) {
          drawFlower(x + size / 2, y + size / 2, v, 1, size * 0.35);
          ctx.fillStyle = '#e5e7eb';
          ctx.font = '8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(v.name, x + size / 2, y + size + 10);
        } else {
          ctx.strokeStyle = '#374151';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x + size / 2, y + size / 2, size * 0.35, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#374151';
          ctx.font = '8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('???', x + size / 2, y + size + 10);
        }
      });
    }

    function drawUpgradeOverlay() {
      if (!state.showUpgrades) return;

      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(0, 0, W, H);

      const panelW = 280;
      const panelX = W / 2 - panelW / 2;
      const panelY = 60;

      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('UPGRADES', W / 2, panelY + 20);

      const upgrades = [
        { id: 'extraPlot1', name: 'Extra Plot I', desc: '6→8 plots', cost: 10 },
        { id: 'extraPlot2', name: 'Extra Plot II', desc: '8→10 plots', cost: 25 },
        { id: 'dripLine', name: 'Drip Line', desc: 'Soil dries 50% slower', cost: 15 },
        { id: 'growLight', name: 'Grow Light', desc: 'Growth +30%', cost: 20 },
        { id: 'goldPot', name: 'Gold Pot', desc: 'Ornate borders', cost: 30 },
      ];

      upgrades.forEach((u, i) => {
        const y = panelY + 45 + i * 40;
        const owned = (state.upgrades as any)[u.id];
        const canBuy = !owned && state.petals >= u.cost && (u.id !== 'extraPlot2' || state.upgrades.extraPlot1);

        ctx.fillStyle = owned ? '#1a2e1a' : canBuy ? '#1a1a2e' : '#1a1a1a';
        ctx.fillRect(panelX, y, panelW, 32);
        ctx.strokeStyle = owned ? '#22c55e' : canBuy ? '#60a5fa' : '#374151';
        ctx.lineWidth = 1;
        ctx.strokeRect(panelX, y, panelW, 32);

        ctx.fillStyle = owned ? '#22c55e' : '#e5e7eb';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(u.name, panelX + 8, y + 14);
        ctx.fillStyle = '#9ca3af';
        ctx.font = '10px monospace';
        ctx.fillText(u.desc, panelX + 8, y + 26);

        ctx.textAlign = 'right';
        ctx.fillStyle = owned ? '#22c55e' : canBuy ? '#fde047' : '#6b7280';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(owned ? '✓' : `${u.cost} 🌸`, panelX + panelW - 8, y + 20);
      });
    }

    function drawSeedChoices() {
      if (!state.seedChoices) return;

      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CHOOSE A SEED', W / 2, H / 2 - 65);

      const choiceW = 90;
      const choiceH = 100;
      const totalW = state.seedChoices.length * (choiceW + 10) - 10;
      const startX = (W - totalW) / 2;
      const choiceY = H / 2 - 40;

      state.seedChoices.forEach((type, i) => {
        const cx = startX + i * (choiceW + 10);
        ctx.fillStyle = '#111827';
        ctx.fillRect(cx, choiceY, choiceW, choiceH);
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx, choiceY, choiceW, choiceH);

        drawFlower(cx + choiceW / 2, choiceY + 40, type, 1, 14);

        ctx.fillStyle = '#e5e7eb';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(type.name, cx + choiceW / 2, choiceY + choiceH - 12);
      });
    }

    // ─── MAIN LOOP ──────────────────────────────────────────────────
    let animId: number;

    function animate(timestamp: number) {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      lastTimeRef.current = timestamp;

      // Clear
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, W, H);

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#0a0f0a');
      bgGrad.addColorStop(0.7, '#0a0a0a');
      bgGrad.addColorStop(1, '#1a1510');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Sunbeams (subtle)
      const t = Date.now() / 2000;
      for (let i = 0; i < 5; i++) {
        const bx = W * (0.1 + (i / 5) * 0.8) + Math.sin(t + i) * 20;
        const by = Math.sin(t * 0.5 + i * 1.5) * H * 0.3;
        ctx.globalAlpha = 0.03;
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(bx, by, 80 + Math.sin(t + i) * 20, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Draw soil plots + plants
      state.plots.forEach((plot, i) => {
        // Soil
        ctx.fillStyle = plot.plant ? '#2a1f15' : '#3a2f20';
        ctx.fillRect(plot.x, plot.y, plot.w, plot.h);
        drawPlotBorder(plot, i);

        // Empty plot hint
        if (!plot.plant && !state.seedChoices) {
          ctx.fillStyle = 'rgba(212, 165, 116, 0.15)';
          ctx.font = '20px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('+', plot.x + plot.w / 2, plot.y + plot.h / 2 + 7);
        }

        // Update & draw plant
        if (plot.plant) {
          updateMoisture(plot);
          updatePlant(plot);
          drawPlant(plot);
          drawMoistureBar(plot);
        }
      });

      // Particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.02; // gravity
        p.life -= 0.015;
        p.alpha = p.life * 0.8;
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        if (p.life <= 0) particles.splice(i, 1);
      }
      ctx.globalAlpha = 1;

      // UI
      drawHUD();
      drawShelfOverlay();
      drawUpgradeOverlay();
      drawSeedChoices();

      // Instructions (only when no plants)
      if (state.plots.every(p => !p.plant) && !state.seedChoices) {
        const pulse = 0.4 + Math.sin(Date.now() / 500) * 0.3;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#D4A574';
        ctx.font = '13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('TAP A PLOT TO PLANT', W / 2, H - 30);
        ctx.globalAlpha = 1;
      }

      // Auto-save periodically
      if (Math.random() < 0.001) saveGame(state);

      animId = requestAnimationFrame(animate);
    }

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('click', handleInput as any);
      canvas.removeEventListener('touchstart', handleInput as any);
      if (stateRef.current) saveGame(stateRef.current);
    };
  }, [playTone]);

  return (
    <div style={{
      background: '#0a0a0a',
      width: '100vw', height: '100vh',
      overflow: 'hidden',
      touchAction: 'none',
      userSelect: 'none',
      WebkitUserSelect: 'none',
    }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100vw', height: '100vh' }}
      />
    </div>
  );
}
