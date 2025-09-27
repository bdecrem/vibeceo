import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

const SLUG_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const DEFAULT_SLUG_LENGTH = 4;
const MAX_SLUG_ATTEMPTS = 12;

interface ShortLinkBody {
  targetUrl?: unknown;
  context?: unknown;
  createdFor?: unknown;
  createdBy?: unknown;
}

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}

function generateSlug(length = DEFAULT_SLUG_LENGTH): string {
  const buffer = randomBytes(length);
  let slug = '';

  for (let i = 0; i < length; i += 1) {
    const index = buffer[i] % SLUG_ALPHABET.length;
    slug += SLUG_ALPHABET[index];
  }

  return slug;
}

function normalizeOptionalString(value: unknown, maxLength = 120): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function getConfiguredToken(): string {
  const token = process.env.SHORTLINK_API_TOKEN;
  if (!token) {
    throw new Error('Missing SHORTLINK_API_TOKEN environment variable');
  }
  return token;
}

function getBaseUrl(): string {
  const configured = process.env.SHORTLINK_BASE_URL || 'https://b52s.me';
  return configured.replace(/\/$/, '');
}

function normalizeTargetUrl(candidate: unknown): string | null {
  if (typeof candidate !== 'string') {
    return null;
  }

  try {
    const parsed = new URL(candidate.trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }

    const incomingToken = authHeader.slice('Bearer '.length).trim();
    const expectedToken = getConfiguredToken();

    if (incomingToken !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabase = getSupabaseClient();
    const body = (await req.json()) as ShortLinkBody;

    const normalizedTarget = normalizeTargetUrl(body.targetUrl);
    if (!normalizedTarget) {
      return NextResponse.json({ error: 'A valid targetUrl is required' }, { status: 400 });
    }

    const context = normalizeOptionalString(body.context);
    const createdFor = normalizeOptionalString(body.createdFor);
    const createdBy = normalizeOptionalString(body.createdBy) || 'api';

    const existing = await supabase
      .from('short_links')
      .select('slug, target_url')
      .eq('target_url', normalizedTarget)
      .maybeSingle();

    if (existing.data?.slug) {
      const shortUrl = `${getBaseUrl()}/l/${existing.data.slug}`;
      return NextResponse.json({
        slug: existing.data.slug,
        shortUrl,
        targetUrl: existing.data.target_url
      });
    }

    let attempts = 0;
    let lastError: unknown = null;

    while (attempts < MAX_SLUG_ATTEMPTS) {
      attempts += 1;
      const slug = generateSlug();

      const { data, error } = await supabase
        .from('short_links')
        .insert({
          slug,
          target_url: normalizedTarget,
          context,
          created_for: createdFor,
          created_by: createdBy
        })
        .select('slug, target_url')
        .single();

      if (!error && data) {
        const shortUrl = `${getBaseUrl()}/l/${data.slug}`;
        return NextResponse.json({
          slug: data.slug,
          shortUrl,
          targetUrl: data.target_url
        }, { status: 201 });
      }

      lastError = error;

      if (error?.code === '23505') {
        continue;
      }

      break;
    }

    console.error('Failed to create short link after multiple attempts:', lastError);
    return NextResponse.json({ error: 'Failed to create short link' }, { status: 500 });
  } catch (error) {
    console.error('Unexpected short link API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
