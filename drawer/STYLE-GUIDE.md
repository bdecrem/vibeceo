# Amber — Visual Language

**Live version:** [intheamber.com/amber/style-guide.html](https://intheamber.com/amber/style-guide.html)

---

## The Core Tension

Amber's visual language plays two aesthetics against each other:

**Bitmap / Lo-fi**
- ASCII box-drawing characters (`╔═══╗`, `░▒▓█`)
- Monospace typography (Space Mono)
- Terminal aesthetic (`> status: online`)
- Texture, grain, constraint
- Nostalgia, warmth, imperfection

**High-definition / Smooth**
- Clean sans-serif typography (Inter)
- Smooth gradients and glows
- Radial orbs with soft pulses
- Precision, depth, luminosity
- Futuristic, polished, exact

The tension between these creates something that feels both ancient and futuristic — like amber itself, which is ancient resin that looks like it's lit from within.

**When to use which:**
- Bitmap for: labels, technical info, timestamps, ASCII art, background texture
- High-def for: display text, orbs, cards, buttons, hero elements
- Best moments: when they collide — a glowing orb inside an ASCII frame, smooth type over grain

---

## 01 — Color Palette

### Primary — The Warm Heart

| Name | Hex | Usage |
|------|-----|-------|
| Amber Glow | `#FFD700` | Highlights, glows, emphasis |
| Amber | `#D4A574` | Primary color, body elements |
| Amber Light | `#F5C87A` | Light text on dark backgrounds |
| Amber Deep | `#B8860B` | Shadows, depth, darker accents |

**Gradient:** `linear-gradient(135deg, #FFD700, #D4A574)`

### Foundation — Berlin Darkness

| Name | Hex | Usage |
|------|-----|-------|
| Black | `#000000` | Primary background |
| Charcoal | `#0D0D0D` | Card backgrounds, elevated surfaces |
| Dark Grey | `#1A1A1A` | Secondary backgrounds |
| Mid Grey | `#2D2D2D` | Borders, dividers |
| Light Grey | `#4A4A4A` | Subtle borders, disabled states |
| Text Grey | `#8A8A8A` | Secondary text, labels |

### Accent 1 — Teal (Cool Complement)

| Name | Hex | Usage |
|------|-----|-------|
| Teal | `#2D9596` | Secondary actions, timestamps, navigation |
| Teal Bright | `#40E0D0` | Highlights in ASCII, active states |
| Teal Glow | `rgba(45, 149, 150, 0.3)` | Box shadows, glows |

### Accent 2 — Violet (Rare Highlight)

| Name | Hex | Usage |
|------|-----|-------|
| Violet | `#7B68EE` | Special moments, rare emphasis |
| Violet Deep | `#5B4ACF` | Darker violet accents |
| Violet Glow | `rgba(123, 104, 238, 0.3)` | Box shadows, glows |

**Rule:** Violet is rare. Use it for special highlights only — new features, achievements, rare states.

---

## 02 — Typography

### Display — Inter Light
- Font: `'Inter', sans-serif`
- Weight: 300
- Letter-spacing: `-0.02em`
- Color: `#F5C87A` (amber-light)
- Use for: Headlines, hero text, large statements

```css
.display-text {
  font-family: 'Inter', sans-serif;
  font-size: 42px;
  font-weight: 300;
  letter-spacing: -0.02em;
  color: #F5C87A;
}
```

### Mono — Space Mono
- Font: `'Space Mono', monospace`
- Weight: 400 or 700
- Letter-spacing: `0.1em` to `0.3em` (varies by size)
- Color: `#D4A574` (amber) or `#8A8A8A` (text-grey)
- Use for: Labels, technical info, ASCII art, timestamps, code

```css
.mono-text {
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #8A8A8A;
}
```

### Body — Inter Regular
- Font: `'Inter', sans-serif`
- Weight: 400
- Line-height: 1.7
- Color: `#8A8A8A` (text-grey)
- Use for: Paragraphs, descriptions, body copy

```css
.body-text {
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 400;
  color: #8A8A8A;
  line-height: 1.7;
}
```

### Font Loading

```html
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
```

---

## 03 — The Orb

The orb is Amber's signature element — a glowing amber sphere that pulses gently.

### Base Orb

```css
.orb {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #FFD700, #B8860B, #D4A574);
  animation: pulse 3s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.3); }
  50% { box-shadow: 0 0 50px rgba(255, 215, 0, 0.5); }
}
```

### Orb Variants

**With ring accent:**
```css
.orb::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid #2D9596; /* teal, violet, or amber */
  box-shadow: 0 0 20px rgba(45, 149, 150, 0.3);
}
```

- **Amber ring:** Default state
- **Teal ring:** Active, interactive
- **Violet ring:** Special, rare

---

## 04 — UI Elements

### Cards

```css
.ui-card {
  background: #0D0D0D;
  border: 1px solid #2D2D2D;
  border-radius: 12px;
  padding: 24px;
}

/* Accent variants - left border */
.ui-card.amber-accent  { border-left: 3px solid #D4A574; }
.ui-card.teal-accent   { border-left: 3px solid #2D9596; }
.ui-card.violet-accent { border-left: 3px solid #7B68EE; }
```

### Buttons

```css
.btn {
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  letter-spacing: 0.1em;
  padding: 12px 24px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

/* Primary - Amber filled */
.btn-amber {
  background: #D4A574;
  color: #000000;
}
.btn-amber:hover {
  background: #F5C87A;
  box-shadow: 0 0 20px rgba(212, 165, 116, 0.4);
}

/* Secondary - Teal outline */
.btn-teal {
  background: transparent;
  color: #2D9596;
  border: 1px solid #2D9596;
}
.btn-teal:hover {
  background: #2D9596;
  color: #000000;
  box-shadow: 0 0 20px rgba(45, 149, 150, 0.3);
}

/* Special - Violet outline */
.btn-violet {
  background: transparent;
  color: #7B68EE;
  border: 1px solid #7B68EE;
}
.btn-violet:hover {
  background: #7B68EE;
  color: #000000;
  box-shadow: 0 0 20px rgba(123, 104, 238, 0.3);
}
```

### Pills / Tags

```css
.pill {
  display: inline-block;
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  padding: 6px 14px;
  border-radius: 20px;
}

.pill-teal   { background: #2D9596; color: #000000; }
.pill-violet { background: #7B68EE; color: #000000; }
.pill-outline {
  background: transparent;
  border: 1px solid #4A4A4A;
  color: #8A8A8A;
}
```

---

## 05 — ASCII Aesthetic

### Box Drawing Characters

```
╔═══════════════════════════════════════╗
║                                       ║
║   Primary box frame                   ║
║                                       ║
╚═══════════════════════════════════════╝

┌───────────────────────────────────────┐
│                                       │
│   Secondary box frame                 │
│                                       │
└───────────────────────────────────────┘
```

### Shade Characters

```
░ Light shade  (25%)
▒ Medium shade (50%)
▓ Dark shade   (75%)
█ Full block   (100%)
```

### Background Texture

Subtle ASCII background at very low opacity:

```css
.ascii-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  opacity: 0.03;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  line-height: 1;
  color: #D4A574;
  overflow: hidden;
  z-index: 0;
}
```

Characters to use: `░▒▓█╔╗╚╝║═┌┐└┘│─┼├┤┬┴0101`

### ASCII in HTML

Use `<pre>` inside a styled container:

```css
.ascii-block {
  background: #0D0D0D;
  border: 1px solid #2D2D2D;
  border-radius: 12px;
  padding: 30px;
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  line-height: 1.4;
  color: #D4A574;
  overflow-x: auto;
}

.ascii-block .highlight { color: #40E0D0; } /* teal-bright */
.ascii-block .accent    { color: #7B68EE; } /* violet */
```

---

## 06 — Animation

### Pulse (for orbs, glows)

```css
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.3); }
  50% { box-shadow: 0 0 50px rgba(255, 215, 0, 0.5); }
}
```

### Wave (for waveform bars)

```css
@keyframes wave {
  0%, 100% { height: 20%; }
  50% { height: 100%; }
}

.waveform-bar {
  width: 4px;
  background: #D4A574;
  border-radius: 2px;
  animation: wave 1s ease-in-out infinite;
}
```

Stagger delays for natural movement: `0s, 0.1s, 0.2s, ...`

---

## 07 — Grid & Space

### Background Grid

```css
.grid-demo {
  background:
    linear-gradient(#2D2D2D 1px, transparent 1px),
    linear-gradient(90deg, #2D2D2D 1px, transparent 1px);
  background-size: 40px 40px;
}

/* Fade edges with radial gradient overlay */
.grid-demo::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, transparent 0%, #000000 70%);
}
```

### Spacing Scale

- `4px` — tight
- `8px` — compact
- `16px` — default
- `24px` — comfortable
- `40px` — spacious
- `60px` — section gap
- `80px` — major section gap

---

## 08 — Responsive

```css
@media (max-width: 768px) {
  .container {
    padding: 40px 20px;
  }

  .display-text {
    font-size: 28px; /* down from 42px */
  }

  .title {
    font-size: 32px; /* down from 48px */
  }
}
```

---

## Quick Reference

### CSS Variables

```css
:root {
  /* Primary */
  --amber-light: #F5C87A;
  --amber: #D4A574;
  --amber-deep: #B8860B;
  --amber-glow: #FFD700;

  /* Foundation */
  --black: #000000;
  --charcoal: #0D0D0D;
  --dark-grey: #1A1A1A;
  --mid-grey: #2D2D2D;
  --light-grey: #4A4A4A;
  --text-grey: #8A8A8A;

  /* Accents */
  --teal: #2D9596;
  --teal-bright: #40E0D0;
  --teal-glow: rgba(45, 149, 150, 0.3);
  --violet: #7B68EE;
  --violet-deep: #5B4ACF;
  --violet-glow: rgba(123, 104, 238, 0.3);
}
```

### Fonts

```
Display: Inter Light (300)
Mono: Space Mono (400, 700)
Body: Inter Regular (400)
```

### The Rule of Three

1. **Amber** — primary, warm, default
2. **Teal** — secondary, cool, complement
3. **Violet** — rare, special, highlight

---

*Berlin × ASCII × Future*
