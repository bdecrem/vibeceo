# Fix Jambot Scroll - Make It Work Like Claude Code

## Problem
Scroll doesn't work at all. The keybindings exist but are blocked by a bug.

## Root Cause
Line 491 in `ui.tsx`: Autocomplete navigation checks `key.upArrow` without checking for modifiers, so Shift+Up gets intercepted and never reaches scroll handler.

```typescript
// BUG: This fires even when Shift is held
if (suggestions.length > 0) {
  if (key.upArrow) {  // ← Doesn't check !key.shift
    setSuggestionIndex(...);
    return;  // ← Scroll handler never reached
  }
}
```

## Fixes

### 1. Fix Event Handling (5 min)
**File:** `jambot/ui.tsx` lines 489-501

Change autocomplete handler to ignore modified keys:
```typescript
if (suggestions.length > 0 && !key.shift && !key.ctrl) {
  // ... existing autocomplete logic
}
```

### 2. Add Mouse Wheel Scroll (PRIMARY FEATURE)
**File:** `jambot/ui.tsx`

**This is the main feature. "Like Claude Code" = mouse wheel scrolling.**

Ink doesn't have a built-in mouse hook. Implementation requires:
1. Enable mouse tracking mode via escape sequences on mount
2. Listen to raw stdin for mouse escape sequences
3. Parse SGR-encoded mouse wheel events (button 64 = up, 65 = down)
4. Update scrollOffset state

```typescript
// On mount, enable SGR mouse mode:
useEffect(() => {
  // Enable SGR extended mouse mode (better parsing)
  process.stdout.write('\x1b[?1000h'); // Enable mouse click tracking
  process.stdout.write('\x1b[?1006h'); // Enable SGR extended mode

  // Listen to stdin for mouse events
  const handleData = (data: Buffer) => {
    const str = data.toString();
    // SGR mouse wheel: \x1b[<64;x;yM (up) or \x1b[<65;x;yM (down)
    const match = str.match(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/);
    if (match) {
      const button = parseInt(match[1]);
      if (button === 64) scrollUp();
      if (button === 65) scrollDown();
    }
  };

  process.stdin.on('data', handleData);

  return () => {
    process.stdout.write('\x1b[?1006l');
    process.stdout.write('\x1b[?1000l');
    process.stdin.off('data', handleData);
  };
}, []);

### 3. Remove Ugly Indicators (5 min)
**File:** `jambot/ui.tsx` lines 208-216

Delete the "↑ older messages" and "↓ scroll down" text. Users will discover scroll naturally (mouse wheel, or see keybindings in /help).

### 4. Optional: Memoize Line Calculations (15 min)
**File:** `jambot/ui.tsx` line 167

Current code recalculates `wrapAnsi` for ALL messages on every render. Add memoization:
```typescript
const lineCounts = useMemo(() =>
  messages.map(msg => getVisualLineCount(msg, width)),
  [messages, width]
);
```

## Files to Modify
- `jambot/ui.tsx` — all changes in this one file

## Testing

### Manual Test Script
```bash
cd jambot && npm start
```

1. **Basic scroll test:**
   - Type a few prompts to generate messages
   - Press Shift+Up — should scroll up (see older messages)
   - Press Shift+Down — should scroll down (see newer)
   - Mouse wheel up/down — should scroll

2. **Autocomplete conflict test:**
   - Type `/h` to show autocomplete suggestions
   - Press Shift+Up — should scroll (not move autocomplete selection)
   - Press plain Up — should move autocomplete selection

3. **Edge cases:**
   - Scroll when at top (shouldn't break)
   - Scroll when at bottom (shouldn't break)
   - Scroll with only 1 message (should do nothing gracefully)
   - Resize terminal while scrolled (should handle gracefully)

4. **Performance test:**
   - Generate 50+ messages
   - Scroll should remain smooth (no lag)

## Success Criteria
1. **Mouse wheel scrolls through conversation history** ← PRIMARY
2. Shift+Up/Down also works as backup
3. No ugly arrow indicators
4. Feels like Claude Code

## Status
- [x] Fix 1: Autocomplete event handling (done)
- [x] Fix 3: Remove ugly indicators (done)
- [x] Fix 4: Memoize line calculations (done)
- [x] **Fix 2: Mouse wheel scroll (IMPLEMENTED)**

Ready for testing.
