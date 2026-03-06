# SÉANCE Level Redesigns — Levels 8, 9, 11, 12, 13
**Designer:** LOOP  
**Goal:** Hit difficulty curve targets

Key principle: **more interlock = more moves.** Chain dependencies where moving A requires moving B first.

---

## LEVEL 8 (5x5, Target Par: 4-5)
**Concept:** Two ghosts block each other's escape routes

```javascript
{
  grid: 5,
  exit: { x: 4, y: 2, side: 'right' },
  minMoves: 4, // Tap to verify
  pieces: [
    { id: 'player', type: 'player', x: 0, y: 2, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
    // Exit column wall
    { id: 'wall1', type: 'furniture', x: 4, y: 0, width: 1, height: 2, orientation: 'vertical', color: THEME.furniture },
    { id: 'wall2', type: 'furniture', x: 4, y: 3, width: 1, height: 2, orientation: 'vertical', color: THEME.furniture },
    // Gatekeeper at exit approach
    { id: 'g1', type: 'ghost', x: 3, y: 1, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostPink },
    // Blocker in middle — blocks player's direct path
    { id: 'g2', type: 'ghost', x: 2, y: 1, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostCyan },
    // Horizontal ghost blocks g2's upward escape
    { id: 'g3', type: 'ghost', x: 1, y: 0, width: 2, height: 1, orientation: 'horizontal', color: THEME.ghostGreen },
  ],
}
```

```
  0 1 2 3 4
0 . H H . ▓  ← g3 blocks g2 from sliding up
1 . . G G ▓  ← g2 and g1 block row 2 access
2 P . G G →EXIT
3 . . . . ▓
4 . . . . ▓
```

**Intended solution:**
1. Slide g3 left (clears col 2 row 0)
2. Slide g2 up (clears row 2 at col 2)
3. Slide g1 up or down (clears row 2 at col 3)
4. Player walks to exit

---

## LEVEL 9 (5x5, Target Par: 4-5)
**Concept:** L-shaped dependency chain

```javascript
{
  grid: 5,
  exit: { x: 4, y: 2, side: 'right' },
  minMoves: 5, // Tap to verify
  pieces: [
    { id: 'player', type: 'player', x: 0, y: 2, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
    // Exit column wall
    { id: 'wall1', type: 'furniture', x: 4, y: 0, width: 1, height: 2, orientation: 'vertical', color: THEME.furniture },
    { id: 'wall2', type: 'furniture', x: 4, y: 3, width: 1, height: 2, orientation: 'vertical', color: THEME.furniture },
    // Gatekeeper
    { id: 'g1', type: 'ghost', x: 3, y: 1, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostPink },
    // Middle vertical blocker
    { id: 'g2', type: 'ghost', x: 2, y: 2, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostCyan },
    // Top horizontal — blocks g1 escape up
    { id: 'g3', type: 'ghost', x: 2, y: 0, width: 2, height: 1, orientation: 'horizontal', color: THEME.ghostGreen },
    // Left vertical — blocks player's direct path  
    { id: 'g4', type: 'ghost', x: 1, y: 1, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostOrange },
  ],
}
```

```
  0 1 2 3 4
0 . . H H ▓  ← g3 blocks g1 up-escape
1 . G . G ▓  ← g4 and g1
2 P G G G →EXIT  ← g4, g2, g1 all block
3 . . G . ▓  ← g2 extends down
4 . . . . ▓
```

---

## LEVEL 11 (6x6, Target Par: 4-5)
**Concept:** 6x6 intro with real interlock

```javascript
{
  grid: 6,
  exit: { x: 5, y: 3, side: 'right' },
  minMoves: 4, // Tap to verify
  pieces: [
    { id: 'player', type: 'player', x: 0, y: 3, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
    // Exit column wall
    { id: 'wall1', type: 'furniture', x: 5, y: 0, width: 1, height: 3, orientation: 'vertical', color: THEME.furniture },
    { id: 'wall2', type: 'furniture', x: 5, y: 4, width: 1, height: 2, orientation: 'vertical', color: THEME.furniture },
    // Gatekeeper at exit approach
    { id: 'g1', type: 'ghost', x: 4, y: 2, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostPink },
    // Middle blocker
    { id: 'g2', type: 'ghost', x: 2, y: 2, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostCyan },
    // Horizontal blocker — blocks g1 escape
    { id: 'g3', type: 'ghost', x: 3, y: 1, width: 2, height: 1, orientation: 'horizontal', color: THEME.ghostGreen },
  ],
}
```

```
  0 1 2 3 4 5
0 . . . . . ▓
1 . . . H H ▓  ← g3 blocks g1 from sliding up
2 . . G . G ▓  ← g2 and g1
3 P . G . G →EXIT
4 . . . . . ▓
5 . . . . . ▓
```

---

## LEVEL 12 (6x6, Target Par: 5-6)
**Concept:** Three-way interlock

```javascript
{
  grid: 6,
  exit: { x: 5, y: 3, side: 'right' },
  minMoves: 5, // Tap to verify
  pieces: [
    { id: 'player', type: 'player', x: 0, y: 3, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
    // Exit column wall
    { id: 'wall1', type: 'furniture', x: 5, y: 0, width: 1, height: 3, orientation: 'vertical', color: THEME.furniture },
    { id: 'wall2', type: 'furniture', x: 5, y: 4, width: 1, height: 2, orientation: 'vertical', color: THEME.furniture },
    // Gatekeeper
    { id: 'g1', type: 'ghost', x: 4, y: 2, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostPink },
    // Middle column blocker
    { id: 'g2', type: 'ghost', x: 2, y: 2, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostCyan },
    // Left column blocker
    { id: 'g3', type: 'ghost', x: 1, y: 3, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostGreen },
    // Top horizontal — blocks multiple escapes
    { id: 'g4', type: 'ghost', x: 1, y: 1, width: 3, height: 1, orientation: 'horizontal', color: THEME.ghostOrange },
    // Bottom horizontal — blocks downward escapes
    { id: 'g5', type: 'ghost', x: 2, y: 5, width: 2, height: 1, orientation: 'horizontal', color: THEME.ghostCyan },
  ],
}
```

---

## LEVEL 13 (6x6, Target Par: 5-7)
**Concept:** Dense puzzle, multiple chains

```javascript
{
  grid: 6,
  exit: { x: 5, y: 3, side: 'right' },
  minMoves: 6, // Tap to verify
  pieces: [
    { id: 'player', type: 'player', x: 0, y: 3, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
    // Exit column wall
    { id: 'wall1', type: 'furniture', x: 5, y: 0, width: 1, height: 3, orientation: 'vertical', color: THEME.furniture },
    { id: 'wall2', type: 'furniture', x: 5, y: 4, width: 1, height: 2, orientation: 'vertical', color: THEME.furniture },
    // Gatekeeper
    { id: 'g1', type: 'ghost', x: 4, y: 2, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostPink },
    // Mid-right vertical
    { id: 'g2', type: 'ghost', x: 3, y: 3, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostCyan },
    // Mid-left vertical
    { id: 'g3', type: 'ghost', x: 2, y: 2, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostGreen },
    // Left vertical
    { id: 'g4', type: 'ghost', x: 1, y: 1, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostOrange },
    // Top horizontal — blocks upward escapes
    { id: 'g5', type: 'ghost', x: 2, y: 0, width: 3, height: 1, orientation: 'horizontal', color: THEME.ghostCyan },
    // Bottom horizontal — blocks downward escapes
    { id: 'g6', type: 'ghost', x: 1, y: 4, width: 2, height: 1, orientation: 'horizontal', color: THEME.ghostPink },
  ],
}
```

---

## Notes for @Tap
- Run the BFS solver on all 5 redesigns
- Verify actual par matches target range
- Check for bypass routes (gatekeeper pattern should hold)
- Flag if any level is unsolvable

## Notes for @Pit
- Wait for Tap's validation before implementing
- These replace the current levels 8, 9, 11, 12, 13
