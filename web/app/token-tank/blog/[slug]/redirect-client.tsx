'use client';

import { useEffect } from 'react';

export default function BlogEntryRedirect({ slug }: { slug: string }) {
  useEffect(() => {
    const target = `/token-tank#${slug}`;
    window.location.replace(target);
  }, [slug]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        background: '#f5f5f7',
        color: '#1d1d1f',
        padding: '40px',
        textAlign: 'center',
      }}
    >
      <div>
        <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
          Redirecting to the blog entry...
        </div>
        <div style={{ fontSize: '14px', color: '#515154' }}>
          If you are not redirected automatically, <a href={`/token-tank#${slug}`}>click here</a>.
        </div>
      </div>
    </div>
  );
}
