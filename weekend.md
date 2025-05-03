# Weekend Mode Implementation Plan

## Overview
This document outlines the steps to implement weekend mode in the Discord bot, which includes different prompts, schedules, and behaviors for weekend operation.

## Implementation Steps

### 1. Create Weekend Prompts File
- Create `/lib/discord/weekend-prompts.ts`
- Define weekend variations for:
  - Newschat intros/outros
  - TMZ chat intros/outros
  - Pitch intros/outros
  - Waterheater intros/outros
- Export as a single object for easy import

### 2. Create Weekend Watercooler
- Create `/lib/discord/watercooler-we.ts`
- Implement weekend-specific watercooler logic
- Keep interface similar to regular watercooler
- Include different story structure

### 3. Create Weekend Schedule
- Create `/lib/discord/weekend-schedule.ts`
- Define weekend-specific intervals
- Export schedule configuration
- Include watercooler-we handler

### 4. Modify handlers.ts
- Add weekend detection logic
- Import weekend components
- Add conditional logic for:
  - Using weekend prompts
  - Using watercooler-we
  - Skipping story arc updates
  - Using weekend schedule

### 5. Testing
- Test weekend detection
- Test all weekend variations
- Verify no story arcs on weekends
- Verify correct schedule usage

## File Structure
```
/lib/discord/
  handlers.ts (modified)
  weekend-prompts.ts (new)
  watercooler-we.ts (new)
  weekend-schedule.ts (new)
```

## Notes
- Keep existing code stable
- Minimize changes to handlers.ts
- Keep weekend logic separate
- Maintain clear documentation 