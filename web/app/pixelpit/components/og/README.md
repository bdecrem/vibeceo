# Pixelpit OG Image Components

Dynamic OpenGraph image generation for score sharing.

## File Structure

```
web/app/pixelpit/arcade/[game]/share/[score]/
├── layout.tsx           # generateMetadata() for title/description
├── page.tsx             # Client redirect back to game
└── opengraph-image.tsx  # Dynamic image generation
```

## Usage

```tsx
// opengraph-image.tsx
import { ImageResponse } from 'next/og';
import { createScoreShareImage, BeamDecorations, OG_SIZE, GAME_COLORS } from '@/app/pixelpit/components';

export const runtime = 'edge';
export const alt = 'BEAM Score - Pixelpit Arcade';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: { score: string } }) {
  return new ImageResponse(
    createScoreShareImage({
      score: params.score,
      gameName: 'BEAM',
      tagline: 'CAN YOU BEAT ME?',
      colors: GAME_COLORS.beam,
      decorations: <BeamDecorations />,
    }),
    { ...size }
  );
}
```

## CRITICAL: metadataBase

The Pixelpit layout MUST have `metadataBase` set, or OG URLs will use the wrong domain:

```tsx
// web/app/pixelpit/layout.tsx
export const metadata: Metadata = {
  metadataBase: new URL('https://pixelpit.gg'),  // REQUIRED!
};
```

## Satori CSS Limitations

Satori (the library behind `next/og`) runs on Edge and has **strict limitations**. Violating these causes silent 502 errors.

### DON'T USE:

| Feature | Problem | Fix |
|---------|---------|-----|
| React fragments `<>...</>` | Crashes Edge | Wrap in `<div>` |
| `radial-gradient(circle at X Y, ...)` | Not supported | Use `linear-gradient` |
| `rgba(r, g, b, a)` | Inconsistent | Use hex: `#rrggbbaa` |
| `transparent` keyword | Not supported | Use `#00000000` |
| `borderRadius: '50%'` | Can fail | Use numeric: `borderRadius: 14` |
| Complex `boxShadow` | Unreliable | Simplify or remove |
| `.map()` with complex JSX | Can fail | Use static elements |

### DO USE:

```tsx
// Satori-safe styles
<div style={{
  position: 'absolute',
  left: 200,              // numeric, not '200px'
  top: 120,
  borderRadius: 14,       // numeric, not '50%'
  background: '#fbbf24',  // solid hex
  opacity: 0.5,
}}>

// Hex with alpha instead of rgba
background: 'linear-gradient(180deg, #0f172a00 0%, #22d3ee26 100%)'
//                                   ^^^^^^^^      ^^^^^^^^
//                                   transparent   ~15% opacity

// Wrapper div instead of fragment
return (
  <div style={{ position: 'absolute', inset: 0 }}>
    <div>element 1</div>
    <div>element 2</div>
  </div>
);
```

## Hex Alpha Reference

| Opacity | Hex Suffix | Example |
|---------|------------|---------|
| 100% | `ff` | `#ffffffff` |
| 50% | `80` | `#ffffff80` |
| 25% | `40` | `#ffffff40` |
| 15% | `26` | `#ffffff26` |
| 0% | `00` | `#ffffff00` |

## Debugging

1. **Test direct URL**: `https://pixelpit.gg/arcade/rain/share/42/opengraph-image`
2. **502 error?** Something in your JSX/CSS isn't Satori-compatible
3. **Simplify**: Remove decorations until it works, add back one by one
4. **Compare**: BEAM works - copy its patterns

## Components

- `createScoreShareImage()` - Parameterized score image generator
- `BeamDecorations()` - BEAM game decorations (walls, grid)
- `RainDecorations()` - RAIN game decorations (drops, glow)
- `CornerAccents()` - Corner bracket decorations
- `PixelpitBranding()` - "PIXELPIT ARCADE" footer
- `GAME_COLORS` - Color schemes per game
- `OG_SIZE` - Standard 1200x630 dimensions
