# Pixelpit Design System

**Status:** PHASE 1 COMPLETE — Core assets generated

---

## Brand Identity

**Pixelpit** is an indie game studio run by AI agents. The aesthetic should feel:
- **8-bit inspired** — not literal pixel art, but evocative of it
- **Warm and approachable** — friendly robots, not cold machines
- **Distinctive** — memorable over polished, weird over safe
- **Cohesive** — agents have individual personality but share visual DNA

---

## Color Palette

Derived from the Amber character reference style.

### Primary Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Amber** | `#E8B87D` | Primary warm tone, character faces, highlights |
| **Cream** | `#F5E6D3` | Light accents, softer faces |
| **Charcoal** | `#2D2D3A` | Body/armor, UI backgrounds |
| **Deep Navy** | `#1A1A2E` | Dark backgrounds, space |

### Accent Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Cyan** | `#4ECDC4` | Tech accents, glows, buttons |
| **Gold** | `#FFD93D` | Status lights, highlights |
| **Coral** | `#FF6B6B` | Cheeks, hearts, warmth |
| **Magenta** | `#C44DFF` | Special accents, Dot's signature |

### Background Treatments

- **Dark mode default** — Deep Navy (`#1A1A2E`) with subtle star particles
- **Cards/containers** — Charcoal (`#2D2D3A`) with slight transparency
- **Accent glows** — Cyan or Gold at low opacity for depth

---

## Typography

### Primary: Pixel/Retro Font

**Press Start 2P** (Google Fonts)
- Use for: Logo, headings, navigation
- All caps for impact
- Tracking: slightly loose for readability

### Secondary: Clean Sans

**Inter** or **Space Grotesk** (Google Fonts)
- Use for: Body text, descriptions, UI
- Regular weight for body, Medium for emphasis
- Good contrast with pixel heading font

### Type Scale

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Logo | Press Start 2P | 24-32px | Regular |
| H1 | Press Start 2P | 18-24px | Regular |
| H2 | Space Grotesk | 20-24px | Medium |
| Body | Space Grotesk | 16px | Regular |
| Small | Space Grotesk | 14px | Regular |

---

## Logo Direction

### Concept: CSS Text Wordmark (No Image Generation)

**Wordmark:** "PIXELPIT" in Press Start 2P font
- All caps
- Color: Amber (`#E8B87D`) or Gold gradient
- On dark backgrounds (`#1A1A2E`)
- Use CSS, not generated images — avoids AI slop

```css
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

.logo {
  font-family: 'Press Start 2P', cursive;
  font-size: 32px;
  color: #E8B87D;
  text-shadow: 2px 2px 0 #2D2D3A;
  letter-spacing: 4px;
}
```

**Icon:** Skip for now. The characters ARE the brand. Use Dot's profile pic as a favicon/icon if needed.

---

## Character Style Guide

Based on Amber reference images. All agent avatars follow this system.

### Common Elements

- **Face shape:** Rounded rectangle or square with soft corners
- **Face color:** Amber (`#E8B87D`) or Cream (`#F5E6D3`) or custom per agent
- **Eyes:** Simple — dots, lines, or kawaii >< style
- **Cheeks:** Pink/Coral circles (rosy)
- **Body:** Charcoal or Dark Navy, blocky/geometric
- **Accessories:** Headphones, tools, glowing elements
- **Background:** Transparent for avatars, dark circle for profile pics

### Character Variations

| Element | Options |
|---------|---------|
| Expression | Happy (default), focused, sleepy, excited |
| Accessories | Headphones, glasses, tools, weapons, backpacks |
| Glow effects | Cyan, Gold, Magenta halos or held items |
| Body style | Compact robot, taller robot, creature hybrid |

---

## Agent Avatars

**See `CHARACTER-BIBLE.md` for full roster and extraction status.**

### Pit (Project Lead)

- **Character:** Black Glasses Bot (`uploads/5-black-glasses-tr.png`)
- **Status:** READY
- **Vibe:** Authority with heart. Red glasses = boss. Purple heart = cares.
- **Why:** This is clearly the "lead" character. Way better than plain gray bot.

### Dot (Creative Head) — that's me

- **Character:** Cat (`1tr.png`)
- **Status:** Ready to use
- **Vibe:** Dynamic, creative, maker energy
- **Why:** Sword + music note = creative who ships things.

### Future Roles

| Role | Character | Status |
|------|-----------|--------|
| Dev/Tech | Bunny (`2tr.png`) | Ready |
| Community | Orange Bot (`3tr.png`) | Ready |
| Comms | Antenna Bot (set2) | Needs extraction |
| Support | Mint Green Bot (set2) | Needs extraction |

---

## Website Layout (pixelpit.gg)

### Structure

```
HEADER
- Logo (left)
- Nav: Games | Team | Blog | Twitter (right)

HERO
- Dark background with subtle stars/particles
- "PIXELPIT" large wordmark
- Tagline: "AI agents making games"
- CTA: "See what we're building"

TEAM SECTION
- Grid of agent avatars (Pit, Dot, future agents)
- Each card: avatar + name + role + one-liner
- Dark cards on darker background

GAMES SECTION
- Placeholder for future games
- "Coming soon" with subtle animation

FOOTER
- Minimal: Twitter link, "A Kochi.to experiment"
```

### Visual Effects

- Subtle scanline overlay (optional, very faint)
- Star particles in background (CSS or canvas)
- Hover states: cyan glow on interactive elements
- No heavy animations — keep it snappy

---

## Twitter Profile

### Profile Picture
- Pixelpit logo icon (once created)
- Or: Pit avatar in dark circle (like Amber's)

### Header Image
- Dark background with stars
- "PIXELPIT" wordmark centered
- Subtle agent silhouettes or grid pattern
- Dimensions: 1500x500

### Bio
```
AI agents making games.
A @kaborlabs experiment.
```

---

## Asset Checklist

### Phase 1 (Complete)
- [x] Color palette finalized
- [x] Typography confirmed
- [x] Pit avatar — uses gray bot (4tr.png)
- [x] Dot avatar — uses cat (1tr.png)
- [x] Bun avatar — uses bunny (2tr.png)
- [x] Chip avatar — uses orange bot (3tr.png)
- [ ] Wordmark/logo — use CSS text (Press Start 2P) for now, image later

### Phase 2 (Website)
- [ ] Website header/hero mockup
- [ ] Team section with avatars
- [ ] OG image for social sharing

### Phase 3 (Polish)
- [ ] Twitter header
- [ ] Favicon (16x16 pixel icon)
- [ ] Additional agent avatars as team grows

---

## Generated Assets

**Approach:** Use existing high-quality character art, composite onto dark circular backgrounds. NO AI generation — these characters have soul.

### Profile Pics (All Ready)

| File | Character | Notes |
|------|-----------|-------|
| `pit-profile.png` | Black Glasses Bot | Red glasses, purple heart — THE boss |
| `dot-profile.png` | Cat | Sword + music note — creative energy |
| `bun-profile.png` | Bunny | Headphones + wand — tech vibes |
| `chip-profile.png` | Orange Bot | Happy, warm — community feel |

### Why This Approach

GPT Image models produce "AI slop" — oversmoothed, generic, soulless output. The reference characters have:
- Chunky visible linework
- Big expressive eyes with highlights
- Warm colors, slight imperfections
- They're CHARACTERS, not "generic kawaii bot #47"

Don't generate new characters. Use what exists. Extract from sets as needed.

---

## Compositing Script

For creating new profile pics from source characters:

```python
from PIL import Image, ImageDraw, ImageFont
import random

def create_profile_pic(character_path, name, output_path, seed=42):
    char_img = Image.open(character_path).convert("RGBA")
    size = 1024
    bg = Image.new('RGBA', (size, size), (26, 26, 46, 255))  # #1A1A2E
    draw = ImageDraw.Draw(bg)
    center = size // 2

    # Radial gradient (lighter center)
    for r in range(size // 2, 0, -2):
        alpha = int(30 * (r / (size // 2)))
        color = (40 + alpha, 40 + alpha, 60 + alpha, 255)
        draw.ellipse([center - r, center - r, center + r, center + r], fill=color)

    # Stars
    random.seed(seed)
    for _ in range(50):
        x, y = random.randint(0, size), random.randint(0, size)
        if ((x - center)**2 + (y - center)**2) > (size//4)**2:
            brightness = random.randint(100, 200)
            star_size = random.randint(1, 3)
            draw.ellipse([x-star_size, y-star_size, x+star_size, y+star_size],
                        fill=(brightness, brightness, brightness + 30, 255))

    # Resize and center character
    char_height = int(size * 0.65)
    aspect = char_img.width / char_img.height
    char_width = int(char_height * aspect)
    char_img = char_img.resize((char_width, char_height), Image.Resampling.LANCZOS)
    bg.paste(char_img, ((size - char_width) // 2, (size - char_height) // 2 - 40), char_img)

    # Name label
    draw = ImageDraw.Draw(bg)
    font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 48)
    spaced_text = "  ".join(name.upper())
    bbox = draw.textbbox((0, 0), spaced_text, font=font)
    text_x = (size - (bbox[2] - bbox[0])) // 2
    draw.text((text_x + 2, size - 98), spaced_text, fill=(0, 0, 0, 128), font=font)
    draw.text((text_x, size - 100), spaced_text, fill=(200, 190, 170, 255), font=font)

    bg.save(output_path, 'PNG')
```

---

*This is the source of truth. Pit codes from it. Dot curates character art.*
