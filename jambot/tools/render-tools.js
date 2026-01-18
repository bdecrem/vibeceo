/**
 * Render Tools
 *
 * Tools for rendering and analysis: render, analyze_render
 * Plus project management: rename_project, list_projects, open_project
 *
 * Note: The actual renderSession() function is kept in jambot.js for now
 * since it's 1500+ lines of core engine code. It's passed via context.
 */

import { registerTools } from './index.js';
import { listProjects } from '../project.js';

const renderTools = {
  /**
   * Render the session to a WAV file
   * Requires context.renderSession to be provided by the caller
   */
  render: async (input, session, context) => {
    if (!context.renderSession) {
      return 'Error: renderSession not available in context';
    }

    const bars = input.bars || 2;
    // Use provided renderPath from context, or fall back to filename in cwd
    const filename = context.renderPath || `${input.filename}.wav`;

    const result = await context.renderSession(session, bars, filename);

    // Store the rendered file path in session for analyze_render
    session.lastRenderedFile = filename;

    // Notify caller about the render (for project tracking)
    context.onRender?.({ bars, bpm: session.bpm, filename });

    return result;
  },

  /**
   * Analyze a rendered WAV file
   */
  analyze_render: async (input, session, context) => {
    const { filename } = input;
    // Use provided filename, or fall back to session's last rendered file
    const wavPath = filename || session.lastRenderedFile;

    if (!wavPath) {
      return 'No WAV file to analyze. Render first, or provide a filename.';
    }

    try {
      const { analyzeWav, formatAnalysis, getRecommendations } = await import('../analyze.js');
      const analysis = await analyzeWav(wavPath, { bpm: session.bpm });
      const formatted = formatAnalysis(analysis);
      const recommendations = getRecommendations(analysis);

      return `${formatted}\n\nRECOMMENDATIONS:\n${recommendations.map(r => `• ${r}`).join('\n')}`;
    } catch (e) {
      return `Analysis error: ${e.message}`;
    }
  },

  /**
   * Rename the current project
   */
  rename_project: async (input, session, context) => {
    if (!context.onRename) {
      return "No project to rename. Create a beat first.";
    }
    const result = context.onRename(input.name);
    if (result.error) {
      return result.error;
    }
    return `Renamed project to "${result.newName}"`;
  },

  /**
   * List all saved projects
   */
  list_projects: async (input, session, context) => {
    const projects = listProjects();
    if (projects.length === 0) {
      return "No projects found. Create a beat and render to start a project.";
    }
    const projectList = projects.map(p => {
      const date = new Date(p.modified).toLocaleDateString();
      return `  ${p.folderName} - "${p.name}" (${p.bpm} BPM, ${p.renderCount} renders, ${date})`;
    }).join('\n');
    return `Your projects:\n${projectList}\n\nUse open_project to continue working on one.`;
  },

  /**
   * Open an existing project by name
   */
  open_project: async (input, session, context) => {
    if (!context.onOpenProject) {
      return "Cannot open projects in this context.";
    }
    const projects = listProjects();
    const searchTerm = input.name.toLowerCase();
    const found = projects.find(p =>
      p.folderName.toLowerCase().includes(searchTerm) ||
      p.name.toLowerCase().includes(searchTerm)
    );
    if (!found) {
      const available = projects.slice(0, 5).map(p => p.folderName).join(', ');
      return `Project not found: "${input.name}". Recent projects: ${available}`;
    }
    const result = context.onOpenProject(found.folderName);
    if (result.error) {
      return result.error;
    }
    return `Opened project "${result.name}" (${result.bpm} BPM, ${result.renderCount} renders). Session restored.`;
  },
};

registerTools(renderTools);
