import axios, { AxiosError } from 'axios';

const DEFAULT_TIMEOUT_MS = Number(process.env.URL_SHORTENER_TIMEOUT_MS || 1500);

function normalizeUrlCandidate(candidate: unknown, fallback: string): string {
  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return candidate.trim();
  }
  return fallback;
}

function buildGetEndpoint(baseEndpoint: string, longUrl: string): string {
  if (baseEndpoint.includes('{url}')) {
    return baseEndpoint.replace('{url}', encodeURIComponent(longUrl));
  }
  const separator = baseEndpoint.includes('?') ? '&' : '?';
  return `${baseEndpoint}${separator}url=${encodeURIComponent(longUrl)}`;
}

function extractShortUrl(payload: unknown, fallback: string): string {
  if (!payload) {
    return fallback;
  }

  if (typeof payload === 'string') {
    return normalizeUrlCandidate(payload, fallback);
  }

  if (typeof payload === 'object') {
    const candidateKeys = [
      'shortUrl',
      'short_url',
      'shortLink',
      'short_link',
      'url',
      'link',
      'href'
    ];

    for (const key of candidateKeys) {
      const value = (payload as Record<string, unknown>)[key];
      const normalized = normalizeUrlCandidate(value, '');
      if (normalized) {
        return normalized;
      }
    }
  }

  return fallback;
}

export async function shortenUrl(longUrl: string): Promise<string> {
  const endpoint = process.env.URL_SHORTENER_ENDPOINT || process.env.WEBTOYS_SHORTENER_ENDPOINT;

  if (!endpoint) {
    return longUrl;
  }

  // First attempt: POST JSON payload
  try {
    const postResponse = await axios.post(endpoint, { url: longUrl }, {
      timeout: DEFAULT_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const shortUrl = extractShortUrl(postResponse.data, longUrl);
    if (shortUrl !== longUrl) {
      return shortUrl;
    }
  } catch (error) {
    const axiosError = error as AxiosError;
    console.warn('URL shortener POST attempt failed:', axiosError.message);
  }

  // Second attempt: GET with query parameter or placeholder replacement
  try {
    const getEndpoint = buildGetEndpoint(endpoint, longUrl);
    const getResponse = await axios.get(getEndpoint, { timeout: DEFAULT_TIMEOUT_MS });
    const shortUrl = extractShortUrl(getResponse.data, longUrl);
    if (shortUrl !== longUrl) {
      return shortUrl;
    }
  } catch (error) {
    const axiosError = error as AxiosError;
    console.warn('URL shortener GET attempt failed:', axiosError.message);
  }

  return longUrl;
}
