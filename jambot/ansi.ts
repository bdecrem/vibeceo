// jambot/ansi.ts - ANSI escape code constants for terminal UI

/**
 * ANSI escape sequences for terminal control.
 * Used by terminal-ui.ts for cursor movement, colors, and scroll regions.
 */
export const ANSI = {
  // Cursor movement
  moveTo: (row: number, col: number) => `\x1b[${row};${col}H`,
  moveUp: (n: number = 1) => `\x1b[${n}A`,
  moveDown: (n: number = 1) => `\x1b[${n}B`,
  moveRight: (n: number = 1) => `\x1b[${n}C`,
  moveLeft: (n: number = 1) => `\x1b[${n}D`,
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
  clearToLineEnd: '\x1b[K',

  // Colors - foreground
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  inverse: '\x1b[7m',

  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // Colors - background
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
  bgGray: '\x1b[48;5;236m',

  // 256-color mode
  fg256: (n: number) => `\x1b[38;5;${n}m`,
  bg256: (n: number) => `\x1b[48;5;${n}m`,
};

// Box drawing characters
export const BOX = {
  topLeft: '\u250c',     // ┌
  topRight: '\u2510',    // ┐
  bottomLeft: '\u2514',  // └
  bottomRight: '\u2518', // ┘
  horizontal: '\u2500',  // ─
  vertical: '\u2502',    // │
  teeLeft: '\u2524',     // ┤
  teeRight: '\u251c',    // ├
  teeUp: '\u2534',       // ┴
  teeDown: '\u252c',     // ┬
  cross: '\u253c',       // ┼
};

// Key codes for raw input handling
export const KEYS = {
  // Control characters
  ctrlC: '\x03',
  ctrlD: '\x04',
  ctrlL: '\x0c',
  enter: '\r',
  newline: '\n',
  tab: '\x09',
  backspace: '\x7f',
  backspaceAlt: '\b',
  escape: '\x1b',

  // Arrow keys
  up: '\x1b[A',
  down: '\x1b[B',
  right: '\x1b[C',
  left: '\x1b[D',

  // Arrow keys with shift modifier
  shiftUp: '\x1b[1;2A',
  shiftDown: '\x1b[1;2B',
  shiftRight: '\x1b[1;2C',
  shiftLeft: '\x1b[1;2D',

  // Page navigation
  pageUp: '\x1b[5~',
  pageDown: '\x1b[6~',
  home: '\x1b[H',
  end: '\x1b[F',
  homeAlt: '\x1b[1~',
  endAlt: '\x1b[4~',

  // Delete
  delete: '\x1b[3~',
};

// Message type to style mapping (matches ui.tsx)
export type MessageType = 'user' | 'tool' | 'result' | 'system' | 'project' | 'response' | 'info';

export interface MessageStyle {
  color: string;
  prefix: string;
}

export function getMessageStyle(type: MessageType): MessageStyle {
  switch (type) {
    case 'user':
      return { color: ANSI.dim, prefix: '> ' };
    case 'tool':
      return { color: ANSI.cyan, prefix: '  ' };
    case 'result':
      return { color: ANSI.gray, prefix: '     ' };
    case 'system':
      return { color: ANSI.yellow, prefix: '' };
    case 'project':
      return { color: ANSI.green, prefix: '' };
    case 'response':
      return { color: '', prefix: '' };
    case 'info':
      return { color: ANSI.dim, prefix: '' };
    default:
      return { color: '', prefix: '' };
  }
}
