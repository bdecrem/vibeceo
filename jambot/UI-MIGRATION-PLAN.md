# Jambot UI Migration: Ink → Raw ANSI

## Overview

Replace the React/Ink-based UI (`ui.tsx`) with a raw ANSI terminal UI based on the proven `uiexperiment/` approach. This removes the Ink framework entirely while preserving all functionality.

## Goals

1. **Keep all features**: messages, scrolling, input, autocomplete, status bar, menus
2. **Improve reliability**: no more Ink rendering quirks
3. **Enable native scrollback**: primary buffer with scroll regions
4. **Support resize/reflow**: content reflows on terminal resize

## Architecture

### Before (Ink)
```
ui.tsx (React components)
    ↓
Ink render() → terminal
```

### After (Raw ANSI)
```
terminal-ui.ts (class-based)
    ↓
ANSI escape codes → terminal
```

## File Changes

| Action | File | Notes |
|--------|------|-------|
| DELETE | `ui.tsx` | After migration complete |
| CREATE | `terminal-ui.ts` | New main UI (port from uiexperiment) |
| MODIFY | `jambot.js` | Update to use new UI class |
| MODIFY | `package.json` | Remove ink, ink-text-input, react |
| MODIFY | `build.js` | Update entry point |

## Dependencies

### Remove
```
- ink
- ink-text-input
- react
```

### Keep
```
- wrap-ansi (text wrapping)
- string-width (ANSI-aware width)
- chalk (colors - optional, can use raw ANSI)
```

### Add (maybe)
```
- None required (raw ANSI needs no deps)
```

---

## Phase 1: Core Terminal UI Class

**Goal**: Basic UI shell that can display messages and accept input.

### 1.1 Create `terminal-ui.ts`

Port from `uiexperiment/src/index.ts` with these additions:

```typescript
class TerminalUI {
  // From uiexperiment
  private rows: number;
  private cols: number;
  private inputBuffer: string;
  private contentHistory: string[];

  // New for Jambot
  private messages: Message[];
  private scrollOffset: number;
  private isProcessing: boolean;
  private session: Session;
  private project: Project | null;

  // Callbacks for agent loop
  public onSubmit: (input: string) => Promise<void>;
}
```

### 1.2 Message Rendering

Port message styling from `ui.tsx`:

```typescript
interface Message {
  type: 'user' | 'tool' | 'result' | 'system' | 'project' | 'response';
  text: string;
}

const MESSAGE_STYLES = {
  user:     { color: ANSI.dim,    prefix: '> ' },
  tool:     { color: ANSI.cyan,   prefix: '  ' },
  result:   { color: ANSI.gray,   prefix: '     ' },
  system:   { color: ANSI.yellow, prefix: '' },
  project:  { color: ANSI.green,  prefix: '' },
  response: { color: '',          prefix: '' },
};
```

### 1.3 Scroll Region Layout

```
Row 1 to (rows-4): Message scroll region
Row (rows-3):      Input box top border
Row (rows-2):      Input line
Row (rows-1):      Input box bottom border
Row (rows):        Status bar
```

### 1.4 Files to Create

- [ ] `jambot/terminal-ui.ts` - Main UI class
- [ ] `jambot/ansi.ts` - ANSI escape code constants

---

## Phase 2: Input & Keyboard Handling

**Goal**: Full input handling with history and special keys.

### 2.1 Keyboard Handler

```typescript
private handleKeypress(data: Buffer): void {
  const key = data.toString();

  // Control keys
  if (key === '\x03') this.exit();           // Ctrl+C
  if (key === '\x1b[A') this.scrollUp();     // Up arrow
  if (key === '\x1b[B') this.scrollDown();   // Down arrow
  if (key === '\x1b[5~') this.pageUp();      // Page Up
  if (key === '\x1b[6~') this.pageDown();    // Page Down

  // Input
  if (key === '\r') this.submit();           // Enter
  if (key === '\x7f') this.backspace();      // Backspace
  if (key === '\t') this.autocomplete();     // Tab

  // Printable
  if (key >= ' ' && key.length === 1) {
    this.inputBuffer += key;
    this.drawInputBox();
  }
}
```

### 2.2 Arrow Key Sequences

```typescript
const KEYS = {
  UP:        '\x1b[A',
  DOWN:      '\x1b[B',
  RIGHT:     '\x1b[C',
  LEFT:      '\x1b[D',
  PAGE_UP:   '\x1b[5~',
  PAGE_DOWN: '\x1b[6~',
  HOME:      '\x1b[H',
  END:       '\x1b[F',
  SHIFT_UP:  '\x1b[1;2A',
  SHIFT_DOWN:'\x1b[1;2B',
};
```

### 2.3 Input History

```typescript
private inputHistory: string[] = [];
private historyIndex: number = -1;

private historyUp(): void {
  if (this.historyIndex < this.inputHistory.length - 1) {
    this.historyIndex++;
    this.inputBuffer = this.inputHistory[this.historyIndex];
    this.drawInputBox();
  }
}
```

---

## Phase 3: Status Bar

**Goal**: Dynamic status showing session info.

### 3.1 Status Content

Port from `ui.tsx` StatusBar component:

```typescript
private drawStatus(): void {
  const parts = [
    this.project?.name || 'No Project',
    `${this.session.bpm} BPM`,
    this.getActiveSynths(),
    this.session.swing > 0 ? `Swing ${this.session.swing}%` : '',
  ].filter(Boolean);

  const status = parts.join(' │ ');
  // Draw at row this.rows with background color
}
```

### 3.2 Active Synths Display

```typescript
private getActiveSynths(): string {
  const active = [];
  if (this.session.drumPattern) active.push('R9D9');
  if (this.session.bassPattern) active.push('R3D3');
  if (this.session.leadPattern) active.push('R1D1');
  if (this.session.samplerKit) active.push('R9DS');
  return active.join(' ');
}
```

---

## Phase 4: Autocomplete

**Goal**: Tab-completion for commands.

### 4.1 Suggestion Display

Draw suggestions ABOVE the input box (in the scroll region):

```typescript
private suggestions: string[] = [];
private suggestionIndex: number = 0;

private drawSuggestions(): void {
  if (this.suggestions.length === 0) return;

  // Draw at rows (this.rows - 4 - suggestions.length) to (this.rows - 4)
  for (let i = 0; i < this.suggestions.length; i++) {
    const isSelected = i === this.suggestionIndex;
    const style = isSelected ? ANSI.inverse : '';
    // Draw suggestion line
  }
}
```

### 4.2 Tab Handling

```typescript
private handleTab(): void {
  if (this.suggestions.length > 0) {
    this.inputBuffer = this.suggestions[this.suggestionIndex];
    this.suggestions = [];
    this.drawInputBox();
  } else {
    this.suggestions = this.getSuggestions(this.inputBuffer);
    this.suggestionIndex = 0;
    this.drawSuggestions();
  }
}
```

---

## Phase 5: Modal Overlays

**Goal**: Slash menu and project list as overlays.

### 5.1 Modal State

```typescript
type ModalType = 'none' | 'slash-menu' | 'project-list';
private activeModal: ModalType = 'none';
private modalSelection: number = 0;
```

### 5.2 Overlay Rendering

Modals draw OVER the scroll region, saving what's behind:

```typescript
private savedContent: string[] = [];

private showModal(type: ModalType): void {
  this.saveScrollRegion();
  this.activeModal = type;
  this.modalSelection = 0;
  this.drawModal();
}

private hideModal(): void {
  this.activeModal = 'none';
  this.restoreScrollRegion();
}
```

### 5.3 Slash Menu Content

```typescript
const SLASH_COMMANDS = [
  { key: '/jb01',   desc: 'JB01 drum machine guide' },
  { key: '/jb202',  desc: 'JB202 bass synth guide' },
  { key: '/jt90',   desc: 'JT90 (909-style) drums guide' },
  { key: '/jt30',   desc: 'JT30 (303-style) acid bass guide' },
  { key: '/jt10',   desc: 'JT10 (101-style) lead synth guide' },
  { key: '/kits',   desc: 'List sample kits' },
  { key: '/status', desc: 'Show session' },
  { key: '/clear',  desc: 'Reset session' },
  { key: '/new',    desc: 'New project' },
  { key: '/open',   desc: 'Open project' },
];
```

---

## Phase 6: Integration with Agent Loop

**Goal**: Connect new UI to `jambot.js`.

### 6.1 Export Interface

```typescript
// terminal-ui.ts
export class TerminalUI {
  addMessage(type: MessageType, text: string): void;
  setProcessing(isProcessing: boolean): void;
  setSession(session: Session): void;
  setProject(project: Project): void;

  onSubmit: (input: string) => Promise<void>;
  onSlashCommand: (command: string) => void;
  onOpenProject: (name: string) => void;
}

export function createUI(): TerminalUI;
```

### 6.2 Update jambot.js

```javascript
// Before (Ink)
import { render } from 'ink';
render(<App />);

// After (Raw ANSI)
import { createUI } from './terminal-ui.js';
const ui = createUI();

ui.onSubmit = async (input) => {
  ui.setProcessing(true);
  await runAgentLoop(input, {
    onTool: (name) => ui.addMessage('tool', name),
    onToolResult: (result) => ui.addMessage('result', result),
    onResponse: (text) => ui.addMessage('response', text),
  });
  ui.setProcessing(false);
};

ui.start();
```

---

## Phase 7: Cleanup & Polish

### 7.1 Remove Ink Dependencies

```bash
cd jambot
npm uninstall ink ink-text-input react
```

### 7.2 Update build.js

```javascript
// Change entry point
entryPoints: ['terminal-ui.ts'],

// Remove from external
external: [
  // Remove: 'ink', 'react',
  '@anthropic-ai/sdk',
  'node-web-audio-api',
  'ffmpeg-static',
],
```

### 7.3 Delete Old Files

```bash
rm ui.tsx
```

### 7.4 Test Checklist

- [ ] Startup splash screen
- [ ] Message display with colors
- [ ] Scroll up/down through history
- [ ] Native terminal scrollback works
- [ ] Input with backspace
- [ ] Tab autocomplete
- [ ] Slash menu (/)
- [ ] Project list (/open)
- [ ] Status bar updates
- [ ] Terminal resize reflows content
- [ ] Ctrl+C exits cleanly
- [ ] Agent loop integration works

---

## Migration Order

```
Phase 1 (Core)        → Can display messages, accept input
Phase 2 (Keyboard)    → Full key handling
Phase 3 (Status)      → Session info display
Phase 4 (Autocomplete)→ Tab completion
Phase 5 (Modals)      → Slash menu, project list
Phase 6 (Integration) → Wire to jambot.js
Phase 7 (Cleanup)     → Remove Ink, test everything
```

## Estimated Scope

- **New code**: ~600-800 lines (`terminal-ui.ts` + `ansi.ts`)
- **Deleted code**: ~958 lines (`ui.tsx`)
- **Modified**: `jambot.js` (entry point), `build.js`, `package.json`

## Rollback Plan

Keep `ui.tsx` until Phase 7 is complete and tested. If issues arise, revert to Ink by restoring the `render(<App />)` call.
