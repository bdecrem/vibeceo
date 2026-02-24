import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

export const dynamic = 'force-dynamic';

export async function GET() {
  const AMBER_WS = '/Users/bartssh/.openclaw/agents/amber/workspace';
  const SSH = 'bartssh@100.66.170.98';
  const results: Record<string, string> = {};
  
  const now = new Date();
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(now);
  results.today = today;

  const files = [
    ['memory', `${AMBER_WS}/MEMORY.md`],
    ['soul', `${AMBER_WS}/SOUL.md`],
    ['todayLog', `${AMBER_WS}/memory/${today}.md`],
  ];

  for (const [key, path] of files) {
    try {
      const r = execSync(
        `ssh -o ConnectTimeout=3 -o StrictHostKeyChecking=no ${SSH} "head -3 '${path}' 2>/dev/null || echo FILE_NOT_FOUND"`,
        { encoding: 'utf-8', timeout: 5000 }
      );
      results[key] = r.trim().slice(0, 150);
    } catch(e: any) {
      results[key] = 'SSH_FAILED: ' + e.message.slice(0, 100);
    }
  }

  return NextResponse.json(results);
}
