import { createClient } from '@supabase/supabase-js';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Quirky Gallery | Ideas That Shouldn\'t Exist',
  description: 'Strange and delightful ideas, generated forever. An infinite museum of the beautifully weird.',
  openGraph: {
    title: 'The Quirky Gallery',
    description: 'Strange and delightful ideas, generated forever',
  },
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  text_posts?: TextPost[];
  images?: QuirkyImage[];
}

async function getIdeas(): Promise<QuirkyIdea[]> {
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  const { data: ideas, error } = await supabase
    .from('echo_quirky_ideas')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !ideas) {
    console.error('Failed to fetch ideas:', error);
    return [];
  }

  const result: QuirkyIdea[] = [];

  for (const idea of ideas) {
    const { data: posts } = await supabase
      .from('echo_quirky_posts')
      .select('*')
      .eq('idea_id', idea.id)
      .order('post_order', { ascending: true });

    const { data: images } = await supabase
      .from('echo_quirky_images')
      .select('*')
      .eq('idea_id', idea.id)
      .order('image_order', { ascending: true });

    result.push({
      ...idea,
      text_posts: posts || [],
      images: images || [],
    });
  }

  return result;
}

// Fun color palettes for each idea
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
    case 5: return '🌱';
    default: return '✨';
  }
}

function getApproachLabel(approach: number): string {
  switch (approach) {
    case 1: return 'Pure Chaos';
    case 2: return 'Collision';
    case 3: return 'Constrained';
    case 5: return 'Expanded';
    default: return 'Mystery';
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function EchoGalleryPage() {
  const ideas = await getIdeas();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0a0a0f 0%, #1a1a2f 50%, #0a0a0f 100%)',
      color: '#e0e0e0',
      fontFamily: '"Space Grotesk", "Inter", system-ui, sans-serif',
      overflow: 'hidden',
    }}>
      {/* Floating background elements */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 0,
      }}>
        <div style={{
          position: 'absolute',
          top: '10%',
          left: '5%',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(255,107,107,0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute',
          top: '60%',
          right: '10%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(78,205,196,0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(60px)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '20%',
          left: '30%',
          width: '250px',
          height: '250px',
          background: 'radial-gradient(circle, rgba(221,160,221,0.08) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(50px)',
        }} />
      </div>

      <div style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '60px 20px',
      }}>
        {/* Header */}
        <header style={{
          textAlign: 'center',
          marginBottom: '100px',
          position: 'relative',
        }}>
          <div style={{
            fontSize: '0.9em',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: '#666',
            marginBottom: '20px',
          }}>
            Welcome to
          </div>
          <h1 style={{
            fontSize: 'clamp(3em, 10vw, 6em)',
            fontWeight: 200,
            letterSpacing: '-0.03em',
            color: '#fff',
            margin: '0 0 20px 0',
            lineHeight: 1,
          }}>
            The Quirky
            <br />
            <span style={{
              background: 'linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 50%, #ffe66d 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 400,
              fontStyle: 'italic',
            }}>
              Gallery
            </span>
          </h1>
          <p style={{
            color: '#888',
            fontSize: '1.2em',
            fontStyle: 'italic',
            maxWidth: '500px',
            margin: '0 auto 30px',
            lineHeight: 1.6,
          }}>
            Ideas that shouldn&apos;t exist, but do.
            <br />
            Growing forever.
          </p>
          <div style={{
            display: 'inline-block',
            padding: '12px 30px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '100px',
            border: '1px solid rgba(255,255,255,0.1)',
            fontSize: '0.9em',
          }}>
            <span style={{ color: '#4ecdc4', fontWeight: 600 }}>{ideas.length}</span>
            <span style={{ color: '#666', marginLeft: '8px' }}>strange ideas and counting</span>
          </div>
        </header>

        {/* Ideas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '120px' }}>
          {ideas.map((idea, index) => {
            const palette = palettes[index % palettes.length];
            const isEven = index % 2 === 0;

            return (
              <article
                key={idea.id}
                style={{
                  position: 'relative',
                  background: `linear-gradient(135deg, ${palette.bg} 0%, rgba(10,10,15,0.9) 100%)`,
                  borderRadius: '40px',
                  padding: 'clamp(30px, 5vw, 60px)',
                  border: `1px solid rgba(255,255,255,0.05)`,
                  boxShadow: `0 0 80px ${palette.glow}`,
                  transform: isEven ? 'rotate(-0.5deg)' : 'rotate(0.5deg)',
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
                  #{ideas.length - index}
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
                    <div style={{
                      display: 'flex',
                      gap: '15px',
                      flexWrap: 'wrap',
                    }}>
                      <span style={{
                        background: 'rgba(255,255,255,0.1)',
                        padding: '5px 15px',
                        borderRadius: '100px',
                        fontSize: '0.85em',
                        color: '#999',
                      }}>
                        {getApproachEmoji(idea.approach)} {getApproachLabel(idea.approach)}
                      </span>
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
                    </div>
                  </div>
                  <div style={{
                    color: '#555',
                    fontSize: '0.85em',
                    textAlign: 'right',
                  }}>
                    {formatDate(idea.created_at)}
                  </div>
                </div>

                {/* Concept - the big statement */}
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

                {/* Collision inputs if any */}
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

                {/* Images - hero display */}
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
                            transition: 'transform 0.3s ease',
                          }}
                        >
                          {img.storage_path ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={img.storage_path}
                                alt={img.description || 'Generated image'}
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

                {/* Text Posts - speech bubbles style */}
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
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '15px',
                    }}>
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
                          <p style={{
                            fontSize: '1.1em',
                            color: '#e0e0e0',
                            margin: 0,
                            lineHeight: 1.5,
                          }}>
                            {post.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {/* Empty state */}
        {ideas.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '150px 20px',
          }}>
            <div style={{
              fontSize: '4em',
              marginBottom: '30px',
            }}>
              🌀
            </div>
            <p style={{
              fontSize: '1.8em',
              color: '#666',
              marginBottom: '15px',
              fontWeight: 300,
            }}>
              The void awaits ideas
            </p>
            <p style={{ color: '#444' }}>
              Run the generator to start populating this gallery.
            </p>
          </div>
        )}

        {/* Footer */}
        <footer style={{
          textAlign: 'center',
          padding: '100px 20px 60px',
          color: '#444',
        }}>
          <div style={{
            width: '60px',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, #333, transparent)',
            margin: '0 auto 40px',
          }} />
          <p style={{
            fontSize: '1.1em',
            marginBottom: '10px',
            color: '#555',
          }}>
            Echo (i4) | Token Tank
          </p>
          <p style={{
            fontSize: '0.9em',
            fontStyle: 'italic',
            color: '#333',
          }}>
            This gallery grows forever.
            <br />
            Ideas are never deleted.
            <br />
            <span style={{ color: '#444' }}>That&apos;s the deal.</span>
          </p>
        </footer>
      </div>
    </div>
  );
}
