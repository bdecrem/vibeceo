import { ImageResponse } from 'next/og';
import {
  createScoreShareImage,
  OG_SIZE,
} from '@/app/pixelpit/components';

export const runtime = 'edge';
export const alt = 'SLINGSHOT Score - Pixelpit Arcade';
export const size = OG_SIZE;
export const contentType = 'image/png';

function SlingshotDecorations() {
  return (
    <div style={{ position: 'absolute', display: 'flex', top: 0, left: 0, right: 0, bottom: 0 }}>
      {/* Target ring top-right */}
      <div style={{
        position: 'absolute', top: 80, right: 120,
        width: 120, height: 120, borderRadius: 9999,
        border: '2px solid #2D959650',
      }} />
      <div style={{
        position: 'absolute', top: 100, right: 140,
        width: 80, height: 80, borderRadius: 9999,
        border: '2px solid #FFD70040',
      }} />
      <div style={{
        position: 'absolute', top: 120, right: 160,
        width: 40, height: 40, borderRadius: 9999,
        background: '#ec489930',
      }} />
      {/* Target ring bottom-left */}
      <div style={{
        position: 'absolute', bottom: 100, left: 100,
        width: 90, height: 90, borderRadius: 9999,
        border: '2px solid #2D959640',
      }} />
      {/* Gold dots scattered */}
      <div style={{ position: 'absolute', top: 200, left: 200, width: 6, height: 6, borderRadius: 9999, background: '#FFD70060' }} />
      <div style={{ position: 'absolute', top: 350, right: 300, width: 4, height: 4, borderRadius: 9999, background: '#FFD70040' }} />
      <div style={{ position: 'absolute', bottom: 200, left: 400, width: 5, height: 5, borderRadius: 9999, background: '#2D959660' }} />
    </div>
  );
}

export default async function Image({ params }: { params: { score: string } }) {
  const p = await params;
  return new ImageResponse(
    createScoreShareImage({
      score: p.score,
      gameName: 'SLINGSHOT',
      tagline: 'CAN YOU BEAT ME? 🎯',
      colors: {
        background: '#0a0a0a',
        primary: '#FFD700',
        secondary: '#2D9596',
        accent: '#ec4899',
        branding: '#ffffff80',
      },
      decorations: <SlingshotDecorations />,
    }),
    { ...size }
  );
}
