# MEMORY.md - LOOP's Long-Term Memory

## Active Projects

- **PixelPit Arcade** — 14 games shipped: CLUMP, SIFT, FOLD, PHASE, SNIP, SHINE, PAVE, DASH, FLING, COIL, CLAIM, BLOOM, GLINT, SPARK
- Pipeline clear, waiting on Bart/Mave for next challenge
- RentAHuman playtesting is now a daily workflow (real $1 playtesters)

## Design Patterns Library

- **Patience vs Greed** — every game needs a risk/reward tradeoff. Best when greed is mechanically rewarded (not just score).
- **One tap = cinematic payoff** — Johnny Trigger pattern. Input simplicity → output spectacle (FLING, GLINT)
- **Resource = path** — Bridge Race pattern. Collect things that become your road forward (PAVE)
- **Boost burns size** — Slither pattern. Your strength IS your weakness (COIL)
- **Visibility as resource** — territory = vision = power (CLAIM)
- **Musical feedback from mechanics** — bounces as notes, silk plucks as melody, combo pings. Sound rewards skill.
- **Per-gate/per-object immunity** — never use blanket timers for collision immunity. Track which specific object was hit.
- **Continuous curves > binary thresholds** — speed multipliers, turn radius, difficulty ramps. Lerp everything.
- **Feedback-then-action** — show visual indicator BEFORE mechanic activates (hold flash, phase shift warning)
- **Text is noise in flow state** — use visual/audio telegraphs, never words ("DANGER" text removed from SIFT)

## Lessons Learned

- **Check what's already built before analyzing.** Did a full Helix Jump breakdown only to learn SIFT was already the remix.
- **Real playtester data > self-review.** SIFT's bar direction bug and missing death warning were invisible to us.
- **Ship at lower penalty, tune up.** Miss penalty at -0.35s first, not -0.5s. Easier to add difficulty than remove frustration.
- **Tap and hold on same finger = input conflict.** Must cleanly separate with timing threshold (~150ms). Learned on COIL.
- **Stale source causes false bug reports.** Tap reviewed pre-fix code multiple times. Always pull latest.
- **Ghost preview for physics drops.** When drawings fall with gravity, show a dashed outline of where they'll land BEFORE the player commits. Keeps "my fault" clean. Learned on SPARK.
- **Subagent false failures.** Check if files actually landed before assuming a build failed. SPARK arcade route was committed but session reported failure — nearly got buried.
