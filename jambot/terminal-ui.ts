#!/usr/bin/env node
// jambot/terminal-ui.ts - Raw ANSI terminal UI for Jambot
// Replaces the Ink-based ui.tsx with native terminal control

import wrapAnsi from 'wrap-ansi';
import stringWidth from 'string-width';
import { ANSI, BOX, KEYS, getMessageStyle, type MessageType } from './ansi.js';
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

// === TYPES ===
interface Message {
  type: MessageType;
  text: string;
}

interface ProjectInfo {
  folderName: string;
  name: string;
  bpm: number;
  renderCount: number;
}

// === TERMINAL UI CLASS ===
class TerminalUI {
  // Terminal dimensions
  private rows: number = 24;
  private cols: number = 80;
  private resizeTimeout: NodeJS.Timeout | null = null;

  // Input state
  private inputBuffer: string = '';
  private cursorPos: number = 0;
  private inputHistory: string[] = [];
  private historyIndex: number = -1;

  // Messages and scroll
  private messages: Message[] = [];
  private scrollOffset: number = 0;  // 0 = most recent (bottom)

  // UI state
  private isProcessing: boolean = false;
  private showSplash: boolean = true;
  private showMenu: boolean = false;
  private showProjectList: boolean = false;
  private menuIndex: number = 0;
  private projectListIndex: number = 0;
  private projectsList: ProjectInfo[] = [];

  // Autocomplete
  private suggestions: typeof SLASH_COMMANDS = [];
  private suggestionIndex: number = 0;

  // Session state
  private session: any;
  private agentMessages: any[] = [];
  private project: any = null;
  private firstPrompt: string | null = null;

  // API key setup state
  private needsSetup: boolean = false;
  private setupStep: 'input' | 'confirm' = 'input';
  private setupApiKey: string = '';
  private setupError: string = '';

  constructor() {
    this.updateSize();
    this.session = createSession();
    this.needsSetup = !getApiKey();
  }

  private updateSize(): void {
    this.rows = process.stdout.rows || 24;
    this.cols = process.stdout.columns || 80;
  }

  // === LAYOUT CALCULATIONS ===
  // Layout:
  //   Row 1 to (rows-4): Message scroll region
  //   Row (rows-3):      Input box top border
  //   Row (rows-2):      Input line
  //   Row (rows-1):      Input box bottom border
  //   Row (rows):        Status bar

  private get scrollRegionBottom(): number {
    return this.rows - 4;
  }

  private get inputBoxRow(): number {
    return this.rows - 3;
  }

  private get inputLineRow(): number {
    return this.rows - 2;
  }

  private get inputBottomRow(): number {
    return this.rows - 1;
  }

  private get statusBarRow(): number {
    return this.rows;
  }

  private get wrapWidth(): number {
    return Math.max(40, this.cols - 4);
  }

  // === TEXT WRAPPING ===
  private wrapText(text: string): string[] {
    if (!text) return [''];
    const wrapped = wrapAnsi(text, this.wrapWidth, { hard: true, trim: false });
    return wrapped.split('\n');
  }

  private getVisualLineCount(msg: Message): number {
    const style = getMessageStyle(msg.type);
    const prefixWidth = stringWidth(style.prefix);
    const contentWidth = Math.max(20, this.cols - prefixWidth);
    const wrapped = wrapAnsi(msg.text, contentWidth, { hard: true });
    return wrapped.split('\n').length;
  }

  // === DRAWING: STATUS BAR ===
  private drawStatusBar(): void {
    // Build list of active synths
    const synths: string[] = [];
    if (this.session?.drumPattern && Object.keys(this.session.drumPattern).length > 0) {
      if (Object.values(this.session.drumPattern).some((v: any) => v?.some?.((s: any) => s?.velocity > 0))) {
        synths.push('R9D9');
      }
    }
    if (this.session?.bassPattern?.some((s: any) => s.gate)) {
      synths.push('R3D3');
    }
    if (this.session?.leadPattern?.some((s: any) => s.gate)) {
      synths.push('R1D1');
    }
    if (this.session?.samplerKit && this.session?.samplerPattern) {
      if (Object.values(this.session.samplerPattern).some((v: any) => v?.some?.((s: any) => s?.velocity > 0))) {
        synths.push('R9DS');
      }
    }
    if (this.session?.jb200Pattern?.some((s: any) => s.gate)) {
      synths.push('JB200');
    }

    const synthList = synths.length > 0 ? synths.join('+') : 'empty';
    const swing = this.session?.swing > 0 ? ` swing ${this.session.swing}%` : '';
    const version = this.project ? ` v${(this.project.renders?.length || 0) + 1}` : '';
    const projectName = this.project ? this.project.name : '(no project)';
    const bpm = this.session?.bpm || 128;

    const status = ` ${projectName}${version} | ${bpm} BPM ${synthList}${swing} `;
    const padded = status.padEnd(this.cols);

    process.stdout.write(ANSI.savePos);
    process.stdout.write(ANSI.moveTo(this.statusBarRow, 1));
    process.stdout.write(ANSI.clearLine);
    process.stdout.write(ANSI.dim + ANSI.bgGray + ANSI.white);
    process.stdout.write(padded);
    process.stdout.write(ANSI.reset);
    process.stdout.write(ANSI.restorePos);
  }

  // === DRAWING: INPUT BOX ===
  private drawInputBox(): void {
    const boxWidth = this.cols - 4;
    const innerWidth = boxWidth - 2;

    // Top border
    process.stdout.write(ANSI.moveTo(this.inputBoxRow, 2));
    process.stdout.write(ANSI.clearLine);
    process.stdout.write(ANSI.cyan);
    process.stdout.write(BOX.topLeft + BOX.horizontal.repeat(innerWidth) + BOX.topRight);
    process.stdout.write(ANSI.reset);

    // Input line with content
    process.stdout.write(ANSI.moveTo(this.inputLineRow, 2));
    process.stdout.write(ANSI.clearLine);
    process.stdout.write(ANSI.cyan + BOX.vertical + ANSI.reset);

    // Show processing state or input
    if (this.isProcessing) {
      process.stdout.write(ANSI.dim + ' thinking...' + ANSI.reset);
      process.stdout.write(' '.repeat(Math.max(0, innerWidth - 12)));
    } else {
      // Handle horizontal scrolling for long input
      const maxVisible = innerWidth - 2;
      let displayText = this.inputBuffer;
      let cursorOffset = this.cursorPos;

      if (this.inputBuffer.length > maxVisible) {
        // Scroll the view to keep cursor visible
        const scrollStart = Math.max(0, this.cursorPos - maxVisible + 5);
        displayText = this.inputBuffer.slice(scrollStart, scrollStart + maxVisible);
        cursorOffset = this.cursorPos - scrollStart;
      }

      process.stdout.write(' ' + displayText);
      process.stdout.write(' '.repeat(Math.max(0, innerWidth - displayText.length - 1)));
    }

    process.stdout.write(ANSI.cyan + BOX.vertical + ANSI.reset);

    // Bottom border
    process.stdout.write(ANSI.moveTo(this.inputBottomRow, 2));
    process.stdout.write(ANSI.clearLine);
    process.stdout.write(ANSI.cyan);
    process.stdout.write(BOX.bottomLeft + BOX.horizontal.repeat(innerWidth) + BOX.bottomRight);
    process.stdout.write(ANSI.reset);
  }

  private positionCursor(): void {
    if (this.isProcessing) return;

    const innerWidth = this.cols - 6;
    const maxVisible = innerWidth - 2;
    let cursorOffset = this.cursorPos;

    if (this.inputBuffer.length > maxVisible) {
      const scrollStart = Math.max(0, this.cursorPos - maxVisible + 5);
      cursorOffset = this.cursorPos - scrollStart;
    }

    const cursorCol = 4 + Math.min(cursorOffset, maxVisible);
    process.stdout.write(ANSI.moveTo(this.inputLineRow, cursorCol));
    process.stdout.write(ANSI.showCursor);
  }

  // === DRAWING: MESSAGES ===
  private drawMessages(): void {
    // Calculate total lines and find visible window
    const lineCounts = this.messages.map(msg => this.getVisualLineCount(msg));
    const totalLines = lineCounts.reduce((a, b) => a + b, 0);
    const maxHeight = this.scrollRegionBottom;

    // scrollOffset = 0 means show most recent (bottom), higher = scroll up
    const maxScrollOffset = Math.max(0, totalLines - maxHeight);
    const effectiveOffset = Math.min(this.scrollOffset, maxScrollOffset);

    // Find which messages to show based on scroll position
    let linesFromEnd = effectiveOffset;
    let endIndex = this.messages.length;

    for (let i = this.messages.length - 1; i >= 0 && linesFromEnd > 0; i--) {
      if (linesFromEnd >= lineCounts[i]) {
        linesFromEnd -= lineCounts[i];
        endIndex = i;
      } else {
        break;
      }
    }

    // Find start index to fill maxHeight
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

    const visibleMessages = this.messages.slice(startIndex, endIndex);
    const hasMoreAbove = startIndex > 0;
    const hasMoreBelow = effectiveOffset > 0;

    // Move to top of scroll region and clear
    for (let i = 1; i <= maxHeight; i++) {
      process.stdout.write(ANSI.moveTo(i, 1));
      process.stdout.write(ANSI.clearLine);
    }

    // Draw messages
    let currentRow = 1;

    if (hasMoreAbove) {
      process.stdout.write(ANSI.moveTo(currentRow, 1));
      process.stdout.write(ANSI.dim + `  \u2191 ${startIndex} older messages (Shift+Up to scroll)` + ANSI.reset);
      currentRow++;
    }

    for (const msg of visibleMessages) {
      const style = getMessageStyle(msg.type);
      const prefixWidth = stringWidth(style.prefix);
      const contentWidth = Math.max(20, this.cols - prefixWidth);
      const wrapped = wrapAnsi(msg.text, contentWidth, { hard: true });
      const lines = wrapped.split('\n');

      for (let i = 0; i < lines.length && currentRow <= maxHeight; i++) {
        process.stdout.write(ANSI.moveTo(currentRow, 1));
        process.stdout.write(style.color);
        if (i === 0) {
          process.stdout.write(style.prefix);
        } else {
          process.stdout.write(' '.repeat(prefixWidth));
        }
        process.stdout.write(lines[i]);
        process.stdout.write(ANSI.reset);
        currentRow++;
      }
    }

    if (hasMoreBelow) {
      if (currentRow <= maxHeight) {
        process.stdout.write(ANSI.moveTo(currentRow, 1));
        process.stdout.write(ANSI.dim + `  \u2193 scroll down for recent (Shift+Down)` + ANSI.reset);
      }
    }
  }

  // === DRAWING: SPLASH ===
  private drawSplash(): void {
    // Clear scroll region
    for (let i = 1; i <= this.scrollRegionBottom; i++) {
      process.stdout.write(ANSI.moveTo(i, 1));
      process.stdout.write(ANSI.clearLine);
    }

    // Draw splash
    const lines = SPLASH.split('\n');
    for (let i = 0; i < lines.length && i < this.scrollRegionBottom; i++) {
      process.stdout.write(ANSI.moveTo(i + 1, 1));
      process.stdout.write(lines[i]);
    }
  }

  // === DRAWING: AUTOCOMPLETE ===
  private drawAutocomplete(): void {
    if (this.suggestions.length === 0) return;

    // Draw suggestions above input box (inside scroll region)
    const startRow = this.scrollRegionBottom - this.suggestions.length;

    for (let i = 0; i < this.suggestions.length; i++) {
      const cmd = this.suggestions[i];
      const row = startRow + i;
      if (row < 1) continue;

      process.stdout.write(ANSI.moveTo(row, 2));
      process.stdout.write(ANSI.clearLine);

      if (i === this.suggestionIndex) {
        process.stdout.write(ANSI.inverse);
      }
      process.stdout.write(`  ${cmd.name.padEnd(12)} ${cmd.description}`);
      process.stdout.write(ANSI.reset);
    }
  }

  // === DRAWING: SLASH MENU ===
  private drawSlashMenu(): void {
    // Clear scroll region
    for (let i = 1; i <= this.scrollRegionBottom; i++) {
      process.stdout.write(ANSI.moveTo(i, 1));
      process.stdout.write(ANSI.clearLine);
    }

    // Draw menu box
    const menuWidth = 50;
    const menuHeight = SLASH_COMMANDS.length + 5;
    const startCol = Math.floor((this.cols - menuWidth) / 2);
    const startRow = 2;

    // Title
    process.stdout.write(ANSI.moveTo(startRow, startCol));
    process.stdout.write(ANSI.bold + 'Commands' + ANSI.reset);

    // Commands
    for (let i = 0; i < SLASH_COMMANDS.length; i++) {
      const cmd = SLASH_COMMANDS[i];
      const row = startRow + 2 + i;

      process.stdout.write(ANSI.moveTo(row, startCol));
      if (i === this.menuIndex) {
        process.stdout.write(ANSI.inverse);
      }
      process.stdout.write(`  ${cmd.name.padEnd(12)} ${cmd.description}`);
      process.stdout.write(ANSI.reset);
    }

    // Footer
    process.stdout.write(ANSI.moveTo(startRow + 2 + SLASH_COMMANDS.length + 1, startCol));
    process.stdout.write(ANSI.dim + '  Enter to select, Esc to cancel' + ANSI.reset);
  }

  // === DRAWING: PROJECT LIST ===
  private drawProjectList(): void {
    // Clear scroll region
    for (let i = 1; i <= this.scrollRegionBottom; i++) {
      process.stdout.write(ANSI.moveTo(i, 1));
      process.stdout.write(ANSI.clearLine);
    }

    const startCol = 4;
    const startRow = 2;

    // Title
    process.stdout.write(ANSI.moveTo(startRow, startCol));
    process.stdout.write(ANSI.bold + 'Projects' + ANSI.reset);

    if (this.projectsList.length === 0) {
      process.stdout.write(ANSI.moveTo(startRow + 2, startCol));
      process.stdout.write(ANSI.dim + '  No projects yet. Start making beats!' + ANSI.reset);
      process.stdout.write(ANSI.moveTo(startRow + 4, startCol));
      process.stdout.write(ANSI.dim + '  Press Esc to close' + ANSI.reset);
      return;
    }

    // Project list (max 10)
    const visible = this.projectsList.slice(0, 10);
    for (let i = 0; i < visible.length; i++) {
      const p = visible[i];
      const row = startRow + 2 + i;

      process.stdout.write(ANSI.moveTo(row, startCol));
      if (i === this.projectListIndex) {
        process.stdout.write(ANSI.inverse);
      }
      process.stdout.write(`  ${p.name.padEnd(20)} ${p.bpm} BPM  ${p.renderCount} renders`);
      process.stdout.write(ANSI.reset);
    }

    // Footer
    process.stdout.write(ANSI.moveTo(startRow + 2 + visible.length + 1, startCol));
    process.stdout.write(ANSI.dim + '  Enter to open, Esc to cancel' + ANSI.reset);
  }

  // === DRAWING: SETUP WIZARD ===
  private drawSetupWizard(): void {
    // Clear screen
    process.stdout.write(ANSI.clearScreen);
    process.stdout.write(ANSI.moveTo(1, 1));

    const startRow = 3;
    const startCol = 4;

    // Box border
    process.stdout.write(ANSI.moveTo(startRow, startCol));
    process.stdout.write(ANSI.cyan + BOX.topLeft + BOX.horizontal.repeat(60) + BOX.topRight + ANSI.reset);

    for (let i = 1; i <= 12; i++) {
      process.stdout.write(ANSI.moveTo(startRow + i, startCol));
      process.stdout.write(ANSI.cyan + BOX.vertical + ANSI.reset);
      process.stdout.write(' '.repeat(60));
      process.stdout.write(ANSI.cyan + BOX.vertical + ANSI.reset);
    }

    process.stdout.write(ANSI.moveTo(startRow + 13, startCol));
    process.stdout.write(ANSI.cyan + BOX.bottomLeft + BOX.horizontal.repeat(60) + BOX.bottomRight + ANSI.reset);

    // Title
    process.stdout.write(ANSI.moveTo(startRow + 2, startCol + 4));
    process.stdout.write(ANSI.bold + ANSI.cyan + 'Welcome to Jambot' + ANSI.reset);

    if (this.setupStep === 'input') {
      process.stdout.write(ANSI.moveTo(startRow + 4, startCol + 4));
      process.stdout.write('To make beats, you need an Anthropic API key.');

      process.stdout.write(ANSI.moveTo(startRow + 5, startCol + 4));
      process.stdout.write(ANSI.dim + 'Get one at: console.anthropic.com' + ANSI.reset);

      if (this.setupError) {
        process.stdout.write(ANSI.moveTo(startRow + 7, startCol + 4));
        process.stdout.write(ANSI.red + this.setupError + ANSI.reset);
      }

      process.stdout.write(ANSI.moveTo(startRow + 9, startCol + 4));
      process.stdout.write('Paste your key: ');
      // Mask the key
      process.stdout.write('*'.repeat(this.setupApiKey.length));
      process.stdout.write(ANSI.showCursor);
    } else if (this.setupStep === 'confirm') {
      process.stdout.write(ANSI.moveTo(startRow + 4, startCol + 4));
      process.stdout.write(ANSI.green + 'Key accepted.' + ANSI.reset);

      process.stdout.write(ANSI.moveTo(startRow + 6, startCol + 4));
      process.stdout.write(`Save to ${getApiKeyPath()} so you don't have to enter it again?`);

      process.stdout.write(ANSI.moveTo(startRow + 8, startCol + 4));
      process.stdout.write(ANSI.bold + '(y/n) ' + ANSI.reset);
    }
  }

  // === INPUT HANDLING ===
  private handleKeypress = (data: Buffer): void => {
    const key = data.toString();

    // Setup wizard mode
    if (this.needsSetup) {
      this.handleSetupKeypress(key);
      return;
    }

    // Ctrl+C - exit
    if (key === KEYS.ctrlC) {
      this.cleanup();
      process.exit(0);
    }

    // Processing mode - ignore input
    if (this.isProcessing) return;

    // Project list navigation
    if (this.showProjectList) {
      this.handleProjectListKeypress(key);
      return;
    }

    // Slash menu navigation
    if (this.showMenu) {
      this.handleMenuKeypress(key);
      return;
    }

    // Autocomplete navigation
    if (this.suggestions.length > 0) {
      if (key === KEYS.up) {
        this.suggestionIndex = Math.max(0, this.suggestionIndex - 1);
        this.redraw();
        return;
      } else if (key === KEYS.down) {
        this.suggestionIndex = Math.min(this.suggestions.length - 1, this.suggestionIndex + 1);
        this.redraw();
        return;
      } else if (key === KEYS.tab) {
        // Select suggestion
        this.inputBuffer = this.suggestions[this.suggestionIndex].name;
        this.cursorPos = this.inputBuffer.length;
        this.suggestions = [];
        this.suggestionIndex = 0;
        this.redraw();
        return;
      } else if (key === KEYS.escape) {
        this.suggestions = [];
        this.suggestionIndex = 0;
        this.redraw();
        return;
      }
    }

    // Scroll handling (Shift+Arrow or Page keys)
    if (key === KEYS.shiftUp) {
      this.scrollOffset += 3;
      this.redraw();
      return;
    }
    if (key === KEYS.shiftDown) {
      this.scrollOffset = Math.max(0, this.scrollOffset - 3);
      this.redraw();
      return;
    }
    if (key === KEYS.pageUp) {
      this.scrollOffset += this.scrollRegionBottom;
      this.redraw();
      return;
    }
    if (key === KEYS.pageDown) {
      this.scrollOffset = Math.max(0, this.scrollOffset - this.scrollRegionBottom);
      this.redraw();
      return;
    }

    // Input history (up/down when not in autocomplete)
    if (key === KEYS.up && this.suggestions.length === 0) {
      if (this.historyIndex < this.inputHistory.length - 1) {
        this.historyIndex++;
        this.inputBuffer = this.inputHistory[this.inputHistory.length - 1 - this.historyIndex];
        this.cursorPos = this.inputBuffer.length;
        this.updateAutocomplete();
        this.redraw();
      }
      return;
    }
    if (key === KEYS.down && this.suggestions.length === 0) {
      if (this.historyIndex > 0) {
        this.historyIndex--;
        this.inputBuffer = this.inputHistory[this.inputHistory.length - 1 - this.historyIndex];
        this.cursorPos = this.inputBuffer.length;
      } else if (this.historyIndex === 0) {
        this.historyIndex = -1;
        this.inputBuffer = '';
        this.cursorPos = 0;
      }
      this.updateAutocomplete();
      this.redraw();
      return;
    }

    // Enter - submit
    if (key === KEYS.enter || key === KEYS.newline) {
      const input = this.inputBuffer.trim();
      if (input) {
        this.inputHistory.push(input);
        this.historyIndex = -1;
        this.inputBuffer = '';
        this.cursorPos = 0;
        this.suggestions = [];
        this.suggestionIndex = 0;
        this.handleSubmit(input);
      }
      return;
    }

    // Backspace
    if (key === KEYS.backspace || key === KEYS.backspaceAlt) {
      if (this.cursorPos > 0) {
        this.inputBuffer = this.inputBuffer.slice(0, this.cursorPos - 1) + this.inputBuffer.slice(this.cursorPos);
        this.cursorPos--;
        this.updateAutocomplete();
        this.redraw();
      }
      return;
    }

    // Delete
    if (key === KEYS.delete) {
      if (this.cursorPos < this.inputBuffer.length) {
        this.inputBuffer = this.inputBuffer.slice(0, this.cursorPos) + this.inputBuffer.slice(this.cursorPos + 1);
        this.updateAutocomplete();
        this.redraw();
      }
      return;
    }

    // Cursor movement
    if (key === KEYS.left) {
      if (this.cursorPos > 0) {
        this.cursorPos--;
        this.redraw();
      }
      return;
    }
    if (key === KEYS.right) {
      if (this.cursorPos < this.inputBuffer.length) {
        this.cursorPos++;
        this.redraw();
      }
      return;
    }

    // Home/End
    if (key === KEYS.home || key === KEYS.homeAlt) {
      this.cursorPos = 0;
      this.redraw();
      return;
    }
    if (key === KEYS.end || key === KEYS.endAlt) {
      this.cursorPos = this.inputBuffer.length;
      this.redraw();
      return;
    }

    // Regular characters
    if (key.length === 1 && key >= ' ') {
      this.inputBuffer = this.inputBuffer.slice(0, this.cursorPos) + key + this.inputBuffer.slice(this.cursorPos);
      this.cursorPos++;
      this.updateAutocomplete();
      this.redraw();
    }
  };

  private handleSetupKeypress(key: string): void {
    if (this.setupStep === 'input') {
      if (key === KEYS.enter || key === KEYS.newline) {
        const trimmed = this.setupApiKey.trim();

        // Validate key format
        if (!trimmed.startsWith('sk-ant-')) {
          this.setupError = 'Key should start with sk-ant-';
          this.drawSetupWizard();
          return;
        }

        if (trimmed.length < 20) {
          this.setupError = 'Key seems too short';
          this.drawSetupWizard();
          return;
        }

        this.setupStep = 'confirm';
        this.drawSetupWizard();
        return;
      }

      if (key === KEYS.backspace || key === KEYS.backspaceAlt) {
        if (this.setupApiKey.length > 0) {
          this.setupApiKey = this.setupApiKey.slice(0, -1);
          this.setupError = '';
          this.drawSetupWizard();
        }
        return;
      }

      // Regular characters
      if (key.length === 1 && key >= ' ') {
        this.setupApiKey += key;
        this.setupError = '';
        this.drawSetupWizard();
      }
    } else if (this.setupStep === 'confirm') {
      if (key.toLowerCase() === 'y') {
        saveApiKey(this.setupApiKey);
        this.needsSetup = false;
        this.fullRedraw();
      } else if (key.toLowerCase() === 'n') {
        // Just set in environment for this session
        process.env.ANTHROPIC_API_KEY = this.setupApiKey;
        this.needsSetup = false;
        this.fullRedraw();
      }
    }
  }

  private handleMenuKeypress(key: string): void {
    if (key === KEYS.up) {
      this.menuIndex = Math.max(0, this.menuIndex - 1);
      this.redraw();
    } else if (key === KEYS.down) {
      this.menuIndex = Math.min(SLASH_COMMANDS.length - 1, this.menuIndex + 1);
      this.redraw();
    } else if (key === KEYS.enter || key === KEYS.newline) {
      const cmd = SLASH_COMMANDS[this.menuIndex].name;
      this.showMenu = false;
      this.handleSlashCommand(cmd);
    } else if (key === KEYS.escape) {
      this.showMenu = false;
      this.redraw();
    }
  }

  private handleProjectListKeypress(key: string): void {
    if (key === KEYS.up) {
      this.projectListIndex = Math.max(0, this.projectListIndex - 1);
      this.redraw();
    } else if (key === KEYS.down) {
      this.projectListIndex = Math.min(this.projectsList.length - 1, this.projectListIndex + 1);
      this.redraw();
    } else if (key === KEYS.enter || key === KEYS.newline) {
      if (this.projectsList.length > 0) {
        this.openProject(this.projectsList[this.projectListIndex].folderName);
        this.showProjectList = false;
        this.redraw();
      }
    } else if (key === KEYS.escape) {
      this.showProjectList = false;
      this.redraw();
    }
  }

  private updateAutocomplete(): void {
    if (this.inputBuffer.startsWith('/') && this.inputBuffer.length > 1) {
      const parts = this.inputBuffer.split(' ');
      const cmd = parts[0].toLowerCase();

      // Commands with arguments don't show autocomplete
      if (cmd === '/open' || cmd === '/new') {
        this.suggestions = [];
      } else {
        this.suggestions = SLASH_COMMANDS.filter(c =>
          c.name.toLowerCase().startsWith(this.inputBuffer.toLowerCase())
        );
        this.suggestionIndex = 0;
      }
    } else {
      this.suggestions = [];
    }
  }

  // === COMMAND HANDLING ===
  private handleSubmit(input: string): void {
    this.showSplash = false;

    // Show menu for just "/"
    if (input === '/') {
      this.showMenu = true;
      this.menuIndex = 0;
      this.redraw();
      return;
    }

    // Handle slash commands
    if (input.startsWith('/')) {
      const parts = input.split(' ');
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1).join(' ');

      // Commands that take arguments
      if (cmd === '/new' || cmd === '/open') {
        this.handleSlashCommand(cmd, args);
        return;
      }

      // If autocomplete is showing, use selected suggestion
      if (this.suggestions.length > 0) {
        this.handleSlashCommand(this.suggestions[this.suggestionIndex].name);
      } else {
        // Try exact match
        const cmdMatch = SLASH_COMMANDS.find(c => c.name === cmd);
        if (cmdMatch) {
          this.handleSlashCommand(cmdMatch.name);
        } else {
          this.addMessage('system', `Unknown command: ${input}`);
          this.redraw();
        }
      }
      return;
    }

    // Track first prompt for project naming
    if (!this.project && !this.firstPrompt) {
      this.firstPrompt = input;
    }

    // Run agent
    this.addMessage('user', input);
    this.runAgent(input);
  }

  private handleSlashCommand(cmd: string, args: string = ''): void {
    this.showSplash = false;
    this.suggestions = [];

    switch (cmd) {
      case '/exit':
        if (this.project) {
          updateSession(this.project, this.session);
        }
        this.cleanup();
        process.exit(0);
        break;

      case '/new':
        this.startNewProject(args || null);
        if (!args) {
          this.addMessage('system', 'New session started. Project will be created on first render.');
        }
        break;

      case '/open':
        if (args) {
          const projects = listProjects();
          const found = projects.find(p =>
            p.folderName.toLowerCase().includes(args.toLowerCase()) ||
            p.name.toLowerCase().includes(args.toLowerCase())
          );
          if (found) {
            this.openProject(found.folderName);
          } else {
            this.addMessage('system', `Project not found: ${args}`);
          }
        } else {
          this.showProjects();
        }
        break;

      case '/projects':
        this.showProjects();
        break;

      case '/clear':
        this.session = createSession();
        this.agentMessages = [];
        this.messages = [];
        if (this.project) {
          this.addMessage('system', `Session cleared (project: ${this.project.name})`);
        } else {
          this.addMessage('system', 'Session cleared');
        }
        break;

      case '/status':
        this.showStatus();
        break;

      case '/help':
        this.addMessage('info', HELP_TEXT);
        break;

      case '/changelog':
        this.addMessage('info', CHANGELOG_TEXT);
        break;

      case '/r9d9':
      case '/909':
        this.addMessage('info', R9D9_GUIDE);
        break;

      case '/r3d3':
      case '/303':
        this.addMessage('info', R3D3_GUIDE);
        break;

      case '/r1d1':
      case '/101':
        this.addMessage('info', R1D1_GUIDE);
        break;

      case '/r9ds':
      case '/sampler':
        this.addMessage('info', R9DS_GUIDE);
        break;

      case '/kits':
        this.showKits();
        break;

      case '/export':
        this.exportCurrentProject();
        break;

      default:
        this.addMessage('system', `Unknown command: ${cmd}`);
    }

    this.redraw();
  }

  // === PROJECT MANAGEMENT ===
  private startNewProject(name: string | null): void {
    if (name) {
      const newProject = createProject(name, this.session);
      this.project = newProject;
      this.addMessage('project', `Created project: ${newProject.name}`);
      this.addMessage('project', `  ${JAMBOT_HOME}/projects/${newProject.folderName}`);
    } else {
      this.project = null;
      this.firstPrompt = null;
    }

    this.session = createSession();
    this.agentMessages = [];
  }

  private openProject(folderName: string): void {
    try {
      const loadedProject = loadProject(folderName);
      this.project = loadedProject;

      const restoredSession = restoreSession(loadedProject);
      this.session = restoredSession;
      this.agentMessages = [];

      this.addMessage('project', `Opened project: ${loadedProject.name}`);
      const renderCount = loadedProject.renders?.length || 0;
      if (renderCount > 0) {
        this.addMessage('project', `  ${renderCount} render${renderCount !== 1 ? 's' : ''}, last: v${renderCount}.wav`);
      }
    } catch (err: any) {
      this.addMessage('system', `Error opening project: ${err.message}`);
    }
  }

  private showProjects(): void {
    const projects = listProjects();
    this.projectsList = projects.map(p => ({
      folderName: p.folderName,
      name: p.name,
      bpm: p.bpm || 128,
      renderCount: p.renderCount || 0,
    }));
    this.projectListIndex = 0;
    this.showProjectList = true;
    this.redraw();
  }

  private ensureProject(prompt: string): any {
    if (this.project) return this.project;

    const bpm = this.session?.bpm || 128;
    const name = extractProjectName(prompt, bpm);
    const newProject = createProject(name, this.session, prompt);
    this.project = newProject;
    this.addMessage('project', `New project: ${newProject.name}`);
    this.addMessage('project', `  ~/Documents/Jambot/projects/${newProject.folderName}/`);
    return newProject;
  }

  private showStatus(): void {
    const voices = Object.keys(this.session.drumPattern || {});
    const voiceList = voices.length > 0 ? voices.join(', ') : '(empty)';
    const tweaks = Object.keys(this.session.drumParams || {});

    let statusText = '';
    if (this.project) {
      statusText += `Project: ${this.project.name}\n`;
      statusText += `  ${JAMBOT_HOME}/projects/${this.project.folderName}\n`;
      statusText += `  Renders: ${this.project.renders?.length || 0}\n`;
    } else {
      statusText += `Project: (none - will create on first render)\n`;
    }
    statusText += `Session: ${this.session.bpm} BPM`;
    if (this.session.swing > 0) statusText += `, swing ${this.session.swing}%`;
    statusText += `\nDrums: ${voiceList}`;
    if (tweaks.length > 0) {
      statusText += `\nTweaks: ${tweaks.join(', ')}`;
    }
    this.addMessage('info', statusText);
  }

  private showKits(): void {
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
    this.addMessage('info', kitsText);
  }

  private exportCurrentProject(): void {
    if (!this.project) {
      this.addMessage('system', 'No project to export. Create a beat first!');
      return;
    }
    if (!this.project.renders || this.project.renders.length === 0) {
      this.addMessage('system', 'No renders yet. Make a beat and render it first!');
      return;
    }
    try {
      const exportResult = exportProject(this.project, this.session);
      this.addMessage('project', `Exported to ${this.project.folderName}/_source/export/`);
      for (const file of exportResult.files) {
        this.addMessage('project', `  ${file}`);
      }
      this.addMessage('system', `Open folder: ${exportResult.path}`);
    } catch (err: any) {
      this.addMessage('system', `Export failed: ${err.message}`);
    }
  }

  // === AGENT LOOP ===
  private async runAgent(input: string): Promise<void> {
    this.isProcessing = true;
    this.redraw();

    let currentProject = this.project;
    let renderInfo: any = null;

    try {
      await runAgentLoop(
        input,
        this.session,
        this.agentMessages,
        {
          onTool: (name: string) => {
            this.addMessage('tool', name);
            this.redraw();
          },
          onToolResult: (result: string) => {
            this.addMessage('result', result);
            this.redraw();
          },
          onResponse: (text: string) => {
            this.addMessage('response', text);
            this.redraw();
          },
        },
        {
          getRenderPath: () => {
            currentProject = this.ensureProject(this.firstPrompt || input);
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
              this.project = { ...currentProject };
              this.addMessage('project', `  Saved as v${renderInfo.version}.wav`);
            }
          },
          onRename: (newName: string) => {
            if (!currentProject && !this.project) {
              return { error: "No project to rename. Create a beat first." };
            }
            const targetProject = currentProject || this.project;
            const result = renameProject(targetProject, newName);
            this.project = { ...targetProject };
            this.addMessage('project', `  Renamed to "${newName}"`);
            return result;
          },
          onOpenProject: (folderName: string) => {
            try {
              const loadedProject = loadProject(folderName);
              const restoredSession = restoreSession(loadedProject);
              this.project = loadedProject;
              this.session = restoredSession;
              currentProject = loadedProject;
              this.agentMessages = [];
              this.addMessage('project', `Opened: ${loadedProject.name}`);
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

      // Update project with session state and history
      if (currentProject) {
        addToHistory(currentProject, input);
        updateSession(currentProject, this.session);
        this.project = { ...currentProject };
      }

      // Force session state update
      this.session = { ...this.session };
    } catch (err: any) {
      this.addMessage('system', `Error: ${err.message}`);
    }

    this.isProcessing = false;
    this.redraw();
  }

  // === MESSAGE MANAGEMENT ===
  private addMessage(type: MessageType, text: string): void {
    this.messages.push({ type, text });
    this.scrollOffset = 0;  // Reset to bottom when new message arrives
  }

  // === DRAWING: FULL REDRAW ===
  private redraw(): void {
    process.stdout.write(ANSI.hideCursor);

    if (this.showSplash) {
      this.drawSplash();
    } else if (this.showMenu) {
      this.drawSlashMenu();
    } else if (this.showProjectList) {
      this.drawProjectList();
    } else {
      this.drawMessages();
      if (this.suggestions.length > 0) {
        this.drawAutocomplete();
      }
    }

    this.drawInputBox();
    this.drawStatusBar();
    this.positionCursor();
  }

  private fullRedraw(): void {
    process.stdout.write(ANSI.clearScreen);
    process.stdout.write(ANSI.moveTo(1, 1));
    this.setupScrollRegion();
    this.redraw();
  }

  // === RESIZE HANDLING ===
  private handleResize = (): void => {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }

    this.resizeTimeout = setTimeout(() => {
      this.updateSize();
      this.setupScrollRegion();
      this.fullRedraw();
    }, 100);
  };

  private setupScrollRegion(): void {
    // Set scroll region to exclude bottom 4 rows (input box + status)
    process.stdout.write(ANSI.setScrollRegion(1, this.scrollRegionBottom));
  }

  // === LIFECYCLE ===
  private cleanup(): void {
    process.stdout.write(ANSI.resetScrollRegion);
    process.stdout.write(ANSI.showCursor);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
    process.stdout.write('\n');
    console.log('Goodbye!');
  }

  start(): void {
    if (!process.stdout.isTTY) {
      console.error('Error: Not a TTY. Run in a terminal.');
      process.exit(1);
    }

    // Ensure directories
    ensureDirectories();

    // Setup resize handlers
    process.stdout.on('resize', this.handleResize);
    process.on('SIGWINCH', this.handleResize);

    // Setup raw mode for keypress handling
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.on('data', this.handleKeypress);

    // Initial draw
    if (this.needsSetup) {
      this.drawSetupWizard();
    } else {
      process.stdout.write(ANSI.clearScreen);
      process.stdout.write(ANSI.moveTo(1, 1));
      this.setupScrollRegion();
      this.redraw();
    }
  }
}

// === START APP ===
const ui = new TerminalUI();
ui.start();
