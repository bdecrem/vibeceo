#!/usr/bin/env node
// jambot/terminal-ui.ts - Raw ANSI terminal UI for Jambot
// Based on uiexperiment/ - uses native terminal scrollback, NOT virtual rendering

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

// === ANSI ESCAPE CODES ===
const ANSI = {
  moveTo: (row: number, col: number) => `\x1b[${row};${col}H`,
  savePos: '\x1b[s',
  restorePos: '\x1b[u',
  hideCursor: '\x1b[?25l',
  showCursor: '\x1b[?25h',
  setScrollRegion: (top: number, bottom: number) => `\x1b[${top};${bottom}r`,
  resetScrollRegion: '\x1b[r',
  clearLine: '\x1b[2K',
  clearScreen: '\x1b[2J',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  inverse: '\x1b[7m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
  bgGray: '\x1b[48;5;236m',
};

const BOX = {
  topLeft: '\u250c', topRight: '\u2510',
  bottomLeft: '\u2514', bottomRight: '\u2518',
  horizontal: '\u2500', vertical: '\u2502',
};

// === TERMINAL UI CLASS ===
class TerminalUI {
  private rows = 24;
  private cols = 80;
  private resizeTimeout: NodeJS.Timeout | null = null;
  private inputBuffer = '';
  private cursorPos = 0;
  private contentHistory: string[] = [];  // For reflow on resize ONLY
  private inputHistory: string[] = [];
  private historyIndex = -1;
  private lastInputLineCount = 1;  // Track for scroll region adjustment

  // Jambot state
  private session: any;
  private agentMessages: any[] = [];
  private project: any = null;
  private firstPrompt: string | null = null;
  private isProcessing = false;

  // UI modes
  private inSetupWizard = false;
  private setupStep: 'input' | 'confirm' = 'input';
  private setupApiKey = '';
  private setupError = '';
  private inModal: 'none' | 'menu' | 'projects' = 'none';
  private modalIndex = 0;
  private projectsList: any[] = [];

  // Autocomplete
  private suggestions: typeof SLASH_COMMANDS = [];
  private suggestionIndex = 0;

  constructor() {
    this.updateSize();
    this.session = createSession();
    this.inSetupWizard = !getApiKey();
  }

  private updateSize(): void {
    this.rows = process.stdout.rows || 24;
    this.cols = process.stdout.columns || 80;
  }

  // Input box inner width (for text wrapping)
  private get inputInnerWidth(): number { return this.cols - 8; }  // 2 margin + 2 border + 2 padding + 2 margin
  private get wrapWidth(): number { return Math.max(40, this.cols - 4); }

  // Calculate how many lines the current input requires
  private getInputLineCount(): number {
    if (!this.inputBuffer || this.inputBuffer.length === 0) return 1;
    const width = this.inputInnerWidth;
    if (width <= 0) return 1;
    return Math.ceil(this.inputBuffer.length / width) || 1;
  }

  // Split input into wrapped lines
  private getInputLines(): string[] {
    if (!this.inputBuffer) return [''];
    const width = this.inputInnerWidth;
    if (width <= 0) return [this.inputBuffer];
    const lines: string[] = [];
    for (let i = 0; i < this.inputBuffer.length; i += width) {
      lines.push(this.inputBuffer.slice(i, i + width));
    }
    return lines.length > 0 ? lines : [''];
  }

  // Dynamic scroll bottom: base is rows-6, shrinks for 4+ input lines
  private get scrollBottom(): number {
    const inputLines = this.getInputLineCount();
    // Base: 6 rows reserved (border + up to 3 lines + border + status + padding)
    // For 4+ lines: need (inputLines + 3) rows = border + inputLines + border + status
    const reserved = Math.max(6, inputLines + 3);
    return this.rows - reserved;
  }

  // === CORE OUTPUT (from experiment) ===
  // This is THE key method - appends content with \n, letting terminal scroll naturally
  private printOutput(text: string, style: { color?: string; prefix?: string } = {}): void {
    const { color = '', prefix = '' } = style;
    const fullText = prefix + text;
    this.contentHistory.push(fullText);

    const lines = this.wrapText(fullText);
    process.stdout.write(ANSI.savePos);
    process.stdout.write(ANSI.moveTo(this.scrollBottom, 1));

    for (const line of lines) {
      process.stdout.write('\n' + color + line + ANSI.reset);
    }

    process.stdout.write(ANSI.restorePos);
    this.drawInputBox();
    this.drawStatusBar();
    this.positionCursor();
  }

  private wrapText(text: string): string[] {
    if (!text) return [''];
    return wrapAnsi(text, this.wrapWidth, { hard: true, trim: false }).split('\n');
  }

  // === STYLED OUTPUT HELPERS ===
  private printUser(text: string): void {
    this.printOutput(text, { color: ANSI.dim, prefix: '> ' });
  }
  private printTool(name: string): void {
    this.printOutput(name, { color: ANSI.cyan, prefix: '  ' });
  }
  private printResult(text: string): void {
    this.printOutput(text, { color: ANSI.gray, prefix: '     ' });
  }
  private printResponse(text: string): void {
    this.printOutput(text);
  }
  private printSystem(text: string): void {
    this.printOutput(text, { color: ANSI.yellow });
  }
  private printProject(text: string): void {
    this.printOutput(text, { color: ANSI.green });
  }
  private printInfo(text: string): void {
    this.printOutput(text, { color: ANSI.dim });
  }

  // === DRAWING: STATUS BAR ===
  private drawStatusBar(): void {
    const synths: string[] = [];
    if (this.session?.drumPattern && Object.values(this.session.drumPattern).some((v: any) => v?.some?.((s: any) => s?.velocity > 0))) {
      synths.push('R9D9');
    }
    if (this.session?.bassPattern?.some((s: any) => s.gate)) synths.push('R3D3');
    if (this.session?.leadPattern?.some((s: any) => s.gate)) synths.push('R1D1');
    if (this.session?.samplerKit && Object.values(this.session.samplerPattern || {}).some((v: any) => v?.some?.((s: any) => s?.velocity > 0))) {
      synths.push('R9DS');
    }
    if (this.session?.jb200Pattern?.some((s: any) => s.gate)) synths.push('JB200');

    const synthList = synths.length > 0 ? synths.join('+') : 'empty';
    const swing = this.session?.swing > 0 ? ` swing ${this.session.swing}%` : '';
    const version = this.project ? ` v${(this.project.renders?.length || 0) + 1}` : '';
    const projectName = this.project ? this.project.name : '(no project)';
    const bpm = this.session?.bpm || 128;

    const status = ` ${projectName}${version} | ${bpm} BPM ${synthList}${swing} `.padEnd(this.cols);

    // Status bar is right after the input box bottom border
    const inputLines = this.getInputLineCount();
    const inputBoxTop = this.scrollBottom + 1;
    const inputBoxBottom = inputBoxTop + 1 + inputLines;  // top border + lines
    const statusRow = inputBoxBottom + 1;  // after bottom border

    process.stdout.write(ANSI.savePos);
    process.stdout.write(ANSI.moveTo(statusRow, 1) + ANSI.clearLine);
    // Subtle status: dim text with small left margin, no background
    process.stdout.write(ANSI.moveTo(statusRow, 3) + ANSI.dim + status.trim() + ANSI.reset);
    process.stdout.write(ANSI.restorePos);
  }

  // === DRAWING: INPUT BOX ===
  private drawInputBox(): void {
    const boxWidth = this.cols - 4;  // 2 margin on each side
    const innerWidth = boxWidth - 2;  // minus borders
    const inputLines = this.getInputLines();
    const lineCount = inputLines.length;

    // Calculate where the input box starts
    // Layout: scrollBottom, then input box, then status, then padding
    // Input box top = scrollBottom + 1
    const inputBoxTop = this.scrollBottom + 1;

    // Top border — clear full line first to eliminate any artifacts at edges
    process.stdout.write(ANSI.moveTo(inputBoxTop, 1) + ANSI.clearLine);
    process.stdout.write(ANSI.moveTo(inputBoxTop, 2) + ANSI.cyan + BOX.topLeft + BOX.horizontal.repeat(innerWidth) + BOX.topRight + ANSI.reset);

    // Input lines
    for (let i = 0; i < lineCount; i++) {
      const row = inputBoxTop + 1 + i;
      process.stdout.write(ANSI.moveTo(row, 1) + ANSI.clearLine);
      process.stdout.write(ANSI.moveTo(row, 2) + ANSI.cyan + BOX.vertical + ANSI.reset);

      if (this.isProcessing && i === 0) {
        process.stdout.write(ANSI.dim + ' thinking...' + ANSI.reset);
        process.stdout.write(' '.repeat(Math.max(0, innerWidth - 12)));  // " thinking..." is 12 chars
      } else if (this.isProcessing) {
        process.stdout.write(' '.repeat(innerWidth));
      } else {
        const lineText = inputLines[i] || '';
        process.stdout.write(' ' + lineText + ' '.repeat(Math.max(0, innerWidth - lineText.length - 1)));
      }
      process.stdout.write(ANSI.cyan + BOX.vertical + ANSI.reset);
    }

    // Bottom border
    const bottomRow = inputBoxTop + 1 + lineCount;
    process.stdout.write(ANSI.moveTo(bottomRow, 1) + ANSI.clearLine);
    process.stdout.write(ANSI.moveTo(bottomRow, 2) + ANSI.cyan + BOX.bottomLeft + BOX.horizontal.repeat(innerWidth) + BOX.bottomRight + ANSI.reset);

    // Clear any leftover rows from when input was longer (padding area)
    // Status bar is at bottomRow + 1, padding rows below that
    const statusRow = bottomRow + 1;
    const paddingStart = statusRow + 1;
    for (let r = paddingStart; r <= this.rows; r++) {
      process.stdout.write(ANSI.moveTo(r, 1) + ANSI.clearLine);
    }
  }

  private positionCursor(): void {
    // When processing, hide cursor entirely — "thinking..." is the visual indicator
    if (this.isProcessing || this.inSetupWizard || this.inModal !== 'none') {
      process.stdout.write(ANSI.hideCursor);
      return;
    }

    const innerWidth = this.inputInnerWidth;
    const inputLines = this.getInputLines();
    const lineCount = inputLines.length;

    // Cursor is at end of input
    // Which line is the cursor on?
    const cursorLine = lineCount - 1;  // 0-indexed, last line
    const lastLineLength = inputLines[cursorLine]?.length || 0;

    // Input box starts at scrollBottom + 1 (top border)
    // First text line is at scrollBottom + 2
    const inputBoxTop = this.scrollBottom + 1;
    const cursorRow = inputBoxTop + 1 + cursorLine;
    const cursorCol = 4 + lastLineLength;  // 2 margin + 1 border + 1 padding

    process.stdout.write(ANSI.moveTo(cursorRow, cursorCol) + ANSI.showCursor);
  }

  // === SCROLL REGION ADJUSTMENT ===
  // Called when input line count changes - adjusts scroll region if needed
  private checkScrollRegion(): void {
    const currentLineCount = this.getInputLineCount();
    if (currentLineCount === this.lastInputLineCount) return;

    const oldScrollBottom = this.rows - Math.max(6, this.lastInputLineCount + 3);
    const newScrollBottom = this.scrollBottom;

    this.lastInputLineCount = currentLineCount;

    if (newScrollBottom !== oldScrollBottom) {
      // Scroll region size changed - need to adjust
      process.stdout.write(ANSI.setScrollRegion(1, newScrollBottom));

      // If scroll region shrank (more input lines), we need to clear the area
      // that's now part of the input box
      if (newScrollBottom < oldScrollBottom) {
        // Clear rows that are now outside scroll region
        for (let r = newScrollBottom + 1; r <= oldScrollBottom; r++) {
          process.stdout.write(ANSI.moveTo(r, 1) + ANSI.clearLine);
        }
      }
    }
  }

  // === DRAWING: AUTOCOMPLETE ===
  private drawAutocomplete(): void {
    if (this.suggestions.length === 0) return;
    const startRow = this.scrollBottom - this.suggestions.length;

    for (let i = 0; i < this.suggestions.length; i++) {
      const cmd = this.suggestions[i];
      const row = startRow + i;
      if (row < 1) continue;

      process.stdout.write(ANSI.moveTo(row, 2) + ANSI.clearLine);
      const highlight = i === this.suggestionIndex ? ANSI.inverse : '';
      process.stdout.write(highlight + `  ${cmd.name.padEnd(12)} ${cmd.description}` + ANSI.reset);
    }
  }

  private clearAutocomplete(): void {
    if (this.suggestions.length === 0) return;
    const startRow = this.scrollBottom - this.suggestions.length;
    for (let i = 0; i < this.suggestions.length; i++) {
      const row = startRow + i;
      if (row >= 1) {
        process.stdout.write(ANSI.moveTo(row, 1) + ANSI.clearLine);
      }
    }
  }

  // === DRAWING: MODALS ===
  private drawModal(): void {
    // Clear scroll region for modal
    for (let i = 1; i <= this.scrollBottom; i++) {
      process.stdout.write(ANSI.moveTo(i, 1) + ANSI.clearLine);
    }

    if (this.inModal === 'menu') {
      this.drawSlashMenu();
    } else if (this.inModal === 'projects') {
      this.drawProjectList();
    }
  }

  private drawSlashMenu(): void {
    const startCol = 4, startRow = 2;
    process.stdout.write(ANSI.moveTo(startRow, startCol) + ANSI.bold + 'Commands' + ANSI.reset);

    for (let i = 0; i < SLASH_COMMANDS.length; i++) {
      const cmd = SLASH_COMMANDS[i];
      const highlight = i === this.modalIndex ? ANSI.inverse : '';
      process.stdout.write(ANSI.moveTo(startRow + 2 + i, startCol));
      process.stdout.write(highlight + `  ${cmd.name.padEnd(12)} ${cmd.description}` + ANSI.reset);
    }

    process.stdout.write(ANSI.moveTo(startRow + 3 + SLASH_COMMANDS.length, startCol));
    process.stdout.write(ANSI.dim + '  Enter to select, Esc to cancel' + ANSI.reset);
  }

  private drawProjectList(): void {
    const startCol = 4, startRow = 2;
    process.stdout.write(ANSI.moveTo(startRow, startCol) + ANSI.bold + 'Projects' + ANSI.reset);

    if (this.projectsList.length === 0) {
      process.stdout.write(ANSI.moveTo(startRow + 2, startCol) + ANSI.dim + '  No projects yet. Start making beats!' + ANSI.reset);
      process.stdout.write(ANSI.moveTo(startRow + 4, startCol) + ANSI.dim + '  Press Esc to close' + ANSI.reset);
      return;
    }

    const formatDateTime = (isoStr: string) => {
      const d = new Date(isoStr);
      const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      return `${date} ${time}`;
    };

    const visible = this.projectsList.slice(0, 8);
    for (let i = 0; i < visible.length; i++) {
      const p = visible[i];
      const highlight = i === this.modalIndex ? ANSI.inverse : '';
      const recent = i === 0 ? ' ← recent' : '';
      const modified = p.modified ? formatDateTime(p.modified) : '';
      process.stdout.write(ANSI.moveTo(startRow + 2 + i * 2, startCol));
      process.stdout.write(highlight + `  ${p.folderName}` + ANSI.reset + ANSI.dim + recent + ANSI.reset);
      process.stdout.write(ANSI.moveTo(startRow + 3 + i * 2, startCol));
      process.stdout.write(ANSI.dim + `    "${p.name}" • ${p.bpm || 128} BPM • ${p.renderCount || 0} renders • ${modified}` + ANSI.reset);
    }

    process.stdout.write(ANSI.moveTo(startRow + 4 + visible.length * 2, startCol));
    process.stdout.write(ANSI.dim + '  Enter to open, Esc to cancel, /recent for most recent' + ANSI.reset);
  }

  private closeModal(): void {
    this.inModal = 'none';
    this.modalIndex = 0;
    this.redrawContent();  // Restore scroll region content
    this.drawInputBox();
    this.drawStatusBar();
    this.positionCursor();
  }

  // === DRAWING: SETUP WIZARD ===
  private drawSetupWizard(): void {
    process.stdout.write(ANSI.clearScreen + ANSI.moveTo(1, 1));
    const startRow = 3, startCol = 4;
    const width = 60;

    // Box
    process.stdout.write(ANSI.moveTo(startRow, startCol) + ANSI.cyan);
    process.stdout.write(BOX.topLeft + BOX.horizontal.repeat(width) + BOX.topRight);
    for (let i = 1; i <= 10; i++) {
      process.stdout.write(ANSI.moveTo(startRow + i, startCol) + BOX.vertical);
      process.stdout.write(' '.repeat(width));
      process.stdout.write(BOX.vertical);
    }
    process.stdout.write(ANSI.moveTo(startRow + 11, startCol));
    process.stdout.write(BOX.bottomLeft + BOX.horizontal.repeat(width) + BOX.bottomRight + ANSI.reset);

    // Content
    process.stdout.write(ANSI.moveTo(startRow + 2, startCol + 4) + ANSI.bold + ANSI.cyan + 'Welcome to Jambot' + ANSI.reset);

    if (this.setupStep === 'input') {
      process.stdout.write(ANSI.moveTo(startRow + 4, startCol + 4) + 'To make beats, you need an Anthropic API key.');
      process.stdout.write(ANSI.moveTo(startRow + 5, startCol + 4) + ANSI.dim + 'Get one at: console.anthropic.com' + ANSI.reset);
      if (this.setupError) {
        process.stdout.write(ANSI.moveTo(startRow + 7, startCol + 4) + ANSI.red + this.setupError + ANSI.reset);
      }
      process.stdout.write(ANSI.moveTo(startRow + 8, startCol + 4) + 'Paste your key: ' + '*'.repeat(this.setupApiKey.length));
      process.stdout.write(ANSI.showCursor);
    } else {
      process.stdout.write(ANSI.moveTo(startRow + 4, startCol + 4) + ANSI.green + 'Key accepted.' + ANSI.reset);
      process.stdout.write(ANSI.moveTo(startRow + 6, startCol + 4) + `Save to ${getApiKeyPath()}?`);
      process.stdout.write(ANSI.moveTo(startRow + 8, startCol + 4) + ANSI.bold + '(y/n) ' + ANSI.reset);
    }
  }

  // === REFLOW (from experiment - for resize only) ===
  private redrawContent(): void {
    for (let i = 1; i <= this.scrollBottom; i++) {
      process.stdout.write(ANSI.moveTo(i, 1) + ANSI.clearLine);
    }

    const allLines: string[] = [];
    for (const text of this.contentHistory) {
      allLines.push(...this.wrapText(text));
    }

    const visibleLines = allLines.slice(-this.scrollBottom);
    for (let i = 0; i < visibleLines.length; i++) {
      process.stdout.write(ANSI.moveTo(i + 1, 1) + visibleLines[i]);
    }
  }

  // === INPUT HANDLING ===
  private handleKeypress = (data: Buffer): void => {
    const key = data.toString();

    if (this.inSetupWizard) {
      this.handleSetupKey(key);
      return;
    }

    if (key === '\x03') { // Ctrl+C
      this.cleanup();
      process.exit(0);
    }

    if (this.isProcessing) return;

    if (this.inModal !== 'none') {
      this.handleModalKey(key);
      return;
    }

    // Autocomplete navigation
    if (this.suggestions.length > 0) {
      if (key === '\x1b[A') { // Up
        this.suggestionIndex = Math.max(0, this.suggestionIndex - 1);
        this.drawAutocomplete();
        return;
      } else if (key === '\x1b[B') { // Down
        this.suggestionIndex = Math.min(this.suggestions.length - 1, this.suggestionIndex + 1);
        this.drawAutocomplete();
        return;
      } else if (key === '\x09') { // Tab - select
        this.inputBuffer = this.suggestions[this.suggestionIndex].name;
        this.cursorPos = this.inputBuffer.length;
        this.clearAutocomplete();
        this.suggestions = [];
        this.checkScrollRegion();
        this.drawInputBox();
        this.drawStatusBar();
        this.positionCursor();
        return;
      } else if (key === '\x1b') { // Escape
        this.clearAutocomplete();
        this.suggestions = [];
        return;
      }
    }

    // Input history
    if (key === '\x1b[A' && this.suggestions.length === 0) { // Up
      if (this.historyIndex < this.inputHistory.length - 1) {
        this.historyIndex++;
        this.inputBuffer = this.inputHistory[this.inputHistory.length - 1 - this.historyIndex];
        this.cursorPos = this.inputBuffer.length;
        this.updateAutocomplete();
        this.checkScrollRegion();
        this.drawInputBox();
        this.drawStatusBar();
        this.positionCursor();
      }
      return;
    }
    if (key === '\x1b[B' && this.suggestions.length === 0) { // Down
      if (this.historyIndex > 0) {
        this.historyIndex--;
        this.inputBuffer = this.inputHistory[this.inputHistory.length - 1 - this.historyIndex];
      } else if (this.historyIndex === 0) {
        this.historyIndex = -1;
        this.inputBuffer = '';
      }
      this.cursorPos = this.inputBuffer.length;
      this.updateAutocomplete();
      this.checkScrollRegion();
      this.drawInputBox();
      this.drawStatusBar();
      this.positionCursor();
      return;
    }

    // Enter
    if (key === '\r' || key === '\n') {
      const input = this.inputBuffer.trim();
      if (input) {
        this.inputHistory.push(input);
        this.historyIndex = -1;
        this.clearAutocomplete();
        this.suggestions = [];

        // Clear the OLD input box area before shrinking
        // (prevents border artifacts in scroll region)
        const oldInputLines = this.getInputLineCount();
        const oldReserved = Math.max(6, oldInputLines + 3);
        for (let r = this.rows - oldReserved + 1; r <= this.rows; r++) {
          process.stdout.write(ANSI.moveTo(r, 1) + ANSI.clearLine);
        }

        this.inputBuffer = '';
        this.cursorPos = 0;
        // Reset scroll region to default (input is now 1 line)
        this.lastInputLineCount = 1;
        this.setupScrollRegion();
        this.drawInputBox();
        this.drawStatusBar();
        this.positionCursor();  // Hide cursor during processing, position when done
        this.handleSubmit(input);
      }
      return;
    }

    // Backspace
    if (key === '\x7f' || key === '\b') {
      if (this.inputBuffer.length > 0) {
        this.inputBuffer = this.inputBuffer.slice(0, -1);
        this.cursorPos = Math.max(0, this.cursorPos - 1);
        this.updateAutocomplete();
        this.checkScrollRegion();
        this.drawInputBox();
        this.drawStatusBar();
        if (this.suggestions.length > 0) this.drawAutocomplete();
        this.positionCursor();
      }
      return;
    }

    // Regular characters (including paste - multiple chars at once)
    // Filter to only printable characters, strip control chars
    const printable = key.split('').filter(c => c >= ' ' && c <= '~').join('');
    if (printable.length > 0) {
      this.inputBuffer += printable;
      this.cursorPos += printable.length;
      this.updateAutocomplete();
      this.checkScrollRegion();
      this.drawInputBox();
      this.drawStatusBar();
      if (this.suggestions.length > 0) this.drawAutocomplete();
      this.positionCursor();
    }
  };

  private handleSetupKey(key: string): void {
    if (this.setupStep === 'input') {
      if (key === '\r' || key === '\n') {
        const trimmed = this.setupApiKey.trim();
        if (!trimmed.startsWith('sk-ant-')) {
          this.setupError = 'Key should start with sk-ant-';
        } else if (trimmed.length < 20) {
          this.setupError = 'Key seems too short';
        } else {
          this.setupStep = 'confirm';
        }
        this.drawSetupWizard();
        return;
      }
      if (key === '\x7f' || key === '\b') {
        this.setupApiKey = this.setupApiKey.slice(0, -1);
        this.setupError = '';
        this.drawSetupWizard();
        return;
      }
      if (key.length === 1 && key >= ' ') {
        this.setupApiKey += key;
        this.setupError = '';
        this.drawSetupWizard();
      }
    } else {
      if (key.toLowerCase() === 'y') {
        saveApiKey(this.setupApiKey);
        this.finishSetup();
      } else if (key.toLowerCase() === 'n') {
        process.env.ANTHROPIC_API_KEY = this.setupApiKey;
        this.finishSetup();
      }
    }
  }

  private finishSetup(): void {
    this.inSetupWizard = false;
    process.stdout.write(ANSI.clearScreen + ANSI.moveTo(1, 1));
    process.stdout.write(SPLASH);
    this.setupScrollRegion();
    this.drawInputBox();
    this.drawStatusBar();
    this.positionCursor();
  }

  private handleModalKey(key: string): void {
    const maxIndex = this.inModal === 'menu' ? SLASH_COMMANDS.length - 1 : Math.min(9, this.projectsList.length - 1);

    if (key === '\x1b[A') { // Up
      this.modalIndex = Math.max(0, this.modalIndex - 1);
      this.drawModal();
    } else if (key === '\x1b[B') { // Down
      this.modalIndex = Math.min(maxIndex, this.modalIndex + 1);
      this.drawModal();
    } else if (key === '\r' || key === '\n') { // Enter
      if (this.inModal === 'menu') {
        const cmd = SLASH_COMMANDS[this.modalIndex].name;
        this.closeModal();
        this.handleSlashCommand(cmd);
      } else if (this.inModal === 'projects' && this.projectsList.length > 0) {
        const folder = this.projectsList[this.modalIndex].folderName;
        this.closeModal();
        this.openProject(folder);
      }
    } else if (key === '\x1b') { // Escape
      this.closeModal();
    }
  }

  private updateAutocomplete(): void {
    const old = this.suggestions.length;
    if (this.inputBuffer.startsWith('/') && this.inputBuffer.length > 1) {
      const parts = this.inputBuffer.split(' ');
      if (parts[0] === '/open' || parts[0] === '/new') {
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
    // Clear old suggestions if count changed
    if (old > 0 && this.suggestions.length !== old) {
      for (let i = 0; i < old; i++) {
        const row = this.scrollBottom - old + i;
        if (row >= 1) process.stdout.write(ANSI.moveTo(row, 1) + ANSI.clearLine);
      }
    }
  }

  // === COMMAND HANDLING ===
  private handleSubmit(input: string): void {
    if (input === '/') {
      this.inModal = 'menu';
      this.modalIndex = 0;
      this.drawModal();
      this.drawInputBox();
      this.drawStatusBar();
      return;
    }

    if (input.startsWith('/')) {
      const parts = input.split(' ');
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1).join(' ');

      if (cmd === '/new' || cmd === '/open') {
        this.handleSlashCommand(cmd, args);
        return;
      }

      if (this.suggestions.length > 0) {
        this.handleSlashCommand(this.suggestions[this.suggestionIndex].name);
      } else {
        const match = SLASH_COMMANDS.find(c => c.name === cmd);
        if (match) {
          this.handleSlashCommand(match.name);
        } else {
          this.printSystem(`Unknown command: ${input}`);
        }
      }
      return;
    }

    // Track first prompt for project naming
    if (!this.project && !this.firstPrompt) {
      this.firstPrompt = input;
    }

    this.printUser(input);
    this.runAgent(input);
  }

  private handleSlashCommand(cmd: string, args = ''): void {
    switch (cmd) {
      case '/exit':
        if (this.project) updateSession(this.project, this.session);
        this.cleanup();
        process.exit(0);
        break;

      case '/new':
        this.startNewProject(args || null);
        if (!args) this.printSystem('New session started. Project will be created on first render.');
        break;

      case '/open':
        if (args) {
          const projects = listProjects();
          const found = projects.find(p =>
            p.folderName.toLowerCase().includes(args.toLowerCase()) ||
            p.name.toLowerCase().includes(args.toLowerCase())
          );
          if (found) this.openProject(found.folderName);
          else this.printSystem(`Project not found: ${args}`);
        } else {
          this.projectsList = listProjects();
          this.inModal = 'projects';
          this.modalIndex = 0;
          this.drawModal();
          this.drawInputBox();
          this.drawStatusBar();
        }
        break;

      case '/recent':
        const recentProject = getMostRecentProject();
        if (recentProject) {
          this.openProject(recentProject.folderName);
        } else {
          this.printSystem('No projects found. Create a beat first!');
        }
        break;

      case '/projects':
        this.projectsList = listProjects();
        this.inModal = 'projects';
        this.modalIndex = 0;
        this.drawModal();
        this.drawInputBox();
        this.drawStatusBar();
        break;

      case '/clear':
        this.session = createSession();
        this.agentMessages = [];
        this.contentHistory = [];
        this.redrawContent();
        this.printSystem(this.project ? `Session cleared (project: ${this.project.name})` : 'Session cleared');
        break;

      case '/mix': this.printInfo(buildMixOverview(this.session, this.project)); break;
      case '/status': this.showStatus(); break;
      case '/help': this.printInfo(HELP_TEXT); break;
      case '/changelog': this.printInfo(CHANGELOG_TEXT); break;
      case '/jb01': this.printInfo(JB01_GUIDE); break;
      case '/jb200': this.printInfo(JB200_GUIDE); break;
      case '/delay': this.printInfo(DELAY_GUIDE); break;
      case '/export': this.exportCurrentProject(); break;
      default: this.printSystem(`Unknown command: ${cmd}`);
    }
  }

  // === PROJECT MANAGEMENT ===
  private startNewProject(name: string | null): void {
    if (name) {
      const newProject = createProject(name, this.session);
      this.project = newProject;
      this.printProject(`Created project: ${newProject.name}`);
      this.printProject(`  ${JAMBOT_HOME}/projects/${newProject.folderName}`);
    } else {
      this.project = null;
      this.firstPrompt = null;
    }
    this.session = createSession();
    this.agentMessages = [];
  }

  private openProject(folderName: string): void {
    try {
      const loaded = loadProject(folderName);
      this.project = loaded;
      this.session = restoreSession(loaded);
      this.agentMessages = [];
      this.printProject(`Opened project: ${loaded.name}`);
      const count = loaded.renders?.length || 0;
      if (count > 0) this.printProject(`  ${count} render${count !== 1 ? 's' : ''}, last: v${count}.wav`);
    } catch (err: any) {
      this.printSystem(`Error opening project: ${err.message}`);
    }
  }

  private ensureProject(prompt: string): any {
    if (this.project) return this.project;
    const bpm = this.session?.bpm || 128;
    const name = extractProjectName(prompt, bpm);
    const newProject = createProject(name, this.session, prompt);
    this.project = newProject;
    this.printProject(`New project: ${newProject.name}`);
    this.printProject(`  ~/Documents/Jambot/projects/${newProject.folderName}/`);
    return newProject;
  }

  private showStatus(): void {
    let text = this.project
      ? `Project: ${this.project.name}\n  ${JAMBOT_HOME}/projects/${this.project.folderName}\n  Renders: ${this.project.renders?.length || 0}\n`
      : `Project: (none - will create on first render)\n`;
    text += `Session: ${this.session.bpm} BPM`;
    if (this.session.swing > 0) text += `, swing ${this.session.swing}%`;
    this.printInfo(text);
  }

  private showKits(): void {
    const kits = getAvailableKits();
    const paths = getKitPaths();
    let text = 'Available Sample Kits\n\n';
    if (kits.length === 0) {
      text += '  No kits found.\n\n';
    } else {
      for (const kit of kits) {
        text += `  ${kit.id.padEnd(12)} ${kit.name.padEnd(20)} [${kit.source}]\n`;
      }
      text += '\n';
    }
    text += `Bundled: ${paths.bundled}\nUser:    ${paths.user}\n\nSay "load the 808 kit" or use load_kit tool.`;
    this.printInfo(text);
  }

  private exportCurrentProject(): void {
    if (!this.project) { this.printSystem('No project to export.'); return; }
    if (!this.project.renders?.length) { this.printSystem('No renders yet.'); return; }
    try {
      const result = exportProject(this.project, this.session);
      this.printProject(`Exported to ${this.project.folderName}/_source/export/`);
      for (const file of result.files) this.printProject(`  ${file}`);
    } catch (err: any) {
      this.printSystem(`Export failed: ${err.message}`);
    }
  }

  // === AGENT LOOP ===
  private async runAgent(input: string): Promise<void> {
    this.isProcessing = true;
    this.drawInputBox();
    this.positionCursor();  // Hides cursor during processing

    let currentProject = this.project;
    let renderInfo: any = null;

    try {
      await runAgentLoop(input, this.session, this.agentMessages, {
        onTool: (name: string) => this.printTool(name),
        onToolResult: (result: string) => this.printResult(result),
        onResponse: (text: string) => this.printResponse(text),
      }, {
        getRenderPath: () => {
          currentProject = this.ensureProject(this.firstPrompt || input);
          renderInfo = getRenderPath(currentProject);
          return renderInfo.fullPath;
        },
        onRender: (info: any) => {
          if (currentProject && renderInfo) {
            recordRender(currentProject, { ...renderInfo, bars: info.bars, bpm: info.bpm });
            this.project = { ...currentProject };
            this.printProject(`  Saved as v${renderInfo.version}.wav`);
          }
        },
        onRename: (newName: string) => {
          if (!currentProject && !this.project) return { error: "No project to rename." };
          const target = currentProject || this.project;
          const result = renameProject(target, newName);
          this.project = { ...target };
          this.printProject(`  Renamed to "${newName}"`);
          return result;
        },
        onOpenProject: (folderName: string) => {
          try {
            const loaded = loadProject(folderName);
            this.project = loaded;
            this.session = restoreSession(loaded);
            currentProject = loaded;
            this.agentMessages = [];
            this.printProject(`Opened: ${loaded.name}`);
            return { name: loaded.name, bpm: this.session.bpm, renderCount: loaded.renders?.length || 0 };
          } catch (e: any) {
            return { error: `Could not open project: ${e.message}` };
          }
        },
      });

      if (currentProject) {
        addToHistory(currentProject, input);
        updateSession(currentProject, this.session);
        this.project = { ...currentProject };
      }
    } catch (err: any) {
      this.printSystem(`Error: ${err.message}`);
    }

    this.isProcessing = false;
    this.drawInputBox();
    this.drawStatusBar();
    this.positionCursor();
  }

  // === RESIZE ===
  private handleResize = (): void => {
    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.updateSize();
      this.setupScrollRegion();
      // Clear the reserved area at bottom (up to 6+ rows depending on input)
      const reserved = Math.max(6, this.getInputLineCount() + 3);
      for (let i = 0; i < reserved; i++) {
        process.stdout.write(ANSI.moveTo(this.rows - i, 1) + ANSI.clearLine);
      }
      if (this.inModal !== 'none') {
        this.drawModal();
      } else {
        this.redrawContent();
      }
      this.drawInputBox();
      this.drawStatusBar();
      this.positionCursor();
    }, 100);
  };

  private setupScrollRegion(): void {
    process.stdout.write(ANSI.setScrollRegion(1, this.scrollBottom));
  }

  // === LIFECYCLE ===
  private cleanup(): void {
    process.stdout.write(ANSI.resetScrollRegion + ANSI.showCursor);
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.stdin.pause();
    console.log('\nGoodbye!');
  }

  start(): void {
    if (!process.stdout.isTTY) {
      console.error('Error: Not a TTY. Run in a terminal.');
      process.exit(1);
    }

    ensureDirectories();
    process.stdout.on('resize', this.handleResize);
    process.on('SIGWINCH', this.handleResize);

    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', this.handleKeypress);

    if (this.inSetupWizard) {
      this.drawSetupWizard();
    } else {
      process.stdout.write(ANSI.clearScreen + ANSI.moveTo(1, 1));
      process.stdout.write(SPLASH);
      this.setupScrollRegion();
      this.drawInputBox();
      this.drawStatusBar();
      this.positionCursor();
    }
  }
}

// === START ===
const ui = new TerminalUI();
ui.start();
