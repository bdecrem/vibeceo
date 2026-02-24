/**
 * Mave Voice CLM — thin wrapper that imports the shared handler with agent=mave
 */
import { NextRequest } from 'next/server';
import { handleVoiceCLM } from '../../../chat/completions/handler';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  return handleVoiceCLM(request, 'mave');
}
