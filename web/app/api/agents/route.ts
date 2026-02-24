/**
 * GET /api/agents
 * Returns available agents for the iPhone app to populate its picker.
 */
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const AGENTS = [
  { id: 'mave', name: 'Mave', emoji: '🌊', color: '#00CCCC' },
  { id: 'amber', name: 'Amber', emoji: '🎨', color: '#E8915A' },
];

export async function GET(request: NextRequest) {
  return Response.json({ agents: AGENTS });
}
