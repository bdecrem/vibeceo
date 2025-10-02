import { Buffer } from 'node:buffer';
import { supabase } from '../lib/supabase.js';

const DEFAULT_BUCKET = process.env.AGENT_REPORTS_BUCKET || 'agent-reports';

interface StoreReportInput {
  agent: string;
  date: string;
  markdown: string;
  summary: string;
}

export interface StoredReportMetadata {
  agent: string;
  date: string;
  summary: string;
  reportPath: string;
  metadataPath: string;
  createdAt: string;
  publicUrl?: string | null;
}

async function ensureBucketExists(bucket: string): Promise<void> {
  const { data, error } = await supabase.storage.getBucket(bucket);

  if (!error && data) {
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(bucket, {
    public: false,
  });

  if (createError) {
    const status = (createError as { status?: number }).status;
    if (status === undefined || status !== 409) {
      throw createError;
    }
  }
}

export async function storeAgentReport(
  input: StoreReportInput,
  bucket: string = DEFAULT_BUCKET
): Promise<StoredReportMetadata> {
  await ensureBucketExists(bucket);

  const reportPath = `${input.agent}/reports/${input.date}.md`;
  const metadataPath = `${input.agent}/metadata/${input.date}.json`;
  const createdAt = new Date().toISOString();

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(reportPath, Buffer.from(input.markdown, 'utf-8'), {
      contentType: 'text/markdown',
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: publicData } = supabase.storage
    .from(bucket)
    .getPublicUrl(reportPath);

  const publicUrl = normalizeUrlCandidate(publicData?.publicUrl) ?? null;

  const metadata: StoredReportMetadata = {
    agent: input.agent,
    date: input.date,
    summary: input.summary,
    reportPath,
    metadataPath,
    createdAt,
    publicUrl,
  };

  const { error: metadataError } = await supabase.storage
    .from(bucket)
    .upload(
      metadataPath,
      Buffer.from(JSON.stringify(metadata, null, 2), 'utf-8'),
      {
        contentType: 'application/json',
        upsert: true,
      }
    );

  if (metadataError) {
    throw metadataError;
  }

  return metadata;
}

export async function getLatestReportMetadata(
  agent: string,
  bucket: string = DEFAULT_BUCKET
): Promise<StoredReportMetadata | null> {
  await ensureBucketExists(bucket);

  const { data: entries, error } = await supabase.storage
    .from(bucket)
    .list(`${agent}/metadata`, {
      limit: 1,
      sortBy: { column: 'name', order: 'desc' },
    });

  if (error) {
    throw error;
  }

  if (!entries || entries.length === 0) {
    return null;
  }

  const latestEntry = entries[0];
  const metadataPath = `${agent}/metadata/${latestEntry.name}`;

  const { data: file, error: downloadError } = await supabase.storage
    .from(bucket)
    .download(metadataPath);

  if (downloadError) {
    throw downloadError;
  }

  const content = await file.text();
  return JSON.parse(content) as StoredReportMetadata;
}

export async function createReportSignedUrl(
  reportPath: string,
  expiresInSeconds: number = 60 * 60 * 24,
  bucket: string = DEFAULT_BUCKET
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(reportPath, expiresInSeconds);

  if (error) {
    console.error('Failed to create signed URL:', error);
    return null;
  }

  return data?.signedUrl ?? null;
}

export async function getReportPublicUrl(
  reportPath: string,
  bucket: string = DEFAULT_BUCKET
): Promise<string | null> {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(reportPath);

  return normalizeUrlCandidate(data?.publicUrl);
}

function normalizeUrlCandidate(candidate: unknown): string | null {
  if (typeof candidate !== 'string') {
    return null;
  }

  const trimmed = candidate.trim();
  return trimmed.length ? trimmed : null;
}
