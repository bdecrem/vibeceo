'use client';

export default function VoiceChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-red-600 mb-4">Voice Chat Error</h1>
      <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm mb-4">
        {error.message}
      </pre>
      <button
        onClick={reset}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Try Again
      </button>
    </div>
  );
}
