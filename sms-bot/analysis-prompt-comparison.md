# Prompt Files Comparison Analysis

## Overview
This document compares the three game builder prompt files to identify differences and potential issues.

## Files Analyzed
1. `/content/builder-game.json` (Current - applied after git reset)
2. `/content/builder-game-chatGPT-MON.json` (ChatGPT Monday version)
3. `/content/deprecated/builder-game.json` (Original deprecated version)

## Key Differences

### 1. Token Support and Model Expectations

**Current (builder-game.json)**:
- Brief mention: "Use comments sparingly or omit them to stay within token limits"
- Final note: "Do not truncate your output. Use Qwen‑3 Coder's long‑context capability to produce full code."

**ChatGPT-MON version**:
- Explicit: "Because Qwen3‑Coder supports 256K tokens natively and up to 1M tokens via extrapolation, you may generate full code without truncation."
- Strong emphasis on not truncating

**Deprecated version**:
- Focus on managing token limits: "If approaching token limits, prioritize functional game code over complex styling."

### 2. Canvas Scaling Issues (Critical for Tetris)

**Current (builder-game.json)**:
- Basic setup: "Set both canvas element dimensions and CSS dimensions using `devicePixelRatio`"
- No specific warning about ctx.scale() issues

**ChatGPT-MON version**:
- Detailed Tetris fix: "compute block size dynamically (blockSize = Math.min(width/10, height/20)) and centre the grid"
- Explicit: "Do not add extra next‑piece panels unless they fit within the canvas"
- Warning about "unused space as in your current Tetris sample"

**Deprecated version**:
- Contains problematic example: `ctx.scale(devicePixelRatio, devicePixelRatio);`
- This could cause the huge blocks issue!

### 3. Control Positioning

**Current**: 
- "Reserve 120px at the bottom for controls: set `controlsHeight = 120`"
- Simple and clear

**ChatGPT-MON**:
- "Reserve exactly controlsHeight = 120px at the bottom"
- "Define controlsHeight = 120 and subtract it from window.innerHeight"

**Deprecated**:
- More detailed with code examples
- Shows exact CSS for .controls class

### 4. Game Loop Timing

**Current**:
- General guidance: "500–1000 ms for Tetris piece drop, 100–150 ms for Snake"

**ChatGPT-MON**:
- Similar timing guidance

**Deprecated**:
- Includes actual code example for time-based game loop
- More educational/instructive

### 5. Collision Detection

**Current**:
- For Pac-Man: "Write an `isValidPosition(x, y)` function"

**ChatGPT-MON**:
- More detailed: "call this in both player and ghost movement"
- Mentions "issue seen in your current sample" (ghosts through walls)

**Deprecated**:
- Less specific about collision requirements

## Critical Issues Identified

### 1. The ctx.scale() Problem
The deprecated prompt includes this problematic line:
```javascript
ctx.scale(devicePixelRatio, devicePixelRatio);
```
This would scale the ENTIRE canvas context, making everything huge on high-DPI displays. This is likely causing the Tetris blocks issue.

### 2. Missing Specific Fixes
The current prompt lacks the specific Tetris fixes mentioned in the ChatGPT-MON version about:
- Dynamic block size calculation
- Grid centering
- Avoiding unused space

### 3. Less Explicit Implementation Guidance
The current prompt is more concise but lacks some of the explicit implementation details that might prevent common errors.

## Recommendations

1. **Add ctx.scale() Warning**: Explicitly warn against using ctx.scale() for the entire canvas
2. **Include Block Size Calculation**: Add the specific formula for Tetris from ChatGPT-MON
3. **More Explicit Collision Examples**: Include the isValidPosition examples
4. **Canvas Setup Clarification**: Be explicit about NOT scaling the context globally