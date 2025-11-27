/**
 * GitHub source fetcher
 * Fetches trending repositories, issues, or PRs
 */

import type { NormalizedItem } from '@vibeceo/shared-types';

export interface GitHubConfig {
  type?: 'trending' | 'repos' | 'issues' | 'prs';
  language?: string;
  timeRange?: 'daily' | 'weekly' | 'monthly';
  query?: string;
  maxItems?: number;
}

interface GitHubRepo {
  full_name: string;
  html_url: string;
  description: string;
  stargazers_count: number;
  language: string;
  owner: { login: string };
  created_at: string;
  updated_at: string;
}

export async function fetchGitHub(config: GitHubConfig): Promise<NormalizedItem[]> {
  const {
    type = 'trending',
    language,
    timeRange = 'daily',
    query,
    maxItems = 10,
  } = config;

  console.log(`🐙 Fetching GitHub ${type}...`);

  try {
    let repos: GitHubRepo[] = [];

    if (type === 'trending') {
      // Use GitHub trending via unofficial API or scraping
      // For now, use GitHub search API with date filter
      const since = getDateForRange(timeRange);
      const searchQuery = language
        ? `language:${language} created:>${since}`
        : `created:>${since}`;

      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=stars&order=desc&per_page=${maxItems}`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          ...(process.env.GITHUB_TOKEN && { 'Authorization': `token ${process.env.GITHUB_TOKEN}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const data = await response.json();
      repos = data.items || [];
    } else if (query) {
      // Search for repos/issues/prs
      const endpoint = type === 'repos' ? 'repositories' : type === 'issues' ? 'issues' : 'issues';
      const url = `https://api.github.com/search/${endpoint}?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=${maxItems}`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          ...(process.env.GITHUB_TOKEN && { 'Authorization': `token ${process.env.GITHUB_TOKEN}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const data = await response.json();
      repos = data.items || [];
    }

    // Normalize to NormalizedItem
    const normalized: NormalizedItem[] = repos.slice(0, maxItems).map(repo => ({
      id: `github-${repo.full_name}`,
      title: repo.full_name,
      summary: repo.description || 'No description provided',
      url: repo.html_url,
      publishedAt: repo.created_at,
      author: repo.owner.login,
      score: repo.stargazers_count,
      raw: repo,
    }));

    console.log(`✅ Fetched ${normalized.length} items from GitHub`);
    return normalized;

  } catch (error: any) {
    console.error('❌ Error fetching GitHub:', error.message);
    throw error;
  }
}

function getDateForRange(range: string): string {
  const now = new Date();
  switch (range) {
    case 'daily':
      now.setDate(now.getDate() - 1);
      break;
    case 'weekly':
      now.setDate(now.getDate() - 7);
      break;
    case 'monthly':
      now.setMonth(now.getMonth() - 1);
      break;
  }
  return now.toISOString().split('T')[0];
}
