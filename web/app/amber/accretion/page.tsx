"use client";

export default function AccretionPage() {
  // Cache bust with timestamp
  const cacheBust = `?v=${Date.now()}`;

  return (
    <>
      <style jsx global>{`
        html {
          background: #0a0806;
        }
        body {
          margin: 0;
          padding: 0;
          background: #0a0806;
        }
      `}</style>
      <iframe
        src={`/toys-accretion.html${cacheBust}`}
        style={{
          width: '100vw',
          height: '100vh',
          border: 'none',
          position: 'fixed',
          top: 0,
          left: 0,
        }}
        title="Amber Accretion"
      />
    </>
  );
}
