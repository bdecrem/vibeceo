/**
 * GET /api/agents
 * Returns available agents for the iPhone app to populate its picker.
 */
import { NextRequest } from 'next/server';
import { checkAuth } from '../auth-guard';

export const dynamic = 'force-dynamic';

const AGENTS = [
  { id: 'mave', name: 'Mave', emoji: '🌊', color: '#00CCCC' },
];

export async function GET(request: NextRequest) {
  const authError = checkAuth(request);
  if (authError) return authError;
  return Response.json({ agents: AGENTS });
}
