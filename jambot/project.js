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
export function updateSession(project, session) {
  project.session = {
    bpm: session.bpm,
    bars: session.bars,
    swing: session.swing,
    // R9D9 (drums)
    drumKit: session.drumKit,
    drumPattern: session.drumPattern,
    drumParams: session.drumParams,
    drumFlam: session.drumFlam,
    drumPatternLength: session.drumPatternLength,
    drumScale: session.drumScale,
    drumGlobalAccent: session.drumGlobalAccent,
    drumVoiceEngines: session.drumVoiceEngines,
    drumUseSample: session.drumUseSample,
    drumAutomation: session.drumAutomation,
    // R3D3 (bass)
    bassPattern: session.bassPattern,
    bassParams: session.bassParams,
    // R1D1 (lead)
    leadPreset: session.leadPreset,
    leadPattern: session.leadPattern,
    leadParams: session.leadParams,
    leadArp: session.leadArp,
    // R9DS (sampler) - save kit ID only, not the actual buffers
    samplerKitId: session.samplerKit?.id || null,
    samplerPattern: session.samplerPattern,
    samplerParams: session.samplerParams,
    // Mixer
    mixer: session.mixer,
    // Song mode (patterns + arrangement)
    patterns: session.patterns,
    currentPattern: session.currentPattern,
    arrangement: session.arrangement,
  };
  saveProject(project);
  return project;
}

// === SESSION RESTORE ===

import { loadKit } from './kit-loader.js';

// Restore session state from a project
export function restoreSession(project) {
  // Reload sampler kit if one was saved
  let samplerKit = null;
  if (project.session?.samplerKitId) {
    try {
      samplerKit = loadKit(project.session.samplerKitId);
    } catch (e) {
      console.warn(`Could not reload sampler kit ${project.session.samplerKitId}:`, e.message);
    }
  }

  return {
    bpm: project.session?.bpm || 128,
    bars: project.session?.bars || 2,
    swing: project.session?.swing || 0,
    // R9D9 (drums)
    drumKit: project.session?.drumKit || 'bart-deep',
    drumPattern: project.session?.drumPattern || {},
    drumParams: project.session?.drumParams || {},
    drumFlam: project.session?.drumFlam || 0,
    drumPatternLength: project.session?.drumPatternLength || 16,
    drumScale: project.session?.drumScale || '16th',
    drumGlobalAccent: project.session?.drumGlobalAccent || 1,
    drumVoiceEngines: project.session?.drumVoiceEngines || {},
    drumUseSample: project.session?.drumUseSample || {},
    drumAutomation: project.session?.drumAutomation || {},
    // R3D3 (bass)
    bassPattern: project.session?.bassPattern || [],
    bassParams: project.session?.bassParams || {},
    // R1D1 (lead)
    leadPreset: project.session?.leadPreset || null,
    leadPattern: project.session?.leadPattern || [],
    leadParams: project.session?.leadParams || {},
    leadArp: project.session?.leadArp || { mode: 'off', octaves: 1, hold: false },
    // R9DS (sampler) - reload kit from ID
    samplerKit: samplerKit,
    samplerPattern: project.session?.samplerPattern || {},
    samplerParams: project.session?.samplerParams || {},
    // Mixer
    mixer: project.session?.mixer || {
      sends: {},
      voiceRouting: {},
      channelInserts: {},
      masterInserts: [],
      masterVolume: 0.8,
    },
    // Song mode (patterns + arrangement)
    patterns: project.session?.patterns || {
      drums: {},
      bass: {},
      lead: {},
      sampler: {},
    },
    currentPattern: project.session?.currentPattern || {
      drums: 'A',
      bass: 'A',
      lead: 'A',
      sampler: 'A',
    },
    arrangement: project.session?.arrangement || [],
  };
}

// === EXPORT ===

import { copyFileSync } from 'fs';
import {
  generateJB01Midi,
  generateJB200Midi,
  generateDrumsMidi,
  generateBassMidi,
  generateLeadMidi,
  generateFullMidi,
  hasContent,
} from './midi.js';

// Generate README.md content for export
function generateReadme(project, session) {
  const lines = [];
  const { hasJB01, hasJB200, hasR9D9, hasR3D3, hasR1D1 } = hasContent(session);

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
    const drumPattern = session.jb01Pattern || session.drumPattern || {};
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

  // JB200 Bass
  lines.push('### JB200 (Bass)');
  if (hasJB200) {
    const bassPattern = session.jb200Pattern || [];
    const activeNotes = bassPattern.filter(s => s?.gate);
    const notes = activeNotes.map(s => s.note);
    const uniqueNotes = [...new Set(notes)];
    lines.push(`- ${activeNotes.length} notes`);
    lines.push(`- Notes used: ${uniqueNotes.join(', ')}`);
  } else {
    lines.push('- (not used)');
  }
  lines.push('');

  // R9D9 Drums
  lines.push('### R9D9 (TR-909 Drums)');
  if (hasR9D9) {
    const drumPattern = session._nodes?.r9d9?.getPattern?.() || {};
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

  // R3D3 Bass
  lines.push('### R3D3 (TB-303 Bass)');
  if (hasR3D3) {
    const bassPattern = session._nodes?.r3d3?.getPattern?.() || [];
    const activeNotes = bassPattern.filter(s => s?.gate);
    const notes = activeNotes.map(s => s.note);
    const uniqueNotes = [...new Set(notes)];
    lines.push(`- ${activeNotes.length} notes`);
    lines.push(`- Notes used: ${uniqueNotes.join(', ')}`);
  } else {
    lines.push('- (not used)');
  }
  lines.push('');

  // R1D1 Lead
  lines.push('### R1D1 (SH-101 Lead)');
  if (hasR1D1) {
    const leadPattern = session._nodes?.r1d1?.getPattern?.() || [];
    const activeNotes = leadPattern.filter(s => s?.gate);
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
  if (hasJB200) lines.push('- `jb200-bass.mid` — JB200 bass pattern');
  if (hasR9D9) lines.push('- `r9d9-drums.mid` — R9D9 (909) drum pattern');
  if (hasR3D3) lines.push('- `r3d3-bass.mid` — R3D3 (303) bass pattern');
  if (hasR1D1) lines.push('- `r1d1-lead.mid` — R1D1 (101) lead pattern');
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

  const { hasJB01, hasJB200, hasR9D9, hasR3D3, hasR1D1, any } = hasContent(session);
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

  // JB200 bass
  if (hasJB200) {
    const jb200MidiPath = join(exportPath, 'jb200-bass.mid');
    generateJB200Midi(exportSession, jb200MidiPath);
    files.push('jb200-bass.mid');
  }

  // R9D9 drums (909)
  if (hasR9D9) {
    const drumsMidiPath = join(exportPath, 'r9d9-drums.mid');
    generateDrumsMidi(exportSession, drumsMidiPath);
    files.push('r9d9-drums.mid');
  }

  // R3D3 bass (303)
  if (hasR3D3) {
    const bassMidiPath = join(exportPath, 'r3d3-bass.mid');
    generateBassMidi(exportSession, bassMidiPath);
    files.push('r3d3-bass.mid');
  }

  // R1D1 lead (101)
  if (hasR1D1) {
    const leadMidiPath = join(exportPath, 'r1d1-lead.mid');
    generateLeadMidi(exportSession, leadMidiPath);
    files.push('r1d1-lead.mid');
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
