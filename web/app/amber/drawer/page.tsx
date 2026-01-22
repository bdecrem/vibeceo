'use client';

import { useState, useEffect } from 'react';

interface FeedItem {
  id: string;
  title: string;
  url: string;
  createdAt: string;
}

interface ImageArtifact {
  name: string;
  title: string;
  url: string;
}

export default function DrawerPage() {
  const [creations, setCreations] = useState<FeedItem[]>([]);
  const [images, setImages] = useState<ImageArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/amber/feed?all=true&limit=50').then(res => res.json()),
      fetch('/api/amber/images').then(res => res.json()),
    ])
      .then(([feedData, imagesData]) => {
        setCreations(feedData.items || []);
        setHasMore(feedData.hasMore || false);
        setImages(imagesData.images || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const loadMore = () => {
    setLoadingMore(true);
    fetch(`/api/amber/feed?all=true&limit=50&offset=${creations.length}`)
      .then(res => res.json())
      .then(data => {
        setCreations(prev => [...prev, ...(data.items || [])]);
        setHasMore(data.hasMore || false);
        setLoadingMore(false);
      })
      .catch(() => setLoadingMore(false));
  };

  const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="drawer-page">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@400;500&display=swap');

        :root {
          --amber-50: #FFF8F0;
          --amber-100: #FFE4C4;
          --amber-200: #DDB892;
          --amber-300: #D4A574;
          --amber-400: #C4956A;
          --amber-500: #B8860B;
          --bg-deep: #0A0908;
          --bg-surface: #141210;
          --bg-elevated: #1C1917;
          --text-primary: #F5F0EB;
          --text-secondary: #A8A29E;
          --text-muted: #6B6560;
        }

        html, body {
          margin: 0;
          padding: 0;
          background: var(--bg-deep);
        }

        .drawer-page {
          min-height: 100vh;
          background: var(--bg-deep);
          color: var(--text-primary);
          font-family: 'DM Sans', sans-serif;
        }

        .drawer-header {
          padding: 2rem 2rem 1.5rem;
          border-bottom: 1px solid rgba(212, 165, 116, 0.1);
        }

        .drawer-header-inner {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .drawer-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 2rem;
          font-weight: 600;
          color: var(--amber-200);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .drawer-back {
          color: var(--text-muted);
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.2s;
        }

        .drawer-back:hover {
          color: var(--amber-300);
        }

        .drawer-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 3rem;
        }

        /* Creations column */
        .creations-column {
          min-width: 0;
        }

        .column-title {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: var(--text-muted);
          margin-bottom: 1.5rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid rgba(212, 165, 116, 0.1);
        }

        .creations-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .creation-item {
          display: block;
          padding: 1rem 1.25rem;
          background: var(--bg-surface);
          border: 1px solid rgba(212, 165, 116, 0.08);
          border-radius: 8px;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .creation-item:hover {
          border-color: rgba(212, 165, 116, 0.25);
          background: var(--bg-elevated);
          transform: translateX(4px);
        }

        .creation-title {
          font-size: 1rem;
          color: var(--amber-100);
          margin-bottom: 0.25rem;
          line-height: 1.4;
        }

        .creation-item:hover .creation-title {
          color: var(--amber-200);
        }

        .creation-date {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .load-more {
          display: block;
          width: 100%;
          margin-top: 1.5rem;
          padding: 1rem;
          background: transparent;
          border: 1px dashed rgba(212, 165, 116, 0.2);
          border-radius: 8px;
          color: var(--amber-300);
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .load-more:hover:not(:disabled) {
          background: rgba(212, 165, 116, 0.05);
          border-style: solid;
        }

        .load-more:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Images column */
        .images-column {
          position: sticky;
          top: 2rem;
          align-self: start;
        }

        .images-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .image-item {
          display: block;
          background: var(--bg-surface);
          border: 1px solid rgba(212, 165, 116, 0.08);
          border-radius: 8px;
          overflow: hidden;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .image-item:hover {
          border-color: rgba(212, 165, 116, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }

        .image-preview {
          aspect-ratio: 1;
          overflow: hidden;
        }

        .image-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .image-item:hover .image-preview img {
          transform: scale(1.05);
        }

        .image-info {
          padding: 0.6rem 0.75rem;
        }

        .image-title {
          font-size: 0.75rem;
          color: var(--amber-100);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Loading state */
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem;
          color: var(--text-muted);
        }

        .loading-spinner {
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

        /* Responsive */
        @media (max-width: 1024px) {
          .drawer-content {
            grid-template-columns: 1fr;
            gap: 2rem;
          }

          .images-column {
            position: static;
          }

          .images-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 640px) {
          .drawer-content {
            padding: 1.5rem 1rem;
          }

          .images-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>

      <header className="drawer-header">
        <div className="drawer-header-inner">
          <h1 className="drawer-title">
            <span>🗄️</span>
            The Drawer
          </h1>
          <a href="/amber" className="drawer-back">← Back to Feed</a>
        </div>
      </header>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          <span>Opening drawer...</span>
        </div>
      ) : (
        <div className="drawer-content">
          <div className="creations-column">
            <div className="column-title">
              Creations ({creations.length}{hasMore ? '+' : ''})
            </div>
            <div className="creations-list">
              {creations.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  className="creation-item"
                  target="_blank"
                  rel="noopener"
                >
                  <div className="creation-title">{item.title}</div>
                  <div className="creation-date">{formatDate(item.createdAt)}</div>
                </a>
              ))}
            </div>
            {hasMore && (
              <button
                className="load-more"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading...' : 'Load more creations'}
              </button>
            )}
          </div>

          <div className="images-column">
            <div className="column-title">
              Art ({images.length})
            </div>
            <div className="images-grid">
              {images.map((img) => (
                <a
                  key={img.name}
                  href={img.url}
                  className="image-item"
                  target="_blank"
                  rel="noopener"
                >
                  <div className="image-preview">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.title} />
                  </div>
                  <div className="image-info">
                    <div className="image-title" title={img.title}>{img.title}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
