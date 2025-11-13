/**
 * Proxycurl Client for Recruiting Agent
 *
 * Official LinkedIn data partner - no scraping, no cookies, no blocking
 * Pricing: ~3 credits per search result (~$0.03-0.06 per candidate)
 */

const PROXYCURL_API_KEY = process.env.PROXYCURL_API_KEY;
const PROXYCURL_BASE_URL = 'https://nubela.co/proxycurl/api/v2';

export interface ProxycurlCandidate {
  name: string;
  title?: string;
  company?: string;
  location?: string;
  linkedinUrl: string;
  summary?: string;
  headline?: string;
  experience?: Array<{
    title: string;
    company: string;
    duration?: string;
  }>;
  skills?: string[];
  education?: Array<{
    school: string;
    degree?: string;
    field?: string;
  }>;
}

/**
 * Search LinkedIn profiles using Proxycurl Person Search API
 */
export async function searchLinkedInProxycurl(
  query: string,
  maxResults: number = 20,
  filters?: {
    location?: string;
    title?: string;
    company?: string;
    industry?: string;
  }
): Promise<ProxycurlCandidate[]> {
  console.log(`[Proxycurl] Searching LinkedIn for: "${query}", max results: ${maxResults}`);

  if (!PROXYCURL_API_KEY) {
    throw new Error('PROXYCURL_API_KEY environment variable not set');
  }

  try {
    // Build search parameters
    const searchParams: any = {
      keyword: query,
      page_size: Math.min(maxResults, 100), // API limit
      enrich_profiles: 'enrich', // Get full profile data
    };

    // Add optional filters
    if (filters?.location) searchParams.country = filters.location;
    if (filters?.title) searchParams.current_role_title = filters.title;
    if (filters?.company) searchParams.current_company_name = filters.company;
    if (filters?.industry) searchParams.industry = filters.industry;

    console.log('[Proxycurl] Search params:', searchParams);

    // Call Person Search API
    const response = await fetch(`${PROXYCURL_BASE_URL}/search/person/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PROXYCURL_API_KEY}`,
      },
      // @ts-ignore - URL params
      ...(() => {
        const params = new URLSearchParams(searchParams);
        return { url: `${PROXYCURL_BASE_URL}/search/person/?${params}` };
      })(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Proxycurl] Search failed: ${response.status} - ${errorText}`);
      throw new Error(`Proxycurl search failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[Proxycurl] Search returned ${data.results?.length || 0} results`);

    if (!data.results || data.results.length === 0) {
      return [];
    }

    // Transform to our candidate format
    const candidates: ProxycurlCandidate[] = data.results.map((result: any) => ({
      name: result.full_name || result.first_name + ' ' + result.last_name || 'Unknown',
      title: result.occupation || result.headline,
      company: result.current_company_name || result.experiences?.[0]?.company,
      location: result.city + (result.state ? ', ' + result.state : '') || result.country,
      linkedinUrl: result.linkedin_profile_url || result.profile_url,
      summary: result.summary,
      headline: result.headline,
      experience: result.experiences?.slice(0, 3).map((exp: any) => ({
        title: exp.title,
        company: exp.company,
        duration: exp.starts_at && exp.ends_at
          ? `${exp.starts_at.year}-${exp.ends_at.year || 'Present'}`
          : undefined,
      })) || [],
      skills: result.skills || [],
      education: result.education?.map((edu: any) => ({
        school: edu.school,
        degree: edu.degree_name,
        field: edu.field_of_study,
      })) || [],
    }));

    console.log(`[Proxycurl] Transformed ${candidates.length} candidates`);
    return candidates;

  } catch (error) {
    console.error('[Proxycurl] Search failed:', error);
    throw error;
  }
}

/**
 * Get full profile details for a specific LinkedIn URL
 */
export async function getLinkedInProfile(linkedinUrl: string): Promise<ProxycurlCandidate | null> {
  console.log(`[Proxycurl] Fetching profile: ${linkedinUrl}`);

  if (!PROXYCURL_API_KEY) {
    throw new Error('PROXYCURL_API_KEY environment variable not set');
  }

  try {
    const response = await fetch(`${PROXYCURL_BASE_URL}/linkedin`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PROXYCURL_API_KEY}`,
      },
      // @ts-ignore
      url: `${PROXYCURL_BASE_URL}/linkedin?url=${encodeURIComponent(linkedinUrl)}`,
    });

    if (!response.ok) {
      console.error(`[Proxycurl] Profile fetch failed: ${response.status}`);
      return null;
    }

    const profile = await response.json();

    return {
      name: profile.full_name || 'Unknown',
      title: profile.occupation || profile.headline,
      company: profile.experiences?.[0]?.company,
      location: profile.city || profile.country,
      linkedinUrl: linkedinUrl,
      summary: profile.summary,
      headline: profile.headline,
      experience: profile.experiences?.slice(0, 5).map((exp: any) => ({
        title: exp.title,
        company: exp.company,
        duration: exp.starts_at && exp.ends_at
          ? `${exp.starts_at.year}-${exp.ends_at.year || 'Present'}`
          : undefined,
      })) || [],
      skills: profile.skills || [],
      education: profile.education || [],
    };

  } catch (error) {
    console.error('[Proxycurl] Profile fetch failed:', error);
    return null;
  }
}

/**
 * Test Proxycurl connection
 */
export async function testProxycurlConnection(): Promise<boolean> {
  if (!PROXYCURL_API_KEY) {
    console.error('[Proxycurl] API key not set');
    return false;
  }

  try {
    // Simple test - search for a common term
    const results = await searchLinkedInProxycurl('software engineer', 1);
    console.log(`[Proxycurl] Connection test successful! Found ${results.length} results`);
    return true;
  } catch (error) {
    console.error('[Proxycurl] Connection test failed:', error);
    return false;
  }
}
