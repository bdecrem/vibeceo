# Flowercraft Implementation Plan

## Summary
Transform the existing Greenhouse game into "Flowercraft" — a flower-growing arcade game with beautiful bezier-petal flowers, active watering, crossbreeding discovery, and collection shelf. Mobile-first (iPhone optimized), localStorage persistence.

## Phase 1: Beautiful Flower Renderer + Active Tending
- Replace circle-petal flowers with bezier curve petals (3 layers, translucent, color gradients)
- Design 6 base flower types with curated palettes: Rose, Lily, Sunflower, Orchid, Tulip, Dahlia
- 3-second bloom unfurl animation (petals scale from center + rotation + pollen burst)
- Active watering: soil dries every ~15-20s, tap to water, miss 3 = wilt/die
- Moisture indicator per plot
- Growth cycle: ~2 min seed-to-bloom through 5 stages (seed → sprout → stem+leaves → bud → BLOOM)

## Phase 2: Currency + Collection Shelf + Seed Selection
- Petals currency: harvest bloomed flowers for petals (tap to collect)
- Visual shelf at top of screen showing 21 variety silhouettes (discovered = full color, undiscovered = dark outline)
- After harvest, pick next seed from 2-3 random options
- HUD: petal count, varieties discovered (X/21)

## Phase 3: Crossbreeding
- When 2+ flowers are bloomed, CROSS button appears
- Select two bloomed flowers → consumed → hybrid seed produced
- 6×6 deterministic breeding grid = 15 unique hybrids + 6 pure = 21 total
- Hybrid visuals blend parent traits (petal shape from A, colors blended)
- Each hybrid has a unique name and designed look

## Phase 4: Upgrades (Petal Sinks)
- Extra Plot (×2): 10, 25 petals → 6 → 8 → 10 plots
- Drip Line: 15 petals → soil dries 50% slower
- Grow Light: 20 petals → growth +30%
- Gold Pot: 30 petals → cosmetic ornate borders

## Phase 5: Share Your Shelf
- OG image generation showing shelf with discovered varieties
- Share route: /pixelpit/arcade/greenhouse/share/[state]
- Uses existing Pixelpit score share pattern

## Persistence
- localStorage: shelf state, petals, upgrades, current plot state

## Mobile-First (iPhone)
- Touch-optimized plot sizes and tap targets (min 44px)
- Responsive layout that works portrait iPhone
- No hover-dependent interactions
- Prevent zoom/scroll on canvas
- Safe area insets for notch/home indicator

## Implementation Order
1. Flower renderer (bezier petals, layers, bloom animation)
2. Watering + wilt mechanics
3. Harvest + petals + seed selection
4. Shelf display
5. Crossbreeding system
6. Upgrades
7. Share image
