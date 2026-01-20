# Terminal-Native UI Plan (Jambot)

## Goal
Replace the Ink TUI with a terminal-native UI that preserves native scrollback, keeps the input area pinned near the bottom with status text beneath, and handles terminal resize gracefully.

## Constraints / Non-Goals
- Do not use Ink or full-screen alternate buffer TUIs.
- Preserve normal stdout history so terminal scrollback works.
- No functional changes to the agent loop or audio engine; UI-only changes.
- Keep codebase manageable: small, testable modules, minimal dependencies.

## Architecture Overview
A terminal-native UI is built by streaming output normally to stdout and redrawing only a small footer region (input + status) using cursor control. The footer is re-rendered after each output and on resize, but history stays in the terminal buffer.

## Proposed Module Layout
- `jambot/ui/terminal.ts`
  - Low-level terminal helpers: cursor save/restore, move, clear line(s), get width/height, hide/show cursor.
- `jambot/ui/output.ts`
  - Message formatting + emit to stdout (prefixes, colors, optional wrapping).
  - Ensures footer is redrawn after output.
- `jambot/ui/input.ts`
  - Input buffer + cursor management, history, tab-complete, selection.
  - Key handling for arrows, backspace, tab, enter, escape.
- `jambot/ui/status.ts`
  - Renders status line(s) from session/project state.
- `jambot/ui/app.ts`
  - Orchestrates input -> runAgentLoop -> output.
  - Owns lifecycle: init, resize handler, cleanup.

## Functional Plan
1) **Inventory current UI behaviors**
   - Map message types and prefixes (user/tool/result/system/project) from `jambot/ui.tsx`.
   - Map slash commands, autocomplete flow, project list behavior.
   - Identify must-have vs nice-to-have UI elements for v1.

2) **Define footer contract**
   - Footer height (e.g., 3–5 lines):
     - Line 1: optional hairline
     - Line 2: input prompt + live buffer
     - Line 3: status text
   - Rule: after any output or resize, redraw footer without disturbing history.

3) **Terminal helpers**
   - Implement `saveCursor()`, `restoreCursor()`, `clearLine()`, `clearLines(n)`, `moveCursorToBottom(nLines)`.
   - Handle `stdout.columns/rows` and `process.stdout.on('resize')`.
   - Hide cursor during redraw, show on exit.

4) **Output pipeline**
   - Create `emitMessage(type, text)` that formats prefix + color and writes to stdout.
   - Ensure `emitMessage` triggers `renderFooter()` afterward.
   - For long text, optionally wrap to terminal width (using `wrap-ansi`).

5) **Input handling**
   - Capture raw keypress events (`process.stdin.setRawMode(true)`).
   - Maintain input buffer + cursor index.
   - Render prompt + buffer in footer, support left/right arrow, backspace, delete.
   - Enter submits: invoke agent loop, clear buffer.
   - Tab for autocomplete selection (v1 can keep current simple behavior).

6) **Slash commands and menus**
   - v1: keep `/` commands as text-based (no list UI) to minimize complexity.
   - v2: optional selectable list using a temporary inline render above the footer (still in scrollback, not a fixed pane).

7) **Project list / menu UI**
   - v1: output a numbered list + prompt to type selection (keeps scrollback native).
   - v2: optional in-footer selection state (still within footer lines).

8) **Lifecycle / Cleanup**
   - On exit: restore cursor, reset stdin raw mode, clear footer if desired.
   - Ensure app handles Ctrl+C gracefully.

9) **Testing / Verification**
   - Manual: resize terminal, scrollback with mouse/keys, ensure footer redraws and history remains.
   - Confirm message ordering and prompts are stable during long agent output.

## Phased Delivery
- **Phase 1 (MVP)**: terminal helpers, output stream, pinned input + status, basic slash command handling.
- **Phase 2**: autocomplete, project list flow, optional inline help rendering.
- **Phase 3**: polish (prompt cursor movement, copy/paste, message wrapping edge cases).

## Key Risks
- Cursor redraw glitches across terminals; mitigate with conservative cursor save/restore and minimal redraw region.
- Raw mode key handling can break paste if not handled carefully; support bracketed paste if needed.
- Resizing while outputting; ensure redraw throttling or a simple debounce.

## Compatibility Notes
- macOS Terminal/iTerm2: should work with ANSI cursor controls.
- Windows: not currently a target; would require additional handling.

## Exit Criteria
- Input stays pinned near bottom, status visible beneath.
- Terminal scrollback works normally.
- Resizing does not corrupt prompt or lose history.
- No reliance on Ink; UI code is modular and maintainable.
