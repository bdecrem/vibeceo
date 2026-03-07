import { ImageResponse } from 'next/og';
import {
  createScoreShareImage,
  OG_SIZE,
} from '@/app/pixelpit/components';

export const runtime = 'edge';
export const alt = 'FLOOD Score - Pixelpit Arcade';
export const size = OG_SIZE;
export const contentType = 'image/png';

function FloodDecorations() {
  const PALETTE = ['#D4A574', '#FFD700', '#2D9596', '#7B68EE', '#FF69B4', '#FF7F50'];
  return (
    <div style={{ position: 'absolute', display: 'flex', top: 0, left: 0, right: 0, bottom: 0 }}>
      {/* Color swatches top-right */}
      {PALETTE.map((color, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: 80 + i * 28,
          right: 120,
          width: 24,
          height: 24,
          background: color,
          borderRadius: 4,
          opacity: 0.5,
        }} />
      ))}
      {/* Grid squares bottom-left */}
      <div style={{
        position: 'absolute', bottom: 100, left: 100,
        width: 60, height: 60, background: '#D4A57430', borderRadius: 4,
      }} />
      <div style={{
        position: 'absolute', bottom: 100, left: 170,
        width: 60, height: 60, background: '#2D959630', borderRadius: 4,
      }} />
      <div style={{
        position: 'absolute', bottom: 170, left: 100,
        width: 60, height: 60, background: '#FFD70030', borderRadius: 4,
      }} />
      <div style={{
        position: 'absolute', bottom: 170, left: 170,
        width: 60, height: 60, background: '#7B68EE30', borderRadius: 4,
      }} />
    </div>
  );
}

export default async function Image({ params }: { params: { score: string } }) {
  const p = await params;
  return new ImageResponse(
    createScoreShareImage({
      score: p.score,
      gameName: 'FLOOD',
      tagline: 'CAN YOU BEAT ME? 🎨',
      colors: {
        background: '#000000',
        primary: '#D4A574',
        secondary: '#2D9596',
        accent: '#FFD700',
        branding: '#ffffff80',
      },
      decorations: <FloodDecorations />,
    }),
    { ...size }
  );
}
