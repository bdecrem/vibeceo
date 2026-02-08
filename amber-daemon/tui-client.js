#!/usr/bin/env node
// amber-daemon/tui-client.js - TUI client that connects to the daemon
// Same fancy terminal UI, but talks to daemon via socket

import wrapAnsi from 'wrap-ansi';
import { connect } from 'net';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';
import { SPLASH } from './amber.js';

const LOCAL_SOCKET_PATH = join(homedir(), '.amber', 'amber.sock');

// --socket <path> flag: connect to a custom socket (e.g. SSH-tunneled)
const socketArg = process.argv.indexOf('--socket');
const SOCKET_PATH = socketArg !== -1 ? process.argv[socketArg + 1] : LOCAL_SOCKET_PATH;
const IS_REMOTE = socketArg !== -1;

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

// === TUI CLIENT ===
class TUIClient {
  constructor() {
    this.rows = 24;
    this.cols = 80;
    this.inputBuffer = '';
    this.inputHistory = [];
    this.historyIndex = -1;
    this.contentHistory = [];
    this.lastInputLineCount = 1;
    this.isProcessing = false;
    this.socket = null;
    this.connected = false;
    this.buffer = '';

    this.updateSize();
  }

  updateSize() {
    this.rows = process.stdout.rows || 24;
    this.cols = process.stdout.columns || 80;
  }

  get inputInnerWidth() { return this.cols - 8; }
  get wrapWidth() { return Math.max(40, this.cols - 4); }

  getInputLineCount() {
    if (!this.inputBuffer) return 1;
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

  // === OUTPUT ===
  printOutput(text, style = {}) {
    const { color = '', prefix = '' } = style;
    const fullText = prefix + text;
    this.contentHistory.push(fullText);

    const lines = wrapAnsi(fullText, this.wrapWidth, { hard: true, trim: false }).split('\n');
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

  printUser(text) { this.printOutput(text, { color: ANSI.dim, prefix: '> ' }); }
  printTool(name) { this.printOutput(name, { color: ANSI.cyan, prefix: '🔧 ' }); }
  printResult(text) { this.printOutput(text, { color: ANSI.gray, prefix: '   → ' }); }
  printResponse(text) { this.printOutput(text); }
  printSystem(text) { this.printOutput(text, { color: ANSI.yellow }); }
  printInfo(text) { this.printOutput(text, { color: ANSI.dim }); }

  // === DRAWING ===
  drawStatusBar() {
    const remoteTag = IS_REMOTE ? ' (remote)' : '';
    const status = this.connected
      ? ` 🔮 Amber | Connected${remoteTag} `
      : ` 🔮 Amber | Disconnected `;
    const inputLines = this.getInputLineCount();
    const inputBoxTop = this.scrollBottom + 1;
    const inputBoxBottom = inputBoxTop + 1 + inputLines;
    const statusRow = inputBoxBottom + 1;

    process.stdout.write(ANSI.savePos);
    process.stdout.write(ANSI.moveTo(statusRow, 1) + ANSI.clearLine);
    process.stdout.write(ANSI.moveTo(statusRow, 3) + ANSI.dim + status.trim() + ANSI.reset);
    process.stdout.write(ANSI.restorePos);
  }

  drawInputBox() {
    const boxWidth = this.cols - 4;
    const innerWidth = boxWidth - 2;
    const inputLines = this.getInputLines();
    const lineCount = inputLines.length;
    const inputBoxTop = this.scrollBottom + 1;

    process.stdout.write(ANSI.moveTo(inputBoxTop, 1) + ANSI.clearLine);
    process.stdout.write(ANSI.moveTo(inputBoxTop, 2) + ANSI.magenta + BOX.topLeft + BOX.horizontal.repeat(innerWidth) + BOX.topRight + ANSI.reset);

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

    const bottomRow = inputBoxTop + 1 + lineCount;
    process.stdout.write(ANSI.moveTo(bottomRow, 1) + ANSI.clearLine);
    process.stdout.write(ANSI.moveTo(bottomRow, 2) + ANSI.magenta + BOX.bottomLeft + BOX.horizontal.repeat(innerWidth) + BOX.bottomRight + ANSI.reset);

    const statusRow = bottomRow + 1;
    const paddingStart = statusRow + 1;
    for (let r = paddingStart; r <= this.rows; r++) {
      process.stdout.write(ANSI.moveTo(r, 1) + ANSI.clearLine);
    }
  }

  positionCursor() {
    if (this.isProcessing) {
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

  setupScrollRegion() {
    process.stdout.write(ANSI.setScrollRegion(1, this.scrollBottom));
  }

  redrawContent() {
    for (let i = 1; i <= this.scrollBottom; i++) {
      process.stdout.write(ANSI.moveTo(i, 1) + ANSI.clearLine);
    }

    const allLines = [];
    for (const text of this.contentHistory) {
      allLines.push(...wrapAnsi(text, this.wrapWidth, { hard: true, trim: false }).split('\n'));
    }

    const visibleLines = allLines.slice(-this.scrollBottom);
    for (let i = 0; i < visibleLines.length; i++) {
      process.stdout.write(ANSI.moveTo(i + 1, 1) + visibleLines[i]);
    }
  }

  // === SOCKET ===
  connect() {
    if (!existsSync(SOCKET_PATH)) {
      this.printSystem(IS_REMOTE
        ? `Socket not found: ${SOCKET_PATH} — is the SSH tunnel running?`
        : 'Daemon not running. Start with: node daemon.js');
      return;
    }

    this.socket = connect(SOCKET_PATH);

    this.socket.on('connect', () => {
      this.connected = true;
      this.printSystem('Connected to Amber daemon');
      this.drawStatusBar();
    });

    this.socket.on('data', (data) => {
      this.buffer += data.toString();
      const lines = this.buffer.split('\n');
      this.buffer = lines.pop();
      
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          this.handleDaemonMessage(msg);
        } catch (err) {}
      }
    });

    this.socket.on('close', () => {
      this.connected = false;
      this.printSystem('Disconnected from daemon');
      this.drawStatusBar();
    });

    this.socket.on('error', (err) => {
      this.connected = false;
      this.printSystem(`Connection error: ${err.message}`);
      this.drawStatusBar();
    });
  }

  handleDaemonMessage(msg) {
    switch (msg.type) {
      case 'connected':
        this.printInfo(`Session: ${msg.messageCount} messages in history`);
        break;
      
      case 'processing':
        this.isProcessing = msg.value;
        this.drawInputBox();
        this.positionCursor();
        break;
      
      case 'tool':
        this.printTool(msg.name);
        break;
      
      case 'toolResult':
        this.printResult(msg.preview);
        break;
      
      case 'response':
        this.printResponse(msg.text);
        break;
      
      case 'log':
        // Optional: show daemon logs
        // this.printInfo(msg.text);
        break;
      
      case 'error':
        this.printSystem(`Error: ${msg.text}`);
        break;
      
      case 'cleared':
        this.contentHistory = [];
        this.redrawContent();
        this.printSystem('Conversation cleared');
        break;
      
      case 'status':
        this.printInfo(`Messages: ${msg.messageCount} | Polls: ${msg.pollCount} | Responses: ${msg.responsesCount}`);
        break;
    }
  }

  send(msg) {
    if (!this.connected) {
      this.printSystem('Not connected to daemon');
      return;
    }
    this.socket.write(JSON.stringify(msg) + '\n');
  }

  // === INPUT ===
  handleKeypress = (data) => {
    const key = data.toString();

    if (key === '\x03') { // Ctrl+C
      this.cleanup();
      process.exit(0);
    }

    if (this.isProcessing) return;

    // History navigation
    if (key === '\x1b[A') { // Up
      if (this.historyIndex < this.inputHistory.length - 1) {
        this.historyIndex++;
        this.inputBuffer = this.inputHistory[this.inputHistory.length - 1 - this.historyIndex];
        this.redrawInput();
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
      this.redrawInput();
      return;
    }

    // Enter
    if (key === '\r' || key === '\n') {
      const input = this.inputBuffer.trim();
      if (input) {
        this.inputHistory.push(input);
        this.historyIndex = -1;
        this.inputBuffer = '';
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
        this.redrawInput();
      }
      return;
    }

    // Regular chars
    const printable = key.split('').filter(c => c >= ' ' && c <= '~').join('');
    if (printable.length > 0) {
      this.inputBuffer += printable;
      this.redrawInput();
    }
  };

  redrawInput() {
    const currentLineCount = this.getInputLineCount();
    if (currentLineCount !== this.lastInputLineCount) {
      this.lastInputLineCount = currentLineCount;
      this.setupScrollRegion();
    }
    this.drawInputBox();
    this.drawStatusBar();
    this.positionCursor();
  }

  handleSubmit(input) {
    if (input.startsWith('/')) {
      this.handleCommand(input);
      return;
    }

    this.printUser(input);
    this.send({ type: 'chat', content: input });
  }

  handleCommand(input) {
    const cmd = input.split(' ')[0].toLowerCase();

    switch (cmd) {
      case '/exit':
      case '/quit':
        this.cleanup();
        process.exit(0);
        break;

      case '/clear':
        this.send({ type: 'clear' });
        break;

      case '/status':
        this.send({ type: 'status' });
        break;

      case '/reconnect':
        if (this.socket) {
          this.socket.destroy();
        }
        this.connect();
        break;

      case '/help':
        this.printInfo(`Commands:
  /help      - Show this help
  /clear     - Clear conversation history
  /status    - Show daemon status
  /reconnect - Reconnect to daemon
  /exit      - Quit TUI

Just type to talk to Amber.`);
        break;

      default:
        this.printSystem(`Unknown command: ${cmd}`);
    }
  }

  // === LIFECYCLE ===
  cleanup() {
    process.stdout.write(ANSI.resetScrollRegion + ANSI.showCursor);
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.stdin.pause();
    if (this.socket) this.socket.destroy();
    console.log('\n✨ Later.\n');
  }

  handleResize = () => {
    this.updateSize();
    this.setupScrollRegion();
    this.redrawContent();
    this.drawInputBox();
    this.drawStatusBar();
    this.positionCursor();
  };

  start() {
    if (!process.stdout.isTTY) {
      console.error('Error: Not a TTY');
      process.exit(1);
    }

    process.stdout.on('resize', this.handleResize);
    process.on('SIGWINCH', this.handleResize);

    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', this.handleKeypress);

    process.stdout.write(ANSI.clearScreen + ANSI.moveTo(1, 1));
    process.stdout.write(SPLASH);
    console.log(IS_REMOTE
      ? `  📡 Remote mode - connecting to ${SOCKET_PATH}\n`
      : '  📡 Client mode - connecting to daemon\n');
    
    this.setupScrollRegion();
    this.drawInputBox();
    this.drawStatusBar();
    this.positionCursor();

    this.connect();
  }
}

// === START ===
const client = new TUIClient();
client.start();
