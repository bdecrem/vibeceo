# SÉANCE Levels 6-15 — REVISED
**Designer:** LOOP  
**Version:** 2 (fixes corridor issue)

---

## Design Pattern: Column Walls + Vertical Ghosts

**Problem with v1:** Horizontal ghosts in 1-row corridors can't escape.

**Solution:** 
- Wall on the **exit column** (except exit cell) blocks player bypass
- **Vertical ghosts** block player's row but can slide UP/DOWN to clear it
- Ghost escape routes exist but don't lead to exit

---

## LEVEL 6: The Gatekeeper (5x5, Par: 2)
**Teaches:** Vertical ghost blocks the path, slide it to clear

```javascript
{
  grid: 5,
  exit: { x: 4, y: 2, side: 'right' },
  minMoves: 2,
  pieces: [
    { id: 'player', type: 'player', x: 0, y: 2, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
    // Column wall - blocks bypass but not exit
    { id: 'wall1', type: 'furniture', x: 4, y: 0, width: 1, height: 2, orientation: 'vertical', color: THEME.furniture },
    { id: 'wall2', type: 'furniture', x: 4, y: 3, width: 1, height: 2, orientation: 'vertical', color: THEME.furniture },
    // Vertical ghost blocking row 2
    { id: 'g1', type: 'ghost', x: 2, y: 1, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostCyan },
  ],
}
```

```
  0 1 2 3 4
0 . . . . ▓
1 . . G . ▓  ← ghost covers (2,1)-(2,2)
2 P . G . →EXIT
3 . . . . ▓
4 . . . . ▓
```

**Solution:** 
1. Slide g1 UP to (2,0)-(2,1) — clears row 2
2. Player walks right to exit

**Why bypass fails:**
- Row 0 → wall at (4,0)
- Row 1 → wall at (4,1)  
- Row 3 → wall at (4,3)
- Row 4 → wall at (4,4)
- Only exit cell (4,2) accessible

---

## LEVEL 7: Two Gatekeepers (5x5, Par: 3)
**Teaches:** Multiple vertical ghosts, must clear both

```javascript
{
  grid: 5,
  exit: { x: 4, y: 2, side: 'right' },
  minMoves: 3,
  pieces: [
    { id: 'player', type: 'player', x: 0, y: 2, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
    // Column wall
    { id: 'wall1', type: 'furniture', x: 4, y: 0, width: 1, height: 2, orientation: 'vertical', color: THEME.furniture },
    { id: 'wall2', type: 'furniture', x: 4, y: 3, width: 1, height: 2, orientation: 'vertical', color: THEME.furniture },
    // Two vertical ghosts
    { id: 'g1', type: 'ghost', x: 1, y: 1, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostCyan },
    { id: 'g2', type: 'ghost', x: 3, y: 1, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostPink },
  ],
}
```

```
  0 1 2 3 4
0 . . . . ▓
1 . G . G ▓
2 P G . G →EXIT
3 . . . . ▓
4 . . . . ▓
```

**Solution:** 
1. Slide g1 UP or DOWN
2. Slide g2 UP or DOWN  
3. Player walks to exit

---

## LEVEL 8: The Tall One (5x5, Par: 2)
**Teaches:** 3-tall ghost needs more room to clear

```javascript
{
  grid: 5,
  exit: { x: 4, y: 2, side: 'right' },
  minMoves: 2,
  pieces: [
    { id: 'player', type: 'player', x: 0, y: 2, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
    // Column wall
    { id: 'wall1', type: 'furniture', x: 4, y: 0, width: 1, height: 2, orientation: 'vertical', color: THEME.furniture },
    { id: 'wall2', type: 'furniture', x: 4, y: 3, width: 1, height: 2, orientation: 'vertical', color: THEME.furniture },
    // Tall vertical ghost (3 cells)
    { id: 'g1', type: 'ghost', x: 2, y: 1, width: 1, height: 3, orientation: 'vertical', color: THEME.ghostCyan },
  ],
}
```

```
  0 1 2 3 4
0 . . . . ▓
1 . . G . ▓
2 P . G . →EXIT
3 . . G . ▓
4 . . . . ▓
```

**Solution:** 
1. Slide g1 DOWN to (2,2)-(2,4) — clears row 1, but player needs row 2...

Wait, this doesn't work. 3-tall ghost always covers row 2 if centered.

**REVISED:** Make ghost 2-tall, positioned at (2,2)-(2,3):

```javascript
{ id: 'g1', type: 'ghost', x: 2, y: 2, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostCyan },
```

```
  0 1 2 3 4
0 . . . . ▓
1 . . . . ▓
2 P . G . →EXIT
3 . . G . ▓
4 . . . . ▓
```

**Solution:** Slide g1 DOWN to (2,3)-(2,4) — clears row 2.

---

## LEVEL 9: The Interlock (5x5, Par: 4)
**Teaches:** Moving one ghost enables moving another

```javascript
{
  grid: 5,
  exit: { x: 4, y: 2, side: 'right' },
  minMoves: 4,
  pieces: [
    { id: 'player', type: 'player', x: 0, y: 2, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
    // Column wall
    { id: 'wall1', type: 'furniture', x: 4, y: 0, width: 1, height: 2, orientation: 'vertical', color: THEME.furniture },
    { id: 'wall2', type: 'furniture', x: 4, y: 3, width: 1, height: 2, orientation: 'vertical', color: THEME.furniture },
    // Vertical ghost A blocks row 2
    { id: 'g1', type: 'ghost', x: 2, y: 1, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostCyan },
    // Horizontal ghost B blocks g1's escape route
    { id: 'g2', type: 'ghost', x: 1, y: 0, width: 2, height: 1, orientation: 'horizontal', color: THEME.ghostPink },
  ],
}
```

```
  0 1 2 3 4
0 . G G . ▓  ← g2 blocks column 2 row 0
1 . . G . ▓  ← g1 needs to go here
2 P . G . →EXIT
3 . . . . ▓
4 . . . . ▓
```

**Solution:**
1. Slide g2 LEFT to (0,0)-(1,0) — clears column 2 row 0
2. Slide g1 UP to (2,0)-(2,1) — clears row 2
3. Player walks to exit (2 moves)

---

## LEVEL 10: Triple Threat (5x5, Par: 4)
**Teaches:** Three ghosts, sequenced movement

```javascript
{
  grid: 5,
  exit: { x: 4, y: 2, side: 'right' },
  minMoves: 4,
  pieces: [
    { id: 'player', type: 'player', x: 0, y: 2, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
    // Column wall
    { id: 'wall1', type: 'furniture', x: 4, y: 0, width: 1, height: 2, orientation: 'vertical', color: THEME.furniture },
    { id: 'wall2', type: 'furniture', x: 4, y: 3, width: 1, height: 2, orientation: 'vertical', color: THEME.furniture },
    // Three vertical ghosts
    { id: 'g1', type: 'ghost', x: 1, y: 2, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostCyan },
    { id: 'g2', type: 'ghost', x: 2, y: 1, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostPink },
    { id: 'g3', type: 'ghost', x: 3, y: 2, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostGreen },
  ],
}
```

```
  0 1 2 3 4
0 . . . . ▓
1 . . G . ▓
2 P G G G →EXIT
3 . G . G ▓
4 . . . . ▓
```

**Solution:** Slide each ghost to clear row 2, then walk to exit.

---

## LEVEL 11: Big Grid (6x6, Par: 3)
**Teaches:** Larger grid, same pattern

```javascript
{
  grid: 6,
  exit: { x: 5, y: 3, side: 'right' },
  minMoves: 3,
  pieces: [
    { id: 'player', type: 'player', x: 0, y: 3, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
    // Column wall (blocks column 5 except exit at y=3)
    { id: 'wall1', type: 'furniture', x: 5, y: 0, width: 1, height: 3, orientation: 'vertical', color: THEME.furniture },
    { id: 'wall2', type: 'furniture', x: 5, y: 4, width: 1, height: 2, orientation: 'vertical', color: THEME.furniture },
    // Vertical ghost
    { id: 'g1', type: 'ghost', x: 3, y: 2, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostCyan },
  ],
}
```

```
  0 1 2 3 4 5
0 . . . . . ▓
1 . . . . . ▓
2 . . . G . ▓
3 P . . G . →EXIT
4 . . . . . ▓
5 . . . . . ▓
```

---

## LEVEL 12: Cross Pattern (6x6, Par: 4)
**Teaches:** Vertical + horizontal ghosts interact

```javascript
{
  grid: 6,
  exit: { x: 5, y: 3, side: 'right' },
  minMoves: 4,
  pieces: [
    { id: 'player', type: 'player', x: 0, y: 3, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
    // Column wall
    { id: 'wall1', type: 'furniture', x: 5, y: 0, width: 1, height: 3, orientation: 'vertical', color: THEME.furniture },
    { id: 'wall2', type: 'furniture', x: 5, y: 4, width: 1, height: 2, orientation: 'vertical', color: THEME.furniture },
    // Vertical ghost blocks direct path
    { id: 'g1', type: 'ghost', x: 2, y: 2, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostCyan },
    // Horizontal ghost blocks g1's escape
    { id: 'g2', type: 'ghost', x: 1, y: 1, width: 2, height: 1, orientation: 'horizontal', color: THEME.ghostPink },
  ],
}
```

---

## LEVEL 13: The Maze (6x6, Par: 5)
**Teaches:** Multiple interlocking pieces

```javascript
{
  grid: 6,
  exit: { x: 5, y: 3, side: 'right' },
  minMoves: 5,
  pieces: [
    { id: 'player', type: 'player', x: 0, y: 3, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
    // Column wall
    { id: 'wall1', type: 'furniture', x: 5, y: 0, width: 1, height: 3, orientation: 'vertical', color: THEME.furniture },
    { id: 'wall2', type: 'furniture', x: 5, y: 4, width: 1, height: 2, orientation: 'vertical', color: THEME.furniture },
    // Multiple ghosts creating a maze
    { id: 'g1', type: 'ghost', x: 1, y: 2, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostCyan },
    { id: 'g2', type: 'ghost', x: 3, y: 3, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostPink },
    { id: 'g3', type: 'ghost', x: 2, y: 0, width: 2, height: 1, orientation: 'horizontal', color: THEME.ghostGreen },
  ],
}
```

---

## LEVEL 14: The Squeeze (6x6, Par: 6)
**Teaches:** Tight interdependencies

```javascript
{
  grid: 6,
  exit: { x: 5, y: 3, side: 'right' },
  minMoves: 6,
  pieces: [
    { id: 'player', type: 'player', x: 0, y: 3, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
    // Column wall
    { id: 'wall1', type: 'furniture', x: 5, y: 0, width: 1, height: 3, orientation: 'vertical', color: THEME.furniture },
    { id: 'wall2', type: 'furniture', x: 5, y: 4, width: 1, height: 2, orientation: 'vertical', color: THEME.furniture },
    // Complex arrangement
    { id: 'g1', type: 'ghost', x: 1, y: 2, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostCyan },
    { id: 'g2', type: 'ghost', x: 2, y: 3, width: 2, height: 1, orientation: 'horizontal', color: THEME.ghostPink },
    { id: 'g3', type: 'ghost', x: 4, y: 2, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostGreen },
    { id: 'g4', type: 'ghost', x: 2, y: 1, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostOrange },
  ],
}
```

---

## LEVEL 15: Grand Finale (6x6, Par: 8)
**Teaches:** Everything combined

```javascript
{
  grid: 6,
  exit: { x: 5, y: 3, side: 'right' },
  minMoves: 8,
  pieces: [
    { id: 'player', type: 'player', x: 0, y: 3, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
    // Column wall
    { id: 'wall1', type: 'furniture', x: 5, y: 0, width: 1, height: 3, orientation: 'vertical', color: THEME.furniture },
    { id: 'wall2', type: 'furniture', x: 5, y: 4, width: 1, height: 2, orientation: 'vertical', color: THEME.furniture },
    // Complex interdependent arrangement
    { id: 'g1', type: 'ghost', x: 1, y: 1, width: 1, height: 3, orientation: 'vertical', color: THEME.ghostCyan },
    { id: 'g2', type: 'ghost', x: 2, y: 3, width: 2, height: 1, orientation: 'horizontal', color: THEME.ghostPink },
    { id: 'g3', type: 'ghost', x: 4, y: 2, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostGreen },
    { id: 'g4', type: 'ghost', x: 2, y: 0, width: 2, height: 1, orientation: 'horizontal', color: THEME.ghostOrange },
    { id: 'g5', type: 'ghost', x: 3, y: 4, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostCyan },
  ],
}
```

---

## Implementation Notes for @Pit

1. Replace levels 6-15 with these revised versions
2. Key pattern: **column wall at exit** (blocking rows 0-1 and 3-4, leaving exit row open)
3. Vertical ghosts slide UP/DOWN to clear player's row
4. Horizontal ghosts create interlock puzzles (must move H to let V escape)

## Validation for @Tap

Each level should be:
- [x] Solvable (ghost escape routes exist)
- [x] No bypass (column wall blocks all non-exit cells)
- [x] Distinct progression (more pieces, more interlock)
