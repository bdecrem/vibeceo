/**
 * GitHub Collector
 *
 * Fetches candidates from specific GitHub sources discovered by the source discovery agent.
 * Uses GitHub API to find active contributors, repo owners, and community members.
 */

import type { DiscoveredSource } from '../source-discovery-agent.js';

const GITHUB_TOKEN = process.env.GITHUB_API_TOKEN;

export interface GitHubCandidate {
  name: string;
  username: string;
  profileUrl: string;
  bio?: string;
  location?: string;
  company?: string;
  email?: string;
  blog?: string;
  twitterHandle?: string;
  recentActivity?: string;
  followers?: number;
  publicRepos?: number;
  rawProfile: any;
}

/**
 * Collect candidates from discovered GitHub sources
 */
export async function collectFromGitHub(
  sources: DiscoveredSource[],
  maxCandidates: number = 20
): Promise<GitHubCandidate[]> {
  if (sources.length === 0) {
    console.log('[GitHub Collector] No sources provided');
    return [];
  }

  console.log(`[GitHub Collector] Collecting from ${sources.length} sources, max ${maxCandidates} candidates`);

  const candidates: GitHubCandidate[] = [];
  const seenUsernames = new Set<string>();

  // Process sources in order of score (highest first)
  const sortedSources = [...sources].sort((a, b) => b.score - a.score);

  for (const source of sortedSources) {
    if (candidates.length >= maxCandidates) {
      break;
    }

    try {
      let newCandidates: GitHubCandidate[] = [];

      if (source.repo) {
        // Fetch contributors from repository
        newCandidates = await fetchRepoContributors(source.repo, maxCandidates - candidates.length);
      } else if (source.url && source.url.includes('github.com')) {
        // Parse GitHub URL to determine what to fetch
        const urlParts = source.url.replace('https://github.com/', '').split('/');

        if (urlParts.length >= 2 && urlParts[1] !== '') {
          // It's a repo URL
          const repo = `${urlParts[0]}/${urlParts[1]}`;
          newCandidates = await fetchRepoContributors(repo, maxCandidates - candidates.length);
        } else if (urlParts.length === 1) {
          // It's a user URL
          const user = await fetchGitHubUser(urlParts[0]);
          if (user) {
            newCandidates = [user];
          }
        }
      }

      // Add new candidates (dedupe by username)
      for (const candidate of newCandidates) {
        if (!seenUsernames.has(candidate.username.toLowerCase())) {
          seenUsernames.add(candidate.username.toLowerCase());
          candidates.push(candidate);

          if (candidates.length >= maxCandidates) {
            break;
          }
        }
      }

      console.log(`[GitHub Collector] Processed ${source.name}: ${newCandidates.length} candidates (total: ${candidates.length})`);

    } catch (error) {
      console.error(`[GitHub Collector] Failed to fetch from ${source.name}:`, error);
    }
  }

  console.log(`[GitHub Collector] Collected ${candidates.length} total candidates`);
  return candidates;
}

/**
 * Fetch contributors from a GitHub repository
 */
async function fetchRepoContributors(repo: string, limit: number = 20): Promise<GitHubCandidate[]> {
  console.log(`[GitHub Collector] Fetching contributors from ${repo}`);

  try {
    const headers: any = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'VibeCEO-Recruiting-Agent',
    };

    if (GITHUB_TOKEN) {
      headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    }

    // Fetch top contributors
    const response = await fetch(
      `https://api.github.com/repos/${repo}/contributors?per_page=${Math.min(limit, 100)}`,
      { headers }
    );

    if (!response.ok) {
      console.error(`[GitHub Collector] API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const contributors = await response.json();

    // Fetch full profile for each contributor
    const candidates: GitHubCandidate[] = [];

    for (const contributor of contributors.slice(0, limit)) {
      const user = await fetchGitHubUser(contributor.login);
      if (user) {
        // Add contribution count as recent activity
        user.recentActivity = `${contributor.contributions} contributions to ${repo}`;
        candidates.push(user);
      }

      // Rate limiting: wait a bit between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return candidates;

  } catch (error) {
    console.error(`[GitHub Collector] Failed to fetch contributors from ${repo}:`, error);
    return [];
  }
}

/**
 * Fetch a single GitHub user's profile
 */
async function fetchGitHubUser(username: string): Promise<GitHubCandidate | null> {
  try {
    const headers: any = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'VibeCEO-Recruiting-Agent',
    };

    if (GITHUB_TOKEN) {
      headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    }

    const response = await fetch(`https://api.github.com/users/${username}`, { headers });

    if (!response.ok) {
      console.error(`[GitHub Collector] Failed to fetch user ${username}: ${response.status}`);
      return null;
    }

    const user = await response.json();

    return {
      name: user.name || user.login,
      username: user.login,
      profileUrl: user.html_url,
      bio: user.bio,
      location: user.location,
      company: user.company,
      email: user.email,
      blog: user.blog,
      twitterHandle: user.twitter_username ? `@${user.twitter_username}` : undefined,
      followers: user.followers,
      publicRepos: user.public_repos,
      rawProfile: user,
    };

  } catch (error) {
    console.error(`[GitHub Collector] Failed to fetch user ${username}:`, error);
    return null;
  }
}
