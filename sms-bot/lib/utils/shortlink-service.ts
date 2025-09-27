import axios, { AxiosError } from 'axios';

const DEFAULT_TIMEOUT_MS = Number(process.env.SHORTLINK_SERVICE_TIMEOUT_MS || 2000);

export interface ShortLinkOptions {
  context?: string;
  createdFor?: string;
  createdBy?: string;
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
  const token = process.env.SHORTLINK_SERVICE_TOKEN;

  if (!endpoint || !token) {
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
      return shortUrl;
    }
  } catch (error) {
    const axiosError = error as AxiosError;
    console.warn('Short link service request failed:', axiosError.message);
  }

  return null;
}
