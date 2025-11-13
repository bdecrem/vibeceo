/**
 * Apify Client for Recruiting Agent
 *
 * Integrates with Apify API to scrape LinkedIn and Twitter for candidates
 */

const APIFY_API_KEY = process.env.APIFY_API_KEY;
const LINKEDIN_COOKIE = process.env.LINKEDIN_COOKIE;
const APIFY_BASE_URL = 'https://api.apify.com/v2';

// Apify Actor IDs (format: username~actor-name)
// Using authenticated actor with residential proxies for full profile access
const LINKEDIN_PEOPLE_SEARCH_ACTOR = 'curious_coder~linkedin-people-search-scraper';
const TWITTER_SCRAPER_ACTOR = 'apidojo~tweet-scraper';

// Poll configuration
const POLL_INTERVAL_MS = 5000; // 5 seconds
const MAX_POLL_ATTEMPTS = 60; // 5 minutes max

export interface LinkedInCandidate {
  name: string;
  title?: string;
  company?: string;
  location?: string;
  linkedinUrl: string;
  summary?: string;
  experience?: Array<{
    title: string;
    company: string;
    duration?: string;
  }>;
  skills?: string[];
}

export interface TwitterCandidate {
  name: string;
  handle: string;
  bio?: string;
  location?: string;
  twitterUrl: string;
  followerCount?: number;
  recentTweets?: Array<{
    text: string;
    timestamp: string;
  }>;
}

interface ApifyRun {
  data: {
    id: string;
    status: string;
    statusMessage?: string;
    defaultDatasetId?: string;
  };
}

/**
 * Start an Apify actor run
 */
async function startActorRun(actorId: string, input: Record<string, any>): Promise<string> {
  const response = await fetch(`${APIFY_BASE_URL}/acts/${actorId}/runs`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${APIFY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[Apify] Actor start error response:`, errorBody);
    throw new Error(`Apify actor start failed: ${response.statusText} - ${errorBody}`);
  }

  const run: ApifyRun = await response.json();
  console.log(`[Apify] Started actor ${actorId}, run ID: ${run.data.id}`);

  return run.data.id;
}

/**
 * Poll for actor run completion
 */
async function pollForCompletion(runId: string): Promise<string> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const response = await fetch(`${APIFY_BASE_URL}/actor-runs/${runId}`, {
      headers: {
        'Authorization': `Bearer ${APIFY_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Apify poll failed: ${response.statusText}`);
    }

    const run: ApifyRun = await response.json();
    const status = run.data.status;

    console.log(`[Apify] Run ${runId} status: ${status} (attempt ${attempt + 1}/${MAX_POLL_ATTEMPTS})`);

    if (status === 'SUCCEEDED') {
      if (!run.data.defaultDatasetId) {
        throw new Error('Actor succeeded but no dataset ID returned');
      }
      return run.data.defaultDatasetId;
    }

    if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      const statusMessage = run.data.statusMessage;
      const reason = statusMessage ? `: ${statusMessage}` : '';
      throw new Error(`Actor run ${status.toLowerCase()}${reason}`);
    }

    // Status is RUNNING or READY, wait and poll again
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(`Actor run timed out after ${MAX_POLL_ATTEMPTS} attempts`);
}

/**
 * Fetch results from a dataset
 */
async function fetchDataset<T>(datasetId: string): Promise<T[]> {
  const response = await fetch(`${APIFY_BASE_URL}/datasets/${datasetId}/items`, {
    headers: {
      'Authorization': `Bearer ${APIFY_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Apify dataset fetch failed: ${response.statusText}`);
  }

  const items = await response.json();
  console.log(`[Apify] Fetched ${items.length} items from dataset ${datasetId}`);

  return items as T[];
}

/**
 * Search LinkedIn for candidates
 */
export async function searchLinkedIn(query: string, maxProfiles: number = 20): Promise<LinkedInCandidate[]> {
  console.log(`[Apify] Searching LinkedIn for: "${query}", max profiles: ${maxProfiles}`);
  console.log(`[Apify] Using authenticated actor with proxies: ${LINKEDIN_PEOPLE_SEARCH_ACTOR}`);

  try {
    // Construct LinkedIn people search URL
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodedQuery}`;
    console.log(`[Apify] Search URL: ${searchUrl}`);

    if (!LINKEDIN_COOKIE) {
      throw new Error('LINKEDIN_COOKIE environment variable not set');
    }

    // Parse and filter cookies
    let cookies;
    try {
      cookies = JSON.parse(LINKEDIN_COOKIE);

      // Filter out only truly expired cookies (not Cloudflare ones)
      // Residential proxies will handle bot detection better
      const now = Date.now() / 1000;
      const validCount = cookies.length;
      cookies = cookies.filter((cookie: any) => {
        // Only remove actually expired cookies
        if (cookie.expirationDate && cookie.expirationDate < now) {
          console.log(`[Apify] Filtering expired cookie: ${cookie.name}`);
          return false;
        }
        return true;
      });

      console.log(`[Apify] Using ${cookies.length}/${validCount} cookies with residential proxies`);
    } catch (error) {
      throw new Error('LINKEDIN_COOKIE must be a valid JSON array from Cookie-Editor');
    }

    const runId = await startActorRun(LINKEDIN_PEOPLE_SEARCH_ACTOR, {
      searchUrl: searchUrl,
      count: maxProfiles,
      cookie: cookies,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      // Note: Proxy configuration commented out for now - testing without proxies first
      // The actor may use its own proxy handling
      // proxyConfiguration: {
      //   useApifyProxy: true,
      //   apifyProxyGroups: ['RESIDENTIAL']
      // },
    });

    const datasetId = await pollForCompletion(runId);
    const results = await fetchDataset<any>(datasetId);

    // Log raw data format for debugging
    if (results.length > 0) {
      console.log('[Apify] Sample raw LinkedIn result (first item):');
      console.log(JSON.stringify(results[0], null, 2));
      console.log('[Apify] Available fields:', Object.keys(results[0]).join(', '));
    }

    // Transform Apify results to our format
    const candidates: LinkedInCandidate[] = results.map((result, index) => {
      const transformed = {
        name: result.name || result.fullName || 'Unknown',
        title: result.title || result.headline,
        company: result.company || result.companyName,
        location: result.location,
        linkedinUrl: result.url || result.profileUrl || result.linkedinUrl,
        summary: result.summary || result.about,
        experience: result.experience || [],
        skills: result.skills || [],
      };

      // Log first transformed candidate to see what Claude will receive
      if (index === 0) {
        console.log('[Apify] Sample transformed candidate:');
        console.log(JSON.stringify(transformed, null, 2));
      }

      return transformed;
    });

    console.log(`[Apify] LinkedIn search complete: ${candidates.length} candidates found`);
    return candidates;

  } catch (error) {
    console.error('[Apify] LinkedIn search failed:', error);
    throw error;
  }
}

/**
 * Search Twitter for candidates
 */
export async function searchTwitter(query: string, maxTweets: number = 50): Promise<TwitterCandidate[]> {
  console.log(`[Apify] Searching Twitter for: "${query}", max tweets: ${maxTweets}`);

  try {
    const runId = await startActorRun(TWITTER_SCRAPER_ACTOR, {
      searchTerms: [query],
      maxTweets,
      includeUserProfiles: true,
      tweetLanguage: 'en',
    });

    const datasetId = await pollForCompletion(runId);
    const results = await fetchDataset<any>(datasetId);

    // Extract unique users from tweets
    const userMap = new Map<string, any>();

    for (const tweet of results) {
      const user = tweet.author || tweet.user;
      if (user && user.username && !userMap.has(user.username)) {
        userMap.set(user.username, {
          ...user,
          recentTweets: [],
        });
      }

      // Add this tweet to user's recent tweets
      if (user && userMap.has(user.username)) {
        userMap.get(user.username).recentTweets.push({
          text: tweet.text || tweet.full_text,
          timestamp: tweet.created_at,
        });
      }
    }

    // Transform to our format
    const candidates: TwitterCandidate[] = Array.from(userMap.values()).map(user => ({
      name: user.name || user.username,
      handle: `@${user.username}`,
      bio: user.description || user.bio,
      location: user.location,
      twitterUrl: `https://twitter.com/${user.username}`,
      followerCount: user.followers_count || user.followersCount,
      recentTweets: (user.recentTweets || []).slice(0, 5), // Keep last 5 tweets
    }));

    console.log(`[Apify] Twitter search complete: ${candidates.length} unique users found`);
    return candidates;

  } catch (error) {
    console.error('[Apify] Twitter search failed:', error);
    throw error;
  }
}

/**
 * Test Apify connection
 */
export async function testApifyConnection(): Promise<boolean> {
  try {
    // Simple test: get account info
    const response = await fetch(`${APIFY_BASE_URL}/users/me`, {
      headers: {
        'Authorization': `Bearer ${APIFY_API_KEY}`,
      },
    });

    if (!response.ok) {
      console.error('[Apify] Connection test failed:', response.statusText);
      return false;
    }

    const user = await response.json();
    console.log(`[Apify] Connection successful! User: ${user.data.username}`);
    return true;

  } catch (error) {
    console.error('[Apify] Connection test error:', error);
    return false;
  }
}
