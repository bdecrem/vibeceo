'use client';

import { useState, useEffect } from 'react';

// Type for WTAF content
export type WTAFContent = {
  id: string;
  user_slug: string;
  app_slug: string;
  prompt: string;
  original_prompt: string;
  html_content: string;
  created_at: string;
  feature: boolean;
  title?: string;
};

export function useFeaturedWTAF() {
  const [featuredPages, setFeaturedPages] = useState<WTAFContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeaturedPages = async (count: number = 3) => {
    try {
      console.log('🔄 Starting to fetch featured pages...');
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/featured-wtaf?count=${count}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch featured pages');
      }

      console.log(`✅ Fetched ${result.data.length} featured WTAF pages`, result.data);
      return result.data;

    } catch (err: any) {
      console.error('❌ Error fetching featured WTAF pages:', err);
      setError(err.message || 'Failed to fetch featured pages');
      return [];
    } finally {
      console.log('🏁 Setting loading to false');
      setLoading(false);
    }
  };

  const loadRandomPages = async (count: number = 3) => {
    console.log(`🎲 Loading ${count} random pages...`);
    const pages = await fetchFeaturedPages(count);
    console.log(`📋 Setting featured pages:`, pages);
    setFeaturedPages(pages);
    console.log(`✨ Featured pages state updated!`);
  };

  // Load initial pages on mount
  useEffect(() => {
    loadRandomPages(3);
  }, []);

  return {
    featuredPages,
    loading,
    error,
    loadRandomPages,
    refresh: () => loadRandomPages(3)
  };
}

// Helper function to extract title from HTML content
export function extractTitleFromHTML(htmlContent: string): string {
  try {
    // Try to extract from <title> tag
    const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1].trim();
    }

    // Try to extract from first <h1> tag
    const h1Match = htmlContent.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match && h1Match[1]) {
      return h1Match[1].trim();
    }

    // Fallback: use app_slug formatted as title
    return '';
  } catch (error) {
    console.warn('Error extracting title from HTML:', error);
    return '';
  }
}

// Helper function to format app slug as title
export function formatAppSlugAsTitle(appSlug: string): string {
  return appSlug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Helper function to get page URL
export function getPageURL(userSlug: string, appSlug: string): string {
  const baseURL = process.env.NEXT_PUBLIC_WTAF_DOMAIN || 'https://www.wtaf.me';
  return `${baseURL}/${userSlug}/${appSlug}`;
}
