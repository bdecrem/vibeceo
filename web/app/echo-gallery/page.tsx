import { createClient } from '@supabase/supabase-js';
import { Metadata } from 'next';
import GalleryViewer from './GalleryViewer';

export const metadata: Metadata = {
  title: 'The Quirky Gallery | Ideas That Shouldn\'t Exist',
  description: 'Strange and delightful ideas, generated forever. An infinite museum of the beautifully weird.',
  openGraph: {
    title: 'The Quirky Gallery',
    description: 'Strange and delightful ideas, generated forever. 154 concepts. 770 images.',
    images: [
      {
        url: 'https://webtoys.ai/og-quirky-gallery.png',
        width: 1200,
        height: 630,
        alt: 'The Quirky Gallery - An infinite idea machine by Echo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Quirky Gallery',
    description: 'An infinite idea machine. Weird concepts. Weirder images.',
    images: ['https://webtoys.ai/og-quirky-gallery.png'],
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
  text_posts?: TextPost[];
  images?: QuirkyImage[];
}

async function getIdeas(): Promise<QuirkyIdea[]> {
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  // Fetch all data in parallel (3 queries instead of 267)
  const [ideasResult, postsResult, imagesResult] = await Promise.all([
    supabase.from('echo_quirky_ideas').select('*').order('created_at', { ascending: false }),
    supabase.from('echo_quirky_posts').select('*').order('post_order', { ascending: true }),
    supabase.from('echo_quirky_images').select('*').order('image_order', { ascending: true }),
  ]);

  if (ideasResult.error || !ideasResult.data) {
    console.error('Failed to fetch ideas:', ideasResult.error);
    return [];
  }

  const ideas = ideasResult.data;
  const posts = postsResult.data || [];
  const images = imagesResult.data || [];

  // Group posts and images by idea_id
  const postsByIdea = new Map<string, TextPost[]>();
  const imagesByIdea = new Map<string, QuirkyImage[]>();

  for (const post of posts) {
    const list = postsByIdea.get(post.idea_id) || [];
    list.push(post);
    postsByIdea.set(post.idea_id, list);
  }

  for (const img of images) {
    const list = imagesByIdea.get(img.idea_id) || [];
    list.push(img);
    imagesByIdea.set(img.idea_id, list);
  }

  // Combine
  return ideas.map(idea => ({
    ...idea,
    text_posts: postsByIdea.get(idea.id) || [],
    images: imagesByIdea.get(idea.id) || [],
  }));
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
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '60px 20px',
      }}>
        {/* Header */}
        <header style={{
          textAlign: 'center',
          marginBottom: '80px',
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
            fontSize: 'clamp(2.5em, 8vw, 5em)',
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
            fontSize: '1.1em',
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

        {/* Gallery Viewer */}
        <GalleryViewer ideas={ideas} />

        {/* Footer */}
        <footer style={{
          textAlign: 'center',
          padding: '60px 20px',
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
