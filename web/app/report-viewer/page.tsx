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
  h1: ({ className, ...props }) => (
    <h1
      {...props}
      className={mergeClassNames(
        'mb-6 text-3xl font-semibold tracking-tight text-[#1A1A1A]',
        className
      )}
    />
  ),
  h2: ({ className, ...props }) => (
    <h2
      {...props}
      className={mergeClassNames(
        'mt-10 text-2xl font-semibold tracking-tight text-[#2C3E1F]',
        className
      )}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3
      {...props}
      className={mergeClassNames(
        'mt-8 text-xl font-semibold text-[#3A3D2F]',
        className
      )}
    />
  ),
  h4: ({ className, ...props }) => (
    <h4
      {...props}
      className={mergeClassNames(
        'mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-[#7C836F]',
        className
      )}
    />
  ),
  p: ({ className, ...props }) => (
    <p
      {...props}
      className={mergeClassNames(
        'my-4 text-base leading-relaxed text-[#3A3D2F]',
        className
      )}
    />
  ),
  a: ({ className, ...props }) => (
    <a
      {...props}
      className={mergeClassNames(
        'break-words font-semibold text-[#2C3E1F] underline decoration-[#C9D2B8] decoration-2 underline-offset-4 transition-colors hover:text-[#1F2E16]',
        className
      )}
      target="_blank"
      rel="noopener noreferrer"
    />
  ),
  hr: ({ className, ...props }) => (
    <hr
      {...props}
      className={mergeClassNames('my-10 border-t border-dashed border-[#E5E5E0]', className)}
    />
  ),
  ul: ({ className, ...props }) => (
    <ul
      {...props}
      className={mergeClassNames('my-4 list-disc space-y-2 pl-6 text-[#3A3D2F]', className)}
    />
  ),
  ol: ({ className, ...props }) => (
    <ol
      {...props}
      className={mergeClassNames('my-4 list-decimal space-y-2 pl-6 text-[#3A3D2F]', className)}
    />
  ),
  li: ({ className, ...props }) => (
    <li
      {...props}
      className={mergeClassNames('leading-relaxed text-[#3A3D2F]', className)}
    />
  ),
  strong: ({ className, ...props }) => (
    <strong
      {...props}
      className={mergeClassNames('font-semibold text-[#1A1A1A]', className)}
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

  const formatDateLabel = (dateStr: string): string | null => {
    if (!dateStr) {
      return null;
    }

    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed
      .toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
      })
      .replace(',', '');
  };

  const secondaryLabel = report
    ? (() => {
        const dateLabel = formatDateLabel(report.metadata.date);
        if (dateLabel) {
          return dateLabel;
        }

        const path = report.metadata.path?.split('/')?.pop();
        if (path) {
          return path.replace(/[-_]/g, ' ');
        }

        return null;
      })()
    : null;

  if (loading) {
    return (
      <main className="relative flex min-h-screen w-full items-center justify-center bg-gradient-to-b from-[#FAFAF8] to-[#F5F5F0] px-4 py-24 sm:px-6">
        <div className="w-full max-w-xs rounded-[20px] border border-[#E0E4D7] bg-white/95 p-8 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] backdrop-blur">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-[3px] border-[#D8DECC] border-t-[#2C3E1F]" />
          <p className="text-sm font-semibold tracking-tight text-[#3A3D2F]">Preparing report…</p>
        </div>
      </main>
    );
  }

  if (error || !report) {
    return (
      <main className="relative flex min-h-screen w-full items-center justify-center bg-gradient-to-b from-[#FAFAF8] to-[#F5F5F0] px-4 py-24 sm:px-6">
        <div className="w-full max-w-sm rounded-[20px] border border-[#E0E4D7] bg-white/95 p-8 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] backdrop-blur">
          <div className="mb-4 text-4xl">📄</div>
          <h1 className="text-lg font-semibold tracking-tight text-[#1A1A1A]">Report unavailable</h1>
          <p className="mt-2 text-sm text-[#4A4F3C]">{error || 'Unable to load the requested report.'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen w-full bg-gradient-to-b from-[#FAFAF8] to-[#F5F5F0] px-4 pb-16 pt-24 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center">
        <article className="w-full rounded-[20px] border border-[#E0E4D7] bg-white/95 p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] backdrop-blur-sm sm:p-10">
          <header className="mb-8 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7C836F]">
              Daily Report
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#1A1A1A]">
              {getAgentDisplayName(report.metadata.agentSlug)}
            </h1>
            {secondaryLabel ? (
              <p className="mt-1.5 text-sm font-semibold tracking-tight text-[#4A4F3C]">{secondaryLabel}</p>
            ) : null}
          </header>

          <section className="prose max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={markdownComponents}
            >
              {report.markdown}
            </ReactMarkdown>
          </section>

          <footer className="mt-10 border-t border-[#ECEFE3] pt-4 text-center text-xs font-medium uppercase tracking-[0.18em] text-[#8F947D]">
            Powered by B52s.me
          </footer>
        </article>
      </div>
    </main>
  );
}

export default function ReportViewerPage(): JSX.Element {
  return (
    <Suspense
      fallback={
        <main className="relative flex min-h-screen w-full items-center justify-center bg-gradient-to-b from-[#FAFAF8] to-[#F5F5F0] px-4 py-24 sm:px-6">
          <div className="w-full max-w-xs rounded-[20px] border border-[#E0E4D7] bg-white/95 p-8 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] backdrop-blur">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-[3px] border-[#D8DECC] border-t-[#2C3E1F]" />
            <p className="text-sm font-semibold tracking-tight text-[#3A3D2F]">Loading report…</p>
          </div>
        </main>
      }
    >
      <ReportViewerContent />
    </Suspense>
  );
}
