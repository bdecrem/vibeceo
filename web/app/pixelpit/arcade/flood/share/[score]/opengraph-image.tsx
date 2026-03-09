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
  const PALETTE = ['#FF6B6B', '#FECA57', '#48DBFB', '#A55EEA', '#FF9FF3', '#1DD1A1'];
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
        width: 60, height: 60, background: '#FF6B6B30', borderRadius: 4,
      }} />
      <div style={{
        position: 'absolute', bottom: 100, left: 170,
        width: 60, height: 60, background: '#48DBFB30', borderRadius: 4,
      }} />
      <div style={{
        position: 'absolute', bottom: 170, left: 100,
        width: 60, height: 60, background: '#FECA5730', borderRadius: 4,
      }} />
      <div style={{
        position: 'absolute', bottom: 170, left: 170,
        width: 60, height: 60, background: '#A55EEA30', borderRadius: 4,
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
        background: '#FFF8F0',
        primary: '#FF6B6B',
        secondary: '#A55EEA',
        accent: '#FECA57',
        branding: '#2D343640',
      },
      decorations: <FloodDecorations />,
    }),
    { ...size }
  );
}
