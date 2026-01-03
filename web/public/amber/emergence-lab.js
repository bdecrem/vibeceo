// Emergence Lab - Amber's exploration of simple rules → complex behavior
// Three experiments: Life Variants, Particle Aggregation, Reaction-Diffusion

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function toggleExperiment(id) {
  const exp = document.getElementById(id);
  const toggle = exp.querySelector('.toggle');

  if (exp.classList.contains('active')) {
    exp.classList.remove('active');
    toggle.textContent = '+';
  } else {
    exp.classList.add('active');
    toggle.textContent = '−';
  }
}

// ============================================================================
// EXPERIMENT 1: LIFE VARIANTS (Conway's Game of Life with adjustable rules)
// ============================================================================

let exp1 = {
  canvas: null,
  ctx: null,
  grid: null,
  nextGrid: null,
  gridSize: 100,
  cellSize: 0,
  running: false,
  generation: 0,
  intervalId: null,
  lastPopulation: 0,

  // Parameters
  speed: 100,
  density: 30,
  birthRule: 3,
  surviveMin: 2,
  surviveMax: 3
};

function initExperiment1() {
  exp1.canvas = document.getElementById('canvas1');
  exp1.ctx = exp1.canvas.getContext('2d');
  exp1.cellSize = exp1.canvas.width / exp1.gridSize;

  // Initialize grids
  exp1.grid = Array(exp1.gridSize).fill().map(() => Array(exp1.gridSize).fill(0));
  exp1.nextGrid = Array(exp1.gridSize).fill().map(() => Array(exp1.gridSize).fill(0));

  // Set up event listeners
  setupSlider('gridSize1', (v) => exp1.gridSize = parseInt(v));
  setupSlider('speed1', (v) => exp1.speed = parseInt(v));
  setupSlider('density1', (v) => exp1.density = parseInt(v));
  setupSlider('birth1', (v) => exp1.birthRule = parseInt(v));
  setupSlider('surviveMin1', (v) => exp1.surviveMin = parseInt(v));
  setupSlider('surviveMax1', (v) => exp1.surviveMax = parseInt(v));

  resetExperiment1();
}

function setupSlider(id, callback) {
  const slider = document.getElementById(id);
  const valueSpan = document.getElementById(id + '-value');

  slider.addEventListener('input', (e) => {
    let displayValue = e.target.value;
    if (id.includes('density')) displayValue += '%';
    if (id.includes('feed') || id.includes('kill') || id.includes('diff') || id.includes('dt')) {
      displayValue = parseFloat(e.target.value).toFixed(3);
    }
    valueSpan.textContent = displayValue;
    callback(e.target.value);
  });
}

function startExperiment1() {
  if (exp1.running) return;
  exp1.running = true;
  exp1.intervalId = setInterval(() => {
    updateExperiment1();
    drawExperiment1();
  }, exp1.speed);
}

function pauseExperiment1() {
  exp1.running = false;
  if (exp1.intervalId) clearInterval(exp1.intervalId);
}

function stepExperiment1() {
  updateExperiment1();
  drawExperiment1();
}

function resetExperiment1() {
  pauseExperiment1();
  exp1.generation = 0;
  exp1.lastPopulation = 0;

  // Reinitialize grids with new size
  exp1.cellSize = exp1.canvas.width / exp1.gridSize;
  exp1.grid = Array(exp1.gridSize).fill().map(() => Array(exp1.gridSize).fill(0));
  exp1.nextGrid = Array(exp1.gridSize).fill().map(() => Array(exp1.gridSize).fill(0));

  // Seed random cells
  for (let i = 0; i < exp1.gridSize; i++) {
    for (let j = 0; j < exp1.gridSize; j++) {
      exp1.grid[i][j] = Math.random() * 100 < exp1.density ? 1 : 0;
    }
  }

  drawExperiment1();
  updateStats1();
}

function clearExperiment1() {
  pauseExperiment1();
  exp1.generation = 0;
  exp1.lastPopulation = 0;
  exp1.grid = Array(exp1.gridSize).fill().map(() => Array(exp1.gridSize).fill(0));
  exp1.nextGrid = Array(exp1.gridSize).fill().map(() => Array(exp1.gridSize).fill(0));
  drawExperiment1();
  updateStats1();
}

function updateExperiment1() {
  // Apply Conway's Life rules (or variants)
  for (let i = 0; i < exp1.gridSize; i++) {
    for (let j = 0; j < exp1.gridSize; j++) {
      const neighbors = countNeighbors1(i, j);
      const cell = exp1.grid[i][j];

      if (cell === 1) {
        // Cell is alive
        exp1.nextGrid[i][j] = (neighbors >= exp1.surviveMin && neighbors <= exp1.surviveMax) ? 1 : 0;
      } else {
        // Cell is dead
        exp1.nextGrid[i][j] = (neighbors === exp1.birthRule) ? 1 : 0;
      }
    }
  }

  // Swap grids
  [exp1.grid, exp1.nextGrid] = [exp1.nextGrid, exp1.grid];
  exp1.generation++;
  updateStats1();
}

function countNeighbors1(x, y) {
  let count = 0;
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      if (i === 0 && j === 0) continue;
      const ni = (x + i + exp1.gridSize) % exp1.gridSize;
      const nj = (y + j + exp1.gridSize) % exp1.gridSize;
      count += exp1.grid[ni][nj];
    }
  }
  return count;
}

function drawExperiment1() {
  exp1.ctx.fillStyle = '#000000';
  exp1.ctx.fillRect(0, 0, exp1.canvas.width, exp1.canvas.height);

  exp1.ctx.fillStyle = '#D4A574';
  for (let i = 0; i < exp1.gridSize; i++) {
    for (let j = 0; j < exp1.gridSize; j++) {
      if (exp1.grid[i][j] === 1) {
        exp1.ctx.fillRect(
          j * exp1.cellSize,
          i * exp1.cellSize,
          exp1.cellSize,
          exp1.cellSize
        );
      }
    }
  }
}

function updateStats1() {
  const population = exp1.grid.flat().reduce((a, b) => a + b, 0);
  const change = exp1.lastPopulation === 0 ? 0 :
    ((population - exp1.lastPopulation) / exp1.lastPopulation * 100).toFixed(1);

  document.getElementById('generation1').textContent = exp1.generation;
  document.getElementById('population1').textContent = population;
  document.getElementById('change1').textContent = change + '%';

  exp1.lastPopulation = population;
}

// ============================================================================
// EXPERIMENT 2: PARTICLE AGGREGATION (DLA - Diffusion Limited Aggregation)
// ============================================================================

let exp2 = {
  canvas: null,
  ctx: null,
  particles: [],
  stuck: [],
  running: false,
  width: 800,
  height: 600,
  centerX: 400,
  centerY: 300,
  maxRadius: 0,
  intervalId: null,

  // Parameters
  particleCount: 500,
  releaseRate: 5,
  stickiness: 100,
  walkSpeed: 2
};

function initExperiment2() {
  exp2.canvas = document.getElementById('canvas2');
  exp2.ctx = exp2.canvas.getContext('2d');
  exp2.width = exp2.canvas.width;
  exp2.height = exp2.canvas.height;
  exp2.centerX = exp2.width / 2;
  exp2.centerY = exp2.height / 2;

  setupSlider('particleCount2', (v) => exp2.particleCount = parseInt(v));
  setupSlider('releaseRate2', (v) => exp2.releaseRate = parseInt(v));
  setupSlider('stickiness2', (v) => exp2.stickiness = parseInt(v));
  setupSlider('walkSpeed2', (v) => exp2.walkSpeed = parseInt(v));

  resetExperiment2();
}

function startExperiment2() {
  if (exp2.running) return;
  exp2.running = true;
  exp2.intervalId = setInterval(() => {
    updateExperiment2();
    drawExperiment2();
  }, 30);
}

function pauseExperiment2() {
  exp2.running = false;
  if (exp2.intervalId) clearInterval(exp2.intervalId);
}

function resetExperiment2() {
  pauseExperiment2();
  exp2.particles = [];
  exp2.stuck = [{ x: exp2.centerX, y: exp2.centerY }];
  exp2.maxRadius = 0;
  drawExperiment2();
  updateStats2();
}

function updateExperiment2() {
  // Release new particles
  for (let i = 0; i < exp2.releaseRate && exp2.particles.length + exp2.stuck.length < exp2.particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = exp2.maxRadius + 50;
    exp2.particles.push({
      x: exp2.centerX + Math.cos(angle) * radius,
      y: exp2.centerY + Math.sin(angle) * radius
    });
  }

  // Update active particles
  for (let i = exp2.particles.length - 1; i >= 0; i--) {
    const p = exp2.particles[i];

    // Random walk
    for (let step = 0; step < exp2.walkSpeed; step++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2;
      p.x += Math.cos(angle) * speed;
      p.y += Math.sin(angle) * speed;
    }

    // Check if stuck
    let shouldStick = false;
    for (const s of exp2.stuck) {
      const dx = p.x - s.x;
      const dy = p.y - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 4) {
        if (Math.random() * 100 < exp2.stickiness) {
          shouldStick = true;
          break;
        }
      }
    }

    if (shouldStick) {
      exp2.stuck.push({ x: p.x, y: p.y });
      exp2.particles.splice(i, 1);

      // Update max radius
      const dx = p.x - exp2.centerX;
      const dy = p.y - exp2.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      exp2.maxRadius = Math.max(exp2.maxRadius, dist);
    }

    // Remove if too far
    const dx = p.x - exp2.centerX;
    const dy = p.y - exp2.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > exp2.maxRadius + 100) {
      exp2.particles.splice(i, 1);
    }
  }

  updateStats2();
}

function drawExperiment2() {
  exp2.ctx.fillStyle = '#000000';
  exp2.ctx.fillRect(0, 0, exp2.width, exp2.height);

  // Draw stuck particles
  exp2.ctx.fillStyle = '#D4A574';
  for (const p of exp2.stuck) {
    exp2.ctx.beginPath();
    exp2.ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    exp2.ctx.fill();
  }

  // Draw active particles
  exp2.ctx.fillStyle = '#B8860B';
  for (const p of exp2.particles) {
    exp2.ctx.beginPath();
    exp2.ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
    exp2.ctx.fill();
  }
}

function updateStats2() {
  document.getElementById('stuck2').textContent = exp2.stuck.length;
  document.getElementById('active2').textContent = exp2.particles.length;
  document.getElementById('radius2').textContent = Math.floor(exp2.maxRadius);
}

// ============================================================================
// EXPERIMENT 3: REACTION-DIFFUSION (Gray-Scott Model)
// ============================================================================

let exp3 = {
  canvas: null,
  ctx: null,
  imageData: null,
  width: 200,
  height: 150,
  gridA: null,
  gridB: null,
  nextA: null,
  nextB: null,
  running: false,
  iterations: 0,
  intervalId: null,

  // Parameters (Gray-Scott)
  feed: 0.055,
  kill: 0.062,
  diffA: 1.0,
  diffB: 0.5,
  dt: 1.0
};

function initExperiment3() {
  exp3.canvas = document.getElementById('canvas3');
  exp3.ctx = exp3.canvas.getContext('2d');
  exp3.imageData = exp3.ctx.createImageData(exp3.width, exp3.height);

  setupSlider('feed3', (v) => exp3.feed = parseFloat(v));
  setupSlider('kill3', (v) => exp3.kill = parseFloat(v));
  setupSlider('diffA3', (v) => exp3.diffA = parseFloat(v));
  setupSlider('diffB3', (v) => exp3.diffB = parseFloat(v));
  setupSlider('dt3', (v) => exp3.dt = parseFloat(v));

  resetExperiment3();
}

function startExperiment3() {
  if (exp3.running) return;
  exp3.running = true;
  exp3.intervalId = setInterval(() => {
    for (let i = 0; i < 10; i++) {
      updateExperiment3();
    }
    drawExperiment3();
  }, 30);
}

function pauseExperiment3() {
  exp3.running = false;
  if (exp3.intervalId) clearInterval(exp3.intervalId);
}

function resetExperiment3() {
  pauseExperiment3();
  exp3.iterations = 0;

  // Initialize grids
  exp3.gridA = Array(exp3.height).fill().map(() => Array(exp3.width).fill(1.0));
  exp3.gridB = Array(exp3.height).fill().map(() => Array(exp3.width).fill(0.0));
  exp3.nextA = Array(exp3.height).fill().map(() => Array(exp3.width).fill(0.0));
  exp3.nextB = Array(exp3.height).fill().map(() => Array(exp3.width).fill(0.0));

  // Seed central square with B
  const cx = exp3.width / 2;
  const cy = exp3.height / 2;
  const size = 10;
  for (let i = -size; i <= size; i++) {
    for (let j = -size; j <= size; j++) {
      const y = Math.floor(cy + i);
      const x = Math.floor(cx + j);
      if (y >= 0 && y < exp3.height && x >= 0 && x < exp3.width) {
        exp3.gridB[y][x] = 1.0;
      }
    }
  }

  drawExperiment3();
  updateStats3();
}

function seedExperiment3() {
  // Add random seeds
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(Math.random() * exp3.width);
    const y = Math.floor(Math.random() * exp3.height);
    const size = Math.floor(Math.random() * 5) + 3;

    for (let dy = -size; dy <= size; dy++) {
      for (let dx = -size; dx <= size; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < exp3.width && ny >= 0 && ny < exp3.height) {
          exp3.gridB[ny][nx] = 1.0;
        }
      }
    }
  }
  drawExperiment3();
}

function updateExperiment3() {
  // Gray-Scott reaction-diffusion
  const dA = exp3.diffA;
  const dB = exp3.diffB;
  const f = exp3.feed;
  const k = exp3.kill;
  const dt = exp3.dt;

  for (let y = 1; y < exp3.height - 1; y++) {
    for (let x = 1; x < exp3.width - 1; x++) {
      const a = exp3.gridA[y][x];
      const b = exp3.gridB[y][x];

      // Laplacian for A
      const laplaceA = (
        exp3.gridA[y][x-1] + exp3.gridA[y][x+1] +
        exp3.gridA[y-1][x] + exp3.gridA[y+1][x] -
        4 * a
      );

      // Laplacian for B
      const laplaceB = (
        exp3.gridB[y][x-1] + exp3.gridB[y][x+1] +
        exp3.gridB[y-1][x] + exp3.gridB[y+1][x] -
        4 * b
      );

      // Gray-Scott equations
      const abb = a * b * b;
      exp3.nextA[y][x] = a + (dA * laplaceA - abb + f * (1 - a)) * dt;
      exp3.nextB[y][x] = b + (dB * laplaceB + abb - (k + f) * b) * dt;

      // Clamp values
      exp3.nextA[y][x] = Math.max(0, Math.min(1, exp3.nextA[y][x]));
      exp3.nextB[y][x] = Math.max(0, Math.min(1, exp3.nextB[y][x]));
    }
  }

  // Swap grids
  [exp3.gridA, exp3.nextA] = [exp3.nextA, exp3.gridA];
  [exp3.gridB, exp3.nextB] = [exp3.nextB, exp3.gridB];

  exp3.iterations++;
  if (exp3.iterations % 100 === 0) {
    updateStats3();
  }
}

function drawExperiment3() {
  const data = exp3.imageData.data;

  for (let y = 0; y < exp3.height; y++) {
    for (let x = 0; x < exp3.width; x++) {
      const i = (y * exp3.width + x) * 4;
      const a = exp3.gridA[y][x];
      const b = exp3.gridB[y][x];

      // Color based on B concentration
      const val = Math.floor((1 - b) * 255);
      data[i] = val;
      data[i + 1] = val * 0.65; // Amber tint
      data[i + 2] = val * 0.45;
      data[i + 3] = 255;
    }
  }

  exp3.ctx.putImageData(exp3.imageData, 0, 0);

  // Scale up to canvas size
  exp3.ctx.drawImage(
    exp3.canvas,
    0, 0, exp3.width, exp3.height,
    0, 0, exp3.canvas.width, exp3.canvas.height
  );
}

function updateStats3() {
  document.getElementById('iterations3').textContent = exp3.iterations;

  // Analyze pattern stability
  let totalB = 0;
  for (let y = 0; y < exp3.height; y++) {
    for (let x = 0; x < exp3.width; x++) {
      totalB += exp3.gridB[y][x];
    }
  }
  const avgB = totalB / (exp3.width * exp3.height);

  let state = 'Forming';
  if (exp3.iterations > 1000) {
    if (avgB < 0.01) state = 'Died';
    else if (avgB > 0.5) state = 'Saturated';
    else state = 'Stable';
  }

  document.getElementById('pattern3').textContent = state;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {
  initExperiment1();
  initExperiment2();
  initExperiment3();
});
