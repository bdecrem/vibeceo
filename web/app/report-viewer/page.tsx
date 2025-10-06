'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ReportData {
  markdown: string;
  metadata: {
    agentSlug: string;
    date: string;
    path: string;
  };
}

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
        setReport(data);
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
          <div className="prose prose-lg prose-slate max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-h1:text-3xl prose-h2:mt-8 prose-h2:text-2xl prose-h3:text-xl prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-blue-600 prose-a:underline hover:prose-a:text-blue-700 prose-strong:font-bold prose-strong:text-gray-900 prose-ul:list-disc prose-ol:list-decimal prose-code:text-sm prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ node, ...props }) => (
                  <a
                    {...props}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-words"
                  />
                ),
              }}
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
