import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'todoit list';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Task = { title: string; completed: boolean };

async function fetchSharedList(slug: string): Promise<{ title: string; tasks: Task[] } | null> {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null) ||
    'https://kochi.to';

  try {
    const res = await fetch(`${baseUrl}/api/mutabl/todoit/view/${slug}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: { slug: string } }) {
  const list = await fetchSharedList(params.slug);
  const title = list?.title || 'todo list';
  const tasks = list?.tasks?.slice(0, 5) || [];
  const done = list?.tasks?.filter((t) => t.completed).length ?? 0;
  const total = list?.tasks?.length ?? 0;

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
        <div style={{ display: 'flex', position: 'absolute', top: 28, left: 28, width: 40, height: 3, backgroundColor: '#6366f140' }} />
        <div style={{ display: 'flex', position: 'absolute', top: 28, left: 28, width: 3, height: 40, backgroundColor: '#6366f140' }} />
        <div style={{ display: 'flex', position: 'absolute', bottom: 28, right: 28, width: 40, height: 3, backgroundColor: '#6366f140' }} />
        <div style={{ display: 'flex', position: 'absolute', bottom: 28, right: 28, width: 3, height: 40, backgroundColor: '#6366f140' }} />

        {/* Title */}
        <div
          style={{
            display: 'flex',
            fontSize: title.length > 40 ? 48 : 64,
            fontWeight: 800,
            color: '#eeeeee',
            lineHeight: 1.2,
            letterSpacing: -1,
            maxWidth: 900,
          }}
        >
          {title}
        </div>

        {/* Progress */}
        {total > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 16,
              marginBottom: 32,
            }}
          >
            <div
              style={{
                display: 'flex',
                width: 200,
                height: 4,
                backgroundColor: '#1a1a30',
                borderRadius: 2,
                position: 'relative',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: total > 0 ? `${(done / total) * 100}%` : '0%',
                  height: '100%',
                  backgroundColor: '#6366f1',
                  borderRadius: 2,
                }}
              />
            </div>
            <div style={{ display: 'flex', fontSize: 18, color: '#555' }}>
              {done}/{total} complete
            </div>
          </div>
        )}

        {/* Tasks preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tasks.map((task, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  display: 'flex',
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  backgroundColor: task.completed ? '#6366f1' : '#1a1a30',
                  border: task.completed ? 'none' : '1px solid #2a2a40',
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  display: 'flex',
                  fontSize: 20,
                  color: task.completed ? '#444' : '#aaa',
                }}
              >
                {task.title}
              </div>
            </div>
          ))}
          {(list?.tasks?.length ?? 0) > 5 && (
            <div style={{ display: 'flex', fontSize: 16, color: '#333', marginTop: 4 }}>
              +{(list?.tasks?.length ?? 0) - 5} more
            </div>
          )}
        </div>

        {/* Branding */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            position: 'absolute',
            bottom: 40,
            left: 80,
          }}
        >
          <div style={{ display: 'flex', width: 6, height: 6, borderRadius: 3, backgroundColor: '#6366f1' }} />
          <div style={{ display: 'flex', fontSize: 20, color: '#6366f1', fontWeight: 700, letterSpacing: 2 }}>
            TODOIT
          </div>
          <div style={{ display: 'flex', fontSize: 18, color: '#333', letterSpacing: 1 }}>
            mutabl.co/todoit
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
