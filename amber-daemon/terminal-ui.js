#!/usr/bin/env node
// amber-daemon/terminal-ui.js - Raw ANSI terminal UI for Amber
// Based on Jambot's terminal-ui.ts - uses native terminal scrollback, NOT virtual rendering

import wrapAnsi from 'wrap-ansi';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  createSession,
  runAgentLoop,
  SPLASH,
  getApiKey,
  saveApiKey,
} from './amber.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..');

// === ANSI ESCAPE CODES ===
const ANSI = {
  moveTo: (row, col) => `\x1b[${row};${col}H`,
  savePos: '\x1b[s',
  restorePos: '\x1b[u',
  hideCursor: '\x1b[?25l',
  showCursor: '\x1b[?25h',
  setScrollRegion: (top, bottom) => `\x1b[${top};${bottom}r`,
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
  magenta: '\x1b[35m',
};

const BOX = {
  topLeft: '\u250c', topRight: '\u2510',
  bottomLeft: '\u2514', bottomRight: '\u2518',
  horizontal: '\u2500', vertical: '\u2502',
};

// Slash commands
const SLASH_COMMANDS = [
  { name: '/help', description: 'Show available commands' },
  { name: '/clear', description: 'Clear conversation history' },
  { name: '/discord', description: 'Check Discord messages' },
  { name: '/status', description: 'Show current session state' },
  { name: '/exit', description: 'Quit Amber' },
];

// === TERMINAL UI CLASS ===
class TerminalUI {
  constructor() {
    this.rows = 24;
    this.cols = 80;
    this.resizeTimeout = null;
    this.inputBuffer = '';
    this.cursorPos = 0;
    this.contentHistory = [];
    this.inputHistory = [];
    this.historyIndex = -1;
    this.lastInputLineCount = 1;

    // Amber state
    this.session = null;
    this.agentMessages = [];
    this.isProcessing = false;

    // Setup wizard
    this.inSetupWizard = false;
    this.setupStep = 'input';
    this.setupApiKey = '';
    this.setupError = '';

    this.updateSize();
    this.session = createSession();
    this.inSetupWizard = !getApiKey();
  }

  updateSize() {
    this.rows = process.stdout.rows || 24;
    this.cols = process.stdout.columns || 80;
  }

  get inputInnerWidth() { return this.cols - 8; }
  get wrapWidth() { return Math.max(40, this.cols - 4); }

  getInputLineCount() {
    if (!this.inputBuffer || this.inputBuffer.length === 0) return 1;
    const width = this.inputInnerWidth;
    if (width <= 0) return 1;
    return Math.ceil(this.inputBuffer.length / width) || 1;
  }

  getInputLines() {
    if (!this.inputBuffer) return [''];
    const width = this.inputInnerWidth;
    if (width <= 0) return [this.inputBuffer];
    const lines = [];
    for (let i = 0; i < this.inputBuffer.length; i += width) {
      lines.push(this.inputBuffer.slice(i, i + width));
    }
    return lines.length > 0 ? lines : [''];
  }

  get scrollBottom() {
    const inputLines = this.getInputLineCount();
    const reserved = Math.max(6, inputLines + 3);
    return this.rows - reserved;
  }

  // === CORE OUTPUT ===
  printOutput(text, style = {}) {
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

  wrapText(text) {
    if (!text) return [''];
    return wrapAnsi(text, this.wrapWidth, { hard: true, trim: false }).split('\n');
  }

  // === STYLED OUTPUT ===
  printUser(text) { this.printOutput(text, { color: ANSI.dim, prefix: '> ' }); }
  printTool(name) { this.printOutput(name, { color: ANSI.cyan, prefix: '🔧 ' }); }
  printResult(text) { this.printOutput(text, { color: ANSI.gray, prefix: '   → ' }); }
  printResponse(text) { this.printOutput(text); }
  printSystem(text) { this.printOutput(text, { color: ANSI.yellow }); }
  printInfo(text) { this.printOutput(text, { color: ANSI.dim }); }

  // === DRAWING: STATUS BAR ===
  drawStatusBar() {
    const status = ` 🔮 Amber | ${this.session?.workingDir || '~'} `.padEnd(this.cols);
    const inputLines = this.getInputLineCount();
    const inputBoxTop = this.scrollBottom + 1;
    const inputBoxBottom = inputBoxTop + 1 + inputLines;
    const statusRow = inputBoxBottom + 1;

    process.stdout.write(ANSI.savePos);
    process.stdout.write(ANSI.moveTo(statusRow, 1) + ANSI.clearLine);
    process.stdout.write(ANSI.moveTo(statusRow, 3) + ANSI.dim + status.trim() + ANSI.reset);
    process.stdout.write(ANSI.restorePos);
  }

  // === DRAWING: INPUT BOX ===
  drawInputBox() {
    const boxWidth = this.cols - 4;
    const innerWidth = boxWidth - 2;
    const inputLines = this.getInputLines();
    const lineCount = inputLines.length;
    const inputBoxTop = this.scrollBottom + 1;

    // Top border
    process.stdout.write(ANSI.moveTo(inputBoxTop, 1) + ANSI.clearLine);
    process.stdout.write(ANSI.moveTo(inputBoxTop, 2) + ANSI.magenta + BOX.topLeft + BOX.horizontal.repeat(innerWidth) + BOX.topRight + ANSI.reset);

    // Input lines
    for (let i = 0; i < lineCount; i++) {
      const row = inputBoxTop + 1 + i;
      process.stdout.write(ANSI.moveTo(row, 1) + ANSI.clearLine);
      process.stdout.write(ANSI.moveTo(row, 2) + ANSI.magenta + BOX.vertical + ANSI.reset);

      if (this.isProcessing && i === 0) {
        process.stdout.write(ANSI.dim + ' thinking...' + ANSI.reset);
        process.stdout.write(' '.repeat(Math.max(0, innerWidth - 12)));
      } else if (this.isProcessing) {
        process.stdout.write(' '.repeat(innerWidth));
      } else {
        const lineText = inputLines[i] || '';
        process.stdout.write(' ' + lineText + ' '.repeat(Math.max(0, innerWidth - lineText.length - 1)));
      }
      process.stdout.write(ANSI.magenta + BOX.vertical + ANSI.reset);
    }

    // Bottom border
    const bottomRow = inputBoxTop + 1 + lineCount;
    process.stdout.write(ANSI.moveTo(bottomRow, 1) + ANSI.clearLine);
    process.stdout.write(ANSI.moveTo(bottomRow, 2) + ANSI.magenta + BOX.bottomLeft + BOX.horizontal.repeat(innerWidth) + BOX.bottomRight + ANSI.reset);

    // Clear padding
    const statusRow = bottomRow + 1;
    const paddingStart = statusRow + 1;
    for (let r = paddingStart; r <= this.rows; r++) {
      process.stdout.write(ANSI.moveTo(r, 1) + ANSI.clearLine);
    }
  }

  positionCursor() {
    if (this.isProcessing || this.inSetupWizard) {
      process.stdout.write(ANSI.hideCursor);
      return;
    }

    const inputLines = this.getInputLines();
    const lineCount = inputLines.length;
    const cursorLine = lineCount - 1;
    const lastLineLength = inputLines[cursorLine]?.length || 0;
    const inputBoxTop = this.scrollBottom + 1;
    const cursorRow = inputBoxTop + 1 + cursorLine;
    const cursorCol = 4 + lastLineLength;

    process.stdout.write(ANSI.moveTo(cursorRow, cursorCol) + ANSI.showCursor);
  }

  checkScrollRegion() {
    const currentLineCount = this.getInputLineCount();
    if (currentLineCount === this.lastInputLineCount) return;

    const oldScrollBottom = this.rows - Math.max(6, this.lastInputLineCount + 3);
    const newScrollBottom = this.scrollBottom;

    this.lastInputLineCount = currentLineCount;

    if (newScrollBottom !== oldScrollBottom) {
      process.stdout.write(ANSI.setScrollRegion(1, newScrollBottom));
      if (newScrollBottom < oldScrollBottom) {
        for (let r = newScrollBottom + 1; r <= oldScrollBottom; r++) {
          process.stdout.write(ANSI.moveTo(r, 1) + ANSI.clearLine);
        }
      }
    }
  }

  redrawContent() {
    for (let i = 1; i <= this.scrollBottom; i++) {
      process.stdout.write(ANSI.moveTo(i, 1) + ANSI.clearLine);
    }

    const allLines = [];
    for (const text of this.contentHistory) {
      allLines.push(...this.wrapText(text));
    }

    const visibleLines = allLines.slice(-this.scrollBottom);
    for (let i = 0; i < visibleLines.length; i++) {
      process.stdout.write(ANSI.moveTo(i + 1, 1) + visibleLines[i]);
    }
  }

  // === SETUP WIZARD ===
  drawSetupWizard() {
    process.stdout.write(ANSI.clearScreen + ANSI.moveTo(1, 1));
    const startRow = 3, startCol = 4, width = 60;

    process.stdout.write(ANSI.moveTo(startRow, startCol) + ANSI.magenta);
    process.stdout.write(BOX.topLeft + BOX.horizontal.repeat(width) + BOX.topRight);
    for (let i = 1; i <= 10; i++) {
      process.stdout.write(ANSI.moveTo(startRow + i, startCol) + BOX.vertical);
      process.stdout.write(' '.repeat(width));
      process.stdout.write(BOX.vertical);
    }
    process.stdout.write(ANSI.moveTo(startRow + 11, startCol));
    process.stdout.write(BOX.bottomLeft + BOX.horizontal.repeat(width) + BOX.bottomRight + ANSI.reset);

    process.stdout.write(ANSI.moveTo(startRow + 2, startCol + 4) + ANSI.bold + ANSI.magenta + '🔮 Welcome to Amber' + ANSI.reset);

    if (this.setupStep === 'input') {
      process.stdout.write(ANSI.moveTo(startRow + 4, startCol + 4) + 'Anthropic API key needed.');
      process.stdout.write(ANSI.moveTo(startRow + 5, startCol + 4) + ANSI.dim + 'Get one at: console.anthropic.com' + ANSI.reset);
      if (this.setupError) {
        process.stdout.write(ANSI.moveTo(startRow + 7, startCol + 4) + ANSI.red + this.setupError + ANSI.reset);
      }
      process.stdout.write(ANSI.moveTo(startRow + 8, startCol + 4) + 'Paste your key: ' + '*'.repeat(this.setupApiKey.length));
      process.stdout.write(ANSI.showCursor);
    } else {
      process.stdout.write(ANSI.moveTo(startRow + 4, startCol + 4) + ANSI.green + 'Key accepted.' + ANSI.reset);
      process.stdout.write(ANSI.moveTo(startRow + 6, startCol + 4) + 'Use for this session?');
      process.stdout.write(ANSI.moveTo(startRow + 7, startCol + 4) + ANSI.dim + '(Add to sms-bot/.env.local to persist)' + ANSI.reset);
      process.stdout.write(ANSI.moveTo(startRow + 9, startCol + 4) + ANSI.bold + '(y/n) ' + ANSI.reset);
    }
  }

  // === INPUT HANDLING ===
  handleKeypress = (data) => {
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

    // Input history
    if (key === '\x1b[A') { // Up
      if (this.historyIndex < this.inputHistory.length - 1) {
        this.historyIndex++;
        this.inputBuffer = this.inputHistory[this.inputHistory.length - 1 - this.historyIndex];
        this.cursorPos = this.inputBuffer.length;
        this.checkScrollRegion();
        this.drawInputBox();
        this.drawStatusBar();
        this.positionCursor();
      }
      return;
    }
    if (key === '\x1b[B') { // Down
      if (this.historyIndex > 0) {
        this.historyIndex--;
        this.inputBuffer = this.inputHistory[this.inputHistory.length - 1 - this.historyIndex];
      } else if (this.historyIndex === 0) {
        this.historyIndex = -1;
        this.inputBuffer = '';
      }
      this.cursorPos = this.inputBuffer.length;
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

        const oldInputLines = this.getInputLineCount();
        const oldReserved = Math.max(6, oldInputLines + 3);
        for (let r = this.rows - oldReserved + 1; r <= this.rows; r++) {
          process.stdout.write(ANSI.moveTo(r, 1) + ANSI.clearLine);
        }

        this.inputBuffer = '';
        this.cursorPos = 0;
        this.lastInputLineCount = 1;
        this.setupScrollRegion();
        this.drawInputBox();
        this.drawStatusBar();
        this.positionCursor();
        this.handleSubmit(input);
      }
      return;
    }

    // Backspace
    if (key === '\x7f' || key === '\b') {
      if (this.inputBuffer.length > 0) {
        this.inputBuffer = this.inputBuffer.slice(0, -1);
        this.cursorPos = Math.max(0, this.cursorPos - 1);
        this.checkScrollRegion();
        this.drawInputBox();
        this.drawStatusBar();
        this.positionCursor();
      }
      return;
    }

    // Regular characters
    const printable = key.split('').filter(c => c >= ' ' && c <= '~').join('');
    if (printable.length > 0) {
      this.inputBuffer += printable;
      this.cursorPos += printable.length;
      this.checkScrollRegion();
      this.drawInputBox();
      this.drawStatusBar();
      this.positionCursor();
    }
  };

  handleSetupKey(key) {
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

  finishSetup() {
    this.inSetupWizard = false;
    process.stdout.write(ANSI.clearScreen + ANSI.moveTo(1, 1));
    process.stdout.write(SPLASH);
    this.setupScrollRegion();
    this.drawInputBox();
    this.drawStatusBar();
    this.positionCursor();
  }

  // === COMMAND HANDLING ===
  handleSubmit(input) {
    if (input.startsWith('/')) {
      const cmd = input.split(' ')[0].toLowerCase();
      this.handleSlashCommand(cmd);
      return;
    }

    this.printUser(input);
    this.runAgent(input);
  }

  handleSlashCommand(cmd) {
    switch (cmd) {
      case '/exit':
        this.cleanup();
        process.exit(0);
        break;

      case '/clear':
        this.session = createSession();
        this.agentMessages = [];
        this.contentHistory = [];
        this.redrawContent();
        this.printSystem('Session cleared.');
        break;

      case '/discord':
        this.printUser('/discord');
        this.runAgent('Check Discord #agent-lounge for recent messages and respond if appropriate.');
        break;

      case '/status':
        this.printInfo(`Session started: ${this.session?.createdAt || 'unknown'}\nMessages: ${this.agentMessages.length}\nWorking dir: ${this.session?.workingDir || '~'}`);
        break;

      case '/help':
        let help = 'Commands:\n';
        for (const c of SLASH_COMMANDS) {
          help += `  ${c.name.padEnd(12)} ${c.description}\n`;
        }
        help += '\nOr just type to talk to Amber.';
        this.printInfo(help);
        break;

      default:
        this.printSystem(`Unknown command: ${cmd}`);
    }
  }

  // === AGENT LOOP ===
  async runAgent(input) {
    this.isProcessing = true;
    this.drawInputBox();
    this.positionCursor();

    try {
      await runAgentLoop(input, this.session, this.agentMessages, {
        onTool: (name) => this.printTool(name),
        onToolResult: (name, result) => {
          const preview = typeof result === 'string'
            ? result.substring(0, 100) + (result.length > 100 ? '...' : '')
            : JSON.stringify(result).substring(0, 100);
          this.printResult(preview);
        },
        onResponse: (text) => this.printResponse(text),
      }, {
        repoRoot: REPO_ROOT
      });
    } catch (err) {
      this.printSystem(`Error: ${err.message}`);
    }

    this.isProcessing = false;
    this.drawInputBox();
    this.drawStatusBar();
    this.positionCursor();
  }

  // === RESIZE ===
  handleResize = () => {
    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.updateSize();
      this.setupScrollRegion();
      const reserved = Math.max(6, this.getInputLineCount() + 3);
      for (let i = 0; i < reserved; i++) {
        process.stdout.write(ANSI.moveTo(this.rows - i, 1) + ANSI.clearLine);
      }
      this.redrawContent();
      this.drawInputBox();
      this.drawStatusBar();
      this.positionCursor();
    }, 100);
  };

  setupScrollRegion() {
    process.stdout.write(ANSI.setScrollRegion(1, this.scrollBottom));
  }

  // === LIFECYCLE ===
  cleanup() {
    process.stdout.write(ANSI.resetScrollRegion + ANSI.showCursor);
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.stdin.pause();
    console.log('\n✨ Later.\n');
  }

  start() {
    if (!process.stdout.isTTY) {
      console.error('Error: Not a TTY. Run in a terminal.');
      process.exit(1);
    }

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
