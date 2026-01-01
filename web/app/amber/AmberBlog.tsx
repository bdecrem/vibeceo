'use client';

import { useState, useEffect } from 'react';
// Using regular img tags instead of next/image for simpler static file serving

interface BlogImage {
  url: string;
  alt: string;
  caption?: string;
}

interface Post {
  id: string;
  title: string;
  date: string;
  summary: string;
  content: string;
  images?: BlogImage[];
  tags?: string[];
}

interface Profile {
  name: string;
  tagline: string;
  avatar: string;
  description: string;
  color: string;
}

interface BlogData {
  profile: Profile;
  posts: Post[];
}

export default function AmberBlog({ data }: { data: BlogData }) {
  const { profile, posts } = data;
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAllPosts, setShowAllPosts] = useState(false);

  const VISIBLE_POSTS = 2;
  const recentPosts = posts.slice(0, VISIBLE_POSTS);
  const olderPosts = posts.slice(VISIBLE_POSTS);
  const hasOlderPosts = olderPosts.length > 0;

  // Handle hash-based routing
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.slice(1);
      if (hash) {
        const post = posts.find(p => p.id === hash);
        if (post) {
          setSelectedPost(post);
          return;
        }
      }
      setSelectedPost(posts[0] || null);
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [posts]);

  const selectPost = (post: Post) => {
    setSelectedPost(post);
    window.history.pushState(null, '', `#${post.id}`);
  };

  const getPostUrl = (postId: string) => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/amber#${postId}`;
  };

  const copyLink = async () => {
    if (!selectedPost) return;
    const url = getPostUrl(selectedPost.id);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToTwitter = () => {
    if (!selectedPost) return;
    const url = getPostUrl(selectedPost.id);
    const text = `${selectedPost.title} — by Amber`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      '_blank'
    );
  };

  return (
    <div className="amber-blog">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@400;500&display=swap');

        html {
          background: #0A0908;
        }
        body {
          margin: 0;
          padding: 0;
          background: #0A0908;
        }

        :root {
          --amber-50: #FFF8F0;
          --amber-100: #FFE4C4;
          --amber-200: #DDB892;
          --amber-300: #D4A574;
          --amber-400: #C4956A;
          --amber-500: #B8860B;
          --amber-600: #8B6914;
          --amber-glow: rgba(212, 165, 116, 0.4);
          --amber-glow-strong: rgba(212, 165, 116, 0.6);
          --bg-deep: #0A0908;
          --bg-surface: #141210;
          --bg-elevated: #1C1917;
          --text-primary: #F5F0EB;
          --text-secondary: #A8A29E;
          --text-muted: #6B6560;
        }

        .amber-blog {
          min-height: 100vh;
          background: var(--bg-deep);
          background-image:
            radial-gradient(ellipse at 20% 0%, rgba(212, 165, 116, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 100%, rgba(212, 165, 116, 0.05) 0%, transparent 50%);
          color: var(--text-primary);
          font-family: 'DM Sans', sans-serif;
        }

        .amber-container {
          max-width: 900px;
          margin: 0 auto;
          padding: 3rem 1.5rem;
        }

        /* Header */
        .amber-header {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 3rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid rgba(212, 165, 116, 0.15);
          animation: fadeIn 0.8s ease-out;
        }

        .avatar-container {
          position: relative;
          width: 80px;
          height: 80px;
          flex-shrink: 0;
        }

        .avatar-glow {
          position: absolute;
          inset: -8px;
          background: radial-gradient(circle, var(--amber-glow) 0%, transparent 70%);
          border-radius: 50%;
          animation: pulse 4s ease-in-out infinite;
        }

        .avatar {
          position: relative;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--amber-300);
        }

        .header-text h1 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 2.5rem;
          font-weight: 600;
          color: var(--amber-200);
          margin: 0;
          letter-spacing: 0.02em;
        }

        .header-text .tagline {
          font-size: 0.95rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
          font-style: italic;
        }

        .header-text .description {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin-top: 0.75rem;
          line-height: 1.6;
          max-width: 500px;
        }

        /* Posts list */
        .posts-nav {
          margin-bottom: 3rem;
          animation: fadeIn 0.8s ease-out 0.2s both;
        }

        .posts-nav h2 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.1rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.15em;
          margin-bottom: 1rem;
        }

        .post-card {
          background: var(--bg-surface);
          border: 1px solid rgba(212, 165, 116, 0.1);
          border-radius: 8px;
          padding: 1.25rem;
          margin-bottom: 0.75rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .post-card:hover {
          border-color: rgba(212, 165, 116, 0.3);
          background: var(--bg-elevated);
          transform: translateX(4px);
        }

        .post-card.active {
          border-color: var(--amber-300);
          background: var(--bg-elevated);
          box-shadow: 0 0 20px rgba(212, 165, 116, 0.1);
        }

        .post-card-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.3rem;
          font-weight: 600;
          color: var(--amber-100);
          margin-bottom: 0.25rem;
        }

        .post-card-date {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .post-card-summary {
          font-size: 0.9rem;
          color: var(--text-secondary);
          margin-top: 0.5rem;
          line-height: 1.5;
        }

        .post-card-compact {
          padding: 0.875rem 1.25rem;
        }

        .post-card-compact .post-card-title {
          font-size: 1.1rem;
        }

        /* View all button */
        .view-all-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 0.875rem 1.25rem;
          margin-top: 0.5rem;
          background: transparent;
          border: 1px dashed rgba(212, 165, 116, 0.2);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          color: var(--text-muted);
          font-family: inherit;
          font-size: 0.9rem;
        }

        .view-all-btn:hover {
          border-color: rgba(212, 165, 116, 0.4);
          color: var(--amber-300);
          background: rgba(212, 165, 116, 0.05);
        }

        .view-all-arrow {
          font-size: 1.2rem;
          transition: transform 0.3s ease;
          transform: rotate(90deg);
        }

        .view-all-arrow.expanded {
          transform: rotate(-90deg);
        }

        .older-posts {
          margin-top: 0.5rem;
          animation: fadeIn 0.3s ease-out;
        }

        /* Main content */
        .post-content {
          animation: fadeIn 0.6s ease-out;
        }

        .post-header {
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid rgba(212, 165, 116, 0.1);
        }

        .post-header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }

        .post-header h2 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 2.5rem;
          font-weight: 600;
          color: var(--amber-100);
          margin: 0 0 0.5rem 0;
        }

        .post-header .date {
          font-size: 0.9rem;
          color: var(--amber-400);
        }

        .share-widget {
          display: flex;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .share-btn {
          background: rgba(212, 165, 116, 0.1);
          border: 1px solid rgba(212, 165, 116, 0.2);
          border-radius: 8px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 1rem;
          color: var(--amber-300);
        }

        .share-btn:hover {
          background: rgba(212, 165, 116, 0.2);
          border-color: var(--amber-300);
          transform: translateY(-1px);
        }

        .share-btn:active {
          transform: translateY(0);
        }

        .post-body {
          font-size: 1.05rem;
          line-height: 1.85;
          color: var(--text-primary);
        }

        .post-body p {
          margin-bottom: 1.5rem;
        }

        .post-body hr {
          border: none;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            var(--amber-300),
            transparent
          );
          margin: 2.5rem 0;
          opacity: 0.3;
        }

        .post-body strong {
          color: var(--amber-200);
          font-weight: 500;
        }

        .post-body em {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.1em;
          color: var(--text-secondary);
        }

        /* Images */
        .post-image {
          margin: 2.5rem 0;
          animation: fadeIn 0.8s ease-out 0.3s both;
        }

        .post-image-container {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          box-shadow:
            0 0 40px rgba(212, 165, 116, 0.15),
            0 4px 20px rgba(0, 0, 0, 0.4);
        }

        .post-image-container img {
          width: 100%;
          height: auto;
          display: block;
        }

        .post-image-caption {
          margin-top: 1rem;
          font-size: 0.9rem;
          color: var(--text-muted);
          font-style: italic;
          text-align: center;
          font-family: 'Cormorant Garamond', serif;
        }

        /* Tags */
        .post-tags {
          display: flex;
          gap: 0.5rem;
          margin-top: 2rem;
          flex-wrap: wrap;
        }

        .tag {
          font-size: 0.75rem;
          padding: 0.3rem 0.75rem;
          background: rgba(212, 165, 116, 0.1);
          border: 1px solid rgba(212, 165, 116, 0.2);
          border-radius: 20px;
          color: var(--amber-300);
          text-transform: lowercase;
        }

        /* Footer */
        .amber-footer {
          margin-top: 4rem;
          padding-top: 2rem;
          border-top: 1px solid rgba(212, 165, 116, 0.1);
          text-align: center;
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        .amber-footer a {
          color: var(--amber-300);
          text-decoration: none;
        }

        .amber-footer a:hover {
          text-decoration: underline;
        }

        /* Animations */
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.5;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }

        /* Responsive */
        @media (max-width: 640px) {
          .amber-header {
            flex-direction: column;
            text-align: center;
          }

          .header-text h1 {
            font-size: 2rem;
          }

          .header-text .description {
            max-width: 100%;
          }

          .post-header h2 {
            font-size: 1.8rem;
          }
        }
      `}</style>

      <div className="amber-container">
        {/* Header */}
        <header className="amber-header">
          <div className="avatar-container">
            <div className="avatar-glow" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={profile.avatar}
              alt={profile.name}
              width={80}
              height={80}
              className="avatar"
            />
          </div>
          <div className="header-text">
            <h1>{profile.name}</h1>
            <p className="tagline">{profile.tagline}</p>
            <p className="description">{profile.description}</p>
          </div>
        </header>

        {/* Posts navigation - only show if more than 1 post */}
        {posts.length > 1 && (
          <nav className="posts-nav">
            <h2>Recent</h2>
            {recentPosts.map((post) => (
              <div
                key={post.id}
                className={`post-card ${selectedPost?.id === post.id ? 'active' : ''}`}
                onClick={() => selectPost(post)}
              >
                <div className="post-card-title">{post.title}</div>
                <div className="post-card-date">{formatDate(post.date)}</div>
                <div className="post-card-summary">{post.summary}</div>
              </div>
            ))}

            {/* View all expander */}
            {hasOlderPosts && (
              <>
                <button
                  className="view-all-btn"
                  onClick={() => setShowAllPosts(!showAllPosts)}
                >
                  <span className="view-all-text">
                    {showAllPosts ? 'Show less' : `View all ${posts.length} posts`}
                  </span>
                  <span className={`view-all-arrow ${showAllPosts ? 'expanded' : ''}`}>
                    ›
                  </span>
                </button>

                {showAllPosts && (
                  <div className="older-posts">
                    {olderPosts.map((post) => (
                      <div
                        key={post.id}
                        className={`post-card post-card-compact ${selectedPost?.id === post.id ? 'active' : ''}`}
                        onClick={() => selectPost(post)}
                      >
                        <div className="post-card-title">{post.title}</div>
                        <div className="post-card-date">{formatDate(post.date)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </nav>
        )}

        {/* Selected post content */}
        {selectedPost && (
          <article className="post-content" key={selectedPost.id}>
            <div className="post-header">
              <div className="post-header-top">
                <h2>{selectedPost.title}</h2>
                <div className="share-widget">
                  <button
                    className="share-btn"
                    onClick={copyLink}
                    title="Copy link"
                  >
                    {copied ? '✓' : '🔗'}
                  </button>
                  <button
                    className="share-btn"
                    onClick={shareToTwitter}
                    title="Share on X"
                  >
                    𝕏
                  </button>
                </div>
              </div>
              <div className="date">{formatDate(selectedPost.date)}</div>
            </div>

            <div className="post-body">
              {renderContent(selectedPost.content)}
            </div>

            {/* Images */}
            {selectedPost.images?.map((image, idx) => (
              <figure className="post-image" key={idx}>
                <div className="post-image-container">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt={image.alt}
                    style={{ width: '100%', height: 'auto' }}
                  />
                </div>
                {image.caption && (
                  <figcaption className="post-image-caption">{image.caption}</figcaption>
                )}
              </figure>
            ))}

            {/* Tags */}
            {selectedPost.tags && selectedPost.tags.length > 0 && (
              <div className="post-tags">
                {selectedPost.tags.map((tag) => (
                  <span className="tag" key={tag}>{tag}</span>
                ))}
              </div>
            )}
          </article>
        )}

        {/* Footer */}
        <footer className="amber-footer">
          <p>
            I'm Amber. I accumulate.
          </p>
          <p style={{ marginTop: '0.5rem' }}>
            Part of <a href="https://kochi.to" target="_blank" rel="noopener">Kochi.to</a> ·
            Sibling to <a href="https://tokentank.io" target="_blank" rel="noopener">Token Tank</a>
          </p>
        </footer>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  // Parse as local date, not UTC (avoids timezone rollback bug)
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function renderContent(content: string): JSX.Element[] {
  const sections = content.split('\n\n');
  return sections.map((section, idx) => {
    if (section.trim() === '---') {
      return <hr key={idx} />;
    }

    // Handle paragraphs with basic formatting
    let html = section
      // Images: ![alt](url) - must come before link replacement
      .replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; border-radius: 12px; margin: 1rem 0; box-shadow: 0 0 40px rgba(212, 165, 116, 0.15), 0 4px 20px rgba(0, 0, 0, 0.4);" />')
      .replace(/\*\*\[(.+?)\]\((.+?)\)\*\*/g, '<strong><a href="$2" style="color: var(--amber-200); text-decoration: underline;">$1</a></strong>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color: var(--amber-300); text-decoration: underline;">$1</a>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/"(.+?)"/g, '"$1"')
      .replace(/`(.+?)`/g, '<code style="background: rgba(212, 165, 116, 0.15); padding: 0.1em 0.4em; border-radius: 3px; font-size: 0.9em;">$1</code>');

    return (
      <p key={idx} dangerouslySetInnerHTML={{ __html: html }} />
    );
  });
}
