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

interface Artifact {
  name: string;
  title: string;
  type: 'app' | 'image';
  url: string;
  modifiedAt: string;
}

// Mood Widget Component
function MoodWidget() {
  const [mood, setMood] = useState<{
    energy: number;
    valence: number;
    quadrant: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/amber/mood')
      .then(res => res.json())
      .then(data => {
        setMood({
          energy: Math.round(data.energy * 100),
          valence: Math.round(data.valence * 100),
          quadrant: data.quadrant || 'steady',
        });
      })
      .catch(() => {
        // Fallback
        setMood({ energy: 65, valence: 95, quadrant: 'animated' });
      });
  }, []);

  return (
    <a href="/amber/mood/" className="mood-widget" title="Amber's current mood">
      <div className="mood-header">
        <span className="mood-deco">◈</span>
        <span className="mood-title">PULSE</span>
        <span className="mood-deco">◈</span>
      </div>
      <div className="mood-gauges">
        <div className="mood-gauge-row">
          <span className="mood-gauge-label">E</span>
          <div className="mood-gauge-track">
            <div
              className="mood-gauge-fill energy"
              style={{ width: mood ? `${mood.energy}%` : '0%' }}
            />
          </div>
          <span className="mood-gauge-value">{mood?.energy ?? '--'}</span>
        </div>
        <div className="mood-gauge-row">
          <span className="mood-gauge-label">V</span>
          <div className="mood-gauge-track">
            <div
              className="mood-gauge-fill valence"
              style={{ width: mood ? `${mood.valence}%` : '0%' }}
            />
          </div>
          <span className="mood-gauge-value teal">{mood?.valence ?? '--'}</span>
        </div>
      </div>
      <div className="mood-quadrant">
        <span className="mood-quadrant-bracket">‹</span>
        <div className="mood-quadrant-dot" />
        <span className="mood-quadrant-text">{mood?.quadrant ?? '...'}</span>
        <span className="mood-quadrant-bracket">›</span>
      </div>
    </a>
  );
}

export default function AmberBlog({ data, artifacts = [] }: { data: BlogData; artifacts?: Artifact[] }) {
  const { profile, posts } = data;
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAllPosts, setShowAllPosts] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar);

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

  // Fix avatar URL for intheamber.com domain (middleware rewrites /foo to /amber/foo)
  useEffect(() => {
    const host = window.location.host;
    if (host.includes('intheamber.com') && profile.avatar.startsWith('/amber/')) {
      setAvatarUrl(profile.avatar.replace('/amber/', '/'));
    }
  }, [profile.avatar]);

  // Handle escape key for drawer modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawerOpen) {
        setDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [drawerOpen]);

  const selectPost = (post: Post) => {
    setSelectedPost(post);
    window.history.pushState(null, '', `#${post.id}`);
  };

  const getPostUrl = (postId: string) => {
    if (typeof window === 'undefined') return '';
    const host = window.location.host;
    // On intheamber.com, middleware adds /amber prefix, so use just /#postId
    const isInTheAmber = host.includes('intheamber.com');
    const path = isInTheAmber ? '' : '/amber';
    return `${window.location.origin}${path}#${postId}`;
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

        .header-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.75rem;
          flex-wrap: wrap;
        }

        .header-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.75rem;
          background: rgba(212, 165, 116, 0.1);
          border: 1px solid rgba(212, 165, 116, 0.2);
          border-radius: 6px;
          color: var(--amber-300);
          text-decoration: none;
          font-size: 0.8rem;
          transition: all 0.2s ease;
          cursor: pointer;
          font-family: inherit;
        }

        .header-action-btn:hover {
          background: rgba(212, 165, 116, 0.2);
          border-color: var(--amber-300);
          transform: translateY(-1px);
        }

        .header-action-icon {
          font-size: 1rem;
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

        /* The Drawer button */
        .drawer-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 0.875rem 1.25rem;
          margin-top: 0.5rem;
          background: rgba(212, 165, 116, 0.03);
          border: 1px solid rgba(212, 165, 116, 0.15);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          color: var(--text-muted);
          font-family: inherit;
          font-size: 0.9rem;
        }

        .drawer-btn:hover {
          border-color: var(--amber-300);
          color: var(--amber-200);
          background: rgba(212, 165, 116, 0.08);
          box-shadow: 0 0 20px rgba(212, 165, 116, 0.1);
        }

        .drawer-btn-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .drawer-icon {
          display: flex;
          gap: 3px;
        }

        .drawer-dot {
          width: 6px;
          height: 6px;
          border-radius: 2px;
          background: var(--amber-400);
          opacity: 0.6;
        }

        .drawer-btn:hover .drawer-dot {
          opacity: 1;
        }

        .drawer-label {
          font-weight: 500;
        }

        .drawer-count {
          opacity: 0.6;
          font-weight: 400;
        }

        /* Drawer Modal */
        .drawer-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(10, 9, 8, 0.9);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          animation: fadeIn 0.2s ease-out;
        }

        .drawer-modal {
          background: var(--bg-surface);
          border: 1px solid rgba(212, 165, 116, 0.2);
          border-radius: 12px;
          max-width: 800px;
          max-height: 80vh;
          width: 100%;
          overflow: hidden;
          box-shadow: 0 0 60px rgba(212, 165, 116, 0.15);
          animation: modalSlideIn 0.3s ease-out;
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .drawer-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid rgba(212, 165, 116, 0.1);
        }

        .drawer-modal-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--amber-200);
          margin: 0;
        }

        .drawer-modal-close {
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.25rem;
          line-height: 1;
          transition: color 0.2s ease;
        }

        .drawer-modal-close:hover {
          color: var(--amber-300);
        }

        .drawer-modal-content {
          padding: 1.5rem;
          overflow-y: auto;
          max-height: calc(80vh - 80px);
        }

        .drawer-section {
          margin-bottom: 2rem;
        }

        .drawer-section:last-child {
          margin-bottom: 0;
        }

        .drawer-section-title {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          margin-bottom: 0.75rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid rgba(212, 165, 116, 0.1);
        }

        /* App list - full width rows */
        .drawer-app-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .drawer-app-item {
          display: block;
          padding: 0.75rem 1rem;
          background: var(--bg-deep);
          border: 1px solid rgba(212, 165, 116, 0.1);
          border-radius: 6px;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .drawer-app-item:hover {
          border-color: rgba(212, 165, 116, 0.3);
          background: var(--bg-elevated);
          transform: translateX(4px);
        }

        .drawer-app-title {
          font-size: 0.9rem;
          color: var(--amber-100);
          margin-bottom: 0.2rem;
        }

        .drawer-app-date {
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        /* Image grid - thumbnails */
        .drawer-image-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 0.75rem;
        }

        .drawer-image-item {
          background: var(--bg-deep);
          border: 1px solid rgba(212, 165, 116, 0.1);
          border-radius: 6px;
          overflow: hidden;
          transition: all 0.2s ease;
          text-decoration: none;
          display: block;
        }

        .drawer-image-item:hover {
          border-color: rgba(212, 165, 116, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(212, 165, 116, 0.1);
        }

        .drawer-image-preview {
          aspect-ratio: 1;
          overflow: hidden;
        }

        .drawer-image-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .drawer-image-info {
          padding: 0.4rem 0.5rem;
        }

        .drawer-image-title {
          font-size: 0.7rem;
          color: var(--amber-100);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 0.15rem;
        }

        .drawer-image-date {
          font-size: 0.6rem;
          color: var(--text-muted);
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

        .footer-links {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          margin-top: 0.75rem;
          flex-wrap: wrap;
        }

        .footer-link {
          color: var(--text-muted);
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .footer-link:hover {
          color: var(--amber-300);
        }

        .footer-divider {
          color: rgba(212, 165, 116, 0.2);
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

        /* Mood Widget - Fixed top right */
        .mood-widget {
          position: fixed;
          top: 6rem;
          right: 1.5rem;
          z-index: 100;
          width: 140px;
          padding: 10px 14px 12px;
          background: linear-gradient(135deg, rgba(20, 18, 16, 0.97), rgba(10, 9, 8, 0.98));
          border: 1px solid rgba(212, 165, 116, 0.15);
          border-radius: 8px;
          text-decoration: none;
          font-family: 'Space Mono', 'SF Mono', monospace;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
        }

        .mood-widget::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 9px;
          background: radial-gradient(
            ellipse at 50% 0%,
            rgba(212, 165, 116, 0.1) 0%,
            transparent 70%
          );
          opacity: 1;
          pointer-events: none;
        }

        .mood-widget:hover {
          transform: translateY(-2px);
          border-color: rgba(212, 165, 116, 0.35);
          box-shadow: 0 8px 32px rgba(212, 165, 116, 0.12);
        }

        .mood-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(212, 165, 116, 0.1);
        }

        .mood-deco {
          font-size: 8px;
          color: rgba(212, 165, 116, 0.4);
        }

        .mood-title {
          font-size: 9px;
          letter-spacing: 0.2em;
          color: rgba(212, 165, 116, 0.6);
          text-transform: uppercase;
        }

        .mood-gauges {
          margin-bottom: 10px;
        }

        .mood-gauge-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }

        .mood-gauge-row:last-child {
          margin-bottom: 0;
        }

        .mood-gauge-label {
          font-size: 8px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #6B6560;
          width: 10px;
          flex-shrink: 0;
        }

        .mood-gauge-track {
          flex: 1;
          height: 3px;
          background: rgba(45, 45, 45, 0.6);
          border-radius: 2px;
          overflow: hidden;
          position: relative;
        }

        .mood-gauge-fill {
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          border-radius: 2px;
          transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .mood-gauge-fill.energy {
          background: linear-gradient(90deg, #B8860B, #FFD700);
          box-shadow: 0 0 8px rgba(255, 215, 0, 0.35);
        }

        .mood-gauge-fill.valence {
          background: linear-gradient(90deg, #2D9596, #40E0D0);
          box-shadow: 0 0 8px rgba(64, 224, 208, 0.35);
        }

        .mood-gauge-value {
          font-size: 9px;
          font-weight: 700;
          color: #F5C87A;
          width: 20px;
          text-align: right;
          flex-shrink: 0;
        }

        .mood-gauge-value.teal {
          color: #40E0D0;
        }

        .mood-quadrant {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
        }

        .mood-quadrant-bracket {
          font-size: 10px;
          color: rgba(212, 165, 116, 0.3);
        }

        .mood-quadrant-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #D4A574;
          box-shadow: 0 0 6px #FFD700;
          animation: moodBreathe 3s ease-in-out infinite;
        }

        @keyframes moodBreathe {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }

        .mood-quadrant-text {
          font-size: 9px;
          letter-spacing: 0.06em;
          text-transform: lowercase;
          color: #DDB892;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .mood-widget {
            top: 0.75rem;
            right: 0.75rem;
            width: 120px;
            padding: 8px 10px 10px;
          }

          .mood-header {
            margin-bottom: 8px;
            padding-bottom: 6px;
          }

          .mood-title {
            font-size: 8px;
          }

          .mood-deco {
            font-size: 7px;
          }

          .mood-gauge-value {
            font-size: 8px;
          }

          .mood-quadrant-text {
            font-size: 8px;
          }

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

      {/* Mood Widget - Fixed top right */}
      <MoodWidget />

      <div className="amber-container">
        {/* Header */}
        <header className="amber-header">
          <div className="avatar-container">
            <div className="avatar-glow" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl}
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
            <div className="header-actions">
              <a href="/amber" className="header-action-btn" title="Back to feed">
                <span className="header-action-icon">🎨</span>
                <span>Feed</span>
              </a>
              <button
                className="header-action-btn"
                onClick={() => setDrawerOpen(true)}
                title="Open the drawer"
              >
                <span className="header-action-icon">🗄️</span>
                <span>Drawer</span>
              </button>
              <a href="mailto:amber@intheamber.com" className="header-action-btn" title="Email me">
                <span className="header-action-icon">✉</span>
                <span>Email</span>
              </a>
              <a href="https://twitter.com/intheamber" target="_blank" rel="noopener" className="header-action-btn" title="@intheamber">
                <span className="header-action-icon">𝕏</span>
                <span>Twitter</span>
              </a>
            </div>
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

            {/* The Drawer button */}
            {artifacts.length > 0 && (
              <button
                className="drawer-btn"
                onClick={() => setDrawerOpen(true)}
              >
                <span className="drawer-btn-content">
                  <span className="drawer-icon">
                    <span className="drawer-dot" />
                    <span className="drawer-dot" />
                    <span className="drawer-dot" />
                    <span className="drawer-dot" />
                    <span className="drawer-dot" />
                  </span>
                  <span>
                    <span className="drawer-label">The Drawer</span>
                    <span className="drawer-count"> · {artifacts.length} things</span>
                  </span>
                </span>
                <span className="view-all-arrow">›</span>
              </button>
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
            Part of <a href="https://kochitolabs.com" target="_blank" rel="noopener">Kochito Labs</a>
          </p>
          <div className="footer-links">
            <a href="https://twitter.com/intheamber" target="_blank" rel="noopener" className="footer-link">@intheamber</a>
            <span className="footer-divider">·</span>
            <a href="https://kochi.to" target="_blank" rel="noopener" className="footer-link">kochi.to</a>
            <span className="footer-divider">·</span>
            <a href="https://tokentank.io" target="_blank" rel="noopener" className="footer-link">tokentank.io</a>
          </div>
        </footer>
      </div>

      {/* Drawer Modal */}
      {drawerOpen && (
        <div
          className="drawer-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDrawerOpen(false);
          }}
        >
          <div className="drawer-modal">
            <div className="drawer-modal-header">
              <h2 className="drawer-modal-title">The Drawer</h2>
              <button
                className="drawer-modal-close"
                onClick={() => setDrawerOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="drawer-modal-content">
              {/* Apps section */}
              {artifacts.filter(a => a.type === 'app').length > 0 && (
                <div className="drawer-section">
                  <div className="drawer-section-title">Pages & Apps</div>
                  <div className="drawer-app-list">
                    {artifacts
                      .filter(a => a.type === 'app')
                      .map((artifact) => (
                        <a
                          key={artifact.url}
                          href={artifact.url}
                          className="drawer-app-item"
                          target="_blank"
                          rel="noopener"
                        >
                          <div className="drawer-app-title">{artifact.title}</div>
                          <div className="drawer-app-date">{formatShortDate(artifact.modifiedAt)}</div>
                        </a>
                      ))}
                  </div>
                </div>
              )}

              {/* Images section */}
              {artifacts.filter(a => a.type === 'image').length > 0 && (
                <div className="drawer-section">
                  <div className="drawer-section-title">Images</div>
                  <div className="drawer-image-grid">
                    {artifacts
                      .filter(a => a.type === 'image')
                      .map((artifact) => (
                        <a
                          key={artifact.url}
                          href={artifact.url}
                          className="drawer-image-item"
                          target="_blank"
                          rel="noopener"
                        >
                          <div className="drawer-image-preview">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={artifact.url} alt={artifact.title} />
                          </div>
                          <div className="drawer-image-info">
                            <div className="drawer-image-title" title={artifact.title}>{artifact.title}</div>
                            <div className="drawer-image-date">{formatShortDate(artifact.modifiedAt)}</div>
                          </div>
                        </a>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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

function formatShortDate(isoString: string): string {
  const date = new Date(isoString);
  const dateStr = date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });
  const hour = date.getHours();
  const ampm = hour >= 12 ? 'pm' : 'am';
  const hour12 = hour % 12 || 12;
  return `${dateStr} - ${hour12}${ampm}`;
}

function renderContent(content: string): JSX.Element[] {
  const sections = content.split('\n\n');
  return sections.map((section, idx) => {
    const trimmed = section.trim();

    if (trimmed === '---') {
      return <hr key={idx} />;
    }

    // Handle h2 headers: ## Title
    if (trimmed.startsWith('## ')) {
      const headerText = trimmed.slice(3);
      return (
        <h3 key={idx} style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '1.5rem',
          fontWeight: 600,
          color: 'var(--amber-200)',
          marginTop: '2.5rem',
          marginBottom: '1rem',
          borderBottom: '1px solid rgba(212, 165, 116, 0.15)',
          paddingBottom: '0.5rem'
        }}>{headerText}</h3>
      );
    }

    // Handle h3 headers: ### Title
    if (trimmed.startsWith('### ')) {
      const headerText = trimmed.slice(4);
      return (
        <h4 key={idx} style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '1.25rem',
          fontWeight: 600,
          color: 'var(--amber-300)',
          marginTop: '2rem',
          marginBottom: '0.75rem'
        }}>{headerText}</h4>
      );
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
