'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Type for WTAF content
export type WTAFContent = {
  id: string;
  user_slug: string;
  app_slug: string;
  prompt: string;
  html_content: string;
  created_at: string;
  feature: boolean;
  title?: string;
};

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase: any = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

export function useFeaturedWTAF() {
  const [featuredPages, setFeaturedPages] = useState<WTAFContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeaturedPages = async (count: number = 3) => {
    if (!supabase) {
      setError('Supabase not configured');
      setLoading(false);
      return [];
    }

    try {
      setLoading(true);
      
      // Fetch all featured pages
      const { data: allFeatured, error: fetchError } = await supabase
        .from('wtaf_content')
        .select('*')
        .eq('feature', true)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      if (!allFeatured || allFeatured.length === 0) {
        console.warn('No featured WTAF pages found');
        return [];
      }

      // Randomly select the requested number of pages
      const shuffled = [...allFeatured].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(count, shuffled.length));
      
      console.log(`✅ Fetched ${selected.length} featured WTAF pages`);
      return selected;

    } catch (err: any) {
      console.error('❌ Error fetching featured WTAF pages:', err);
      setError(err.message || 'Failed to fetch featured pages');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const loadRandomPages = async (count: number = 3) => {
    const pages = await fetchFeaturedPages(count);
    setFeaturedPages(pages);
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
