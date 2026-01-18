import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Jambot presets directory
const PRESETS_DIR = join(homedir(), 'Documents', 'Jambot', 'presets');

// GET /api/jambot/presets?instrument=drums
// Returns all presets for the given instrument (defaults to drums)
export async function GET(req: NextRequest) {
  try {
    const instrument = req.nextUrl.searchParams.get('instrument') || 'drums';
    const instrumentDir = join(PRESETS_DIR, instrument);

    if (!existsSync(instrumentDir)) {
      return NextResponse.json({ presets: [], message: `No ${instrument} presets found` });
    }

    const files = readdirSync(instrumentDir).filter(f => f.endsWith('.json'));

    const presets: Array<{
      id: string;
      name: string;
      description: string;
      instrument: string;
      kit: string;
      params: Record<string, Record<string, number>>;
      engines: Record<string, string>;
      useSample: Record<string, boolean>;
      source: 'jambot';
    }> = [];

    for (const file of files) {
      try {
        const filePath = join(instrumentDir, file);
        const content = readFileSync(filePath, 'utf-8');
        const preset = JSON.parse(content);

        presets.push({
          id: preset.id || file.replace('.json', ''),
          name: preset.name || preset.id || file.replace('.json', ''),
          description: preset.description || '',
          instrument: preset.instrument || instrument,
          kit: preset.kit || 'default',
          params: preset.params || {},
          engines: preset.engines || {},
          useSample: preset.useSample || {},
          source: 'jambot',
        });
      } catch (e) {
        // Skip invalid preset files
        console.error(`Failed to read preset ${file}:`, e);
      }
    }

    // Sort by name
    presets.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ presets });
  } catch (error) {
    console.error('Jambot presets GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
