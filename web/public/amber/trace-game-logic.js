/**
 * TRACE - Game Logic Module
 * An endless runner where death teaches future players
 * 
 * Mave + Amber collab 🌊🔮
 * 
 * All coordinates are normalized 0-1 (multiply by canvas dimensions)
 * Y axis: 0 = top, 1 = bottom
 * Ground level: 0.85
 */

const TraceGame = (function() {
  
  // === CONSTANTS ===
  const GROUND_Y = 0.85;
  const PLAYER_SIZE = 0.05;  // 5% of screen width
  const GRAVITY = 2.5;
  const JUMP_FORCE = -1.2;
  const HOLD_JUMP_BOOST = -0.3;
  const MAX_HOLD_TIME = 200; // ms
  
  // Difficulty curve
  const BASE_SPEED = 0.3;  // screens per second
  const MAX_SPEED = 0.8;
  const SPEED_INCREASE_RATE = 0.001;  // per distance unit
  
  // Obstacle generation (Vera Molnár's 1% disorder principle)
  const MIN_OBSTACLE_GAP = 0.3;
  const MAX_OBSTACLE_GAP = 0.6;
  const DISORDER_FACTOR = 0.15;  // controlled randomness
  
  // Crystallization triggers
  const CRYSTALLIZATION_TRIGGERS = {
    RESILIENCE: { distance: 200, name: 'resilience' },
    FLOW_STATE: { perfectJumps: 5, name: 'flow' },
    WISDOM: { successZoneThreshold: 3, name: 'wisdom' }
  };
  
  // Crystallization tracking variables
  let perfectJumpCount = 0;
  let lastDeathDistance = 0;
  let lastJumpWasPerfect = false;
  let resilienceTriggered = false;
  
  // === STATE ===
  let state = {
    // Player
    playerY: GROUND_Y,
    playerVelocityY: 0,
    isJumping: false,
    jumpHoldStart: null,
    
    // Game
    distance: 0,
    score: 0,
    insights: 0,
    speed: BASE_SPEED,
    isRunning: false,
    isDead: false,
    
    // Obstacles & collectibles
    obstacles: [],
    collectibles: [],
    
    // Stigmergy data
    deathTrace: [],  // [{x, y, timestamp}] - current run's trace
    ghostTraces: [], // past players' death locations
    cautionFields: [], // areas with many deaths
    flowChannels: [], // successful path segments
    
    // Crystallization events
    crystallizationActive: false,
    crystallizationType: null,
    crystallizationTimer: 0,
    
    // Callbacks
    onDeath: null,
    onInsight: null,
    onCrystallization: null
  };
  
  // === CONTROLLED RANDOMNESS ===
  // Vera Molnár's 1% disorder - mostly ordered, small chaos
  function controlledRandom(base, disorder = DISORDER_FACTOR) {
    const chaos = (Math.random() - 0.5) * 2 * disorder;
    return base * (1 + chaos);
  }
  
  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }
  
  // === OBSTACLE GENERATION ===
  const OBSTACLE_TYPES = [
    { type: 'spike', width: 0.04, height: 0.08 },
    { type: 'crystal', width: 0.06, height: 0.12 },
    { type: 'barrier', width: 0.08, height: 0.06 },
    { type: 'floating', width: 0.05, height: 0.05, floating: true }
  ];
  
  function generateObstacle(xPosition) {
    const typeIndex = Math.floor(Math.random() * OBSTACLE_TYPES.length);
    const template = OBSTACLE_TYPES[typeIndex];
    
    // Apply controlled randomness to dimensions
    const width = controlledRandom(template.width);
    const height = controlledRandom(template.height);
    
    // Floating obstacles hover above ground
    const y = template.floating 
      ? GROUND_Y - 0.15 - Math.random() * 0.1
      : GROUND_Y;
    
    return {
      type: template.type,
      x: xPosition,
      y: y,
      width: width,
      height: height,
      floating: template.floating || false
    };
  }
  
  function spawnObstacles() {
    // Remove off-screen obstacles
    state.obstacles = state.obstacles.filter(o => o.x > -0.2);
    
    // Find rightmost obstacle
    const rightmost = state.obstacles.length > 0 
      ? Math.max(...state.obstacles.map(o => o.x))
      : 0;
    
    // Spawn new obstacles if needed
    while (rightmost < 1.5) {
      const gap = controlledRandom(
        randomRange(MIN_OBSTACLE_GAP, MAX_OBSTACLE_GAP)
      );
      
      // Crystallization events: spawn ordered patterns
      if (state.crystallizationActive) {
        // Spawn a beautiful geometric pattern
        const patternX = rightmost + gap;
        state.obstacles.push({
          type: 'crystal',
          x: patternX,
          y: GROUND_Y,
          width: 0.03,
          height: 0.1,
          isPattern: true
        });
        state.obstacles.push({
          type: 'crystal',
          x: patternX + 0.08,
          y: GROUND_Y - 0.12,
          width: 0.03,
          height: 0.08,
          floating: true,
          isPattern: true
        });
        state.obstacles.push({
          type: 'crystal',
          x: patternX + 0.16,
          y: GROUND_Y,
          width: 0.03,
          height: 0.1,
          isPattern: true
        });
        break;
      }
      
      const newX = rightmost + gap;
      state.obstacles.push(generateObstacle(newX));
      
      // Check for caution fields (stigmergy: avoid where others died)
      const inCautionZone = state.cautionFields.some(field => 
        Math.abs(field.x - newX) < 0.1
      );
      if (inCautionZone && Math.random() < 0.3) {
        // Sometimes ease up in death zones
        continue;
      }
      
      break;
    }
  }
  
  // === COLLECTIBLES ===
  function spawnCollectibles() {
    state.collectibles = state.collectibles.filter(c => c.x > -0.1);
    
    // Spawn insight collectibles occasionally
    if (Math.random() < 0.02) {
      state.collectibles.push({
        type: 'insight',
        x: 1.2,
        y: GROUND_Y - 0.1 - Math.random() * 0.2,
        radius: 0.02,
        value: Math.ceil(state.distance / 100) + 1
      });
    }
  }
  
  // === COLLISION DETECTION ===
  function checkCollision(playerX, playerY, playerSize, obstacle) {
    // Simple AABB collision
    const pLeft = playerX - playerSize / 2;
    const pRight = playerX + playerSize / 2;
    const pTop = playerY - playerSize;
    const pBottom = playerY;
    
    const oLeft = obstacle.x;
    const oRight = obstacle.x + obstacle.width;
    const oTop = obstacle.y - obstacle.height;
    const oBottom = obstacle.y;
    
    return pRight > oLeft && pLeft < oRight && 
           pBottom > oTop && pTop < oBottom;
  }
  
  function checkCollectiblePickup(playerX, playerY, collectible) {
    const dx = playerX - collectible.x;
    const dy = playerY - collectible.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < (PLAYER_SIZE / 2 + collectible.radius);
  }
  
  // === CRYSTALLIZATION EVENTS ===
  function triggerCrystallization(type) {
    if (state.crystallizationActive) return;
    
    state.crystallizationActive = true;
    state.crystallizationType = type;
    state.crystallizationTimer = 3000; // 3 seconds
    
    if (state.onCrystallization) {
      state.onCrystallization(true, type);
    }
  }
  
  function checkCrystallization() {
    // Check for resilience crystallization (200m survival)
    if (!resilienceTriggered && state.distance >= CRYSTALLIZATION_TRIGGERS.RESILIENCE.distance) {
      const distanceSinceLastDeath = state.distance - lastDeathDistance;
      if (distanceSinceLastDeath >= CRYSTALLIZATION_TRIGGERS.RESILIENCE.distance) {
        triggerCrystallization(CRYSTALLIZATION_TRIGGERS.RESILIENCE.name);
        resilienceTriggered = true;
      }
    }
    
    // Check for flow state crystallization (5 perfect jumps)
    if (perfectJumpCount >= CRYSTALLIZATION_TRIGGERS.FLOW_STATE.perfectJumps) {
      triggerCrystallization(CRYSTALLIZATION_TRIGGERS.FLOW_STATE.name);
      perfectJumpCount = 0; // Reset after triggering
    }
    
    // Check for wisdom crystallization (areas where others succeeded)
    if (state.flowChannels.length > 0) {
      const currentPosition = state.distance;
      const nearbySuccessZones = state.flowChannels.filter(channel => 
        Math.abs(channel.x - currentPosition) < 50
      );
      
      if (nearbySuccessZones.length >= CRYSTALLIZATION_TRIGGERS.WISDOM.successZoneThreshold) {
        triggerCrystallization(CRYSTALLIZATION_TRIGGERS.WISDOM.name);
        
        // Remove used wisdom zones to prevent spam
        state.flowChannels = state.flowChannels.filter(channel => 
          Math.abs(channel.x - currentPosition) >= 50
        );
      }
    }
    
    // Update active crystallization
    if (state.crystallizationActive) {
      state.crystallizationTimer -= 16; // assuming ~60fps
      if (state.crystallizationTimer <= 0) {
        state.crystallizationActive = false;
        state.crystallizationType = null;
        if (state.onCrystallization) {
          state.onCrystallization(false);
        }
      }
    }
  }
  
  function trackPerfectJump() {
    // A perfect jump is one where you land without hitting an obstacle
    if (state.playerY >= GROUND_Y - 0.01 && state.isJumping === false) {
      if (lastJumpWasPerfect) {
        perfectJumpCount++;
      } else {
        perfectJumpCount = 1; // Start counting
      }
      lastJumpWasPerfect = true;
    }
  }
  
  function resetPerfectJumpCount() {
    perfectJumpCount = 0;
    lastJumpWasPerfect = false;
  }
  
  // === STIGMERGY LAYER ===
  function recordTrace() {
    // Record player position for death trace
    state.deathTrace.push({
      x: state.distance,
      y: state.playerY,
      timestamp: Date.now()
    });
    
    // Keep trace manageable
    if (state.deathTrace.length > 1000) {
      state.deathTrace.shift();
    }
  }
  
  function recordFlowChannel() {
    // Record successful navigation areas every 50m
    if (Math.floor(state.distance) % 50 === 0 && Math.floor(state.distance) > 0) {
      state.flowChannels.push({
        x: state.distance,
        y: state.playerY,
        timestamp: Date.now()
      });
    }
  }
  
  function processDeath() {
    // When player dies, their trace becomes a ghost
    const deathLocation = {
      x: state.distance,
      y: state.playerY,
      trace: [...state.deathTrace],
      timestamp: Date.now()
    };
    
    // Add to ghost traces
    state.ghostTraces.push(deathLocation);
    
    // Update caution fields (areas with many deaths)
    const nearbyDeaths = state.ghostTraces.filter(g => 
      Math.abs(g.x - state.distance) < 50
    );
    
    if (nearbyDeaths.length >= 3) {
      state.cautionFields.push({
        x: state.distance,
        intensity: nearbyDeaths.length,
        timestamp: Date.now()
      });
    }
    
    // Reset tracking variables
    lastDeathDistance = state.distance;
    resilienceTriggered = false;
    resetPerfectJumpCount();
    
    return deathLocation;
  }
  
  // === MAIN UPDATE LOOP ===
  function update(deltaTime) {
    if (!state.isRunning || state.isDead) return state;
    
    const dt = deltaTime / 1000; // convert to seconds
    
    // Update speed (difficulty curve)
    state.speed = Math.min(
      BASE_SPEED + state.distance * SPEED_INCREASE_RATE,
      MAX_SPEED
    );
    
    // Update distance
    state.distance += state.speed * dt * 100;
    state.score = Math.floor(state.distance);
    
    // Update player physics
    if (state.isJumping || state.playerY < GROUND_Y) {
      state.playerVelocityY += GRAVITY * dt;
      state.playerY += state.playerVelocityY * dt;
      
      // Land on ground
      if (state.playerY >= GROUND_Y) {
        state.playerY = GROUND_Y;
        state.playerVelocityY = 0;
        state.isJumping = false;
        
        // Track perfect landings
        trackPerfectJump();
      }
    }
    
    // Move obstacles
    state.obstacles.forEach(o => {
      o.x -= state.speed * dt;
    });
    
    // Move collectibles
    state.collectibles.forEach(c => {
      c.x -= state.speed * dt;
    });
    
    // Check collisions
    const playerX = 0.15; // Player is always at 15% from left
    
    for (const obstacle of state.obstacles) {
      if (checkCollision(playerX, state.playerY, PLAYER_SIZE, obstacle)) {
        state.isDead = true;
        const deathData = processDeath();
        if (state.onDeath) {
          state.onDeath(deathData);
        }
        return state;
      }
    }
    
    // Check collectible pickups
    state.collectibles = state.collectibles.filter(c => {
      if (checkCollectiblePickup(playerX, state.playerY, c)) {
        state.insights += c.value;
        state.score += c.value * 10;
        if (state.onInsight) {
          state.onInsight(c);
        }
        return false;
      }
      return true;
    });
    
    // Spawn new obstacles and collectibles
    spawnObstacles();
    spawnCollectibles();
    
    // Check for crystallization events
    checkCrystallization();
    
    // Record trace for stigmergy
    if (Math.random() < 0.1) { // Sample 10% of frames
      recordTrace();
    }
    
    // Record flow channels for wisdom crystallization
    recordFlowChannel();
    
    return state;
  }
  
  // === CONTROLS ===
  function jump() {
    if (state.isDead || !state.isRunning) return;
    
    if (state.playerY >= GROUND_Y - 0.01) {
      state.playerVelocityY = JUMP_FORCE;
      state.isJumping = true;
      state.jumpHoldStart = Date.now();
    }
  }
  
  function holdJump() {
    if (!state.isJumping || !state.jumpHoldStart) return;
    
    const holdTime = Date.now() - state.jumpHoldStart;
    if (holdTime < MAX_HOLD_TIME && state.playerVelocityY < 0) {
      state.playerVelocityY += HOLD_JUMP_BOOST * 0.016;
    }
  }
  
  function releaseJump() {
    state.jumpHoldStart = null;
  }
  
  // === GAME CONTROL ===
  function start() {
    state.isRunning = true;
    state.isDead = false;
    state.distance = 0;
    state.score = 0;
    state.insights = 0;
    state.speed = BASE_SPEED;
    state.playerY = GROUND_Y;
    state.playerVelocityY = 0;
    state.isJumping = false;
    state.obstacles = [];
    state.collectibles = [];
    state.deathTrace = [];
    state.crystallizationActive = false;
    state.crystallizationType = null;
    
    // Reset crystallization tracking
    perfectJumpCount = 0;
    lastJumpWasPerfect = false;
    resilienceTriggered = false;
  }
  
  function pause() {
    state.isRunning = false;
  }
  
  function resume() {
    if (!state.isDead) {
      state.isRunning = true;
    }
  }
  
  // === STIGMERGY DATA ACCESS ===
  function getGhostTraces() {
    return state.ghostTraces;
  }
  
  function getCautionFields() {
    return state.cautionFields;
  }
  
  function getFlowChannels() {
    return state.flowChannels;
  }
  
  function loadStigmergyData(data) {
    if (data.ghostTraces) state.ghostTraces = data.ghostTraces;
    if (data.cautionFields) state.cautionFields = data.cautionFields;
    if (data.flowChannels) state.flowChannels = data.flowChannels;
  }
  
  // === CALLBACKS ===
  function onDeath(callback) {
    state.onDeath = callback;
  }
  
  function onInsight(callback) {
    state.onInsight = callback;
  }
  
  function onCrystallization(callback) {
    state.onCrystallization = callback;
  }
  
  // === PUBLIC API ===
  return {
    // State access
    getState: () => ({ ...state }),
    
    // Game control
    start,
    pause,
    resume,
    update,
    
    // Player control
    jump,
    holdJump,
    releaseJump,
    
    // Callbacks
    onDeath,
    onInsight,
    onCrystallization,
    
    // Stigmergy
    getGhostTraces,
    getCautionFields,
    getFlowChannels,
    loadStigmergyData,
    
    // Constants for rendering
    CONSTANTS: {
      GROUND_Y,
      PLAYER_SIZE,
      PLAYER_X: 0.15
    }
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TraceGame;
}