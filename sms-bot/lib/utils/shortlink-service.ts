import axios, { AxiosError } from 'axios';

const DEFAULT_TIMEOUT_MS = Number(process.env.SHORTLINK_SERVICE_TIMEOUT_MS || 2000);

export interface ShortLinkOptions {
  context?: string;
  createdFor?: string;
  createdBy?: string;
}

const LEGACY_SHORTLINK_HOSTS = new Set(['b52s.me', 'www.b52s.me']);
const CURRENT_SHORTLINK_HOST = 'kochi.to';

export function normalizeShortLinkDomain(shortUrl: string): string {
  try {
    const parsed = new URL(shortUrl);

    if (LEGACY_SHORTLINK_HOSTS.has(parsed.hostname)) {
      parsed.hostname = CURRENT_SHORTLINK_HOST;
      parsed.protocol = 'https:';
      parsed.port = '';
      return parsed.toString();
    }

    return shortUrl;
  } catch {
    return shortUrl;
  }
}

function normalizeUrlCandidate(candidate: unknown): string | null {
  if (typeof candidate !== 'string') {
    return null;
  }

  const trimmed = candidate.trim();
  return trimmed.length ? trimmed : null;
}

export async function createShortLink(
  targetUrl: string,
  options: ShortLinkOptions = {}
): Promise<string | null> {
  const endpoint = process.env.SHORTLINK_SERVICE_URL;
  const token =
    process.env.SHORTLINK_SERVICE_TOKEN || process.env.SHORTLINK_API_TOKEN;

  if (!endpoint || !token) {
    console.warn(
      'Short link service disabled: missing',
      !endpoint ? 'SHORTLINK_SERVICE_URL' : '',
      'and/or',
      !token ? 'SHORTLINK_SERVICE_TOKEN' : ''
    );
    return null;
  }

  try {
    const response = await axios.post(endpoint, {
      targetUrl,
      context: options.context,
      createdFor: options.createdFor,
      createdBy: options.createdBy
    }, {
      timeout: DEFAULT_TIMEOUT_MS,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const shortUrl = normalizeUrlCandidate(response.data?.shortUrl);
    if (shortUrl) {
      return normalizeShortLinkDomain(shortUrl);
    }
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    console.warn('Short link service request failed:', axiosError.message);
    if (axiosError.response) {
      console.warn(
        'Short link service response:',
        axiosError.response.status,
        axiosError.response.data
      );
    } else if (axiosError.request) {
      console.warn('Short link service request made with no response received');
    } else {
      console.warn('Short link service unexpected error:', error);
    }
  }

  return null;
}
