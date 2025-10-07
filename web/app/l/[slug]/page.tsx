'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ShortLinkPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  useEffect(() => {
    if (!slug) return;

    // Redirect to the API route that handles the actual redirect
    router.replace(`/api/l/${slug}`);
  }, [slug, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-blue-50">
      <div className="text-center">
        <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500"></div>
        <p className="text-lg font-semibold text-gray-700">Redirecting...</p>
      </div>
    </main>
  );
}
