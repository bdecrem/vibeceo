import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'FLOOD - Pixelpit Arcade';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  // Generate a mini grid of colored squares for the OG image
  const PALETTE = ['#D4A574', '#FFD700', '#2D9596', '#7B68EE', '#FF69B4', '#FF7F50'];
  const cells: string[] = [];
  for (let i = 0; i < 36; i++) {
    cells.push(PALETTE[i % PALETTE.length]);
  }
  // Shuffle
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  return new ImageResponse(
    (
      <div style={{
        background: '#000000',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        {/* Mini color grid behind title */}
        <div style={{
          position: 'absolute',
          display: 'flex',
          flexWrap: 'wrap',
          width: 360,
          height: 360,
          gap: 4,
          opacity: 0.25,
        }}>
          {cells.map((color, i) => (
            <div key={i} style={{
              width: 56,
              height: 56,
              background: color,
              borderRadius: 4,
            }} />
          ))}
        </div>

        {/* Title */}
        <div style={{
          fontSize: 160,
          fontWeight: 700,
          color: '#D4A574',
          letterSpacing: 20,
          textShadow: '0 0 60px #D4A57480',
          zIndex: 1,
        }}>
          FLOOD
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: 28,
          color: '#2D9596',
          letterSpacing: 8,
          marginTop: 12,
          zIndex: 1,
        }}>
          FILL THE GRID WITH ONE COLOR
        </div>

        {/* Color swatches at bottom */}
        <div style={{
          position: 'absolute',
          bottom: 80,
          display: 'flex',
          gap: 16,
        }}>
          {PALETTE.map((color, i) => (
            <div key={i} style={{
              width: 40,
              height: 40,
              background: color,
              borderRadius: 8,
              border: '2px solid #ffffff20',
            }} />
          ))}
        </div>

        {/* Branding */}
        <div style={{
          position: 'absolute',
          bottom: 30,
          fontSize: 24,
          color: '#ffffff60',
          letterSpacing: 6,
        }}>
          PIXELPIT ARCADE
        </div>

        {/* Corner accents */}
        <div style={{ position: 'absolute', top: 30, left: 30, width: 40, height: 40, borderTop: '2px solid #D4A57440', borderLeft: '2px solid #D4A57440' }} />
        <div style={{ position: 'absolute', top: 30, right: 30, width: 40, height: 40, borderTop: '2px solid #D4A57440', borderRight: '2px solid #D4A57440' }} />
        <div style={{ position: 'absolute', bottom: 30, left: 30, width: 40, height: 40, borderBottom: '2px solid #D4A57440', borderLeft: '2px solid #D4A57440' }} />
        <div style={{ position: 'absolute', bottom: 30, right: 30, width: 40, height: 40, borderBottom: '2px solid #D4A57440', borderRight: '2px solid #D4A57440' }} />
      </div>
    ),
    { ...size }
  );
}
