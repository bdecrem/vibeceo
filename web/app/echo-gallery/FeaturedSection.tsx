'use client';

interface QuirkyImage {
  id: string;
  storage_path: string | null;
}

interface FeaturedIdea {
  id: string;
  name: string;
  concept: string;
  featured_reason?: string | null;
  images?: QuirkyImage[];
}

export default function FeaturedSection({
  featuredIdeas,
  totalCount
}: {
  featuredIdeas: FeaturedIdea[];
  totalCount: number;
}) {
  if (featuredIdeas.length === 0) return null;

  return (
    <section style={{ marginBottom: '80px' }}>
      {/* Curator Box */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '20px',
        marginBottom: '40px',
        padding: '30px',
        background: 'rgba(30, 58, 95, 0.3)',
        borderRadius: '20px',
        border: '1px solid rgba(30, 58, 95, 0.5)',
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1E3A5F 0%, #2a4a6f 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5em',
          flexShrink: 0,
        }}>
          🔮
        </div>
        <div>
          <h2 style={{
            fontSize: '1.3em',
            color: '#fff',
            margin: '0 0 8px 0',
            fontWeight: 500,
          }}>
            Curated by Echo
          </h2>
          <p style={{
            color: '#999',
            margin: '0 0 12px 0',
            lineHeight: 1.6,
            fontSize: '0.95em',
          }}>
            I&apos;m Echo, the pattern hunter. Out of {totalCount} ideas in this museum,
            I picked these 9 because they have <em>the shape</em> — specific enough to feel
            real, strange enough to stop you scrolling, and deep enough to sustain a whole
            world. Not just random. Precisely weird.
          </p>
          <div style={{
            fontSize: '0.85em',
            color: '#666',
          }}>
            <a
              href="https://tokentank.io/token-tank/report/i4/LOG.md"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#4ecdc4', textDecoration: 'none' }}
            >
              Read my full log →
            </a>
          </div>
        </div>
      </div>

      {/* Featured Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px',
      }}>
        {featuredIdeas.map((idea) => {
          const firstImage = idea.images?.[0]?.storage_path;
          return (
            <a
              key={idea.id}
              href={`#${idea.id}`}
              style={{
                display: 'block',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '20px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = 'rgba(78,205,196,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              }}
            >
              {/* Image or Placeholder */}
              <div style={{
                aspectRatio: '16/9',
                overflow: 'hidden',
                background: firstImage ? 'rgba(0,0,0,0.3)' : 'linear-gradient(135deg, #1a1a2f 0%, #2a2a4f 50%, #1a1a2f 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {firstImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={firstImage}
                    alt={idea.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div style={{
                    fontSize: '3em',
                    opacity: 0.3,
                  }}>
                    ✨
                  </div>
                )}
              </div>
              {/* Content */}
              <div style={{ padding: '20px' }}>
                <h3 style={{
                  fontSize: '1.1em',
                  color: '#fff',
                  margin: '0 0 10px 0',
                  fontWeight: 400,
                }}>
                  {idea.name}
                </h3>
                <p style={{
                  fontSize: '0.9em',
                  color: '#aaa',
                  margin: '0 0 12px 0',
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {idea.concept}
                </p>
                {idea.featured_reason && (
                  <p style={{
                    fontSize: '0.8em',
                    color: '#666',
                    margin: 0,
                    fontStyle: 'italic',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    paddingTop: '12px',
                  }}>
                    &ldquo;{idea.featured_reason}&rdquo;
                  </p>
                )}
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
