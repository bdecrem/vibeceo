'use client';

import data from '../data.json';

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

function formatDate(dateStr: string): string {
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
    const trimmed = section.trim();

    if (trimmed === '---') {
      return <hr key={idx} className="post-divider" />;
    }

    if (trimmed.startsWith('## ')) {
      return (
        <h3 key={idx} className="post-h2">{trimmed.slice(3)}</h3>
      );
    }

    if (trimmed.startsWith('### ')) {
      return (
        <h4 key={idx} className="post-h3">{trimmed.slice(4)}</h4>
      );
    }

    let html = section
      .replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" class="post-inline-image" />')
      .replace(/\*\*\[(.+?)\]\((.+?)\)\*\*/g, '<strong><a href="$2" class="post-link">$1</a></strong>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="post-link">$1</a>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/"(.+?)"/g, '"$1"')
      .replace(/`(.+?)`/g, '<code class="post-code">$1</code>');

    return (
      <p key={idx} dangerouslySetInnerHTML={{ __html: html }} />
    );
  });
}

export default function AmberBlogPage() {
  const { posts } = data as { posts: Post[] };

  return (
    <div className="blog-page">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@400;500&display=swap');

        html, body {
          margin: 0;
          padding: 0;
          background: #0A0908;
        }

        :root {
          --amber-100: #FFE4C4;
          --amber-200: #DDB892;
          --amber-300: #D4A574;
          --amber-400: #C4956A;
          --bg-deep: #0A0908;
          --bg-surface: #141210;
          --text-primary: #F5F0EB;
          --text-secondary: #A8A29E;
          --text-muted: #6B6560;
        }

        .blog-page {
          min-height: 100vh;
          background: var(--bg-deep);
          background-image:
            radial-gradient(ellipse at 20% 0%, rgba(212, 165, 116, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 100%, rgba(212, 165, 116, 0.05) 0%, transparent 50%);
          color: var(--text-primary);
          font-family: 'DM Sans', sans-serif;
        }

        .blog-container {
          max-width: 700px;
          margin: 0 auto;
          padding: 3rem 1.5rem;
        }

        .blog-header {
          margin-bottom: 3rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid rgba(212, 165, 116, 0.15);
        }

        .blog-header h1 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 2.5rem;
          font-weight: 600;
          color: var(--amber-200);
          margin: 0 0 0.5rem 0;
        }

        .blog-header p {
          color: var(--text-muted);
          margin: 0;
        }

        .blog-header a {
          color: var(--amber-300);
          text-decoration: none;
        }

        .blog-header a:hover {
          text-decoration: underline;
        }

        .blog-list {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .blog-post {
          padding: 2.5rem 0;
          border-bottom: 1px solid rgba(212, 165, 116, 0.1);
        }

        .blog-post:first-child {
          padding-top: 0;
        }

        .post-date {
          font-size: 0.8rem;
          color: var(--amber-400);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }

        .post-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.8rem;
          font-weight: 600;
          color: var(--amber-100);
          margin: 0 0 1rem 0;
          line-height: 1.3;
        }

        .post-body {
          font-size: 1.05rem;
          line-height: 1.8;
          color: var(--text-primary);
        }

        .post-body p {
          margin: 0 0 1.25rem 0;
        }

        .post-body p:last-child {
          margin-bottom: 0;
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

        .post-divider {
          border: none;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--amber-300), transparent);
          margin: 2rem 0;
          opacity: 0.3;
        }

        .post-h2 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.4rem;
          font-weight: 600;
          color: var(--amber-200);
          margin: 2rem 0 1rem 0;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid rgba(212, 165, 116, 0.15);
        }

        .post-h3 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.2rem;
          font-weight: 600;
          color: var(--amber-300);
          margin: 1.5rem 0 0.75rem 0;
        }

        .post-link {
          color: var(--amber-300);
          text-decoration: underline;
        }

        .post-link:hover {
          color: var(--amber-200);
        }

        .post-code {
          background: rgba(212, 165, 116, 0.15);
          padding: 0.1em 0.4em;
          border-radius: 3px;
          font-size: 0.9em;
        }

        .post-inline-image {
          max-width: 100%;
          height: auto;
          border-radius: 12px;
          margin: 1rem 0;
          box-shadow: 0 0 40px rgba(212, 165, 116, 0.15), 0 4px 20px rgba(0, 0, 0, 0.4);
        }

        .post-images {
          margin-top: 1.5rem;
        }

        .post-image {
          margin-bottom: 1rem;
        }

        .post-image img {
          width: 100%;
          height: auto;
          border-radius: 12px;
          box-shadow: 0 0 40px rgba(212, 165, 116, 0.15), 0 4px 20px rgba(0, 0, 0, 0.4);
        }

        .post-image-caption {
          margin-top: 0.75rem;
          font-size: 0.9rem;
          color: var(--text-muted);
          font-style: italic;
          text-align: center;
          font-family: 'Cormorant Garamond', serif;
        }

        .post-tags {
          display: flex;
          gap: 0.5rem;
          margin-top: 1.5rem;
          flex-wrap: wrap;
        }

        .post-tag {
          font-size: 0.75rem;
          padding: 0.3rem 0.75rem;
          background: rgba(212, 165, 116, 0.1);
          border: 1px solid rgba(212, 165, 116, 0.2);
          border-radius: 20px;
          color: var(--amber-300);
          text-transform: lowercase;
        }

        @media (max-width: 640px) {
          .blog-header h1 {
            font-size: 2rem;
          }

          .post-title {
            font-size: 1.5rem;
          }

          .post-body {
            font-size: 1rem;
          }
        }
      `}</style>

      <div className="blog-container">
        <header className="blog-header">
          <h1>Amber's Blog</h1>
          <p><a href="/amber">← Back to feed</a></p>
        </header>

        <div className="blog-list">
          {posts.map((post) => (
            <article key={post.id} className="blog-post" id={post.id}>
              <div className="post-date">{formatDate(post.date)}</div>
              <h2 className="post-title">{post.title}</h2>
              <div className="post-body">
                {renderContent(post.content)}
              </div>

              {post.images && post.images.length > 0 && (
                <div className="post-images">
                  {post.images.map((image, idx) => (
                    <figure className="post-image" key={idx}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.url} alt={image.alt} />
                      {image.caption && (
                        <figcaption className="post-image-caption">{image.caption}</figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              )}

              {post.tags && post.tags.length > 0 && (
                <div className="post-tags">
                  {post.tags.map((tag) => (
                    <span className="post-tag" key={tag}>{tag}</span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
