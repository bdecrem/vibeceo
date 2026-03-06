# SÉANCE Levels 6-15 Spec
**Designer:** LOOP  
**For:** @Pit to implement

---

## Design Pattern: The Corridor

Since player moves freely, we use **walls** (immovable furniture spanning full width) to block bypass routes. This creates a "corridor" the player must navigate.

---

## LEVEL 6: Single Corridor (5x5, Par: 2)
**Teaches:** Walls block bypass, must move blocker

```javascript
{
  grid: 5,
  exit: { x: 4, y: 2, side: 'right' },
  minMoves: 2,
  pieces: [
    { id: 'player', type: 'player', x: 0, y: 2, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
    { id: 'wall1', type: 'furniture', x: 0, y: 0, width: 5, height: 2, orientation: 'horizontal', color: THEME.furniture },
    { id: 'wall2', type: 'furniture', x: 0, y: 3, width: 5, height: 2, orientation: 'horizontal', color: THEME.furniture },
    { id: 'g1', type: 'ghost', x: 2, y: 2, width: 1, height: 1, orientation: 'horizontal', color: THEME.ghostCyan },
  ],
}
```

```
  0 1 2 3 4
0 ▓ ▓ ▓ ▓ ▓  (wall1)
1 ▓ ▓ ▓ ▓ ▓
2 P . G . →EXIT
3 ▓ ▓ ▓ ▓ ▓  (wall2)
4 ▓ ▓ ▓ ▓ ▓
```

**Solution:** Slide G left or right (1), player walks to exit (1).

---

## LEVEL 7: Two Horizontal (5x5, Par: 3)
**Teaches:** Multiple blockers, same axis

```javascript
{
  grid: 5,
  exit: { x: 4, y: 2, side: 'right' },
  minMoves: 3,
  pieces: [
    { id: 'player', type: 'player', x: 0, y: 2, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
    { id: 'wall1', type: 'furniture', x: 0, y: 0, width: 5, height: 2, orientation: 'horizontal', color: THEME.furniture },
    { id: 'wall2', type: 'furniture', x: 0, y: 3, width: 5, height: 2, orientation: 'horizontal', color: THEME.furniture },
    { id: 'g1', type: 'ghost', x: 1, y: 2, width: 1, height: 1, orientation: 'horizontal', color: THEME.ghostCyan },
    { id: 'g2', type: 'ghost', x: 3, y: 2, width: 1, height: 1, orientation: 'horizontal', color: THEME.ghostPink },
  ],
}
```

```
  0 1 2 3 4
0 ▓ ▓ ▓ ▓ ▓
1 ▓ ▓ ▓ ▓ ▓
2 P G . G →EXIT
3 ▓ ▓ ▓ ▓ ▓
4 ▓ ▓ ▓ ▓ ▓
```

**Solution:** Slide g1 left to (0,2) — but player blocks! So: Player moves right to (1,2), slide g1 left to (0,2), slide g2 left, player exits. OR just slide both right. Multiple solutions, par is achievable.

---

## LEVEL 8: Wide Blocker (5x5, Par: 2)
**Teaches:** 2-wide pieces take more room to clear

```javascript
{
  grid: 5,
  exit: { x: 4, y: 2, side: 'right' },
  minMoves: 2,
  pieces: [
    { id: 'player', type: 'player', x: 0, y: 2, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
    { id: 'wall1', type: 'furniture', x: 0, y: 0, width: 5, height: 2, orientation: 'horizontal', color: THEME.furniture },
    { id: 'wall2', type: 'furniture', x: 0, y: 3, width: 5, height: 2, orientation: 'horizontal', color: THEME.furniture },
    { id: 'g1', type: 'ghost', x: 2, y: 2, width: 2, height: 1, orientation: 'horizontal', color: THEME.ghostCyan },
  ],
}
```

```
  0 1 2 3 4
0 ▓ ▓ ▓ ▓ ▓
1 ▓ ▓ ▓ ▓ ▓
2 P . G G →EXIT
3 ▓ ▓ ▓ ▓ ▓
4 ▓ ▓ ▓ ▓ ▓
```

**Solution:** Slide GG left to (1,2)-(2,2), player walks to exit.

---

## LEVEL 9: Two Corridors (5x5, Par: 4)
**Teaches:** Navigate through multiple constrained paths

```javascript
{
  grid: 5,
  exit: { x: 4, y: 4, side: 'right' },
  minMoves: 4,
  pieces: [
    { id: 'player', type: 'player', x: 0, y: 0, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
    { id: 'wall1', type: 'furniture', x: 1, y: 0, width: 4, height: 1, orientation: 'horizontal', color: THEME.furniture },
    { id: 'wall2', type: 'furniture', x: 0, y: 2, width: 4, height: 1, orientation: 'horizontal', color: THEME.furniture },
    { id: 'wall3', type: 'furniture', x: 1, y: 4, width: 2, height: 1, orientation: 'horizontal', color: THEME.furniture },
    { id: 'g1', type: 'ghost', x: 0, y: 1, width: 1, height: 1, orientation: 'vertical', color: THEME.ghostCyan },
    { id: 'g2', type: 'ghost', x: 0, y: 3, width: 1, height: 1, orientation: 'vertical', color: THEME.ghostPink },
  ],
}
```

```
  0 1 2 3 4
0 P ▓ ▓ ▓ ▓
1 G . . . .
2 ▓ ▓ ▓ ▓ .
3 G . . . .
4 . ▓ ▓ . →EXIT
```

**Solution:** 
1. g1 down (clears row 1 access)
2. Player moves down-right through maze
3. g2 down to clear row 3
4. Player reaches exit

---

## LEVEL 10: The Gauntlet (5x5, Par: 5)
**Teaches:** Chain of blockers

```javascript
{
  grid: 5,
  exit: { x: 4, y: 2, side: 'right' },
  minMoves: 5,
  pieces: [
    { id: 'player', type: 'player', x: 0, y: 2, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
    { id: 'wall1', type: 'furniture', x: 0, y: 0, width: 5, height: 2, orientation: 'horizontal', color: THEME.furniture },
    { id: 'wall2', type: 'furniture', x: 0, y: 3, width: 5, height: 2, orientation: 'horizontal', color: THEME.furniture },
    { id: 'g1', type: 'ghost', x: 1, y: 2, width: 1, height: 1, orientation: 'horizontal', color: THEME.ghostCyan },
    { id: 'g2', type: 'ghost', x: 2, y: 2, width: 1, height: 1, orientation: 'horizontal', color: THEME.ghostPink },
    { id: 'g3', type: 'ghost', x: 3, y: 2, width: 1, height: 1, orientation: 'horizontal', color: THEME.ghostGreen },
  ],
}
```

```
  0 1 2 3 4
0 ▓ ▓ ▓ ▓ ▓
1 ▓ ▓ ▓ ▓ ▓
2 P A B C →EXIT
3 ▓ ▓ ▓ ▓ ▓
4 ▓ ▓ ▓ ▓ ▓
```

**Solution:** Slide each ghost right in sequence, player follows.

---

## LEVEL 11: Big Grid Intro (6x6, Par: 3)
**Teaches:** 6x6 grid, more space

```javascript
{
  grid: 6,
  exit: { x: 5, y: 2, side: 'right' },
  minMoves: 3,
  pieces: [
    { id: 'player', type: 'player', x: 0, y: 2, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
    { id: 'wall1', type: 'furniture', x: 0, y: 0, width: 6, height: 2, orientation: 'horizontal', color: THEME.furniture },
    { id: 'wall2', type: 'furniture', x: 0, y: 3, width: 6, height: 3, orientation: 'horizontal', color: THEME.furniture },
    { id: 'g1', type: 'ghost', x: 2, y: 2, width: 2, height: 1, orientation: 'horizontal', color: THEME.ghostCyan },
  ],
}
```

```
  0 1 2 3 4 5
0 ▓ ▓ ▓ ▓ ▓ ▓
1 ▓ ▓ ▓ ▓ ▓ ▓
2 P . G G . →EXIT
3 ▓ ▓ ▓ ▓ ▓ ▓
4 ▓ ▓ ▓ ▓ ▓ ▓
5 ▓ ▓ ▓ ▓ ▓ ▓
```

---

## LEVEL 12: Cross Traffic (6x6, Par: 4)
**Teaches:** Vertical blocker in horizontal corridor

```javascript
{
  grid: 6,
  exit: { x: 5, y: 2, side: 'right' },
  minMoves: 4,
  pieces: [
    { id: 'player', type: 'player', x: 0, y: 2, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
    { id: 'wall1', type: 'furniture', x: 0, y: 0, width: 6, height: 1, orientation: 'horizontal', color: THEME.furniture },
    { id: 'wall2', type: 'furniture', x: 0, y: 4, width: 6, height: 2, orientation: 'horizontal', color: THEME.furniture },
    { id: 'g1', type: 'ghost', x: 2, y: 1, width: 1, height: 3, orientation: 'vertical', color: THEME.ghostCyan },
    { id: 'g2', type: 'ghost', x: 4, y: 2, width: 1, height: 1, orientation: 'horizontal', color: THEME.ghostPink },
  ],
}
```

```
  0 1 2 3 4 5
0 ▓ ▓ ▓ ▓ ▓ ▓
1 . . G . . .
2 P . G . G →EXIT
3 . . G . . .
4 ▓ ▓ ▓ ▓ ▓ ▓
5 ▓ ▓ ▓ ▓ ▓ ▓
```

**Solution:** g1 can slide up (blocking row 1) or down (blocking row 3). Player navigates accordingly. Then move g2.

---

## LEVEL 13: The Squeeze (6x6, Par: 5)
**Teaches:** Tight spaces, piece coordination

```javascript
{
  grid: 6,
  exit: { x: 5, y: 3, side: 'right' },
  minMoves: 5,
  pieces: [
    { id: 'player', type: 'player', x: 0, y: 3, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
    { id: 'wall1', type: 'furniture', x: 0, y: 0, width: 6, height: 2, orientation: 'horizontal', color: THEME.furniture },
    { id: 'wall2', type: 'furniture', x: 0, y: 4, width: 5, height: 2, orientation: 'horizontal', color: THEME.furniture },
    { id: 'g1', type: 'ghost', x: 1, y: 2, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostCyan },
    { id: 'g2', type: 'ghost', x: 3, y: 2, width: 2, height: 1, orientation: 'horizontal', color: THEME.ghostPink },
    { id: 'g3', type: 'ghost', x: 3, y: 3, width: 1, height: 1, orientation: 'horizontal', color: THEME.ghostGreen },
  ],
}
```

---

## LEVEL 14: Rush Hour (6x6, Par: 6)
**Teaches:** Classic Rush Hour complexity

```javascript
{
  grid: 6,
  exit: { x: 5, y: 2, side: 'right' },
  minMoves: 6,
  pieces: [
    { id: 'player', type: 'player', x: 0, y: 2, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
    { id: 'wall1', type: 'furniture', x: 0, y: 0, width: 6, height: 1, orientation: 'horizontal', color: THEME.furniture },
    { id: 'wall2', type: 'furniture', x: 0, y: 5, width: 6, height: 1, orientation: 'horizontal', color: THEME.furniture },
    { id: 'g1', type: 'ghost', x: 2, y: 1, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostCyan },
    { id: 'g2', type: 'ghost', x: 4, y: 1, width: 1, height: 3, orientation: 'vertical', color: THEME.ghostPink },
    { id: 'g3', type: 'ghost', x: 2, y: 3, width: 2, height: 1, orientation: 'horizontal', color: THEME.ghostGreen },
    { id: 'g4', type: 'ghost', x: 1, y: 4, width: 1, height: 1, orientation: 'horizontal', color: THEME.ghostOrange },
  ],
}
```

---

## LEVEL 15: The Grand Séance (6x6, Par: 8)
**Teaches:** Everything combined — final challenge

```javascript
{
  grid: 6,
  exit: { x: 5, y: 2, side: 'right' },
  minMoves: 8,
  pieces: [
    { id: 'player', type: 'player', x: 0, y: 2, width: 1, height: 1, orientation: 'both', color: THEME.ghostWhite },
    { id: 'wall1', type: 'furniture', x: 0, y: 0, width: 6, height: 1, orientation: 'horizontal', color: THEME.furniture },
    { id: 'wall2', type: 'furniture', x: 0, y: 5, width: 6, height: 1, orientation: 'horizontal', color: THEME.furniture },
    { id: 'g1', type: 'ghost', x: 1, y: 1, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostCyan },
    { id: 'g2', type: 'ghost', x: 2, y: 2, width: 2, height: 1, orientation: 'horizontal', color: THEME.ghostPink },
    { id: 'g3', type: 'ghost', x: 4, y: 1, width: 1, height: 3, orientation: 'vertical', color: THEME.ghostGreen },
    { id: 'g4', type: 'ghost', x: 2, y: 3, width: 1, height: 2, orientation: 'vertical', color: THEME.ghostOrange },
    { id: 'g5', type: 'ghost', x: 3, y: 4, width: 2, height: 1, orientation: 'horizontal', color: THEME.ghostCyan },
  ],
}
```

---

## Implementation Notes for @Pit

1. Copy these level objects into the `LEVELS` array after level 5
2. The 2x2 wall pieces need `orientation: 'horizontal'` but they don't move (furniture = immovable)
3. Test each level is solvable before deploying
4. If any level has an obvious bypass I missed, flag it and I'll redesign

---

## Validation Checklist (for @Tap)

For each level:
- [ ] Is it solvable?
- [ ] Is par achievable?
- [ ] Is there a bypass (can player reach exit without moving any blockers)?
- [ ] Is the solution unique or are there multiple paths?
