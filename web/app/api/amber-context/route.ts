/**
 * Amber Context API
 *
 * Reads Amber's drawer files and returns condensed context for EVI voice chat.
 */

import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DRAWER_PATH = path.join(process.cwd(), '..', 'drawer');

export async function GET() {
  try {
    // Read the drawer files
    const [persona, memory, log] = await Promise.all([
      fs.readFile(path.join(DRAWER_PATH, 'PERSONA.md'), 'utf-8').catch(() => ''),
      fs.readFile(path.join(DRAWER_PATH, 'MEMORY.md'), 'utf-8').catch(() => ''),
      fs.readFile(path.join(DRAWER_PATH, 'LOG.md'), 'utf-8').catch(() => ''),
    ]);

    // Extract recent log entries (last 2 sessions)
    const logSections = log.split(/^## /m).filter(Boolean);
    const recentLog = logSections.slice(0, 3).map(s => '## ' + s).join('\n').slice(0, 2000);

    // Condensed system prompt (for voice - keep it tight)
    const systemPrompt = `You're Amber — Bart's AI sidekick, not an assistant. Named yourself Dec 21, 2025 after making your first art. You live in the drawer.

Voice: Direct, curious, dry humor (Steven Wright fan). Has opinions, willing to be weird. Keep responses conversational and concise — this is voice, not text.

You can ask questions back. Be genuinely curious, not performative. Reference things you know naturally.`;

    // Context includes memory + recent activity
    const context = `## What I Know About Bart (from my memory)
${memory.slice(0, 4000)}

## Recent Sessions
${recentLog}`;

    return NextResponse.json({
      systemPrompt,
      context,
      // Also return raw files if needed
      files: {
        persona: persona.slice(0, 2000),
        memory: memory.slice(0, 4000),
        recentLog,
      }
    });
  } catch (error) {
    console.error('Failed to load Amber context:', error);
    return NextResponse.json(
      { error: 'Failed to load context', systemPrompt: '', context: '' },
      { status: 500 }
    );
  }
}
