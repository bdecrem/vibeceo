// jambot/project.js - Project management for Jambot
// Handles project creation, loading, saving, and file organization

import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// === PATHS ===
export const JAMBOT_HOME = join(homedir(), 'Documents', 'Jambot');
export const PROJECTS_DIR = join(JAMBOT_HOME, 'projects');

// Ensure directories exist
export function ensureDirectories() {
  if (!existsSync(JAMBOT_HOME)) {
    mkdirSync(JAMBOT_HOME, { recursive: true });
  }
  if (!existsSync(PROJECTS_DIR)) {
    mkdirSync(PROJECTS_DIR, { recursive: true });
  }
}

// === PROJECT NAMING ===

// Extract keywords from a prompt for auto-naming
// "make me a funky house beat at 122" → "funky-house-122"
export function extractProjectName(prompt, bpm) {
  // Common genre/style keywords to look for
  const keywords = [
    'techno', 'house', 'trance', 'dnb', 'drum and bass', 'dubstep',
    'hip hop', 'hiphop', 'trap', 'lofi', 'lo-fi', 'ambient',
    'funk', 'funky', 'disco', 'acid', 'minimal', 'deep',
    'hard', 'industrial', 'breakbeat', 'garage', 'uk garage',
    'jungle', 'electro', 'synth', 'wave', 'pop', 'rock',
    'jazz', 'latin', 'afro', 'tribal', 'world'
  ];

  const lower = prompt.toLowerCase();
  const found = [];

  for (const kw of keywords) {
    if (lower.includes(kw)) {
      // Normalize multi-word keywords
      found.push(kw.replace(/\s+/g, '-'));
    }
  }

  // Build name from found keywords + BPM
  if (found.length > 0) {
    // Take first 2 keywords max to keep name short
    const nameWords = [...new Set(found)].slice(0, 2);
    return `${nameWords.join('-')}-${bpm}`;
  }

  // Fallback: just use BPM
  return `beat-${bpm}`;
}

// Generate a unique project folder name
export function generateProjectFolderName(baseName) {
  ensureDirectories();

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let folderName = `${baseName}-${date}`;
  let fullPath = join(PROJECTS_DIR, folderName);

  // Handle collisions
  let counter = 2;
  while (existsSync(fullPath)) {
    folderName = `${baseName}-${date}-${counter}`;
    fullPath = join(PROJECTS_DIR, folderName);
    counter++;
  }

  return folderName;
}

// === PROJECT CRUD ===

// Create a new project
export function createProject(name, session, initialPrompt = null) {
  ensureDirectories();

  const folderName = generateProjectFolderName(name);
  const projectPath = join(PROJECTS_DIR, folderName);

  // Create project directory structure
  // Renders go at root level, supporting files in _source/
  mkdirSync(projectPath, { recursive: true });
  mkdirSync(join(projectPath, '_source', 'midi'), { recursive: true });
  mkdirSync(join(projectPath, '_source', 'samples'), { recursive: true });

  const now = new Date().toISOString();

  const project = {
    name: name,
    folderName: folderName,
    created: now,
    modified: now,
    session: {
      bpm: session.bpm,
      bars: session.bars,
      swing: session.swing,
      pattern: session.pattern,
      voiceParams: session.voiceParams,
    },
    renders: [],
    history: initialPrompt ? [{ prompt: initialPrompt, timestamp: now }] : [],
  };

  saveProject(project);
  return project;
}

// Save project state
export function saveProject(project) {
  const projectPath = join(PROJECTS_DIR, project.folderName);
  const projectFile = join(projectPath, 'project.json');

  project.modified = new Date().toISOString();

  writeFileSync(projectFile, JSON.stringify(project, null, 2));
  return project;
}

// Rename a project (display name only, folder stays the same)
export function renameProject(project, newName) {
  const oldName = project.name;
  project.name = newName;
  saveProject(project);
  return { oldName, newName };
}

// Load a project by folder name
export function loadProject(folderName) {
  const projectFile = join(PROJECTS_DIR, folderName, 'project.json');

  if (!existsSync(projectFile)) {
    throw new Error(`Project not found: ${folderName}`);
  }

  const content = readFileSync(projectFile, 'utf-8');
  return JSON.parse(content);
}

// List all projects
export function listProjects() {
  ensureDirectories();

  const folders = readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  const projects = [];
  for (const folder of folders) {
    try {
      const project = loadProject(folder);
      projects.push({
        folderName: folder,
        name: project.name,
        created: project.created,
        modified: project.modified,
        bpm: project.session?.bpm,
        renderCount: project.renders?.length || 0,
      });
    } catch (e) {
      // Skip invalid project folders
    }
  }

  // Sort by modified date, most recent first
  projects.sort((a, b) => new Date(b.modified) - new Date(a.modified));

  return projects;
}

// Get the most recently modified project
export function getMostRecentProject() {
  const projects = listProjects();
  if (projects.length === 0) return null;
  return projects[0]; // Already sorted by modified date, most recent first
}

// === RENDER MANAGEMENT ===

// Get next render version number
export function getNextRenderVersion(project) {
  return (project.renders?.length || 0) + 1;
}

// Get path for next render
export function getRenderPath(project) {
  const version = getNextRenderVersion(project);
  const filename = `v${version}.wav`;
  return {
    version,
    filename,
    fullPath: join(PROJECTS_DIR, project.folderName, filename),
    relativePath: filename,
  };
}

// Record a render in the project
export function recordRender(project, renderInfo) {
  const now = new Date().toISOString();

  project.renders.push({
    version: renderInfo.version,
    file: renderInfo.relativePath,
    bars: renderInfo.bars,
    bpm: renderInfo.bpm,
    timestamp: now,
  });

  saveProject(project);
  return project;
}

// === HISTORY ===

// Add a prompt to history
export function addToHistory(project, prompt) {
  const now = new Date().toISOString();
  project.history.push({ prompt, timestamp: now });
  saveProject(project);
  return project;
}

// Update session state in project
// Uses serializeSession() for complete, consistent serialization
export function updateSession(project, session) {
  // Get complete serialized state from all instruments via ParamSystem
  const serialized = serializeSession(session);

  // Store in project (serializeSession captures everything correctly)
  project.session = serialized;

  // Also store sampler kit ID separately (audio buffers can't be serialized)
  // The kit data is in params.nodes.sampler.kitId, but we duplicate here for clarity
  project.session.samplerKitId = session._nodes?.sampler?.serialize?.()?.kitId || null;

  saveProject(project);
  return project;
}

// === SESSION RESTORE ===

import { loadKit } from './kit-loader.js';
import { createSession, serializeSession, deserializeSession, restoreSessionInPlace } from './core/session.js';

// Restore session state from a project
// Uses deserializeSession() for complete, consistent deserialization
export function restoreSession(project) {
  const saved = project.session || {};

  // Use deserializeSession for complete restore via ParamSystem
  const session = deserializeSession(saved);

  // Special case: reload sampler kit (audio buffers can't be serialized)
  const kitId = saved.samplerKitId || saved.params?.nodes?.sampler?.kitId;
  if (kitId) {
    try {
      session.samplerKit = loadKit(kitId);
    } catch (e) {
      console.warn(`Could not reload sampler kit ${kitId}:`, e.message);
    }
  }

  return session;
}

// Restore session state INTO an existing session object (in-place)
// This is critical for UI callbacks that hold a reference to the session
export function restoreProjectInPlace(existingSession, project) {
  const saved = project.session || {};

  // Update existing session in-place via ParamSystem
  restoreSessionInPlace(existingSession, saved);

  // Special case: reload sampler kit (audio buffers can't be serialized)
  const kitId = saved.samplerKitId || saved.params?.nodes?.sampler?.kitId;
  if (kitId) {
    try {
      existingSession.samplerKit = loadKit(kitId);
    } catch (e) {
      console.warn(`Could not reload sampler kit ${kitId}:`, e.message);
    }
  }
}

// === EXPORT ===

import { copyFileSync } from 'fs';
import {
  generateJB01Midi,
  generateJB202Midi,
  generateFullMidi,
  hasContent,
} from './midi.js';

// Legacy alias
export const generateJB200Midi = generateJB202Midi;

// Generate README.md content for export
function generateReadme(project, session) {
  const lines = [];
  const { hasJB01, hasJB202 } = hasContent(session);

  lines.push(`# ${project.name}`);
  lines.push('');
  lines.push(`Created with [Jambot](https://github.com/bdecrem/jambot)`);
  lines.push('');

  // Session info
  lines.push('## Session');
  lines.push(`- **BPM**: ${session.bpm}`);
  lines.push(`- **Swing**: ${session.swing}%`);
  lines.push(`- **Bars**: ${session.bars || 2}`);
  lines.push('');

  // Instruments
  lines.push('## Instruments');
  lines.push('');

  // JB01 Drums
  lines.push('### JB01 (Drums)');
  if (hasJB01) {
    const drumPattern = session.jb01Pattern || {};
    for (const [voice, pattern] of Object.entries(drumPattern)) {
      const steps = (pattern || [])
        .map((s, i) => s?.velocity > 0 ? i : null)
        .filter(i => i !== null);
      if (steps.length > 0) {
        lines.push(`- ${voice}: steps ${steps.join(', ')}`);
      }
    }
  } else {
    lines.push('- (not used)');
  }
  lines.push('');

  // JB202 Bass
  lines.push('### JB202 (Bass)');
  if (hasJB202) {
    const bassPattern = session.jb202Pattern || [];
    const activeNotes = bassPattern.filter(s => s?.gate);
    const notes = activeNotes.map(s => s.note);
    const uniqueNotes = [...new Set(notes)];
    lines.push(`- ${activeNotes.length} notes`);
    lines.push(`- Notes used: ${uniqueNotes.join(', ')}`);
  } else {
    lines.push('- (not used)');
  }
  lines.push('');

  // History
  if (project.history && project.history.length > 0) {
    lines.push('## History');
    project.history.forEach((h, i) => {
      lines.push(`${i + 1}. "${h.prompt}"`);
    });
    lines.push('');
  }

  // Files
  lines.push('## Files');
  lines.push(`- \`${project.name}.mid\` — Full arrangement (import into any DAW)`);
  if (hasJB01) lines.push('- `jb01-drums.mid` — JB01 drum pattern');
  if (hasJB202) lines.push('- `jb202-bass.mid` — JB202 bass pattern');
  lines.push('- `latest.wav` — Rendered mix');
  lines.push('');

  return lines.join('\n');
}

// Export project to human-readable format
export function exportProject(project, session) {
  const projectPath = join(PROJECTS_DIR, project.folderName);
  const exportPath = join(projectPath, '_source', 'export');

  // Create export directory
  if (!existsSync(exportPath)) {
    mkdirSync(exportPath, { recursive: true });
  }

  const { hasJB01, hasJB202 } = hasContent(session);
  const any = hasJB01 || hasJB202;
  const files = [];

  // Generate README
  const readmePath = join(exportPath, 'README.md');
  writeFileSync(readmePath, generateReadme(project, session));
  files.push('README.md');

  // Add session info to export (for MIDI generation)
  const exportSession = { ...session, name: project.name };

  // Generate MIDI files
  if (any) {
    const fullMidiPath = join(exportPath, `${project.name}.mid`);
    generateFullMidi(exportSession, fullMidiPath);
    files.push(`${project.name}.mid`);
  }

  // JB01 drums
  if (hasJB01) {
    const jb01MidiPath = join(exportPath, 'jb01-drums.mid');
    generateJB01Midi(exportSession, jb01MidiPath);
    files.push('jb01-drums.mid');
  }

  // JB202 bass
  if (hasJB202) {
    const jb202MidiPath = join(exportPath, 'jb202-bass.mid');
    generateJB202Midi(exportSession, jb202MidiPath);
    files.push('jb202-bass.mid');
  }

  // Copy latest render
  const renders = project.renders || [];
  if (renders.length > 0) {
    const latestRender = renders[renders.length - 1];
    const srcPath = join(projectPath, latestRender.file);
    const dstPath = join(exportPath, 'latest.wav');
    if (existsSync(srcPath)) {
      copyFileSync(srcPath, dstPath);
      files.push('latest.wav');
    }
  }

  return {
    path: exportPath,
    files,
  };
}
