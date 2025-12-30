'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface Investigation {
  question: string;
  findings: string;
  summary: string;
  filesExamined: string[];
  toolCalls: number;
  durationMs: number;
  createdAt: string;
}

export default function CCInvestigationPage() {
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<Investigation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/cc/${id}`)
      .then(res => res.json())
      .then(result => {
        if (result.error) {
          setError(result.error);
        } else {
          setData(result);
        }
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl text-red-400">Investigation not found</h1>
          <p className="text-gray-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const duration = Math.round((data.durationMs || 0) / 1000);
  const date = new Date(data.createdAt).toLocaleString();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">CC Investigation</div>
          <h1 className="text-2xl font-bold mb-2">{data.question}</h1>
          <div className="text-sm text-gray-500">
            {data.filesExamined.length} files examined &middot; {data.toolCalls} tool calls &middot; {duration}s &middot; {date}
          </div>
        </div>

        {data.summary && (
          <div className="mb-8 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Summary</div>
            <p className="text-gray-200">{data.summary}</p>
          </div>
        )}

        <div className="mb-8">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Full Findings</div>
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono leading-relaxed">
              {data.findings}
            </pre>
          </div>
        </div>

        {data.filesExamined.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Files Examined</div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <div className="flex flex-wrap gap-2">
                {data.filesExamined.slice(0, 20).map((file, i) => (
                  <span key={i} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded font-mono">
                    {file.split('/').pop()}
                  </span>
                ))}
                {data.filesExamined.length > 20 && (
                  <span className="text-xs text-gray-500">+{data.filesExamined.length - 20} more</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
