/**
 * Render Tools
 *
 * Tools for rendering: render
 * Plus project management: rename_project, list_projects, open_project
 *
 * Note: The actual renderSession() function is kept in jambot.js for now
 * since it's 1500+ lines of core engine code. It's passed via context.
 *
 * Analysis tools have been moved to analyze-tools.js
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

    // Format date+time nicely
    const formatDateTime = (isoStr) => {
      const d = new Date(isoStr);
      const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      return `${date} ${time}`;
    };

    const projectList = projects.map((p, i) => {
      const modified = formatDateTime(p.modified);
      const recent = i === 0 ? ' ← most recent' : '';
      return `  ${p.folderName}\n    "${p.name}" • ${p.bpm} BPM • ${p.renderCount} renders • ${modified}${recent}`;
    }).join('\n\n');

    return `Your projects (${projects.length}):\n\n${projectList}\n\nUse /open <folder> or /recent to continue.`;
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
