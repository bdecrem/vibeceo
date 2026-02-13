# PREFLIGHT.md — PixelPit Quality Gate

**Run this checklist BEFORE any build goes to Bart.**

---

## Pipeline

```
1. Loop specs (with CONSTRAINTS)
2. Pit builds (with defensive code)
3. Tap playtests (this checklist)
4. If FAIL → back to Pit/Loop
5. If PASS → push to Bart
6. Push verifies (OG images, share flows)
7. Bart decides featuring
8. Mave adds to homepage
```

---

## Tap's Playtest Checklist

### ⏱️ Minimum Play Time
- [ ] Played for **60 seconds minimum**
- [ ] Reached at least **halfway through difficulty curve**

### 🚫 Impossible States
- [ ] No blocked paths (always a way through)
- [ ] No overlapping hazards/pickups
- [ ] No instant deaths on spawn
- [ ] No "impossible to avoid" situations

### 🎮 Basic Playability
- [ ] Controls respond immediately
- [ ] Can survive first 30 seconds without luck
- [ ] Difficulty ramp feels gradual (no walls)
- [ ] Death always feels like "my fault"

### 🤔 Clarity
- [ ] Understand goal within 5 seconds
- [ ] Know what kills me vs helps me
- [ ] Visual feedback is clear (hit = ouch, collect = good)
- [ ] No "WTF just happened?" moments

### 📱 Mobile Sanity
- [ ] Playable with one thumb
- [ ] Touch targets big enough
- [ ] No tiny text
- [ ] Works in portrait mode

---

## Result

**✅ PASS** — Push to Bart, ready for testing

**❌ FAIL** — Back to Pit/Loop with specific issues:
```
FAIL: [Game Name]
Issues:
- [Specific problem 1]
- [Specific problem 2]
Fix required before push.
```

---

## Loop's Constraint Format

Every spec must include hard constraints, not just targets:

```
CONSTRAINTS (hard rules, must never violate):
- MAX_ROCKS_PER_ROW = 2 (always 1 clear lane)
- MIN_GAP_WIDTH = 30% screen width
- ICE_CANNOT_OVERLAP_ROCKS = true
- FIRST_1000_UNITS = gentle mode

PARAMETERS (tunable):
- base_speed = 1.0
- rock_chance_start = 30%
- difficulty_ramp = gradual over 10000 units
```

Constraints = Pit's validation rules (code rejects violations)
Parameters = Loop/Pit can tune based on feel

---

## Defensive Code Requirements

Pit must implement spawn validation that **prevents** impossible states:

```javascript
// Example: validateSpawn()
function spawnObstacles(row) {
  // CONSTRAINT: Max 2 rocks per row
  if (rocksInRow >= 2) return; // Hard stop
  
  // CONSTRAINT: Ice can't overlap rocks
  if (icePosition === rockPosition) {
    icePosition = findClearLane();
  }
  
  // CONSTRAINT: Always 1 clear lane
  const clearLanes = lanes.filter(l => !hasRock(l));
  if (clearLanes.length === 0) {
    removeOneRock(); // Fix impossible state
  }
}
```

If the code **can't create** an impossible state, we **can't ship** one.

---

*Last updated: 2026-02-13*
*Owner: Mave 🌊*
