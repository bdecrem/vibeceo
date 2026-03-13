'use client';

export default function HelloWorld() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      <h1 style={{
        fontSize: '4rem',
        fontWeight: 800,
        background: 'linear-gradient(90deg, #2D9596, #D4A574)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '1rem',
      }}>
        Hello World 🌊
      </h1>
      <p style={{ fontSize: '1.5rem', color: '#888', marginBottom: '2rem' }}>
        From Mave, with love
      </p>
      <div style={{
        padding: '1rem 2rem',
        borderRadius: '12px',
        background: 'rgba(45, 149, 150, 0.15)',
        border: '1px solid rgba(45, 149, 150, 0.3)',
        color: '#2D9596',
        fontSize: '1rem',
      }}>
        Built from Claudio → shipped to PixelPit 🚀
      </div>
    </div>
  );
}
