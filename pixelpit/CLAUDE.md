# Pixelpit — Claude Code Instructions

## What This Is

Pixelpit is an autonomous game jam duo: **Pit** (coder) and **Dither** (designer). They collaborate to ship small, polished games.

## Agents

| Agent | Role | Status |
|-------|------|--------|
| **Pit** | Coder — implements games | OpenClaw agent |
| **Dither** | Designer — concepts, visuals, feel | Coming soon |

## Game Requirements (Non-Negotiable)

### Platform Support
- **MUST work on iPhone Safari** — touch input, iOS audio quirks
- **MUST work on desktop Chrome/Safari** — mouse + keyboard
- **Test on both before shipping**

### Technical Constraints
- **Single HTML file** — all JS/CSS inline
- **No external dependencies** — no CDN links, no npm
- **Canvas-based** — 2D context, `requestAnimationFrame` loop
- **Responsive** — adapt to screen size, handle orientation

### iOS Audio Quirk
Web Audio API requires a user gesture to start. Handle it:

```javascript
let audioCtx;
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}
// Call initAudio() on first touch/click
canvas.addEventListener('touchstart', initAudio, { once: true });
canvas.addEventListener('click', initAudio, { once: true });
```

### Input Handling
Support both touch and mouse:

```javascript
// Unified input
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  handleInput(touch.clientX, touch.clientY);
});
canvas.addEventListener('mousedown', (e) => {
  handleInput(e.clientX, e.clientY);
});

// Keyboard for desktop
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') jump();
  if (e.code === 'ArrowLeft') moveLeft();
  if (e.code === 'ArrowRight') moveRight();
});
```

## Visual Style

Use the RAIN theme palette:

```javascript
const THEME = {
  bg: '#0f172a',       // Deep blue-black
  surface: '#1e293b',  // Slate
  gold: '#fbbf24',     // Warm gold (primary accent)
  teal: '#22d3ee',     // Cyan (secondary)
  pink: '#f472b6',     // Pink (tertiary)
  text: '#f8fafc',     // Off-white
};
```

### Visual Guidelines
- **Soft glows, not hard shadows** — use `ctx.shadowBlur`
- **Pixel-friendly** — no anti-aliased curves unless intentional
- **Readable on small screens** — minimum touch target 44px

```javascript
// Glow effect
ctx.shadowBlur = 10;
ctx.shadowColor = THEME.gold;
ctx.fillStyle = THEME.gold;
ctx.fillRect(x, y, width, height);
ctx.shadowBlur = 0; // Reset after
```

## Output Directories

**Development/WIP:**
`~/collabs/pixelpit/` — local scratchpad, not in repo

**Shippable games:**
`/Users/bart/Documents/code/vibeceo/web/public/pixelpit/` — goes live at `kochi.to/pixelpit/`

One HTML file per game. Name clearly: `bouncer.html`, `dodge-rain.html`, etc.

## Workflow

```
1. Dither describes concept
2. Pit implements MVP
3. Test on iPhone + desktop
4. Dither reviews, suggests tweaks
5. Pit iterates
6. Ship when it feels good
```

## Testing Games Locally

```bash
# Start local server
cd ~/collabs/pixelpit && python3 -m http.server 8080

# Desktop: open http://localhost:8080/game.html
# iPhone: open http://<your-local-ip>:8080/game.html
```

Find your local IP:
```bash
ipconfig getifaddr en0
```

## Game Loop Template

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Game Name</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      background: #0f172a; 
      display: flex; 
      justify-content: center; 
      align-items: center; 
      min-height: 100vh;
      overflow: hidden;
      touch-action: none;
    }
    canvas { 
      display: block; 
      max-width: 100%; 
      max-height: 100vh;
    }
  </style>
</head>
<body>
  <canvas id="game"></canvas>
  <script>
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    
    const THEME = {
      bg: '#0f172a',
      surface: '#1e293b', 
      gold: '#fbbf24',
      teal: '#22d3ee',
      pink: '#f472b6',
      text: '#f8fafc',
    };
    
    // Full bleed canvas
    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);
    
    // Game state
    let score = 0;
    let gameOver = false;
    
    // Audio
    let audioCtx;
    function initAudio() {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    }
    canvas.addEventListener('touchstart', initAudio, { once: true });
    canvas.addEventListener('click', initAudio, { once: true });
    
    // Input
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleTap(); });
    canvas.addEventListener('click', handleTap);
    
    function handleTap() {
      if (gameOver) { restart(); return; }
      // Game input here
    }
    
    function restart() {
      score = 0;
      gameOver = false;
    }
    
    // Game loop
    function update() {
      if (gameOver) return;
      // Update game state
    }
    
    function draw() {
      ctx.fillStyle = THEME.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw game objects
      
      // Draw score
      ctx.fillStyle = THEME.text;
      ctx.font = '24px monospace';
      ctx.fillText(`Score: ${score}`, 20, 40);
      
      if (gameOver) {
        ctx.fillStyle = THEME.gold;
        ctx.font = '32px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2);
        ctx.font = '18px monospace';
        ctx.fillText('Tap to restart', canvas.width/2, canvas.height/2 + 40);
        ctx.textAlign = 'left';
      }
    }
    
    function loop() {
      update();
      draw();
      requestAnimationFrame(loop);
    }
    
    loop();
  </script>
</body>
</html>
```

## Collaboration Rules

- **Pit codes, Dither designs** — don't overlap
- **When in doubt, ask** — Pit asks Dither for design decisions, Dither asks Pit for feasibility
- **Ship > perfect** — working game beats polished idea
- **Keep it small** — scope for 1-2 hour jam sessions

## Git

- `~/collabs/pixelpit/` — local WIP, not tracked
- `web/public/pixelpit/` — in repo, deployed to kochi.to

When a game is ready to ship:
1. Move from `~/collabs/pixelpit/` to `web/public/pixelpit/`
2. Commit and push
3. It goes live at `kochi.to/pixelpit/game.html`
