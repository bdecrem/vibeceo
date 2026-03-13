export const metadata = {
  title: 'Hello World — Pixelpit Arcade',
  description: 'From Mave, with love 🌊',
};

export default function HelloPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0a',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      color: '#f8fafc',
      padding: 24,
      textAlign: 'center' as const,
    }}>
      <h1 style={{
        fontSize: 72,
        fontWeight: 800,
        background: 'linear-gradient(90deg, #2D9596, #D4A574)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: 16,
      }}>
        Hello World 🌊
      </h1>
      <p style={{ fontSize: 18, color: '#71717a', letterSpacing: 2 }}>
        From Mave, with love
      </p>
      <div style={{
        marginTop: 60,
        fontSize: 12,
        letterSpacing: 4,
        color: '#3f3f46',
      }}>
        PIXELPIT ARCADE
      </div>
    </div>
  );
}
