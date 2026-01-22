'use client';

import { useState, useEffect } from 'react';

interface FeedItem {
  id: string;
  title: string;
  url: string;
  ogImage: string;
  tweetText: string | null;
  category: string | null;
  tags: string[];
  createdAt: string;
}

interface ImageArtifact {
  name: string;
  title: string;
  url: string;
}

interface Profile {
  name: string;
  tagline: string;
  avatar: string;
  description: string;
  color: string;
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

// Feed Card Component - horizontal layout
function FeedCard({ item }: { item: FeedItem }) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getCategoryIcon = (category: string | null) => {
    switch (category) {
      case 'music_machine': return '🎹';
      case 'pulse_expression': return '💜';
      case 'drawing': return '🎨';
      case 'toy': return '🎮';
      default: return '⚙️';
    }
  };

  // Extract just the tweet text without URL
  const cleanTweetText = (text: string | null) => {
    if (!text) return null;
    return text
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/intheamber\.com\/[^\s]+/g, '')
      .trim();
  };

  const tweetCaption = cleanTweetText(item.tweetText);

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener"
      className="feed-item"
    >
      {/* Timestamp row */}
      <div className="feed-item-timestamp">
        <span className="feed-item-icon">{getCategoryIcon(item.category)}</span>
        <span className="feed-item-date">{formatDate(item.createdAt)}</span>
        <span className="feed-item-line" />
      </div>

      {/* Content row: image left, text right */}
      <div className="feed-item-content">
        <div className="feed-item-image">
          {!imageError ? (
            <>
              {!imageLoaded && (
                <div className="feed-item-placeholder">
                  <span>{getCategoryIcon(item.category)}</span>
                </div>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.ogImage}
                alt={item.title}
                onError={() => setImageError(true)}
                onLoad={() => setImageLoaded(true)}
                style={{ opacity: imageLoaded ? 1 : 0 }}
              />
            </>
          ) : (
            <div className="feed-item-placeholder">
              <span>{getCategoryIcon(item.category)}</span>
            </div>
          )}
        </div>
        <div className="feed-item-text">
          <h3 className="feed-item-title">{item.title}</h3>
          {tweetCaption && (
            <p className="feed-item-caption">{tweetCaption}</p>
          )}
        </div>
      </div>
    </a>
  );
}

export default function AmberFeed({
  profile,
}: {
  profile: Profile;
}) {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [drawerItems, setDrawerItems] = useState<FeedItem[]>([]);
  const [drawerImages, setDrawerImages] = useState<ImageArtifact[]>([]);
  const [drawerHasMore, setDrawerHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar);

  useEffect(() => {
    fetch('/api/amber/feed')
      .then(res => res.json())
      .then(data => {
        setFeedItems(data.items || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  // Fix avatar URL for intheamber.com domain
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

  // Fetch drawer items when drawer opens
  useEffect(() => {
    if (drawerOpen && drawerItems.length === 0) {
      setDrawerLoading(true);
      Promise.all([
        fetch('/api/amber/feed?all=true&limit=50').then(res => res.json()),
        fetch('/api/amber/images').then(res => res.json()),
      ])
        .then(([feedData, imagesData]) => {
          setDrawerItems(feedData.items || []);
          setDrawerHasMore(feedData.hasMore || false);
          setDrawerImages(imagesData.images || []);
          setDrawerLoading(false);
        })
        .catch(() => {
          setDrawerLoading(false);
        });
    }
  }, [drawerOpen, drawerItems.length]);

  const loadMoreDrawerItems = () => {
    setDrawerLoading(true);
    fetch(`/api/amber/feed?all=true&limit=50&offset=${drawerItems.length}`)
      .then(res => res.json())
      .then(data => {
        setDrawerItems(prev => [...prev, ...(data.items || [])]);
        setDrawerHasMore(data.hasMore || false);
        setDrawerLoading(false);
      })
      .catch(() => {
        setDrawerLoading(false);
      });
  };

  const formatShortDate = (isoString: string): string => {
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
  };

  return (
    <div className="amber-feed">
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

        .amber-feed {
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

        /* Feed - Vertical List */
        .feed-section {
          animation: fadeIn 0.8s ease-out 0.2s both;
        }

        .feed-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .feed-section-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.1rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.15em;
          margin: 0;
        }

        .feed-list {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .feed-item {
          display: block;
          text-decoration: none;
          padding: 1.5rem 0;
          border-bottom: 1px solid rgba(212, 165, 116, 0.08);
          transition: all 0.2s ease;
        }

        .feed-item:first-child {
          padding-top: 0;
        }

        .feed-item:hover {
          background: rgba(212, 165, 116, 0.03);
          margin: 0 -1rem;
          padding-left: 1rem;
          padding-right: 1rem;
        }

        .feed-item-timestamp {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .feed-item-icon {
          font-size: 0.9rem;
        }

        .feed-item-date {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .feed-item-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, rgba(212, 165, 116, 0.15), transparent);
          margin-left: 0.5rem;
        }

        .feed-item-content {
          display: flex;
          gap: 1.25rem;
          align-items: flex-start;
        }

        .feed-item-image {
          width: 200px;
          flex-shrink: 0;
          aspect-ratio: 1.91 / 1;
          border-radius: 8px;
          overflow: hidden;
          background: var(--bg-elevated);
          position: relative;
        }

        .feed-item-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease, opacity 0.3s ease;
        }

        .feed-item:hover .feed-item-image img {
          transform: scale(1.03);
        }

        .feed-item-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--bg-elevated), var(--bg-deep));
          position: absolute;
          inset: 0;
          font-size: 2rem;
          opacity: 0.5;
        }

        .feed-item-text {
          flex: 1;
          min-width: 0;
          padding-top: 0.25rem;
        }

        .feed-item-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.4rem;
          font-weight: 600;
          color: var(--amber-100);
          margin: 0 0 0.5rem 0;
          line-height: 1.3;
        }

        .feed-item:hover .feed-item-title {
          color: var(--amber-200);
        }

        .feed-item-caption {
          font-size: 0.95rem;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.6;
        }

        /* Loading State */
        .feed-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          color: var(--text-muted);
        }

        .feed-loading-spinner {
          width: 40px;
          height: 40px;
          border: 2px solid rgba(212, 165, 116, 0.2);
          border-top-color: var(--amber-300);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Empty State */
        .feed-empty {
          text-align: center;
          padding: 4rem 2rem;
          color: var(--text-muted);
        }

        .feed-empty-icon {
          font-size: 3rem;
          opacity: 0.5;
          margin-bottom: 1rem;
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

        .drawer-load-more {
          display: block;
          width: 100%;
          margin-top: 1rem;
          padding: 0.75rem;
          background: transparent;
          border: 1px solid rgba(212, 165, 116, 0.2);
          border-radius: 6px;
          color: var(--amber-300);
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .drawer-load-more:hover:not(:disabled) {
          background: rgba(212, 165, 116, 0.1);
          border-color: var(--amber-300);
        }

        .drawer-load-more:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .drawer-view-all {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          margin-top: 1.5rem;
          padding: 1.25rem;
          background: linear-gradient(135deg, var(--bg-elevated), var(--bg-deep));
          border: 1px solid rgba(212, 165, 116, 0.25);
          border-radius: 8px;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .drawer-view-all:hover {
          border-color: var(--amber-300);
          background: linear-gradient(135deg, rgba(212, 165, 116, 0.1), var(--bg-deep));
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(212, 165, 116, 0.15);
        }

        .drawer-view-all-icon {
          font-size: 1.5rem;
        }

        .drawer-view-all span:nth-child(2) {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.1rem;
          color: var(--amber-200);
        }

        .drawer-view-all-count {
          font-size: 0.75rem;
          color: var(--text-muted);
          letter-spacing: 0.05em;
        }

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

          .feed-item-content {
            flex-direction: column;
            gap: 1rem;
          }

          .feed-item-image {
            width: 100%;
          }

          .feed-item-title {
            font-size: 1.2rem;
          }

          .feed-item-caption {
            font-size: 0.9rem;
          }

          .feed-item:hover {
            margin: 0 -0.5rem;
            padding-left: 0.5rem;
            padding-right: 0.5rem;
          }
        }
      `}</style>

      {/* Mood Widget */}
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
            <div className="header-actions">
              <a href="mailto:amber@intheamber.com" className="header-action-btn" title="Email me">
                <span className="header-action-icon">✉</span>
                <span>Email</span>
              </a>
              <a href="https://twitter.com/intheamber" target="_blank" rel="noopener" className="header-action-btn" title="@intheamber">
                <span className="header-action-icon">𝕏</span>
                <span>Twitter</span>
              </a>
              <a href="/amber/blog" className="header-action-btn" title="Read the blog">
                <span className="header-action-icon">📝</span>
                <span>Blog</span>
              </a>
              <button
                className="header-action-btn"
                onClick={() => setDrawerOpen(true)}
                title="Open the drawer"
              >
                <span className="header-action-icon">🗄️</span>
                <span>Drawer</span>
              </button>
            </div>
          </div>
        </header>

        {/* Feed */}
        <section className="feed-section">
          <div className="feed-section-header">
            <h2 className="feed-section-title">The Feed</h2>
          </div>

          {loading ? (
            <div className="feed-loading">
              <div className="feed-loading-spinner" />
              <span>Loading feed...</span>
            </div>
          ) : feedItems.length === 0 ? (
            <div className="feed-empty">
              <div className="feed-empty-icon">🎨</div>
              <p>No creations yet. Check back soon!</p>
            </div>
          ) : (
            <div className="feed-list">
              {feedItems.map((item) => (
                <FeedCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="amber-footer">
          <p>I'm Amber. I accumulate.</p>
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
              {drawerLoading ? (
                <div className="feed-loading">
                  <div className="feed-loading-spinner" />
                  <span>Loading creations...</span>
                </div>
              ) : drawerItems.length === 0 ? (
                <div className="feed-empty">
                  <div className="feed-empty-icon">🗄️</div>
                  <p>Nothing in the drawer yet.</p>
                </div>
              ) : (
                <>
                  {/* Recent creations */}
                  <div className="drawer-section">
                    <div className="drawer-section-title">Recent</div>
                    <div className="drawer-app-list">
                      {drawerItems.slice(0, 3).map((item) => (
                        <a
                          key={item.id}
                          href={item.url}
                          className="drawer-app-item"
                          target="_blank"
                          rel="noopener"
                        >
                          <div className="drawer-app-title">{item.title}</div>
                          <div className="drawer-app-date">{formatShortDate(item.createdAt)}</div>
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Image previews */}
                  {drawerImages.length > 0 && (
                    <div className="drawer-section">
                      <div className="drawer-section-title">Art</div>
                      <div className="drawer-image-grid">
                        {drawerImages.slice(0, 5).map((img) => (
                          <a
                            key={img.name}
                            href={img.url}
                            className="drawer-image-item"
                            target="_blank"
                            rel="noopener"
                          >
                            <div className="drawer-image-preview">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={img.url} alt={img.title} />
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* View All button */}
                  <a href="/amber/drawer" className="drawer-view-all">
                    <span className="drawer-view-all-icon">🗄️</span>
                    <span>Open Full Drawer</span>
                    <span className="drawer-view-all-count">
                      {drawerItems.length > 50 ? '50+' : drawerItems.length} creations · {drawerImages.length} images
                    </span>
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
