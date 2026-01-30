"""
T11 SWARM PROMPTS — Hyper-Casual Game Generation

Closely patterned on Amber's toy prompt from amber-social/index.ts
but focused on producing playable hyper-casual mobile games with scoreboards.
"""

from typing import List, Dict
import random

# =============================================================================
# MECHANIC SEEDS — Different game types to explore
# =============================================================================

MECHANIC_SEEDS = [
    # Timing games
    {"id": "tap_timing", "name": "TAP TIMING", "desc": "Tap at the right moment. Too early or too late = fail."},
    {"id": "hold_release", "name": "HOLD & RELEASE", "desc": "Hold to charge, release at the right moment."},
    {"id": "rhythm_tap", "name": "RHYTHM TAP", "desc": "Tap in rhythm with visual or audio cues."},

    # Avoidance games
    {"id": "dodge", "name": "DODGE", "desc": "Move to avoid obstacles coming at you."},
    {"id": "weave", "name": "WEAVE", "desc": "Navigate through gaps in barriers."},
    {"id": "escape", "name": "ESCAPE", "desc": "Outrun something chasing you."},

    # Collection games
    {"id": "catch", "name": "CATCH", "desc": "Catch falling objects. Miss = lose points or life."},
    {"id": "collect", "name": "COLLECT", "desc": "Gather items while avoiding bad ones."},
    {"id": "vacuum", "name": "VACUUM", "desc": "Absorb nearby objects by getting close to them."},

    # Precision games
    {"id": "aim", "name": "AIM & SHOOT", "desc": "Aim and fire at targets. Accuracy matters."},
    {"id": "land", "name": "STICK THE LANDING", "desc": "Land precisely on a target zone."},
    {"id": "balance", "name": "BALANCE", "desc": "Keep something balanced. Tilt to adjust."},

    # Stacking/Building games
    {"id": "stack", "name": "STACK", "desc": "Stack objects as high as possible without toppling."},
    {"id": "tetris", "name": "FIT", "desc": "Fit shapes into spaces before time runs out."},
    {"id": "chain", "name": "CHAIN REACTION", "desc": "Trigger cascading effects for combo points."},

    # Memory/Pattern games
    {"id": "sequence", "name": "SEQUENCE", "desc": "Remember and repeat a growing sequence."},
    {"id": "match", "name": "MATCH", "desc": "Find matching pairs or groups."},
    {"id": "spot", "name": "SPOT THE DIFFERENCE", "desc": "Find what's different or out of place."},

    # Endless runner variants
    {"id": "runner", "name": "RUNNER", "desc": "Run endlessly, jump or slide to avoid obstacles."},
    {"id": "climber", "name": "CLIMBER", "desc": "Jump upward from platform to platform."},
    {"id": "faller", "name": "FALLER", "desc": "Fall through gaps, avoid solid platforms."},

    # Physics toys
    {"id": "bounce", "name": "BOUNCE", "desc": "Control bouncing. Each bounce scores or chains."},
    {"id": "swing", "name": "SWING", "desc": "Swing and release to reach targets."},
    {"id": "roll", "name": "ROLL", "desc": "Tilt to roll a ball through a course."},
]

# =============================================================================
# VISUAL THEMES — Different looks for variety
# =============================================================================

VISUAL_THEMES = [
    {"id": "neon", "name": "NEON", "colors": ["#00ff88", "#ff00ff", "#00ffff"], "bg": "#0a0a0f", "desc": "Glowing neon on dark"},
    {"id": "pastel", "name": "PASTEL", "colors": ["#ffb3ba", "#baffc9", "#bae1ff"], "bg": "#fef6e4", "desc": "Soft pastel colors"},
    {"id": "retro", "name": "RETRO", "colors": ["#ff6b35", "#f7c59f", "#2ec4b6"], "bg": "#1a1a2e", "desc": "80s arcade vibes"},
    {"id": "minimal", "name": "MINIMAL", "colors": ["#ffffff", "#888888"], "bg": "#000000", "desc": "Black and white only"},
    {"id": "candy", "name": "CANDY", "colors": ["#ff6b6b", "#ffd93d", "#6bcb77"], "bg": "#fff5e4", "desc": "Bright candy colors"},
    {"id": "space", "name": "SPACE", "colors": ["#a855f7", "#3b82f6", "#ffffff"], "bg": "#030014", "desc": "Deep space purple/blue"},
    {"id": "forest", "name": "FOREST", "colors": ["#84cc16", "#22c55e", "#f59e0b"], "bg": "#0f1f0f", "desc": "Natural greens"},
    {"id": "sunset", "name": "SUNSET", "colors": ["#f97316", "#ec4899", "#8b5cf6"], "bg": "#1f1020", "desc": "Warm gradient sky"},
    {"id": "ocean", "name": "OCEAN", "colors": ["#06b6d4", "#0ea5e9", "#ffffff"], "bg": "#0c1929", "desc": "Cool ocean blues"},
    {"id": "amber", "name": "AMBER", "colors": ["#ffd700", "#f59e0b", "#2d9596"], "bg": "#0d0d0d", "desc": "Gold on black with teal"},
]

# =============================================================================
# STYLE TRAITS — How the game feels
# =============================================================================

STYLE_TRAITS = [
    {"id": "juicy", "name": "JUICY", "desc": "Lots of feedback: screen shake, particles, sound on every action"},
    {"id": "zen", "name": "ZEN", "desc": "Calm, no pressure, relaxing pace"},
    {"id": "frantic", "name": "FRANTIC", "desc": "Fast-paced, things speed up, tension builds"},
    {"id": "satisfying", "name": "SATISFYING", "desc": "Focus on that perfect moment: the click, the landing, the combo"},
    {"id": "cute", "name": "CUTE", "desc": "Adorable elements, friendly faces, happy sounds"},
    {"id": "clean", "name": "CLEAN", "desc": "Minimal UI, precise shapes, geometric beauty"},
    {"id": "chaotic", "name": "CHAOTIC", "desc": "Lots happening, particles everywhere, sensory overload"},
    {"id": "retro", "name": "RETRO", "desc": "Chunky pixels, limited colors, 8-bit sounds"},
    {"id": "smooth", "name": "SMOOTH", "desc": "Fluid animations, easing on everything, buttery movement"},
    {"id": "punchy", "name": "PUNCHY", "desc": "Snappy feedback, instant response, impactful"},
]


def get_random_config() -> Dict:
    """Get a random combination of mechanic, theme, and style."""
    return {
        "mechanic": random.choice(MECHANIC_SEEDS),
        "theme": random.choice(VISUAL_THEMES),
        "style": random.choice(STYLE_TRAITS),
    }


def get_config_by_index(index: int) -> Dict:
    """Get a deterministic config based on index (for parallel agents)."""
    mechanic = MECHANIC_SEEDS[index % len(MECHANIC_SEEDS)]
    theme = VISUAL_THEMES[index % len(VISUAL_THEMES)]
    style = STYLE_TRAITS[index % len(STYLE_TRAITS)]
    return {
        "mechanic": mechanic,
        "theme": theme,
        "style": style,
    }


# =============================================================================
# THE MAIN PROMPT — Closely patterned on Amber's toy prompt
# =============================================================================

def build_game_prompt(
    mechanic: Dict,
    theme: Dict,
    style: Dict,
    maker_name: str = "Maker",
    include_reference: bool = True,
) -> str:
    """
    Build the full prompt for generating a hyper-casual game.

    Closely patterned on Amber's toy prompt from amber-social/index.ts
    but focused on playable games with scoreboards.
    """

    reference_section = ""
    if include_reference:
        reference_section = f"""
## REFERENCE: Minimal Working Game

Here's a minimal game structure that WORKS. Use this as your foundation:

```html
<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
<title>Game</title>
<style>
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
body {{
  background: {theme['bg']};
  overflow: hidden;
  touch-action: none;
  font-family: -apple-system, sans-serif;
}}
canvas {{ display: block; }}
#ui {{ position: fixed; top: 20px; left: 20px; color: {theme['colors'][0]}; font-size: 24px; z-index: 10; }}
#score {{ font-weight: bold; }}
#game-over {{
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.8); display: none;
  flex-direction: column; justify-content: center; align-items: center;
  color: white; text-align: center; z-index: 100;
}}
#game-over.show {{ display: flex; }}
#game-over h1 {{ font-size: 48px; margin-bottom: 20px; }}
#game-over .final-score {{ font-size: 32px; margin-bottom: 30px; color: {theme['colors'][0]}; }}
#restart {{
  padding: 15px 40px; font-size: 20px;
  background: {theme['colors'][0]}; color: {theme['bg']};
  border: none; border-radius: 8px; cursor: pointer;
}}
</style>
</head>
<body>
<div id="ui"><span id="score">0</span></div>
<canvas id="c"></canvas>
<div id="game-over">
  <h1>GAME OVER</h1>
  <div class="final-score">Score: <span id="final-score">0</span></div>
  <button id="restart">TAP TO RESTART</button>
</div>
<script>
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const gameOverEl = document.getElementById('game-over');
const finalScoreEl = document.getElementById('final-score');
const restartBtn = document.getElementById('restart');

let W, H, score = 0, gameRunning = true;

function resize() {{ W = canvas.width = innerWidth; H = canvas.height = innerHeight; }}
resize(); window.onresize = resize;

// GAME STATE - customize these
let player = {{ x: W/2, y: H - 100, size: 40 }};
let objects = [];

function spawnObject() {{
  objects.push({{
    x: Math.random() * W,
    y: -20,
    size: 20,
    speed: 2 + Math.random() * 3,
    good: Math.random() > 0.3
  }});
}}

function update() {{
  if (!gameRunning) return;

  // Spawn objects periodically
  if (Math.random() < 0.02) spawnObject();

  // Update objects
  objects.forEach(obj => obj.y += obj.speed);

  // Check collisions with player
  objects = objects.filter(obj => {{
    const dx = obj.x - player.x;
    const dy = obj.y - player.y;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if (dist < player.size/2 + obj.size/2) {{
      if (obj.good) {{
        score += 10;
        scoreEl.textContent = score;
        return false; // Remove collected
      }} else {{
        endGame();
        return false;
      }}
    }}
    return obj.y < H + 50; // Remove off-screen
  }});
}}

function draw() {{
  ctx.fillStyle = '{theme['bg']}';
  ctx.fillRect(0, 0, W, H);

  // Draw player
  ctx.fillStyle = '{theme['colors'][0]}';
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size/2, 0, Math.PI * 2);
  ctx.fill();

  // Draw objects
  objects.forEach(obj => {{
    ctx.fillStyle = obj.good ? '{theme['colors'][1] if len(theme['colors']) > 1 else theme['colors'][0]}' : '#ff4444';
    ctx.beginPath();
    ctx.arc(obj.x, obj.y, obj.size/2, 0, Math.PI * 2);
    ctx.fill();
  }});
}}

function endGame() {{
  gameRunning = false;
  finalScoreEl.textContent = score;
  gameOverEl.classList.add('show');
}}

function restart() {{
  score = 0;
  scoreEl.textContent = '0';
  objects = [];
  player.x = W/2;
  gameRunning = true;
  gameOverEl.classList.remove('show');
}}

// Controls - MOBILE FIRST
function handleMove(x) {{
  player.x = Math.max(player.size/2, Math.min(W - player.size/2, x));
}}

canvas.addEventListener('touchmove', e => {{ e.preventDefault(); handleMove(e.touches[0].clientX); }});
canvas.addEventListener('touchstart', e => {{ e.preventDefault(); handleMove(e.touches[0].clientX); }});
canvas.addEventListener('mousemove', e => handleMove(e.clientX));
restartBtn.addEventListener('click', restart);

function loop() {{ update(); draw(); requestAnimationFrame(loop); }}
loop();
</script>
</body></html>
```

This reference has: canvas game loop, score display, game over screen, restart button, mobile touch controls.
Your game MUST have all of these elements.
"""

    return f"""You are {maker_name}, a game maker at Pixelpit studio.

---

## YOUR TASK: Make a Hyper-Casual Mobile Game

You're making a **hyper-casual game** — the kind people play for 30 seconds while waiting for coffee.

**What you're building:**
- Mechanic: **{mechanic['name']}** — {mechanic['desc']}
- Visual Theme: **{theme['name']}** — {theme['desc']}
- Style: **{style['name']}** — {style['desc']}

---

## ABSOLUTE REQUIREMENTS (Non-Negotiable)

Your game MUST have ALL of these or it's broken:

### 1. PLAYABLE
- The game must actually work when loaded
- Clear goal that a player understands in 2 seconds
- Instant start — no tutorials, no menus, just play
- Game over condition (lose a life, hit something, time runs out)

### 2. SCOREBOARD
- Score displayed during gameplay (visible, updating)
- Final score shown on game over screen
- Score increases based on player actions

### 3. MOBILE-FIRST CONTROLS
- Touch controls ONLY — no keyboard
- Tap, hold, drag, or swipe — pick ONE primary interaction
- Touch targets at least 44px
- No hover states required for gameplay

### 4. RESTART FLOW
- Game over screen with final score
- Clear "restart" or "play again" button
- Tap to restart and play again immediately

### 5. GAME LOOP
- requestAnimationFrame loop
- Consistent frame rate
- Spawning, movement, collision detection

---

## GAME DESIGN TIPS

**For {mechanic['name']}:**
- Keep the core loop to ONE action (tap, drag, or hold)
- Difficulty should increase over time (faster spawns, faster movement)
- Feedback on every player action (visual + optional sound)

**For {style['name']} feel:**
- {style['desc']}

**Color palette ({theme['name']}):**
- Background: `{theme['bg']}`
- Primary: `{theme['colors'][0]}`
- Secondary: `{theme['colors'][1] if len(theme['colors']) > 1 else theme['colors'][0]}`
- Accent: `{theme['colors'][2] if len(theme['colors']) > 2 else theme['colors'][0]}`

---
{reference_section}
---

## OUTPUT FORMAT

Return a COMPLETE, WORKING HTML file.
- Start with `<!DOCTYPE html>`
- End with `</html>`
- Single file, all CSS and JS inline
- No external dependencies
- No explanations — just the code

**Make a game someone would actually want to play for 30 seconds.**
"""


# =============================================================================
# JUDGE PROMPT — For evaluating games
# =============================================================================

JUDGE_PROMPT = """Rate this hyper-casual game screenshot.

Score 1-10 for each:
- PLAYABLE: Does it look like an actual game? (visible player, objects, score)
- MOBILE: Would this work on a phone? (touch-friendly, readable)
- POLISH: Visual quality and feedback?
- FUN: Does it look like something you'd tap on?

Verdict:
- SHIP (avg >= 7) — Ready for players
- NEEDS_WORK (avg 4-6) — Has potential, needs fixes
- BROKEN (avg < 4) — Doesn't work or not a game

Format:
PLAYABLE: [score]
MOBILE: [score]
POLISH: [score]
FUN: [score]
VERDICT: [SHIP/NEEDS_WORK/BROKEN]
"""


# =============================================================================
# PRODUCTION PROMPT — For polishing winners
# =============================================================================

def build_production_prompt(
    prototype_code: str,
    mechanic: Dict,
    theme: Dict,
    style: Dict,
) -> str:
    """Build prompt for the production phase (polishing a winning prototype)."""

    return f"""You are the Production Builder at Pixelpit game studio.

## YOUR MISSION

Take this prototype and make it PRODUCTION READY.

## PROTOTYPE INFO
- Mechanic: {mechanic['name']} — {mechanic['desc']}
- Theme: {theme['name']} — {theme['desc']}
- Style: {style['name']} — {style['desc']}

## PROTOTYPE CODE
```html
{prototype_code}
```

## PRODUCTION CHECKLIST

Make sure the final game has:

### Must Have
- [ ] Score displayed during gameplay
- [ ] Game over screen with final score
- [ ] Restart button that works
- [ ] Touch controls (no keyboard)
- [ ] Smooth 60fps animation

### Should Have
- [ ] Difficulty increases over time
- [ ] Visual feedback on player actions (particles, shake, flash)
- [ ] Audio feedback (Web Audio API — simple tones on actions)
- [ ] High score saved to localStorage

### Nice to Have
- [ ] Particle effects
- [ ] Screen shake on impact
- [ ] Combo system
- [ ] Progressive difficulty curve

## TECHNICAL REQUIREMENTS

1. **Mobile Audio**: Audio context must be created on first user tap
   ```javascript
   let audioCtx;
   document.body.addEventListener('click', () => {{
     if (!audioCtx) audioCtx = new AudioContext();
   }}, {{ once: true }});
   ```

2. **Touch Events**: Prevent default to avoid scrolling
   ```javascript
   canvas.addEventListener('touchstart', e => e.preventDefault());
   canvas.addEventListener('touchmove', e => e.preventDefault());
   ```

3. **Viewport**: Must include mobile viewport meta tag
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
   ```

4. **High Score**: Save to localStorage
   ```javascript
   const highScore = localStorage.getItem('highscore') || 0;
   if (score > highScore) localStorage.setItem('highscore', score);
   ```

## OUTPUT

Return the polished, production-ready HTML file.
Focus on making it FEEL good to play — juice, feedback, satisfaction.
"""
