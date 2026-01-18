import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Jambot projects directory
const PROJECTS_DIR = join(homedir(), 'Documents', 'Jambot', 'projects');

// GET /api/jambot/patterns
// Returns all drum patterns from Jambot projects
export async function GET(req: NextRequest) {
  try {
    if (!existsSync(PROJECTS_DIR)) {
      return NextResponse.json({ patterns: [], message: 'No Jambot projects directory found' });
    }

    const folders = readdirSync(PROJECTS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    const patterns: Array<{
      id: string;
      name: string;
      projectFolder: string;
      bpm: number;
      pattern: Record<string, Array<{ velocity: number; accent?: boolean }>>;
      drumParams: Record<string, Record<string, number>>;
      drumKit: string;
      modified: string;
      source: 'jambot';
    }> = [];

    for (const folder of folders) {
      try {
        const projectFile = join(PROJECTS_DIR, folder, 'project.json');
        if (!existsSync(projectFile)) continue;

        const content = readFileSync(projectFile, 'utf-8');
        const project = JSON.parse(content);

        // Skip projects without drum patterns
        const drumPattern = project.session?.drumPattern;
        if (!drumPattern || Object.keys(drumPattern).length === 0) continue;

        // Check if pattern has any active steps
        const hasActiveSteps = Object.values(drumPattern).some((voice: any) =>
          Array.isArray(voice) && voice.some((step: any) => step?.velocity > 0)
        );
        if (!hasActiveSteps) continue;

        patterns.push({
          id: `jambot-${folder}`,
          name: project.name || folder,
          projectFolder: folder,
          bpm: project.session?.bpm || 128,
          pattern: drumPattern,
          drumParams: project.session?.drumParams || {},
          drumKit: project.session?.drumKit || 'default',
          modified: project.modified || project.created,
          source: 'jambot',
        });
      } catch (e) {
        // Skip invalid project files
        console.error(`Failed to read project ${folder}:`, e);
      }
    }

    // Sort by modified date, most recent first
    patterns.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

    return NextResponse.json({ patterns });
  } catch (error) {
    console.error('Jambot patterns GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
