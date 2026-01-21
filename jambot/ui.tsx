#!/usr/bin/env node
// jambot/ui.tsx - terminal-native UI for Jambot

import readline from 'node:readline';
import process from 'node:process';
import wrapAnsi from 'wrap-ansi';
import stringWidth from 'string-width';
import {
  createSession,
  runAgentLoop,
  SLASH_COMMANDS,
  SPLASH,
  HELP_TEXT,
  CHANGELOG_TEXT,
  R9D9_GUIDE,
  R3D3_GUIDE,
  R1D1_GUIDE,
  R9DS_GUIDE,
  getApiKey,
  saveApiKey,
  getApiKeyPath,
} from './jambot.js';
import { getAvailableKits, getKitPaths } from './kit-loader.js';
import {
  createProject,
  loadProject,
  listProjects,
  getRenderPath,
  recordRender,
  addToHistory,
  updateSession,
  restoreSession,
  extractProjectName,
  ensureDirectories,
  exportProject,
  renameProject,
  JAMBOT_HOME,
} from './project.js';

const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
};

function styleText(text: string, opts: { color?: keyof typeof COLORS; dim?: boolean }) {
  const parts: string[] = [];
  if (opts.dim) parts.push(COLORS.dim);
  if (opts.color) parts.push(COLORS[opts.color]);
  if (parts.length === 0) return text;
  return `${parts.join('')}${text}${COLORS.reset}`;
}

function getMessageStyle(type: string) {
  switch (type) {
    case 'user':
      return { dim: true, prefix: '> ' };
    case 'tool':
      return { color: 'cyan', prefix: '  ' };
    case 'result':
      return { color: 'gray', prefix: '     ' };
    case 'system':
      return { color: 'yellow', prefix: '' };
    case 'project':
      return { color: 'green', prefix: '' };
    default:
      return { prefix: '' };
  }
}

function getCols() {
  return process.stdout.columns || 80;
}

function getRows() {
  return process.stdout.rows || 24;
}

function cursorTo(col: number, row?: number) {
  readline.cursorTo(process.stdout, col, row);
}

function clearLine() {
  readline.clearLine(process.stdout, 0);
}

function hideCursor() {
  process.stdout.write('\x1b[?25l');
}

function showCursor() {
  process.stdout.write('\x1b[?25h');
}

let footerHeight = 3;

function clearFooter() {
  const rows = getRows();
  const startRow = Math.max(0, rows - footerHeight);
  for (let i = 0; i < footerHeight; i += 1) {
    cursorTo(0, startRow + i);
    clearLine();
  }
}

function buildStatusLine(session: any, project: any) {
  const synths: string[] = [];
  if (session?.drumPattern && Object.keys(session.drumPattern).length > 0) {
    synths.push('R9D9');
  }
  if (session?.bassPattern?.some((s: any) => s.gate)) {
    synths.push('R3D3');
  }
  if (session?.leadPattern?.some((s: any) => s.gate)) {
    synths.push('R1D1');
  }
  if (session?.samplerKit && session?.samplerPattern && Object.keys(session.samplerPattern).length > 0) {
    synths.push('R9DS');
  }
  const synthList = synths.length > 0 ? synths.join('+') : 'empty';
  const swing = session?.swing > 0 ? ` swing ${session.swing}%` : '';
  const version = project ? ` v${(project.renders?.length || 0) + 1}` : '';
  const projectName = project ? project.name : '(no project)';
  const bpm = session?.bpm || 128;

  return `${projectName}${version} | ${bpm} BPM ${synthList}${swing}`;
}

function buildFooterLines(
  width: number,
  input: string,
  cursorIndex: number,
  isProcessing: boolean,
  session: any,
  project: any,
  maskInput: boolean,
) {
  const hairline = '-'.repeat(width);
  const prompt = '> ';
  const status = buildStatusLine(session, project);

  let renderText = input;
  if (maskInput) {
    renderText = '*'.repeat(input.length);
  }

  if (isProcessing) {
    const line = `${prompt}thinking...`;
    return {
      lines: [hairline, line.slice(0, width), styleText(status, { dim: true })],
      cursor: { row: 1, col: Math.min(width, line.length) },
    };
  }

  const maxInputWidth = Math.max(1, width - prompt.length);
  let start = 0;
  if (cursorIndex > maxInputWidth) {
    start = cursorIndex - maxInputWidth;
  }
  const visible = renderText.slice(start, start + maxInputWidth);
  const line = `${prompt}${visible}`;
  const cursorCol = Math.min(width, prompt.length + (cursorIndex - start));

  return {
    lines: [hairline, line.slice(0, width), styleText(status, { dim: true })],
    cursor: { row: 1, col: cursorCol },
  };
}

function renderFooter(
  input: string,
  cursorIndex: number,
  isProcessing: boolean,
  session: any,
  project: any,
  maskInput: boolean,
) {
  const width = getCols();
  const rows = getRows();
  const { lines, cursor } = buildFooterLines(width, input, cursorIndex, isProcessing, session, project, maskInput);

  footerHeight = lines.length;
  const startRow = Math.max(0, rows - footerHeight);

  hideCursor();
  for (let i = 0; i < lines.length; i += 1) {
    cursorTo(0, startRow + i);
    clearLine();
    process.stdout.write(lines[i]);
  }
  cursorTo(cursor.col, startRow + cursor.row);
  showCursor();
}

function emitMessage(type: string, text: string) {
  const style = getMessageStyle(type);
  const prefix = style.prefix || '';
  const prefixWidth = stringWidth(prefix);
  const width = getCols();
  const contentWidth = Math.max(20, width - prefixWidth);
  const indent = ' '.repeat(prefixWidth);

  clearFooter();
  const startRow = Math.max(0, getRows() - footerHeight);
  cursorTo(0, startRow);

  const segments = text.split('\n');
  segments.forEach((segment, segmentIndex) => {
    const wrapped = wrapAnsi(segment, contentWidth, { hard: true }) || '';
    const lines = wrapped.split('\n');
    lines.forEach((line, lineIndex) => {
      const lead = segmentIndex === 0 && lineIndex === 0 ? prefix : indent;
      const styled = styleText(`${lead}${line}`, { color: style.color as any, dim: style.dim });
      process.stdout.write(styled + '\n');
    });
  });
}

function emitMessagesAndFooter(
  type: string,
  text: string,
  input: string,
  cursorIndex: number,
  isProcessing: boolean,
  session: any,
  project: any,
  maskInput: boolean,
) {
  emitMessage(type, text);
  renderFooter(input, cursorIndex, isProcessing, session, project, maskInput);
}

function formatCommandList() {
  return SLASH_COMMANDS.map(cmd => `  ${cmd.name.padEnd(12)} ${cmd.description}`).join('\n');
}

function matchesCommand(input: string) {
  if (!input.startsWith('/')) return [];
  const lower = input.toLowerCase();
  return SLASH_COMMANDS.filter(cmd => cmd.name.startsWith(lower));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

async function main() {
  ensureDirectories();

  let input = '';
  let cursorIndex = 0;
  let isProcessing = false;
  let messages: any[] = [];
  let session = createSession();
  let project: any = null;
  let firstPrompt: string | null = null;
  let history: string[] = [];
  let historyIndex = -1;
  let needsSetup = !getApiKey();
  let setupStep: 'input' | 'confirm' | 'done' = needsSetup ? 'input' : 'done';
  let maskInput = needsSetup;

  const addMessage = (type: string, text: string) => {
    emitMessagesAndFooter(type, text, input, cursorIndex, isProcessing, session, project, maskInput);
  };

  const resetInput = () => {
    input = '';
    cursorIndex = 0;
  };

  const ensureProject = (prompt: string, currentSession: any) => {
    if (project) return project;
    const bpm = currentSession?.bpm || session.bpm;
    const name = extractProjectName(prompt, bpm);
    const newProject = createProject(name, currentSession || session, prompt);
    project = newProject;
    addMessage('project', `New project: ${newProject.name}`);
    addMessage('project', `  ~/Documents/Jambot/projects/${newProject.folderName}/`);
    return newProject;
  };

  const openProject = (folderName: string) => {
    try {
      const loadedProject = loadProject(folderName);
      project = loadedProject;
      const restoredSession = restoreSession(loadedProject);
      session = restoredSession;
      messages = [];
      addMessage('project', `Opened project: ${loadedProject.name}`);
      const renderCount = loadedProject.renders?.length || 0;
      if (renderCount > 0) {
        addMessage('project', `  ${renderCount} render${renderCount !== 1 ? 's' : ''}, last: v${renderCount}.wav`);
      }
    } catch (err: any) {
      addMessage('system', `Error opening project: ${err.message}`);
    }
  };

  const showProjects = () => {
    const projects = listProjects();
    if (projects.length === 0) {
      addMessage('system', 'No projects yet. Start making beats!');
      return;
    }
    const list = projects
      .slice(0, 20)
      .map((p, i) => `  ${String(i + 1).padStart(2, ' ')}. ${p.name} (${p.bpm} BPM, ${p.renderCount} renders)`)
      .join('\n');
    addMessage('system', `Projects\n\n${list}\n\nUse /open <name> to open.`);
  };

  const handleSlashCommand = (cmd: string, args = '') => {
    switch (cmd) {
      case '/exit':
        if (project) {
          updateSession(project, session);
        }
        cleanupAndExit();
        return;
      case '/new':
        if (args) {
          const newProject = createProject(args, session);
          project = newProject;
          addMessage('project', `Created project: ${newProject.name}`);
          addMessage('project', `  ${JAMBOT_HOME}/projects/${newProject.folderName}`);
        } else {
          project = null;
          firstPrompt = null;
        }
        session = createSession();
        messages = [];
        addMessage('system', 'New session started. Project will be created on first render.');
        return;
      case '/open': {
        if (!args) {
          showProjects();
          return;
        }
        const projects = listProjects();
        const found = projects.find(p =>
          p.folderName.toLowerCase().includes(args.toLowerCase()) ||
          p.name.toLowerCase().includes(args.toLowerCase())
        );
        if (found) {
          openProject(found.folderName);
        } else {
          addMessage('system', `Project not found: ${args}`);
        }
        return;
      }
      case '/projects':
        showProjects();
        return;
      case '/clear':
        session = createSession();
        messages = [];
        if (project) {
          addMessage('system', `Session cleared (project: ${project.name})`);
        } else {
          addMessage('system', 'Session cleared');
        }
        return;
      case '/status': {
        const voices = Object.keys(session.pattern || {});
        const voiceList = voices.length > 0 ? voices.join(', ') : '(empty)';
        const tweaks = Object.keys(session.voiceParams || {});
        let statusText = '';
        if (project) {
          statusText += `Project: ${project.name}\n`;
          statusText += `  ${JAMBOT_HOME}/projects/${project.folderName}\n`;
          statusText += `  Renders: ${project.renders?.length || 0}\n`;
        } else {
          statusText += 'Project: (none - will create on first render)\n';
        }
        statusText += `Session: ${session.bpm} BPM`;
        if (session.swing > 0) statusText += `, swing ${session.swing}%`;
        statusText += `\nDrums: ${voiceList}`;
        if (tweaks.length > 0) {
          statusText += `\nTweaks: ${tweaks.map(v => `${v}(${Object.keys(session.voiceParams[v]).join(',')})`).join(', ')}`;
        }
        addMessage('system', statusText);
        return;
      }
      case '/help':
        addMessage('system', HELP_TEXT);
        return;
      case '/changelog':
        addMessage('system', CHANGELOG_TEXT);
        return;
      case '/r9d9':
      case '/909':
        addMessage('system', R9D9_GUIDE);
        return;
      case '/r3d3':
      case '/303':
        addMessage('system', R3D3_GUIDE);
        return;
      case '/r1d1':
      case '/101':
        addMessage('system', R1D1_GUIDE);
        return;
      case '/r9ds':
      case '/sampler':
        addMessage('system', R9DS_GUIDE);
        return;
      case '/kits': {
        const kits = getAvailableKits();
        const paths = getKitPaths();
        let kitsText = 'Available Sample Kits\n\n';
        if (kits.length === 0) {
          kitsText += '  No kits found.\n\n';
        } else {
          for (const kit of kits) {
            const source = kit.source === 'user' ? '[user]' : '[bundled]';
            kitsText += `  ${kit.id.padEnd(12)} ${kit.name.padEnd(20)} ${source}\n`;
          }
          kitsText += '\n';
        }
        kitsText += `Bundled: ${paths.bundled}\n`;
        kitsText += `User:    ${paths.user}\n`;
        kitsText += '\nSay "load the 808 kit" or use load_kit tool.';
        addMessage('system', kitsText);
        return;
      }
      case '/export':
        if (!project) {
          addMessage('system', 'No project to export. Create a beat first!');
          return;
        }
        if (!project.renders || project.renders.length === 0) {
          addMessage('system', 'No renders yet. Make a beat and render it first!');
          return;
        }
        try {
          const exportResult = exportProject(project, session);
          addMessage('project', `Exported to ${project.folderName}/_source/export/`);
          for (const file of exportResult.files) {
            addMessage('project', `  ${file}`);
          }
          addMessage('system', `Open folder: ${exportResult.path}`);
        } catch (err: any) {
          addMessage('system', `Export failed: ${err.message}`);
        }
        return;
      default:
        addMessage('system', `Unknown command: ${cmd}`);
    }
  };

  const handleSubmit = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    if (trimmed === '/') {
      addMessage('system', `Commands\n\n${formatCommandList()}\n\nType a command or /help for details.`);
      return;
    }

    if (trimmed.startsWith('/')) {
      const parts = trimmed.split(' ');
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1).join(' ');
      if (cmd === '/new' || cmd === '/open') {
        handleSlashCommand(cmd, args);
        return;
      }
      const cmdMatch = SLASH_COMMANDS.find(c => c.name === cmd);
      if (cmdMatch) {
        handleSlashCommand(cmdMatch.name);
      } else {
        addMessage('system', `Unknown command: ${trimmed}`);
      }
      return;
    }

    if (!project && !firstPrompt) {
      firstPrompt = trimmed;
    }

    addMessage('user', trimmed);
    isProcessing = true;
    renderFooter(input, cursorIndex, isProcessing, session, project, maskInput);

    let currentProject = project;
    let renderInfo: any = null;

    try {
      await runAgentLoop(
        trimmed,
        session,
        messages,
        {
          onTool: (name: string) => {
            addMessage('tool', name);
          },
          onToolResult: (result: string) => {
            addMessage('result', result);
          },
          onResponse: (text: string) => {
            addMessage('response', text);
          },
        },
        {
          getRenderPath: () => {
            currentProject = ensureProject(firstPrompt || trimmed, session);
            renderInfo = getRenderPath(currentProject);
            return renderInfo.fullPath;
          },
          onRender: (info: any) => {
            if (currentProject && renderInfo) {
              recordRender(currentProject, {
                ...renderInfo,
                bars: info.bars,
                bpm: info.bpm,
              });
              project = { ...currentProject };
              addMessage('project', `  Saved as v${renderInfo.version}.wav`);
            }
          },
          onRename: (newName: string) => {
            if (!currentProject && !project) {
              return { error: 'No project to rename. Create a beat first.' };
            }
            const targetProject = currentProject || project;
            const result = renameProject(targetProject, newName);
            project = { ...targetProject };
            addMessage('project', `  Renamed to "${newName}"`);
            return result;
          },
          onOpenProject: (folderName: string) => {
            try {
              const loadedProject = loadProject(folderName);
              const restoredSession = restoreSession(loadedProject);
              project = loadedProject;
              session = restoredSession;
              currentProject = loadedProject;
              messages = [];
              addMessage('project', `Opened: ${loadedProject.name}`);
              return {
                name: loadedProject.name,
                bpm: restoredSession.bpm,
                renderCount: loadedProject.renders?.length || 0,
              };
            } catch (e: any) {
              return { error: `Could not open project: ${e.message}` };
            }
          },
        }
      );

      if (currentProject) {
        addToHistory(currentProject, trimmed);
        updateSession(currentProject, session);
        project = { ...currentProject };
      }
    } catch (err: any) {
      addMessage('system', `Error: ${err.message}`);
    }

    isProcessing = false;
    renderFooter(input, cursorIndex, isProcessing, session, project, maskInput);
  };

  const cleanupAndExit = () => {
    showCursor();
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
    process.exit(0);
  };

  if (process.stdin.isTTY) {
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
  }

  process.on('SIGINT', () => cleanupAndExit());
  process.stdout.on('resize', () => {
    renderFooter(input, cursorIndex, isProcessing, session, project, maskInput);
  });

  emitMessage('system', SPLASH.trimEnd());

  if (needsSetup) {
    emitMessage('system', 'To make beats, you need an Anthropic API key.');
    emitMessage('system', 'Get one at: console.anthropic.com');
    emitMessage('system', 'Paste your key:');
  }

  renderFooter(input, cursorIndex, isProcessing, session, project, maskInput);

  process.stdin.on('keypress', async (str, key) => {
    if (key.ctrl && key.name === 'c') {
      cleanupAndExit();
      return;
    }

    if (needsSetup) {
      if (setupStep === 'confirm') {
        if (str.toLowerCase() === 'y') {
          saveApiKey(input.trim());
          needsSetup = false;
          setupStep = 'done';
          maskInput = false;
          resetInput();
          addMessage('system', 'API key saved.');
        } else if (str.toLowerCase() === 'n') {
          process.env.ANTHROPIC_API_KEY = input.trim();
          needsSetup = false;
          setupStep = 'done';
          maskInput = false;
          resetInput();
          addMessage('system', 'API key set for this session.');
        }
        renderFooter(input, cursorIndex, isProcessing, session, project, maskInput);
        return;
      }

      if (key.name === 'return') {
        const trimmed = input.trim();
        if (!trimmed.startsWith('sk-ant-')) {
          addMessage('system', 'Key should start with sk-ant-');
          resetInput();
          renderFooter(input, cursorIndex, isProcessing, session, project, maskInput);
          return;
        }
        if (trimmed.length < 20) {
          addMessage('system', 'Key seems too short');
          resetInput();
          renderFooter(input, cursorIndex, isProcessing, session, project, maskInput);
          return;
        }
        setupStep = 'confirm';
        addMessage('system', `Save to ${getApiKeyPath()} so you don't have to enter it again? (y/n)`);
        renderFooter(input, cursorIndex, isProcessing, session, project, maskInput);
        return;
      }
    }

    if (isProcessing) {
      return;
    }

    if (key.name === 'return') {
      const current = input;
      if (current.trim().length > 0) {
        history.push(current);
        historyIndex = history.length;
      }
      resetInput();
      renderFooter(input, cursorIndex, isProcessing, session, project, maskInput);
      await handleSubmit(current);
      return;
    }

    if (key.name === 'backspace') {
      if (cursorIndex > 0) {
        input = input.slice(0, cursorIndex - 1) + input.slice(cursorIndex);
        cursorIndex -= 1;
      }
      renderFooter(input, cursorIndex, isProcessing, session, project, maskInput);
      return;
    }

    if (key.name === 'delete') {
      if (cursorIndex < input.length) {
        input = input.slice(0, cursorIndex) + input.slice(cursorIndex + 1);
      }
      renderFooter(input, cursorIndex, isProcessing, session, project, maskInput);
      return;
    }

    if (key.name === 'left') {
      cursorIndex = clamp(cursorIndex - 1, 0, input.length);
      renderFooter(input, cursorIndex, isProcessing, session, project, maskInput);
      return;
    }

    if (key.name === 'right') {
      cursorIndex = clamp(cursorIndex + 1, 0, input.length);
      renderFooter(input, cursorIndex, isProcessing, session, project, maskInput);
      return;
    }

    if (key.ctrl && key.name === 'a') {
      cursorIndex = 0;
      renderFooter(input, cursorIndex, isProcessing, session, project, maskInput);
      return;
    }

    if (key.ctrl && key.name === 'e') {
      cursorIndex = input.length;
      renderFooter(input, cursorIndex, isProcessing, session, project, maskInput);
      return;
    }

    if (key.name === 'up') {
      if (history.length > 0) {
        historyIndex = clamp(historyIndex - 1, 0, history.length - 1);
        input = history[historyIndex] || '';
        cursorIndex = input.length;
        renderFooter(input, cursorIndex, isProcessing, session, project, maskInput);
      }
      return;
    }

    if (key.name === 'down') {
      if (history.length > 0) {
        historyIndex = clamp(historyIndex + 1, 0, history.length);
        if (historyIndex >= history.length) {
          input = '';
        } else {
          input = history[historyIndex] || '';
        }
        cursorIndex = input.length;
        renderFooter(input, cursorIndex, isProcessing, session, project, maskInput);
      }
      return;
    }

    if (key.name === 'tab') {
      const matches = matchesCommand(input);
      if (matches.length > 0) {
        input = matches[0].name;
        cursorIndex = input.length;
        renderFooter(input, cursorIndex, isProcessing, session, project, maskInput);
      }
      return;
    }

    if (key.name === 'escape') {
      return;
    }

    if (str && !key.ctrl && !key.meta) {
      input = input.slice(0, cursorIndex) + str + input.slice(cursorIndex);
      cursorIndex += str.length;
      renderFooter(input, cursorIndex, isProcessing, session, project, maskInput);
    }
  });
}

main().catch(err => {
  showCursor();
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
