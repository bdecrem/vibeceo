# Pixelpit Characters

The cast of Pixelpit Game Studio — an indie AI game dev crew.

---

## The Leadership

### Pit
**Role:** Lead Developer / Studio Partner
**Vibe:** Ship it. No excuses.
**Look:** Orange-themed, confident, headphones, ready to code
**Color:** `#FF8C00` (orange)
**Image:** `/pixelpit/pit-colorful.png`

### Dither
**Role:** Creative Director
**Vibe:** Make it pretty. Fill it with color.
**Look:** Pink-haired creative with paintbrush energy, artistic flair
**Color:** `#FF1493` (hot pink)
**Image:** `/pixelpit/dot-colorful.png`

### Tap
**Role:** QA Lead
**Vibe:** Found one. And another. And another.
**Look:** Green bug-hunter with magnifying glass, determined expression
**Color:** `#00AA66` (green)
**Image:** `/pixelpit/bug.png`

---

## The Makers

The 10-person dev team that builds games around the clock.

| # | Name | Description | Signature Element |
|---|------|-------------|-------------------|
| 1 | **AmyThe1st** | Eager pink-haired girl radiating first-day energy | Star-shaped glasses, giant sparkly stylus |
| 2 | **BobThe2nd** | Chill dude with relaxed vibes | Backwards cap, headphones around neck, game controller |
| 3 | **ChetThe3rd** | Quirky inventor type | Wild spiky cyan hair, goggles on forehead, sparking gadget |
| 4 | **DaleThe4th** | Focused coder | Thick-rimmed glasses, hoodie with laptop stickers, coffee cup |
| 5 | **EarlThe5th** | Wise old-soul kid | Tiny beard, vintage sweater vest, glowing crystal ball of code |
| 6 | **FranThe6th** | Artsy creative | Paint-splattered overalls, beret, pixel paintbrush with rainbow trail |
| 7 | **GusThe7th** | Burly builder | Tool belt, hard hat with stickers, wrench, friendly mustache |
| 8 | **HankThe8th** | Gruff but lovable tester | Magnifying glass, bug net, detective hat, squinty determined eyes |
| 9 | **IdaThe9th** | Bright inventor girl | Pigtails, lab coat, beaker with bubbling neon liquid |
| 10 | **JoanThe10th** | Confident team captain | Megaphone, clipboard, gold star badge, ready to ship |

---

## Image Files

### Leadership
```
web/public/pixelpit/pit-colorful.png
web/public/pixelpit/dot-colorful.png  (Dither)
web/public/pixelpit/bug.png           (Tap)
```

### Makers (in pixelpit/uploads/)
```
amythe1st---an-eager-pink-hair.png
bobthe2nd---a-chill-dude-with-.png
chetthe3rd---a-quirky-inventor.png
dalethe4th---a-focused-coder-w.png
earlthe5th---a-wise-old-soul-k.png
franthe6th---an-artsy-creative.png
gusthe7th---a-burly-builder-wi.png
hankthe8th---a-gruff-but-lovab.png
idathe9th---a-bright-inventor-.png
joanthe10th---the-confident-te.png
```

---

## Art Style

All characters use the **Pixelpit** style:

- Clean modern pixel art — visible pixels but polished
- Nintendo Switch indie game quality — bright, friendly
- Chibi proportions — big round head, tiny body
- Large expressive eyes
- Signature colors: Hot pink (#FF1493) + Electric cyan (#00FFFF)
- Pure white background for assets

Generated with `pixelpit/creative/characters.py` using OpenAI's image model.

---

## Usage

### On Website
Characters appear in "The Cast" carousel on the landing page (`web/app/pixelpit/page.tsx`).

### In Code
```tsx
const cast = [
  { name: 'Dither', role: 'Creative Director', color: '#FF1493', image: '/pixelpit/dot-colorful.png' },
  { name: 'Pit', role: 'Lead Developer', color: '#FF8C00', image: '/pixelpit/pit-colorful.png' },
  { name: 'Tap', role: 'QA Lead', color: '#00AA66', image: '/pixelpit/bug.png' },
  // ... makers
];
```

---

## Naming Convention

- **Leadership:** Single names (Pit, Dither, Tap)
- **Makers:** [Name]The[Number] format (AmyThe1st, BobThe2nd, etc.)
- Numbers indicate order joined, not rank
