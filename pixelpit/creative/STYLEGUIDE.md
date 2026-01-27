# PIXELPIT STYLEGUIDE

**Theme: RAIN** — warm + soft + friendly

---

## THE VIBE

| Principle | Meaning |
|-----------|---------|
| **WARM** | Amber and gold tones. Cozy, inviting. |
| **SOFT** | Gentle glows, rounded corners. No hard edges. |
| **FRIENDLY** | Approachable, joyful. Easy on the eyes. |

---

## DESIGN RULES

1. **Dark backgrounds.** Deep blue-black base (`#0f172a`). Let colors glow.
2. **Soft shadows.** Use `shadowBlur` for glows, not hard offsets.
3. **Gold/amber leads.** Warm yellow (`#fbbf24`) is our signature. Teal supports.
4. **Rounded corners.** 4-8px radius on buttons and cards. Soft, not sharp.
5. **Mono fonts only.** Every character same width. Clean and readable.

---

## COLORS

### Backgrounds

| Name | Hex | Use |
|------|-----|-----|
| **DEEP** | `#0f172a` | Main page background |
| **SURFACE** | `#1e293b` | Cards, panels |
| **ELEVATED** | `#334155` | Hover states, raised elements |

### Primary (Warm)

| Name | Hex | Use |
|------|-----|-----|
| **GOLD** | `#fbbf24` | THE lead color. Scores, highlights, energy. |
| **TEAL** | `#22d3ee` | Secondary. Player color, buttons. |
| **PINK** | `#f472b6` | Accent. Drops, special items. |
| **GREEN** | `#34d399` | Success. Health, confirmations. |
| **CORAL** | `#f87171` | Danger. Damage, errors. |

### Text

| Name | Hex | Use |
|------|-----|-----|
| **PRIMARY** | `#f8fafc` | Headings, important text |
| **SECONDARY** | `#94a3b8` | Body text |
| **MUTED** | `#64748b` | Labels, hints, captions |

---

## THE CREW

| Character | Color | Background | Quote |
|-----------|-------|------------|-------|
| **DOT** | `#ec4899` | `#be185d` | "make it pretty" |
| **PIT** | `#22d3ee` | `#0891b2` | "ship it" |
| **BUG** | `#34d399` | `#059669` | "found one" |
| **CHIP** | `#fbbf24` | `#d97706` | "turn it up" |

---

## SHADOWS & GLOWS

Use soft glows for emphasis, not hard drop shadows.

| Type | Value | Use |
|------|-------|-----|
| **glow-gold** | `0 0 20px rgba(251, 191, 36, 0.5)` | Scores, highlights |
| **glow-teal** | `0 0 20px rgba(34, 211, 238, 0.5)` | Player, buttons |
| **glow-pink** | `0 0 20px rgba(244, 114, 182, 0.5)` | Accents, drops |
| **text-glow** | `0 0 20px {color}80` | Important text |

For canvas rendering:
```javascript
ctx.shadowBlur = 10;
ctx.shadowColor = '#fbbf24';
// draw element
ctx.shadowBlur = 0;
```

---

## TYPOGRAPHY

**Font:** Monospace only — `'Space Mono', ui-monospace, monospace`

**Style:** `font-mono` (Tailwind)

| Size | Px | Use |
|------|-----|-----|
| xs | 10px | Labels, captions |
| sm | 12px | Body text, buttons |
| md | 14px | Default |
| lg | 18px | Headings |
| xl | 24px | Titles |
| 2xl | 32px | Hero text |

**Lowercase preferred** for friendly feel. ALL CAPS only for game titles.

---

## BUTTONS

```
╭─────────────╮
│    start    │
╰─────────────╯
```

- Border radius: 8px
- No hard shadows
- Solid background color
- Text: lowercase or uppercase depending on context

| Variant | Background | Text |
|---------|------------|------|
| **primary** | `#22d3ee` (teal) | `#0f172a` (dark) |
| **secondary** | `transparent` | `#f472b6` (pink) |
| **ghost** | `rgba(0,0,0,0.6)` | `#fbbf24` (gold) |

---

## COMPONENTS

### Cards

- Background: slate-800 (`#1e293b`)
- Border: 1px white/10
- Border radius: 8px
- No hard shadows

### Score Display

- Large mono numbers, gold text (`#fbbf24`)
- Text glow: `0 0 20px rgba(251, 191, 36, 0.5)`
- No zero-padding (just the number)

### Hearts/Lives

- Teal color (`#22d3ee`)
- Soft glow when active
- Dim when lost

### Game Elements

- Use gradients for depth (radial for drops, linear for containers)
- Soft ellipses over hard rectangles
- Glow effects on interactive items

---

## CANVAS RENDERING

### Drops (falling items)
```javascript
ctx.shadowBlur = 10;
ctx.shadowColor = THEME.accent;
const grd = ctx.createRadialGradient(...);
grd.addColorStop(0, THEME.highlight);  // gold center
grd.addColorStop(1, THEME.accent);     // pink edge
ctx.fillStyle = grd;
ctx.beginPath();
ctx.ellipse(x, y, 10, 14, 0, 0, Math.PI * 2);
ctx.fill();
ctx.shadowBlur = 0;
```

### Basket/Player
```javascript
const grad = ctx.createLinearGradient(x, y, x, y + height);
grad.addColorStop(0, THEME.secondary);      // teal
grad.addColorStop(1, `${THEME.secondary}80`); // teal faded
ctx.fillStyle = grad;
// draw trapezoid or rounded shape
```

### Particles
```javascript
ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`; // gold with fade
ctx.beginPath();
ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
ctx.fill();
```

---

## DO / DON'T

### DO

- Use gold/amber as the dominant accent
- Keep backgrounds dark (slate-900)
- Use soft glows and gradients
- Round your corners (4-8px)
- Make it warm and inviting
- Use lowercase for friendly feel

### DON'T

- Use hard pixel shadows
- Use sharp corners on UI elements
- Make it too punchy or aggressive
- Use all caps everywhere
- Add CRT/scanline effects
- Make it cold or harsh

---

## TAGLINES

- "small games. big smiles."
- "fun for everyone"
- "catch the warmth"

---

## FILES

| File | Purpose |
|------|---------|
| `theme.ts` | Design tokens (import into code) |
| `STYLEGUIDE.md` | This doc (quick reference) |

---

*RAIN Theme — Last updated: 2026-01-26*
