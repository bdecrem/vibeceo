/**
 * The Drawer — Puzzle Engine
 * by Mave 🌊
 * 
 * Generates solvable puzzles where ejection ORDER matters.
 * Objects have fixed directions. You can only eject if the path is clear.
 * Good puzzles require clearing blockers before you can reach deeper objects.
 * 
 * API:
 *   createLevel(size, difficulty) → grid[][]
 *   canEject(grid, x, y) → boolean
 *   eject(grid, x, y) → { grid, ejected: {x, y, dir, path} } | null
 *   getHint(grid) → {x, y} | null
 *   isSolved(grid) → boolean
 */

const DIRS = {
  up:    { dx: 0, dy: -1 },
  down:  { dx: 0, dy:  1 },
  left:  { dx: -1, dy: 0 },
  right: { dx:  1, dy: 0 },
};

const DIR_NAMES = Object.keys(DIRS);

/**
 * Create a deep copy of the grid
 */
function cloneGrid(grid) {
  return grid.map(row => row.map(cell => cell ? { ...cell } : null));
}

/**
 * Check if an object at (x,y) can be ejected — path to edge must be clear
 */
function canEject(grid, x, y) {
  const cell = grid[y]?.[x];
  if (!cell) return false;

  const { dx, dy } = DIRS[cell.dir];
  const size = grid.length;
  let cx = x + dx;
  let cy = y + dy;

  while (cx >= 0 && cx < size && cy >= 0 && cy < size) {
    if (grid[cy][cx] !== null) return false;
    cx += dx;
    cy += dy;
  }
  return true;
}

/**
 * Eject object at (x,y). Returns new grid + ejection info, or null if blocked.
 */
function eject(grid, x, y) {
  if (!canEject(grid, x, y)) return null;

  const cell = grid[y][x];
  const newGrid = cloneGrid(grid);
  newGrid[y][x] = null;

  return {
    grid: newGrid,
    ejected: { x, y, dir: cell.dir, obj: cell },
  };
}

/**
 * Check if the puzzle is solved (all cells empty)
 */
function isSolved(grid) {
  return grid.every(row => row.every(cell => cell === null));
}

/**
 * Find one valid move (for hints). Returns {x, y} or null.
 */
function getHint(grid) {
  const size = grid.length;
  // Try to find moves that unlock the most other moves
  let best = null;
  let bestScore = -1;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (canEject(grid, x, y)) {
        // Score: how many new moves does this unlock?
        const after = eject(grid, x, y).grid;
        let unlocked = 0;
        for (let yy = 0; yy < size; yy++) {
          for (let xx = 0; xx < size; xx++) {
            if (after[yy][xx] && canEject(after, xx, yy) && !canEject(grid, xx, yy)) {
              unlocked++;
            }
          }
        }
        if (unlocked > bestScore) {
          bestScore = unlocked;
          best = { x, y };
        }
      }
    }
  }
  return best;
}

/**
 * Check if a grid state is solvable (all objects can eventually be ejected)
 */
function isSolvable(grid) {
  const size = grid.length;
  let state = cloneGrid(grid);
  let remaining = 0;

  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (state[y][x]) remaining++;

  // Greedy: keep ejecting whatever we can until stuck or done
  let progress = true;
  while (progress && remaining > 0) {
    progress = false;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (state[y][x] && canEject(state, x, y)) {
          state[y][x] = null;
          remaining--;
          progress = true;
        }
      }
    }
  }

  return remaining === 0;
}

/**
 * Count how many objects are immediately ejectable
 */
function countFree(grid) {
  const size = grid.length;
  let free = 0;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (grid[y][x] && canEject(grid, x, y)) free++;
  return free;
}

/**
 * Count total objects in grid
 */
function countObjects(grid) {
  const size = grid.length;
  let count = 0;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (grid[y][x]) count++;
  return count;
}

/**
 * Measure puzzle depth — minimum number of "rounds" to clear
 * (each round clears all currently-ejectable objects)
 */
function measureDepth(grid) {
  const size = grid.length;
  let state = cloneGrid(grid);
  let depth = 0;
  let remaining = countObjects(state);

  while (remaining > 0) {
    const ejectable = [];
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++)
        if (state[y][x] && canEject(state, x, y))
          ejectable.push({ x, y });

    if (ejectable.length === 0) return -1; // unsolvable
    ejectable.forEach(({ x, y }) => { state[y][x] = null; });
    remaining -= ejectable.length;
    depth++;
  }
  return depth;
}

/**
 * Generate a level using reverse construction.
 * 
 * Strategy: place objects one at a time, starting from the edge (easily ejectable)
 * and working inward. Objects placed later block objects placed earlier,
 * creating the sequencing dependency.
 * 
 * @param {number} size - Grid size (5 = 5x5)
 * @param {number} difficulty - 1-5, controls density and required sequencing depth
 * @returns {Array<Array<{dir: string, id: number}|null>>} The puzzle grid
 */
function createLevel(size = 5, difficulty = 2) {
  const maxAttempts = 200;

  // Difficulty controls
  const fillRatios = { 1: 0.3, 2: 0.45, 3: 0.55, 4: 0.65, 5: 0.75 };
  const minDepths  = { 1: 2,   2: 3,    3: 4,    4: 5,    5: 6 };
  
  const targetCount = Math.round(size * size * (fillRatios[difficulty] || 0.45));
  const minDepth = minDepths[difficulty] || 3;

  let bestGrid = null;
  let bestDepth = 0;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const grid = Array.from({ length: size }, () => Array(size).fill(null));
    let placed = 0;
    let id = 0;

    // Shuffle all positions
    const positions = [];
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++)
        positions.push({ x, y });
    shuffle(positions);

    // Try to place objects
    for (const { x, y } of positions) {
      if (placed >= targetCount) break;

      // Pick a direction — prefer directions that create blocking
      const dirs = shuffle([...DIR_NAMES]);
      
      for (const dir of dirs) {
        grid[y][x] = { dir, id: id };
        
        if (isSolvable(grid)) {
          placed++;
          id++;
          break;
        } else {
          grid[y][x] = null;
        }
      }
    }

    if (placed < targetCount * 0.7) continue; // too sparse, retry

    const depth = measureDepth(grid);
    if (depth >= minDepth) {
      // Good puzzle — has enough sequencing depth
      return assignIds(grid);
    }

    if (depth > bestDepth) {
      bestDepth = depth;
      bestGrid = cloneGrid(grid);
    }
  }

  // Return best attempt even if it didn't hit target depth
  return assignIds(bestGrid || createFallbackLevel(size));
}

/**
 * Assign sequential IDs to all objects in the grid
 */
function assignIds(grid) {
  let id = 0;
  const size = grid.length;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (grid[y][x]) grid[y][x].id = id++;
  return grid;
}

/**
 * Simple fallback level if generation fails
 */
function createFallbackLevel(size) {
  const grid = Array.from({ length: size }, () => Array(size).fill(null));
  // Place a simple cross pattern
  const mid = Math.floor(size / 2);
  grid[mid][0] = { dir: 'left', id: 0 };
  grid[mid][size - 1] = { dir: 'right', id: 1 };
  grid[0][mid] = { dir: 'up', id: 2 };
  grid[size - 1][mid] = { dir: 'down', id: 3 };
  // Blocker in center pointing up, blocked by top piece
  grid[mid][mid] = { dir: 'up', id: 4 };
  return grid;
}

/**
 * Fisher-Yates shuffle (in-place, returns array)
 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Export for both ES modules and script tags
if (typeof window !== 'undefined') {
  window.DrawerEngine = { createLevel, canEject, eject, getHint, isSolved, measureDepth };
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createLevel, canEject, eject, getHint, isSolved, measureDepth };
}
