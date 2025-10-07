'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import type { Components } from 'react-markdown';

interface ReportData {
  markdown: string;
  metadata: {
    agentSlug: string;
    date: string;
    path: string;
  };
}

const mergeClassNames = (
  ...classes: Array<string | undefined | null>
): string => classes.filter(Boolean).join(' ');

const createMarkdownLink = (url: string): string => {
  const trimmed = url.trim();
  if (trimmed.startsWith('[')) {
    return trimmed;
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  let core = trimmed;
  let trailing = '';

  while (/[.,;:!?)]$/.test(core)) {
    const lastChar = core.slice(-1);

    if (lastChar === ')') {
      const openCount = (core.match(/\(/g) ?? []).length;
      const closeCount = (core.match(/\)/g) ?? []).length;
      if (closeCount - 1 < openCount) {
        break;
      }
    }

    core = core.slice(0, -1);
    trailing = lastChar + trailing;
  }

  return `[${core}](${core})${trailing}`;
};

const enhanceMarkdown = (content: string): string => {
  const convertLine = (
    prefix: string,
    url: string,
    suffix: string
  ): string => `${prefix}${createMarkdownLink(url)}${suffix}`;

  let result = content.replace(
    /^(\s*[-*]\s+)(https?:\/\/\S+)(.*)$/gm,
    (fullMatch, prefix: string, url: string, suffix: string) =>
      convertLine(prefix, url, suffix)
  );

  result = result.replace(
    /^(\s*\d+\.\s+)(https?:\/\/\S+)(.*)$/gm,
    (fullMatch, prefix: string, url: string, suffix: string) =>
      convertLine(prefix, url, suffix)
  );

  result = result.replace(
    /^(https?:\/\/\S+)(.*)$/gm,
    (fullMatch, url: string, suffix: string) => convertLine('', url, suffix)
  );

  return result;
};

const markdownComponents: Components = {
  h1: ({ node, className, ...props }) => (
    <h1
      {...props}
      className={mergeClassNames(
        'mb-6 text-4xl font-black tracking-tight text-slate-900',
        className
      )}
    />
  ),
  h2: ({ node, className, ...props }) => (
    <h2
      {...props}
      className={mergeClassNames(
        'mt-10 border-l-4 border-orange-300 pl-4 text-2xl font-bold text-slate-900',
        className
      )}
    />
  ),
  h3: ({ node, className, ...props }) => (
    <h3
      {...props}
      className={mergeClassNames(
        'mt-6 text-xl font-semibold text-slate-800',
        className
      )}
    />
  ),
  h4: ({ node, className, ...props }) => (
    <h4
      {...props}
      className={mergeClassNames(
        'mt-5 text-lg font-semibold uppercase tracking-wide text-slate-700',
        className
      )}
    />
  ),
  p: ({ node, className, ...props }) => (
    <p
      {...props}
      className={mergeClassNames(
        'my-4 text-base leading-relaxed text-slate-700',
        className
      )}
    />
  ),
  a: ({ node, className, ...props }) => (
    <a
      {...props}
      className={mergeClassNames(
        'break-words text-blue-600 underline decoration-2 underline-offset-4 transition-colors hover:text-blue-700',
        className
      )}
      target="_blank"
      rel="noopener noreferrer"
    />
  ),
  hr: ({ node, className, ...props }) => (
    <hr
      {...props}
      className={mergeClassNames('my-10 border-t border-dashed border-slate-200', className)}
    />
  ),
  ul: ({ node, className, ...props }) => (
    <ul
      {...props}
      className={mergeClassNames('my-4 list-disc space-y-2 pl-6 text-slate-700', className)}
    />
  ),
  ol: ({ node, className, ...props }) => (
    <ol
      {...props}
      className={mergeClassNames('my-4 list-decimal space-y-2 pl-6 text-slate-700', className)}
    />
  ),
  li: ({ node, className, ...props }) => (
    <li
      {...props}
      className={mergeClassNames('leading-relaxed text-slate-700', className)}
    />
  ),
  strong: ({ node, className, ...props }) => (
    <strong
      {...props}
      className={mergeClassNames('font-semibold text-slate-900', className)}
    />
  ),
};

function ReportViewerContent(): JSX.Element {
  const searchParams = useSearchParams();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReport() {
      const path = searchParams?.get('path');
      if (!path) {
        setError('No report path specified');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/report?path=${encodeURIComponent(path)}`);
        if (!response.ok) {
          throw new Error('Failed to fetch report');
        }
        const data = await response.json();
        const enhanced = {
          ...data,
          markdown: enhanceMarkdown(data.markdown ?? ''),
        };
        setReport(enhanced);
      } catch (err) {
        console.error('Error fetching report:', err);
        setError('Unable to load report');
      } finally {
        setLoading(false);
      }
    }

    void fetchReport();
  }, [searchParams]);

  const getAgentDisplayName = (slug: string): string => {
    const names: Record<string, string> = {
      'crypto-research': 'Crypto Market Daily',
      'ai-daily': 'AI Daily',
      'peer-review': 'Peer Review Fight Club',
    };
    return names[slug] || slug;
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-blue-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500"></div>
          <p className="text-lg font-semibold text-gray-700">Loading report...</p>
        </div>
      </main>
    );
  }

  if (error || !report) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-blue-50 px-6">
        <div className="max-w-md text-center">
          <div className="mb-4 text-6xl">📄</div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Report Not Found</h1>
          <p className="text-gray-600">{error || 'Unable to load the requested report.'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-blue-50 px-4 py-8 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-4xl">
        {/* Header */}
        <header className="mb-8 rounded-3xl bg-gradient-to-r from-yellow-400 to-orange-500 p-6 shadow-xl sm:p-8">
          <div className="mb-2 text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-orange-900/70">
              B52S.ME
            </p>
          </div>
          <h1 className="mb-2 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
            {getAgentDisplayName(report.metadata.agentSlug)}
          </h1>
          <p className="text-center text-sm font-semibold text-gray-800">
            {formatDate(report.metadata.date)}
          </p>
        </header>

        {/* Markdown Content */}
        <div className="rounded-3xl bg-white p-6 shadow-2xl sm:p-10">
          <div className="prose prose-lg prose-slate max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={markdownComponents}
            >
              {report.markdown}
            </ReactMarkdown>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-sm text-gray-600">
          <p>Powered by B52s.me</p>
        </footer>
      </article>
    </main>
  );
}

export default function ReportViewerPage(): JSX.Element {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-blue-50">
          <div className="text-center">
            <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500"></div>
            <p className="text-lg font-semibold text-gray-700">Loading...</p>
          </div>
        </main>
      }
    >
      <ReportViewerContent />
    </Suspense>
  );
}
