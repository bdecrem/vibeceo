# PitchMode2 Implementation Plan

## Backward Compatibility Requirements
The following must remain unchanged to maintain compatibility:

1. **Command Interface**
   - `!pitch [idea]` command must work exactly as before
   - `!pitchchat-admin [idea]` command must work exactly as before
   - No changes to command syntax or response format

2. **Scheduler Integration**
   - `schedule.txt` format must remain unchanged
   - `pitchchat` service name in scheduler must work as before
   - Scheduled pitch timing and triggering must work as before

3. **State Management**
   - Existing `PitchState` interface must remain compatible
   - Active pitch sessions must continue to work
   - No breaking changes to state structure

4. **Response Flow**
   - Two-round discussion structure must remain
   - Voting phase must complete as before
   - Results announcement format must remain compatible

## Overview
Enhancing the pitch mode with better analysis, categorization, and response handling while maintaining the above compatibility requirements.

## Implementation Steps

### 1. Create Analysis Module
- [x] Create `lib/discord/pitchAnalysis.ts`
- [x] Implement rule-based analysis functions
  - [x] Length analysis
  - [x] Joke pattern detection
  - [x] Feasibility keywords
  - [x] Novelty check
- [x] Create test cases
- [x] Add documentation

### 2. Update PitchState Interface
- [x] Modify `PitchState` in `pitch.ts`
- [x] Add analysis fields
- [x] Ensure backward compatibility
- [x] Update type definitions

### 3. Integrate Analysis
- [x] Add analysis to `handlePitchCommand`
- [x] Add analysis to `triggerPitchChat`
- [x] Add logging for debugging
- [x] Test integration points

### 4. Modify Coach Prompts
- [x] Update prompt templates
- [x] Create response styles based on scores
- [x] Test with various pitch types
- [x] Refine prompt engineering

### 5. Update Voting System
- [x] Modify voting logic
- [x] Adjust score ranges
- [x] Update results presentation
- [x] Test voting outcomes

### 6. Testing & Validation
- [x] Create test suite
- [x] Test edge cases
- [x] Verify backward compatibility
- [x] Document test results

## Notes
- Each step should be completed and tested before moving to the next
- Backward compatibility must be maintained throughout
- All changes should be made on the `Pitchmode2` branch

## Test Cases
Test cases have been implemented in `pitchAnalysis.ts` with the following examples:
- "waffle stand"
- "send a man to mars, needs $1000 in startup funding"
- "AI-powered toaster that writes poetry"
- "B2B SaaS platform for enterprise AI integration..." 