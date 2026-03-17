import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'notabl document';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

async function fetchDocumentTitle(slug: string): Promise<string | null> {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null) ||
    'https://kochi.to';

  try {
    const res = await fetch(`${baseUrl}/api/mutabl/notabl/view/${slug}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.title || null;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: { slug: string } }) {
  const title = await fetchDocumentTitle(params.slug);

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          backgroundColor: '#0a0a1a',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px',
          position: 'relative',
        }}
      >
        {/* Corner accents */}
        <div style={{ display: 'flex', position: 'absolute', top: 28, left: 28, width: 40, height: 3, backgroundColor: '#FD79A840' }} />
        <div style={{ display: 'flex', position: 'absolute', top: 28, left: 28, width: 3, height: 40, backgroundColor: '#FD79A840' }} />
        <div style={{ display: 'flex', position: 'absolute', bottom: 28, right: 28, width: 40, height: 3, backgroundColor: '#FD79A840' }} />
        <div style={{ display: 'flex', position: 'absolute', bottom: 28, right: 28, width: 3, height: 40, backgroundColor: '#FD79A840' }} />

        {/* Title */}
        <div
          style={{
            display: 'flex',
            fontSize: title && title.length > 40 ? 52 : 72,
            fontWeight: 800,
            color: '#eeeeee',
            lineHeight: 1.2,
            letterSpacing: -1,
            maxWidth: 1000,
          }}
        >
          {title || 'untitled document'}
        </div>

        {/* Branding row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 40,
          }}
        >
          <div
            style={{
              display: 'flex',
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: '#FD79A8',
            }}
          />
          <div
            style={{
              display: 'flex',
              fontSize: 22,
              color: '#FD79A8',
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            NOTABL
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 20,
              color: '#444',
              letterSpacing: 1,
              marginLeft: 8,
            }}
          >
            documents that evolve
          </div>
        </div>

        {/* Bottom domain */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: 40,
            right: 80,
            fontSize: 16,
            color: '#333',
            letterSpacing: 2,
          }}
        >
          mutabl.co/notabl
        </div>
      </div>
    ),
    { ...size }
  );
}
