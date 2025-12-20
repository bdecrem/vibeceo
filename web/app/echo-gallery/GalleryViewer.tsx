'use client';

import { useState, useEffect, useCallback } from 'react';

interface TextPost {
  id: string;
  text: string;
  why: string | null;
  post_order: number;
}

interface QuirkyImage {
  id: string;
  prompt: string;
  description: string | null;
  storage_path: string | null;
  image_order: number;
  model: string | null;
}

interface QuirkyIdea {
  id: string;
  name: string;
  concept: string;
  why_interesting: string | null;
  vibe: string | null;
  approach: number;
  approach_input: string | null;
  collision_inputs: string | null;
  created_at: string;
  featured?: boolean;
  featured_order?: number | null;
  featured_reason?: string | null;
  text_posts?: TextPost[];
  images?: QuirkyImage[];
}

const palettes = [
  { bg: '#1a0a2e', accent: '#ff6b6b', glow: 'rgba(255,107,107,0.3)' },
  { bg: '#0a1a2e', accent: '#4ecdc4', glow: 'rgba(78,205,196,0.3)' },
  { bg: '#2e1a0a', accent: '#ffe66d', glow: 'rgba(255,230,109,0.3)' },
  { bg: '#0a2e1a', accent: '#a8e6cf', glow: 'rgba(168,230,207,0.3)' },
  { bg: '#2e0a2e', accent: '#dda0dd', glow: 'rgba(221,160,221,0.3)' },
  { bg: '#1a2e2e', accent: '#88d8b0', glow: 'rgba(136,216,176,0.3)' },
  { bg: '#2e2e0a', accent: '#ffcc5c', glow: 'rgba(255,204,92,0.3)' },
  { bg: '#0a0a2e', accent: '#96ceb4', glow: 'rgba(150,206,180,0.3)' },
];

function getApproachEmoji(approach: number): string {
  switch (approach) {
    case 1: return '🎲';
    case 2: return '💥';
    case 3: return '🔒';
    case 4: return '🌱';
    case 5: return '🌍';
    case 6: return '🖤';
    default: return '✨';
  }
}

function getApproachLabel(approach: number): string {
  switch (approach) {
    case 1: return 'Pure Chaos';
    case 2: return 'Collision';
    case 3: return 'Constrained';
    case 4: return 'Expanded';
    case 5: return 'Reality Remix';
    case 6: return 'Underground';
    default: return 'Mystery';
  }
}

function getModelLabel(images: QuirkyImage[] | undefined): string | null {
  if (!images || images.length === 0) return null;
  const models = images.map(img => img.model).filter(Boolean);
  if (models.length === 0) return null;
  const uniqueModels = [...new Set(models)];
  if (uniqueModels.length === 1) {
    return uniqueModels[0] === 'gpt-image-1.5' ? 'GPT 1.5' : 'DALL-E 3';
  }
  return 'Mixed';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${month} ${day}, ${hour12}:${minutes} ${ampm}`;
}

export default function GalleryViewer({ ideas }: { ideas: QuirkyIdea[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [copied, setCopied] = useState(false);

  // Read hash from URL on initial load and on hash change
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.slice(1); // Remove #
      if (hash) {
        const index = ideas.findIndex(idea => idea.id === hash);
        if (index !== -1) {
          setCurrentIndex(index);
          // Scroll to the gallery viewer
          setTimeout(() => {
            document.getElementById('gallery-viewer')?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      }
    };

    // Check on mount
    handleHash();

    // Listen for hash changes (when clicking featured cards)
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [ideas]);

  const goTo = useCallback((index: number) => {
    if (index < 0 || index >= ideas.length || isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    // Update URL hash
    if (ideas[index]) {
      window.history.replaceState(null, '', `#${ideas[index].id}`);
    }
    setTimeout(() => setIsTransitioning(false), 300);
  }, [ideas, isTransitioning]);

  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);
  const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);

  const shareIdea = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}#${ideas[currentIndex].id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [ideas, currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        goNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        goPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev]);

  if (ideas.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '150px 20px' }}>
        <div style={{ fontSize: '4em', marginBottom: '30px' }}>🌀</div>
        <p style={{ fontSize: '1.8em', color: '#666', marginBottom: '15px', fontWeight: 300 }}>
          The void awaits ideas
        </p>
        <p style={{ color: '#444' }}>
          Run the generator to start populating this gallery.
        </p>
      </div>
    );
  }

  const idea = ideas[currentIndex];
  const palette = palettes[currentIndex % palettes.length];
  const ideaNumber = ideas.length - currentIndex;

  return (
    <div id="gallery-viewer" style={{ position: 'relative' }}>
      {/* Progress bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: 'rgba(255,255,255,0.1)',
        zIndex: 100,
      }}>
        <div style={{
          height: '100%',
          width: `${((currentIndex + 1) / ideas.length) * 100}%`,
          background: `linear-gradient(90deg, ${palette.accent}, ${palettes[(currentIndex + 1) % palettes.length].accent})`,
          transition: 'width 0.3s ease, background 0.3s ease',
        }} />
      </div>

      {/* Navigation arrows - subtle edge strips on mobile, circles on desktop */}
      <style>{`
        .nav-btn {
          position: fixed;
          top: 50%;
          transform: translateY(-50%);
          border: none;
          cursor: pointer;
          z-index: 100;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .nav-btn:disabled {
          cursor: not-allowed;
        }
        .nav-btn-prev {
          left: 0;
          border-radius: 0 8px 8px 0;
          width: 28px;
          height: 80px;
          font-size: 1em;
        }
        .nav-btn-next {
          right: 0;
          border-radius: 8px 0 0 8px;
          width: 28px;
          height: 80px;
          font-size: 1em;
        }
        @media (min-width: 768px) {
          .nav-btn-prev {
            left: 20px;
            border-radius: 50%;
            width: 60px;
            height: 60px;
            font-size: 1.5em;
          }
          .nav-btn-next {
            right: 20px;
            border-radius: 50%;
            width: 60px;
            height: 60px;
            font-size: 1.5em;
          }
        }
      `}</style>
      <button
        className="nav-btn nav-btn-prev"
        onClick={goPrev}
        disabled={currentIndex === 0}
        style={{
          background: currentIndex === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
          color: currentIndex === 0 ? '#333' : 'rgba(255,255,255,0.6)',
        }}
        onMouseEnter={(e) => {
          if (currentIndex !== 0) {
            e.currentTarget.style.background = palette.accent;
            e.currentTarget.style.color = '#000';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = currentIndex === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)';
          e.currentTarget.style.color = currentIndex === 0 ? '#333' : 'rgba(255,255,255,0.6)';
        }}
      >
        ‹
      </button>

      <button
        className="nav-btn nav-btn-next"
        onClick={goNext}
        disabled={currentIndex === ideas.length - 1}
        style={{
          background: currentIndex === ideas.length - 1 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
          color: currentIndex === ideas.length - 1 ? '#333' : 'rgba(255,255,255,0.6)',
        }}
        onMouseEnter={(e) => {
          if (currentIndex !== ideas.length - 1) {
            e.currentTarget.style.background = palette.accent;
            e.currentTarget.style.color = '#000';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = currentIndex === ideas.length - 1 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)';
          e.currentTarget.style.color = currentIndex === ideas.length - 1 ? '#333' : 'rgba(255,255,255,0.6)';
        }}
      >
        ›
      </button>

      {/* Idea counter / slider - pinned to bottom on mobile */}
      <div style={{
        position: 'fixed',
        bottom: '0',
        left: '0',
        right: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '15px',
        background: 'rgba(0,0,0,0.95)',
        padding: '12px 20px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        zIndex: 1000,
        WebkitBackdropFilter: 'blur(10px)',
        backdropFilter: 'blur(10px)',
      }}>
        <span style={{ color: '#666', fontSize: '0.85em', minWidth: '45px' }}>#{ideaNumber}</span>
        <input
          type="range"
          min={0}
          max={ideas.length - 1}
          value={currentIndex}
          onChange={(e) => goTo(parseInt(e.target.value))}
          style={{
            flex: 1,
            maxWidth: '300px',
            accentColor: palette.accent,
            cursor: 'pointer',
          }}
        />
        <span style={{ color: '#666', fontSize: '0.85em', minWidth: '60px', textAlign: 'right' }}>{ideas.length} ideas</span>
      </div>

      {/* Main idea display */}
      <article
        style={{
          position: 'relative',
          background: `linear-gradient(135deg, ${palette.bg} 0%, rgba(10,10,15,0.9) 100%)`,
          borderRadius: '40px',
          padding: 'clamp(30px, 5vw, 60px)',
          border: '1px solid rgba(255,255,255,0.05)',
          boxShadow: `0 0 80px ${palette.glow}`,
          opacity: isTransitioning ? 0.7 : 1,
          transform: isTransitioning ? 'scale(0.98)' : 'scale(1)',
          transition: 'all 0.3s ease',
          marginBottom: '100px',
        }}
      >
        {/* Idea number badge */}
        <div style={{
          position: 'absolute',
          top: '-20px',
          left: '40px',
          background: palette.accent,
          color: '#000',
          padding: '8px 20px',
          borderRadius: '100px',
          fontSize: '0.85em',
          fontWeight: 700,
          letterSpacing: '0.05em',
        }}>
          #{ideaNumber}
        </div>

        {/* Header row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '30px',
          flexWrap: 'wrap',
          gap: '20px',
        }}>
          <div>
            <h2 style={{
              fontSize: 'clamp(1.5em, 4vw, 2.5em)',
              color: palette.accent,
              fontWeight: 300,
              margin: '0 0 10px 0',
              letterSpacing: '-0.02em',
            }}>
              {idea.name}
            </h2>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{
                background: 'rgba(255,255,255,0.1)',
                padding: '5px 15px',
                borderRadius: '100px',
                fontSize: '0.85em',
                color: '#999',
              }}>
                {getApproachEmoji(idea.approach)} {getApproachLabel(idea.approach)}
              </span>
              {getModelLabel(idea.images) && (
                <span style={{
                  background: 'rgba(255,255,255,0.08)',
                  padding: '5px 15px',
                  borderRadius: '100px',
                  fontSize: '0.85em',
                  color: '#888',
                }}>
                  🎨 {getModelLabel(idea.images)}
                </span>
              )}
              {idea.vibe && (
                <span style={{
                  background: 'rgba(255,255,255,0.05)',
                  padding: '5px 15px',
                  borderRadius: '100px',
                  fontSize: '0.85em',
                  color: '#777',
                  fontStyle: 'italic',
                }}>
                  {idea.vibe}
                </span>
              )}
              {idea.approach_input && [3, 4, 5].includes(idea.approach) && (
                <span style={{
                  background: 'rgba(255,255,255,0.05)',
                  padding: '5px 15px',
                  borderRadius: '100px',
                  fontSize: '0.85em',
                  color: '#666',
                }}>
                  💬 &ldquo;{idea.approach_input}&rdquo;
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button
              onClick={shareIdea}
              style={{
                background: copied ? 'rgba(78,205,196,0.2)' : 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1em',
                transition: 'all 0.2s ease',
              }}
              title={copied ? 'Copied!' : 'Copy link'}
            >
              {copied ? '✓' : '🔗'}
            </button>
            <div style={{ color: '#555', fontSize: '0.85em', textAlign: 'right' }} suppressHydrationWarning>
              {formatDate(idea.created_at)}
            </div>
          </div>
        </div>

        {/* Concept */}
        <blockquote style={{
          fontSize: 'clamp(1.2em, 3vw, 1.8em)',
          color: '#ddd',
          margin: '0 0 40px 0',
          padding: '30px 40px',
          borderLeft: `4px solid ${palette.accent}`,
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '0 20px 20px 0',
          fontWeight: 300,
          lineHeight: 1.5,
        }}>
          &ldquo;{idea.concept}&rdquo;
        </blockquote>

        {/* Collision inputs */}
        {idea.collision_inputs && (
          <div style={{
            color: '#666',
            fontSize: '0.9em',
            marginBottom: '30px',
            fontFamily: 'monospace',
            background: 'rgba(0,0,0,0.2)',
            padding: '15px 20px',
            borderRadius: '10px',
            display: 'inline-block',
          }}>
            <span style={{ color: '#888' }}>collision:</span> {idea.collision_inputs}
          </div>
        )}

        {/* Images */}
        {idea.images && idea.images.length > 0 && (
          <div style={{ marginBottom: '40px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
            }}>
              {idea.images.map((img, imgIndex) => (
                <div
                  key={img.id}
                  style={{
                    position: 'relative',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    aspectRatio: '1',
                    background: 'rgba(0,0,0,0.3)',
                    transform: `rotate(${(imgIndex - 2) * 1.5}deg)`,
                  }}
                >
                  {img.storage_path ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.storage_path}
                        alt={img.description || 'Generated image'}
                        loading="lazy"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                      {img.description && (
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
                          padding: '40px 15px 15px',
                          fontSize: '0.85em',
                          color: '#ccc',
                        }}>
                          {img.description}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#444',
                      fontStyle: 'italic',
                      padding: '20px',
                      textAlign: 'center',
                      fontSize: '0.9em',
                    }}>
                      {img.description || 'Manifesting...'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Text Posts */}
        {idea.text_posts && idea.text_posts.length > 0 && (
          <div>
            <h3 style={{
              fontSize: '0.9em',
              color: '#555',
              marginBottom: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
            }}>
              Sample Posts
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {idea.text_posts.map((post, postIndex) => (
                <div
                  key={post.id}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    padding: '20px 25px',
                    borderRadius: '20px',
                    borderBottomLeftRadius: postIndex % 2 === 0 ? '5px' : '20px',
                    borderBottomRightRadius: postIndex % 2 === 1 ? '5px' : '20px',
                    marginLeft: postIndex % 2 === 0 ? '0' : '40px',
                    marginRight: postIndex % 2 === 1 ? '0' : '40px',
                    maxWidth: '85%',
                    alignSelf: postIndex % 2 === 0 ? 'flex-start' : 'flex-end',
                  }}
                >
                  <p style={{ fontSize: '1.1em', color: '#e0e0e0', margin: 0, lineHeight: 1.5 }}>
                    {post.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* Keyboard hint */}
      <div style={{
        position: 'fixed',
        bottom: '90px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#444',
        fontSize: '0.8em',
        zIndex: 100,
      }}>
        ← → to navigate
      </div>
    </div>
  );
}
