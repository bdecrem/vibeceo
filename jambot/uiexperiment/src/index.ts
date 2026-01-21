/**
 * Terminal UI Experiment - Phase 2
 *
 * Features:
 * - ASCII art bootup screen
 * - Styled text input box
 * - /short (2 sentences) and /long (3 paragraphs) commands
 */

import { appendFileSync } from 'fs';
const DEBUG_LOG = '/tmp/tui-debug.log';
function debugLog(msg: string) {
  appendFileSync(DEBUG_LOG, `${new Date().toISOString()} ${msg}\n`);
}

const ANSI = {
  // Cursor movement
  moveTo: (row: number, col: number) => `\x1b[${row};${col}H`,
  savePos: '\x1b[s',
  restorePos: '\x1b[u',
  hideCursor: '\x1b[?25l',
  showCursor: '\x1b[?25h',

  // Scroll region (DECSTBM) - content scrolls only within this region
  setScrollRegion: (top: number, bottom: number) => `\x1b[${top};${bottom}r`,
  resetScrollRegion: '\x1b[r',

  // Clearing
  clearLine: '\x1b[2K',
  clearScreen: '\x1b[2J',
  clearToEnd: '\x1b[J',

  // Colors
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  reset: '\x1b[0m',
  bgBlue: '\x1b[44m',
  bgGray: '\x1b[48;5;236m',
  white: '\x1b[37m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  gray: '\x1b[90m',
};

// Box drawing characters
const BOX = {
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  horizontal: '─',
  vertical: '│',
};

const SPLASH = `
${ANSI.cyan}${ANSI.bold}
    ██╗   ██╗██╗    ███████╗██╗  ██╗██████╗
    ██║   ██║██║    ██╔════╝╚██╗██╔╝██╔══██╗
    ██║   ██║██║    █████╗   ╚███╔╝ ██████╔╝
    ██║   ██║██║    ██╔══╝   ██╔██╗ ██╔═══╝
    ╚██████╔╝██║    ███████╗██╔╝ ██╗██║
     ╚═════╝ ╚═╝    ╚══════╝╚═╝  ╚═╝╚═╝
${ANSI.reset}
${ANSI.gray}    Terminal UI Experiment v0.1${ANSI.reset}
${ANSI.dim}    Testing fixed input + native scrollback${ANSI.reset}

${ANSI.yellow}    Commands:${ANSI.reset}
${ANSI.gray}    /short${ANSI.reset}  - Reply with 2 sentences
${ANSI.gray}    /long${ANSI.reset}   - Reply with 3 paragraphs
${ANSI.gray}    /flood${ANSI.reset}  - Stress test (2x screen height)
${ANSI.gray}    /clear${ANSI.reset}  - Clear screen
${ANSI.gray}    /quit${ANSI.reset}   - Exit

`;

class TerminalUI {
  private rows: number = 0;
  private cols: number = 0;
  private resizeTimeout: NodeJS.Timeout | null = null;
  private inputBuffer: string = '';
  private cursorPos: number = 0;
  private contentHistory: string[] = [];  // Store raw content for reflow

  constructor() {
    this.updateSize();
  }

  private updateSize(): void {
    this.rows = process.stdout.rows || 24;
    this.cols = process.stdout.columns || 80;
  }

  // Word-wrap text to fit terminal width
  private wrapText(text: string, width: number): string[] {
    if (!text) return [''];

    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      // Account for ANSI codes - they don't take visual space
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const visualLength = testLine.replace(/\x1b\[[0-9;]*m/g, '').length;

      if (visualLength <= width) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);

    return lines;
  }

  private drawStatus(): void {
    const now = new Date().toLocaleTimeString();
    const status = ` ${this.cols}x${this.rows} │ ${now} │ ctrl+c to quit `;
    const padded = status.padEnd(this.cols);

    process.stdout.write(ANSI.savePos);
    process.stdout.write(ANSI.moveTo(this.rows, 1));
    process.stdout.write(ANSI.clearLine);
    process.stdout.write(ANSI.dim + ANSI.bgGray + ANSI.white);
    process.stdout.write(padded);
    process.stdout.write(ANSI.reset);
    process.stdout.write(ANSI.restorePos);
  }

  private drawInputBox(): void {
    const inputRow = this.rows - 3;  // Moved up 1 to make room for status below
    const boxWidth = this.cols - 4;  // Full width minus margins
    const innerWidth = boxWidth - 2;

    // Top border
    process.stdout.write(ANSI.moveTo(inputRow, 2));
    process.stdout.write(ANSI.clearLine);
    process.stdout.write(ANSI.cyan);
    process.stdout.write(BOX.topLeft + BOX.horizontal.repeat(innerWidth) + BOX.topRight);
    process.stdout.write(ANSI.reset);

    // Input line with content
    process.stdout.write(ANSI.moveTo(inputRow + 1, 2));
    process.stdout.write(ANSI.clearLine);
    process.stdout.write(ANSI.cyan + BOX.vertical + ANSI.reset);

    const displayText = this.inputBuffer.slice(0, innerWidth - 1);
    process.stdout.write(' ' + displayText);
    process.stdout.write(' '.repeat(Math.max(0, innerWidth - displayText.length - 1)));
    process.stdout.write(ANSI.cyan + BOX.vertical + ANSI.reset);

    // Bottom border
    process.stdout.write(ANSI.moveTo(inputRow + 2, 2));
    process.stdout.write(ANSI.clearLine);
    process.stdout.write(ANSI.cyan);
    process.stdout.write(BOX.bottomLeft + BOX.horizontal.repeat(innerWidth) + BOX.bottomRight);
    process.stdout.write(ANSI.reset);
  }

  private positionCursor(): void {
    const inputRow = this.rows - 2; // Middle row of input box (box starts at rows-3)
    const cursorCol = 4 + Math.min(this.inputBuffer.length, this.cols - 8);
    process.stdout.write(ANSI.moveTo(inputRow, cursorCol));
  }

  private handleResize = (): void => {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }

    this.resizeTimeout = setTimeout(() => {
      this.updateSize();

      // Reconfigure scroll region for new size
      this.setupScrollRegion();

      // Clear bottom 4 lines to prevent artifacts
      for (let i = 0; i < 4; i++) {
        process.stdout.write(ANSI.moveTo(this.rows - i, 1));
        process.stdout.write(ANSI.clearLine);
      }

      // Reflow content with new width
      if (this.contentHistory.length > 0) {
        this.redrawContent();
      }

      this.drawInputBox();
      this.drawStatus();
      this.positionCursor();
    }, 100);
  };

  private handleKeypress = (key: Buffer): void => {
    const str = key.toString();

    // In test/non-raw mode, input comes as full lines
    if (!process.stdin.isTTY) {
      // Process each character including the line
      for (const char of str) {
        this.processChar(char);
      }
      return;
    }

    this.processChar(str);
  };

  private processChar(char: string): void {
    // Ctrl+C - exit
    if (char === '\x03') {
      this.cleanup();
      process.exit(0);
    }

    // Enter - submit input
    if (char === '\r' || char === '\n') {
      const input = this.inputBuffer.trim();
      this.inputBuffer = '';
      this.cursorPos = 0;

      if (input) {
        this.handleCommand(input);
      }

      this.drawInputBox();
      this.positionCursor();
      return;
    }

    // Backspace
    if (char === '\x7f' || char === '\b') {
      if (this.inputBuffer.length > 0) {
        this.inputBuffer = this.inputBuffer.slice(0, -1);
        this.cursorPos = Math.max(0, this.cursorPos - 1);
        this.drawInputBox();
        this.positionCursor();
      }
      return;
    }

    // Regular character
    if (char.length === 1 && char >= ' ') {
      this.inputBuffer += char;
      this.cursorPos++;
      this.drawInputBox();
      this.positionCursor();
    }
  };

  private handleCommand(input: string): void {
    // Show user input first
    this.printOutput(`${ANSI.green}>${ANSI.reset} ${input}`);

    if (input === '/short') {
      this.printOutput('');
      this.printOutput('The terminal UI experiment is working as expected. Native scrollback should allow you to scroll up through this history using your terminal\'s built-in mechanisms.');
      this.printOutput('');
    } else if (input === '/long') {
      this.printOutput('');
      this.printOutput('This is the first paragraph of the long response. It contains several sentences to demonstrate how multi-line output appears in the terminal. The text should wrap naturally based on your terminal width, and you should be able to scroll back to read it all.');
      this.printOutput('');
      this.printOutput('Here is the second paragraph. When you have a lot of text output like this, the input box will naturally scroll up as new content is added. This is intentional - we\'re staying in the primary screen buffer so that the terminal\'s native scrollback functionality works properly.');
      this.printOutput('');
      this.printOutput('Finally, the third paragraph wraps up this demonstration. Try resizing your terminal window while this text is visible to see how the layout adapts. The input box should remain at the bottom, and the status line should stay anchored below it. If you see any visual artifacts during resize, that\'s what we\'re trying to eliminate.');
      this.printOutput('');
    } else if (input === '/flood') {
      const lineCount = this.rows * 2;
      this.printOutput('');
      for (let i = 1; i <= lineCount; i++) {
        this.printOutput(`${ANSI.dim}Line ${i.toString().padStart(3)} of ${lineCount}${ANSI.reset} - Scroll up to verify native scrollback works`);
      }
      this.printOutput('');
    } else if (input === '/clear') {
      process.stdout.write(ANSI.clearScreen);
      process.stdout.write(ANSI.moveTo(1, 1));
      this.drawInputBox();
      this.drawStatus();
      this.positionCursor();
    } else if (input === '/quit' || input === '/q') {
      this.cleanup();
      process.exit(0);
    } else {
      const now = new Date().toLocaleTimeString();
      this.printOutput(`${ANSI.dim}[${now}]${ANSI.reset} Echo: ${input}`);
    }
  }

  private setupScrollRegion(): void {
    // Set scroll region to exclude bottom 4 rows (input box + status)
    const scrollBottom = this.rows - 4;
    process.stdout.write(ANSI.setScrollRegion(1, scrollBottom));
  }

  private getWrapWidth(): number {
    return Math.max(40, this.cols - 4);
  }

  private printOutput(text: string): void {
    // Store raw content for reflow on resize
    this.contentHistory.push(text);

    // Wrap to current terminal width
    const lines = this.wrapText(text, this.getWrapWidth());

    // Save cursor, move to bottom of scroll region
    process.stdout.write(ANSI.savePos);
    const scrollBottom = this.rows - 4;
    process.stdout.write(ANSI.moveTo(scrollBottom, 1));

    // Print each line - this will scroll within the scroll region
    for (const line of lines) {
      process.stdout.write('\n' + line);
    }

    // Restore cursor and redraw fixed elements (outside scroll region)
    process.stdout.write(ANSI.restorePos);
    this.drawInputBox();
    this.drawStatus();
    this.positionCursor();
  }

  private redrawContent(): void {
    // Clear scroll region and reprint all content with new wrapping
    const scrollBottom = this.rows - 4;
    const wrapWidth = this.getWrapWidth();

    // Move to top of scroll region and clear it
    process.stdout.write(ANSI.moveTo(1, 1));
    for (let i = 1; i <= scrollBottom; i++) {
      process.stdout.write(ANSI.moveTo(i, 1));
      process.stdout.write(ANSI.clearLine);
    }

    // Re-wrap and reprint all content
    const allLines: string[] = [];
    for (const text of this.contentHistory) {
      const wrapped = this.wrapText(text, wrapWidth);
      allLines.push(...wrapped);
    }

    // Only show the last N lines that fit in the scroll region
    const visibleLines = allLines.slice(-scrollBottom);

    // Print from top of scroll region
    for (let i = 0; i < visibleLines.length; i++) {
      process.stdout.write(ANSI.moveTo(i + 1, 1));
      process.stdout.write(visibleLines[i]);
    }
  }

  private cleanup(): void {
    // Reset scroll region to full terminal
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
    const isTest = process.env.TEST_MODE === '1';

    if (!process.stdout.isTTY && !isTest) {
      console.error('Error: Not a TTY. Run in a terminal.');
      process.exit(1);
    }

    // In test mode, use fixed dimensions
    if (isTest) {
      this.rows = 24;
      this.cols = 80;
    }

    // Setup resize handlers
    process.stdout.on('resize', this.handleResize);
    process.on('SIGWINCH', this.handleResize);

    // Setup raw mode for keypress handling
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.on('data', this.handleKeypress);

    // Show splash screen
    process.stdout.write(ANSI.clearScreen);
    process.stdout.write(ANSI.moveTo(1, 1));
    process.stdout.write(SPLASH);

    // Set up scroll region (content area excludes bottom 4 rows)
    this.setupScrollRegion();

    // Draw UI elements
    this.drawInputBox();
    this.drawStatus();
    this.positionCursor();
  }
}

const ui = new TerminalUI();
ui.start();
