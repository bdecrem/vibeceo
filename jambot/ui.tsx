#!/usr/bin/env node
// jambot/ui.tsx - Ink-based TUI for Jambot

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { render, Box, Text, useInput, useApp, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import wrapAnsi from 'wrap-ansi';
import stringWidth from 'string-width';
import {
  createSession,
  runAgentLoop,
  SLASH_COMMANDS,
  SPLASH,
  HELP_TEXT,
  CHANGELOG_TEXT,
  JB01_GUIDE,
  JB200_GUIDE,
  DELAY_GUIDE,
  getApiKey,
  saveApiKey,
  getApiKeyPath,
  buildMixOverview,
} from './jambot.js';
import { getAvailableKits, getKitPaths } from './kit-loader.js';
import {
  createProject,
  loadProject,
  listProjects,
  getMostRecentProject,
  saveProject,
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
  PROJECTS_DIR,
} from './project.js';

// === HAIRLINE COMPONENT ===
function Hairline() {
  const { stdout } = useStdout();
  const width = stdout?.columns || 80;
  return <Text dimColor>{'─'.repeat(width)}</Text>;
}

// === SPLASH COMPONENT ===
function Splash() {
  return (
    <Box flexDirection="column">
      <Text>{SPLASH}</Text>
    </Box>
  );
}

// === SETUP WIZARD ===
function SetupWizard({ onComplete }) {
  const [apiKey, setApiKey] = useState('');
  const [step, setStep] = useState('input'); // 'input' | 'confirm' | 'done'
  const [error, setError] = useState('');

  const handleSubmit = useCallback((value) => {
    const trimmed = value.trim();

    // Validate key format
    if (!trimmed.startsWith('sk-ant-')) {
      setError('Key should start with sk-ant-');
      return;
    }

    if (trimmed.length < 20) {
      setError('Key seems too short');
      return;
    }

    setApiKey(trimmed);
    setStep('confirm');
  }, []);

  const handleConfirm = useCallback((save) => {
    if (save) {
      saveApiKey(apiKey);
    } else {
      // Just set in environment for this session
      process.env.ANTHROPIC_API_KEY = apiKey;
    }
    onComplete();
  }, [apiKey, onComplete]);

  useInput((input, key) => {
    if (step === 'confirm') {
      if (input.toLowerCase() === 'y') {
        handleConfirm(true);
      } else if (input.toLowerCase() === 'n') {
        handleConfirm(false);
      }
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1} flexDirection="column">
        <Text bold color="cyan">Welcome to Jambot</Text>
        <Text> </Text>

        {step === 'input' && (
          <>
            <Text>To make beats, you need an Anthropic API key.</Text>
            <Text dimColor>Get one at: console.anthropic.com</Text>
            <Text> </Text>
            {error && <Text color="red">{error}</Text>}
            <Box>
              <Text>Paste your key: </Text>
              <TextInput
                value={apiKey}
                onChange={setApiKey}
                onSubmit={handleSubmit}
                mask="*"
              />
            </Box>
          </>
        )}

        {step === 'confirm' && (
          <>
            <Text color="green">Key accepted.</Text>
            <Text> </Text>
            <Text>Save to {getApiKeyPath()} so you don't have to enter it again?</Text>
            <Text> </Text>
            <Text bold>(y/n) </Text>
          </>
        )}
      </Box>
    </Box>
  );
}

// === MESSAGE STYLING (module level for reuse) ===
function getMessageStyle(type: string) {
  switch (type) {
    case 'user': return { dimColor: true, prefix: '> ' };
    case 'tool': return { color: 'cyan', prefix: '  ' };
    case 'result': return { color: 'gray', prefix: '     ' };
    case 'system': return { color: 'yellow', prefix: '' };
    case 'project': return { color: 'green', prefix: '' };
    default: return { prefix: '' };
  }
}

// Calculate visual line count for a message at given terminal width
function getVisualLineCount(msg: { type: string; text: string }, width: number): number {
  const style = getMessageStyle(msg.type);
  const prefixWidth = stringWidth(style.prefix);
  const contentWidth = Math.max(20, width - prefixWidth);

  // Wrap the text and count resulting lines
  const wrapped = wrapAnsi(msg.text, contentWidth, { hard: true });
  return wrapped.split('\n').length;
}

// === MESSAGES COMPONENT ===
function Messages({ messages, maxHeight, width, scrollOffset }) {
  // Calculate total lines and per-message line counts
  const lineCounts = messages.map(msg => getVisualLineCount(msg, width));
  const totalLines = lineCounts.reduce((a, b) => a + b, 0);

  // scrollOffset = 0 means show most recent (bottom), higher = scroll up (see older)
  const maxScrollOffset = Math.max(0, totalLines - maxHeight);
  const effectiveOffset = Math.min(scrollOffset, maxScrollOffset);

  // Find which messages to show based on scroll position
  // Work backwards from the end, skipping lines based on offset
  let linesFromEnd = effectiveOffset;
  let endIndex = messages.length;

  for (let i = messages.length - 1; i >= 0 && linesFromEnd > 0; i--) {
    if (linesFromEnd >= lineCounts[i]) {
      linesFromEnd -= lineCounts[i];
      endIndex = i;
    } else {
      break;
    }
  }

  // Now find start index to fill maxHeight
  let visibleLines = 0;
  let startIndex = endIndex;

  for (let i = endIndex - 1; i >= 0; i--) {
    const msgLines = lineCounts[i];
    if (visibleLines + msgLines <= maxHeight) {
      visibleLines += msgLines;
      startIndex = i;
    } else {
      break;
    }
  }

  const visibleMessages = messages.slice(startIndex, endIndex);
  const hasMoreAbove = startIndex > 0;
  const hasMoreBelow = effectiveOffset > 0;

  return (
    <Box flexDirection="column" flexGrow={1}>
      {hasMoreAbove && (
        <Text dimColor>  ↑ {startIndex} older messages (scroll up)</Text>
      )}
      {visibleMessages.map((msg, i) => (
        <MessageLine key={startIndex + i} message={msg} width={width} />
      ))}
      {hasMoreBelow && (
        <Text dimColor>  ↓ scroll down for recent</Text>
      )}
    </Box>
  );
}

function MessageLine({ message, width, skipLines = 0, maxLines = undefined }) {
  const style = getMessageStyle(message.type);
  const prefixWidth = stringWidth(style.prefix);
  const contentWidth = Math.max(20, width - prefixWidth);

  // Pre-wrap the text at content width (handles ANSI codes, emojis, wide chars)
  const wrapped = wrapAnsi(message.text, contentWidth, { hard: true });
  let lines = wrapped.split('\n');

  // Apply line slicing for partial visibility during scroll
  if (skipLines > 0) {
    lines = lines.slice(skipLines);
  }
  if (maxLines !== undefined) {
    lines = lines.slice(0, maxLines);
  }

  // Indent for continuation lines (same width as prefix, but spaces)
  const indent = ' '.repeat(prefixWidth);

  // Extract style props without prefix for Text component
  const { prefix, ...textStyle } = style;

  // Adjust prefix display: if we skipped lines, don't show prefix on first visible line
  const showPrefix = skipLines === 0;

  return (
    <Box flexDirection="column">
      {lines.map((line, i) => (
        <Text key={i} {...textStyle}>{(i === 0 && showPrefix) ? prefix : indent}{line}</Text>
      ))}
    </Box>
  );
}

// === AUTOCOMPLETE COMPONENT ===
function Autocomplete({ suggestions, selectedIndex }) {
  if (suggestions.length === 0) return null;

  return (
    <Box flexDirection="column" marginBottom={1}>
      {suggestions.map((cmd, i) => (
        <Box key={cmd.name}>
          <Text inverse={i === selectedIndex}>
            {`  ${cmd.name.padEnd(12)} ${cmd.description}`}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

// === INPUT BAR COMPONENT ===
function InputBar({ value, onChange, onSubmit, isProcessing, suggestions, selectedIndex, onSelectSuggestion }) {
  useInput((input, key) => {
    if (isProcessing) return;

    if (key.tab && suggestions.length > 0) {
      onSelectSuggestion(suggestions[selectedIndex].name);
    }
  });

  return (
    <Box>
      <Text color="green">&gt; </Text>
      {isProcessing ? (
        <Text dimColor>thinking...</Text>
      ) : (
        <TextInput
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          placeholder=""
        />
      )}
    </Box>
  );
}

// === STATUS BAR COMPONENT ===
function StatusBar({ session, project }) {
  // Build list of active synths
  const synths = [];
  if (session?.drumPattern && Object.keys(session.drumPattern).length > 0) {
    synths.push('R9D9');
  }
  if (session?.bassPattern?.some(s => s.gate)) {
    synths.push('R3D3');
  }
  if (session?.leadPattern?.some(s => s.gate)) {
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

  return (
    <Box>
      <Text dimColor>
        {projectName}{version} | {bpm} BPM {synthList}{swing}
      </Text>
    </Box>
  );
}

// === SLASH MENU COMPONENT ===
function SlashMenu({ onSelect, onCancel, selectedIndex }) {
  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  return (
    <Box flexDirection="column" borderStyle="single" paddingX={1}>
      <Text bold>Commands</Text>
      <Text> </Text>
      {SLASH_COMMANDS.map((cmd, i) => (
        <Box key={cmd.name}>
          <Text inverse={i === selectedIndex}>
            {`  ${cmd.name.padEnd(12)} ${cmd.description}`}
          </Text>
        </Box>
      ))}
      <Text> </Text>
      <Text dimColor>  Enter to select, Esc to cancel</Text>
    </Box>
  );
}

// === PROJECT LIST COMPONENT ===
function ProjectList({ projects, selectedIndex, onSelect, onCancel }) {
  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  if (projects.length === 0) {
    return (
      <Box flexDirection="column" borderStyle="single" paddingX={1}>
        <Text bold>Projects</Text>
        <Text> </Text>
        <Text dimColor>  No projects yet. Start making beats!</Text>
        <Text> </Text>
        <Text dimColor>  Press Esc to close</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="single" paddingX={1}>
      <Text bold>Projects</Text>
      <Text> </Text>
      {projects.slice(0, 10).map((p, i) => (
        <Box key={p.folderName}>
          <Text inverse={i === selectedIndex}>
            {`  ${p.name.padEnd(20)} ${p.bpm} BPM  ${p.renderCount} renders`}
          </Text>
        </Box>
      ))}
      <Text> </Text>
      <Text dimColor>  Enter to open, Esc to cancel</Text>
    </Box>
  );
}


// === MAIN APP COMPONENT ===
function App() {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // API key state - check on mount
  const [needsSetup, setNeedsSetup] = useState(() => !getApiKey());

  // Session state
  const [input, setInput] = useState('');
  const [session, setSession] = useState(createSession());
  const [agentMessages, setAgentMessages] = useState([]);
  const [displayMessages, setDisplayMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // UI state
  const [showSplash, setShowSplash] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showProjectList, setShowProjectList] = useState(false);
  const [menuIndex, setMenuIndex] = useState(0);
  const [projectListIndex, setProjectListIndex] = useState(0);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);  // 0 = most recent, higher = scroll up

  // Project state
  const [project, setProject] = useState(null);
  const [projectsList, setProjectsList] = useState([]);
  const firstPromptRef = useRef(null);

  // Calculate available height for messages (must be before hooks that use it)
  const terminalHeight = stdout?.rows || 24;
  const reservedLines = 4;
  const maxMessageHeight = Math.max(5, terminalHeight - reservedLines);

  // Ensure directories on mount
  useEffect(() => {
    ensureDirectories();
  }, []);

  // Autocomplete logic
  useEffect(() => {
    if (input.startsWith('/') && input.length > 1 && !showMenu && !showProjectList) {
      // Handle /open and /new with arguments
      const parts = input.split(' ');
      const cmd = parts[0].toLowerCase();

      if (cmd === '/open' || cmd === '/new') {
        setSuggestions([]);
      } else {
        const matches = SLASH_COMMANDS.filter(c =>
          c.name.toLowerCase().startsWith(input.toLowerCase())
        );
        setSuggestions(matches);
        setSuggestionIndex(0);
      }
    } else {
      setSuggestions([]);
    }
  }, [input, showMenu, showProjectList]);

  // Keyboard handling
  useInput((char, key) => {
    if (isProcessing) return;

    // Project list navigation
    if (showProjectList) {
      if (key.upArrow) {
        setProjectListIndex(i => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setProjectListIndex(i => Math.min(projectsList.length - 1, i + 1));
      } else if (key.return && projectsList.length > 0) {
        openProject(projectsList[projectListIndex].folderName);
        setShowProjectList(false);
      } else if (key.escape) {
        setShowProjectList(false);
      }
      return;
    }

    // Slash menu navigation
    if (showMenu) {
      if (key.upArrow) {
        setMenuIndex(i => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setMenuIndex(i => Math.min(SLASH_COMMANDS.length - 1, i + 1));
      } else if (key.return) {
        handleSlashCommand(SLASH_COMMANDS[menuIndex].name);
        setShowMenu(false);
      } else if (key.escape) {
        setShowMenu(false);
      }
      return;
    }

    // Autocomplete navigation
    if (suggestions.length > 0) {
      if (key.upArrow) {
        setSuggestionIndex(i => Math.max(0, i - 1));
        return;
      } else if (key.downArrow) {
        setSuggestionIndex(i => Math.min(suggestions.length - 1, i + 1));
        return;
      } else if (key.escape) {
        setSuggestions([]);
        return;
      }
    }

    // Scroll history: Shift+Up/Down or Page Up/Down
    if (key.shift && key.upArrow) {
      setScrollOffset(prev => prev + 3);  // Scroll up (see older)
      return;
    }
    if (key.shift && key.downArrow) {
      setScrollOffset(prev => Math.max(0, prev - 3));  // Scroll down (see newer)
      return;
    }
    if (key.pageUp) {
      setScrollOffset(prev => prev + maxMessageHeight);  // Page up
      return;
    }
    if (key.pageDown) {
      setScrollOffset(prev => Math.max(0, prev - maxMessageHeight));  // Page down
      return;
    }
    // Home = oldest, End = newest
    if (key.home || (key.ctrl && char === 'a')) {
      setScrollOffset(999999);  // Will be clamped to max
      return;
    }
    if (key.end || (key.ctrl && char === 'e')) {
      setScrollOffset(0);  // Back to bottom (most recent)
      return;
    }

    // Ctrl+C to exit
    if (key.ctrl && char === 'c') {
      exit();
    }
  });

  const addMessage = useCallback((type, text) => {
    setDisplayMessages(prev => [...prev, { type, text }]);
    setScrollOffset(0);  // Reset to bottom when new message arrives
  }, []);

  // Project management functions
  const startNewProject = useCallback((name = null) => {
    // If no name given, we'll create the project on first render
    if (name) {
      const newProject = createProject(name, session);
      setProject(newProject);
      addMessage('project', `Created project: ${newProject.name}`);
      addMessage('project', `  ${JAMBOT_HOME}/projects/${newProject.folderName}`);
    } else {
      // Clear project, will be created on first render
      setProject(null);
      firstPromptRef.current = null;
    }
    // Reset session
    const newSession = createSession();
    setSession(newSession);
    setAgentMessages([]);
  }, [session, addMessage]);

  const openProject = useCallback((folderName) => {
    try {
      const loadedProject = loadProject(folderName);
      setProject(loadedProject);

      // Restore session from project
      const restoredSession = restoreSession(loadedProject);
      setSession(restoredSession);
      setAgentMessages([]);

      addMessage('project', `Opened project: ${loadedProject.name}`);
      const renderCount = loadedProject.renders?.length || 0;
      if (renderCount > 0) {
        addMessage('project', `  ${renderCount} render${renderCount !== 1 ? 's' : ''}, last: v${renderCount}.wav`);
      }
    } catch (err) {
      addMessage('system', `Error opening project: ${err.message}`);
    }
  }, [addMessage]);

  const showProjects = useCallback(() => {
    const projects = listProjects();
    setProjectsList(projects);
    setProjectListIndex(0);
    setShowProjectList(true);
  }, []);

  // Ensure project exists before render
  const ensureProject = useCallback((prompt, currentSession) => {
    if (project) return project;

    // Create project from first prompt - use currentSession for accurate BPM
    const bpm = currentSession?.bpm || session.bpm;
    const name = extractProjectName(prompt, bpm);
    const newProject = createProject(name, currentSession || session, prompt);
    setProject(newProject);
    addMessage('project', `New project: ${newProject.name}`);
    addMessage('project', `  ~/Documents/Jambot/projects/${newProject.folderName}/`);
    return newProject;
  }, [project, session, addMessage]);

  const handleSlashCommand = useCallback((cmd, args = '') => {
    setShowSplash(false);
    setSuggestions([]);

    switch (cmd) {
      case '/exit':
        // Save project before exit
        if (project) {
          updateSession(project, session);
        }
        exit();
        break;

      case '/new':
        startNewProject(args || null);
        if (!args) {
          addMessage('system', 'New session started. Project will be created on first render.');
        }
        break;

      case '/open':
        if (args) {
          // Try to find project by name
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
        } else {
          showProjects();
        }
        break;

      case '/recent':
        const recentProject = getMostRecentProject();
        if (recentProject) {
          openProject(recentProject.folderName);
        } else {
          addMessage('system', 'No projects found. Create a beat first!');
        }
        break;

      case '/projects':
        showProjects();
        break;

      case '/clear':
        const newSession = createSession();
        setSession(newSession);
        setAgentMessages([]);
        setDisplayMessages([]);
        if (project) {
          addMessage('system', `Session cleared (project: ${project.name})`);
        } else {
          addMessage('system', 'Session cleared');
        }
        break;

      case '/mix':
        addMessage('info', buildMixOverview(session, project));
        break;

      case '/status':
        const voices = Object.keys(session.pattern);
        const voiceList = voices.length > 0 ? voices.join(', ') : '(empty)';
        const tweaks = Object.keys(session.voiceParams);
        let statusText = '';
        if (project) {
          statusText += `Project: ${project.name}\n`;
          statusText += `  ${JAMBOT_HOME}/projects/${project.folderName}\n`;
          statusText += `  Renders: ${project.renders?.length || 0}\n`;
        } else {
          statusText += `Project: (none - will create on first render)\n`;
        }
        statusText += `Session: ${session.bpm} BPM`;
        if (session.swing > 0) statusText += `, swing ${session.swing}%`;
        statusText += `\nDrums: ${voiceList}`;
        if (tweaks.length > 0) {
          statusText += `\nTweaks: ${tweaks.map(v => `${v}(${Object.keys(session.voiceParams[v]).join(',')})`).join(', ')}`;
        }
        addMessage('info', statusText);
        break;

      case '/help':
        addMessage('info', HELP_TEXT);
        break;

      case '/changelog':
        addMessage('info', CHANGELOG_TEXT);
        break;

      case '/jb01':
        addMessage('info', JB01_GUIDE);
        break;

      case '/jb200':
        addMessage('info', JB200_GUIDE);
        break;

      case '/delay':
        addMessage('info', DELAY_GUIDE);
        break;

      case '/export':
        if (!project) {
          addMessage('system', 'No project to export. Create a beat first!');
          break;
        }
        if (!project.renders || project.renders.length === 0) {
          addMessage('system', 'No renders yet. Make a beat and render it first!');
          break;
        }
        try {
          const exportResult = exportProject(project, session);
          addMessage('project', `Exported to ${project.folderName}/_source/export/`);
          for (const file of exportResult.files) {
            addMessage('project', `  ${file}`);
          }
          addMessage('system', `Open folder: ${exportResult.path}`);
        } catch (err) {
          addMessage('system', `Export failed: ${err.message}`);
        }
        break;

      default:
        addMessage('system', `Unknown command: ${cmd}`);
    }
  }, [session, project, exit, addMessage, startNewProject, openProject, showProjects]);

  const handleSubmit = useCallback(async (value) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    setInput('');
    setShowSplash(false);
    setSuggestions([]);

    // Show menu for just "/"
    if (trimmed === '/') {
      setShowMenu(true);
      setMenuIndex(0);
      return;
    }

    // Handle slash commands
    if (trimmed.startsWith('/')) {
      const parts = trimmed.split(' ');
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1).join(' ');

      // Commands that take arguments
      if (cmd === '/new' || cmd === '/open') {
        handleSlashCommand(cmd, args);
        return;
      }

      // If autocomplete is showing and we have a match, use it
      if (suggestions.length > 0) {
        handleSlashCommand(suggestions[suggestionIndex].name);
      } else {
        // Try exact match
        const cmdMatch = SLASH_COMMANDS.find(c => c.name === cmd);
        if (cmdMatch) {
          handleSlashCommand(cmdMatch.name);
        } else {
          addMessage('system', `Unknown command: ${trimmed}`);
        }
      }
      return;
    }

    // Track first prompt for project naming
    if (!project && !firstPromptRef.current) {
      firstPromptRef.current = trimmed;
    }

    // Run agent
    addMessage('user', trimmed);
    setIsProcessing(true);

    // Reference to current project (may be created during render)
    let currentProject = project;
    let renderInfo = null;

    try {
      await runAgentLoop(
        trimmed,
        session,
        agentMessages,
        {
          onTool: (name, input) => {
            addMessage('tool', `${name}`);
          },
          onToolResult: (result) => {
            addMessage('result', result);
          },
          onResponse: (text) => {
            addMessage('response', text);
          },
        },
        {
          // Called before render to get the path
          getRenderPath: () => {
            // Ensure project exists (pass current session for accurate BPM)
            currentProject = ensureProject(firstPromptRef.current || trimmed, session);
            renderInfo = getRenderPath(currentProject);
            return renderInfo.fullPath;
          },
          // Called after render completes
          onRender: (info) => {
            if (currentProject && renderInfo) {
              recordRender(currentProject, {
                ...renderInfo,
                bars: info.bars,
                bpm: info.bpm,
              });
              // Update our state with the modified project
              setProject({ ...currentProject });
              addMessage('project', `  Saved as v${renderInfo.version}.wav`);
            }
          },
          // Called to rename project
          onRename: (newName) => {
            if (!currentProject && !project) {
              return { error: "No project to rename. Create a beat first." };
            }
            const targetProject = currentProject || project;
            const result = renameProject(targetProject, newName);
            setProject({ ...targetProject });
            addMessage('project', `  Renamed to "${newName}"`);
            return result;
          },
          // Called to open an existing project
          onOpenProject: (folderName) => {
            try {
              const loadedProject = loadProject(folderName);
              const restoredSession = restoreSession(loadedProject);
              // Update state
              setProject(loadedProject);
              setSession(restoredSession);
              currentProject = loadedProject;
              // Clear agent messages for fresh start
              setAgentMessages([]);
              addMessage('project', `Opened: ${loadedProject.name}`);
              return {
                name: loadedProject.name,
                bpm: restoredSession.bpm,
                renderCount: loadedProject.renders?.length || 0,
              };
            } catch (e) {
              return { error: `Could not open project: ${e.message}` };
            }
          },
        }
      );

      // Update project with session state and history
      if (currentProject) {
        addToHistory(currentProject, trimmed);
        updateSession(currentProject, session);
        setProject({ ...currentProject });
      }

      // Force session state update
      setSession({ ...session });
    } catch (err) {
      addMessage('system', `Error: ${err.message}`);
    }

    setIsProcessing(false);
  }, [session, agentMessages, project, suggestions, suggestionIndex, handleSlashCommand, addMessage, ensureProject]);

  const handleSelectSuggestion = useCallback((name) => {
    setInput(name);
    setSuggestions([]);
  }, []);

  // Main render
  if (needsSetup) {
    return <SetupWizard onComplete={() => setNeedsSetup(false)} />;
  }

  return (
    <Box flexDirection="column" height={terminalHeight}>
      {/* Content area - fixed height to prevent overflow */}
      <Box flexDirection="column" height={maxMessageHeight} overflowY="hidden">
        {showSplash ? (
          <Splash />
        ) : showProjectList ? (
          <ProjectList
            projects={projectsList}
            selectedIndex={projectListIndex}
            onSelect={openProject}
            onCancel={() => setShowProjectList(false)}
          />
        ) : showMenu ? (
          <SlashMenu
            onSelect={handleSlashCommand}
            onCancel={() => setShowMenu(false)}
            selectedIndex={menuIndex}
          />
        ) : (
          <Messages messages={displayMessages} maxHeight={maxMessageHeight} width={stdout?.columns || 80} scrollOffset={scrollOffset} />
        )}
      </Box>

      {/* Hairline above input */}
      <Hairline />

      {/* Autocomplete (above input) */}
      <Autocomplete
        suggestions={suggestions}
        selectedIndex={suggestionIndex}
      />

      {/* Input bar */}
      <InputBar
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        isProcessing={isProcessing}
        suggestions={suggestions}
        selectedIndex={suggestionIndex}
        onSelectSuggestion={handleSelectSuggestion}
      />

      {/* Hairline below input */}
      <Hairline />

      {/* Status bar */}
      <StatusBar session={session} project={project} />
    </Box>
  );
}

// === START APP ===
render(<App />);
