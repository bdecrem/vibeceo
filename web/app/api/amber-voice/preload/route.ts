/**
 * Preload: Fetch from Supabase ONCE, write to local drawer files.
 * Voice endpoint reads from local files - no Supabase calls during conversation.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const DRAWER_PATH = path.join(process.cwd(), '..', 'drawer');

export async function POST() {
  const startTime = Date.now();

  try {
    console.log('[preload] Fetching from Supabase...');

    // Fetch from Supabase
    const [personaResult, memoryResult, logResult, blogResult] = await Promise.all([
      supabase
        .from('amber_state')
        .select('content')
        .eq('type', 'persona')
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('amber_state')
        .select('content')
        .eq('type', 'memory')
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('amber_state')
        .select('content')
        .eq('type', 'log_entry')
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('amber_state')
        .select('content, metadata')
        .eq('type', 'blog_post')
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
    ]);

    const persona = personaResult.data?.content || '';
    const memory = memoryResult.data?.content || '';
    const logEntries = logResult.data || [];
    const log = '# Log\n\nRecent entries:\n\n' + logEntries.map(l => l.content).join('\n\n---\n\n');

    // Latest blog post (just title + summary for context)
    const blogData = blogResult.data;
    const blog = blogData
      ? `# Latest Blog Post\n\n**${blogData.metadata?.title}** (${blogData.metadata?.date})\n${blogData.metadata?.summary}`
      : '';

    // Write to local drawer files
    await Promise.all([
      fs.writeFile(path.join(DRAWER_PATH, 'PERSONA.md'), persona),
      fs.writeFile(path.join(DRAWER_PATH, 'MEMORY.md'), memory),
      fs.writeFile(path.join(DRAWER_PATH, 'LOG.md'), log),
      fs.writeFile(path.join(DRAWER_PATH, 'BLOG.md'), blog),
    ]);

    const loadTime = Date.now() - startTime;
    console.log(`[preload] Synced Supabase → drawer in ${loadTime}ms`);
    console.log(`[preload] Persona: ${persona.length}, Memory: ${memory.length}, Log: ${log.length}, Blog: ${blog.length} chars`);

    return Response.json({
      success: true,
      source: 'supabase',
      loadTimeMs: loadTime,
      persona: persona.length,
      memory: memory.length,
      log: log.length,
      blog: blog.length,
    });
  } catch (error) {
    console.error('[preload] Error:', error);
    return Response.json({ success: false, error: String(error) }, { status: 500 });
  }
}
