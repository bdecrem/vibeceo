'use client';

import { useState, useEffect } from 'react';
import { Press_Start_2P } from 'next/font/google';

const pixelFont = Press_Start_2P({ weight: '400', subsets: ['latin'] });

export default function CreaturesGallery() {
  const [creatures, setCreatures] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    // Fetch list of creatures from API
    const fetchCreatures = () => {
      fetch('/api/pixelpit/creatures')
        .then(res => res.json())
        .then(data => setCreatures(data.creatures || []))
        .catch(() => setCreatures([]));
    };

    fetchCreatures();
    // Auto-refresh every 3 seconds to watch swarm output
    const interval = setInterval(fetchCreatures, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={pixelFont.className}
      style={{
        background: '#0f172a',
        minHeight: '100vh',
        padding: '20px',
        color: '#fff',
      }}
    >
      <h1
        style={{
          fontSize: '16px',
          color: '#ec4899',
          marginBottom: '20px',
          textShadow: '4px 4px 0 #000',
        }}
      >
        CREATURES
      </h1>

      {selected ? (
        <div>
          <button
            onClick={() => setSelected(null)}
            style={{
              background: '#22d3ee',
              color: '#0f172a',
              border: 'none',
              padding: '8px 16px',
              fontSize: '10px',
              cursor: 'pointer',
              marginBottom: '20px',
              boxShadow: '4px 4px 0 #000',
            }}
          >
            BACK
          </button>
          <iframe
            src={`/pixelpit/creatures/${selected}`}
            style={{
              width: '100%',
              height: 'calc(100vh - 120px)',
              border: '4px solid #ec4899',
              boxShadow: '8px 8px 0 #000',
            }}
          />
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: '16px',
          }}
        >
          {creatures.length === 0 ? (
            <p style={{ fontSize: '10px', color: '#64748b' }}>
              No creatures yet...
            </p>
          ) : (
            creatures.map((name) => (
              <button
                key={name}
                onClick={() => setSelected(name)}
                style={{
                  background: '#1e293b',
                  border: '4px solid #ec4899',
                  padding: '16px',
                  color: '#fbbf24',
                  fontSize: '10px',
                  cursor: 'pointer',
                  boxShadow: '4px 4px 0 #000',
                  textTransform: 'uppercase',
                }}
              >
                {name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
