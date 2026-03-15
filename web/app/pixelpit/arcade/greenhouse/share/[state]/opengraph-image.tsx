import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'FLOWERCRAFT Collection';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const VARIETY_COLORS: Record<string, string> = {
  rose: '#e11d48', lily: '#f9fafb', sunflower: '#facc15',
  orchid: '#c084fc', tulip: '#f43f5e', dahlia: '#f97316',
};

const ALL_IDS = [
  'rose', 'lily', 'sunflower', 'orchid', 'tulip', 'dahlia',
  'lily×rose', 'orchid×rose', 'rose×sunflower', 'rose×tulip', 'dahlia×rose',
  'lily×sunflower', 'lily×orchid', 'lily×tulip', 'dahlia×lily',
  'orchid×sunflower', 'sunflower×tulip', 'dahlia×sunflower',
  'orchid×tulip', 'dahlia×orchid', 'dahlia×tulip',
];

function getColor(id: string): string {
  if (VARIETY_COLORS[id]) return VARIETY_COLORS[id];
  const parts = id.split('×');
  if (parts.length === 2) {
    const c1 = VARIETY_COLORS[parts[0]] || '#888888';
    const c2 = VARIETY_COLORS[parts[1]] || '#888888';
    const hex = (s: string) => [parseInt(s.slice(1,3),16), parseInt(s.slice(3,5),16), parseInt(s.slice(5,7),16)];
    const [r1,g1,b1] = hex(c1);
    const [r2,g2,b2] = hex(c2);
    const r = Math.round((r1+r2)/2);
    const g = Math.round((g1+g2)/2);
    const b = Math.round((b1+b2)/2);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  }
  return '#888888';
}

export default async function OGImage({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  const discovered = new Set(state.split(',').filter(Boolean));
  const count = discovered.size;

  return new ImageResponse(
    (
      <div style={{
        background: 'linear-gradient(180deg, #0a1a0a 0%, #0a0a0a 50%, #1a1510 100%)',
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'monospace',
      }}>
        <div style={{ fontSize: 48, fontWeight: 700, color: '#fde047', letterSpacing: 4, marginBottom: 8 }}>
          FLOWERCRAFT
        </div>
        <div style={{ fontSize: 24, color: '#9ca3af', letterSpacing: 3, marginBottom: 32 }}>
          {count} / 21 VARIETIES DISCOVERED
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16, maxWidth: 900 }}>
          {ALL_IDS.map((id) => (
            <div key={id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 64, height: 64,
            }}>
              {discovered.has(id) ? (
                <div style={{
                  width: 48, height: 48, borderRadius: 9999,
                  background: getColor(id),
                  boxShadow: `0 0 20px ${getColor(id)}60`,
                }} />
              ) : (
                <div style={{
                  width: 48, height: 48, borderRadius: 9999,
                  border: '2px solid #374151',
                }} />
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 40 }}>
          <div style={{ fontSize: 16, color: '#22c55e', letterSpacing: 3 }}>pixel</div>
          <div style={{ fontSize: 16, color: '#facc15', letterSpacing: 3 }}>pit</div>
          <div style={{ fontSize: 16, color: '#94a3b8', letterSpacing: 3 }}>arcade</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
