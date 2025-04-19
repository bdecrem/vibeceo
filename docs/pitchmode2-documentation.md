# PitchMode2 Documentation

## Overview
PitchMode2 enhances the original pitch system with intelligent analysis and more structured feedback. It maintains backward compatibility while adding new features for better pitch evaluation and discussion.

## Components

### 1. Pitch Analysis (`lib/discord/pitchAnalysis.ts`)
- **Purpose**: Analyzes pitches to determine their characteristics
- **Key Metrics**:
  - `jokeScore`: Identifies joke/fun pitches (score > 7)
  - `noveltyScore`: Measures idea uniqueness (score > 7 for novel)
  - `feasibilityScore`: Assesses implementation practicality
  - `developmentScore`: Evaluates idea completeness (score > 7 for underdeveloped)
- **Analysis Rules**:
  - Joke detection: Looks for absurd combinations and humorous elements
  - Novelty check: Identifies innovative concepts and technologies
  - Feasibility: Evaluates technical and market viability
  - Development: Assesses idea completeness and detail level

### 2. Enhanced Pitch State (`lib/discord/pitch.ts`)
- **New Fields**:
  ```typescript
  interface PitchState {
    analysis?: PitchAnalysis;  // Analysis results
    pros?: string[];          // Extracted pros
    cons?: string[];          // Extracted cons
    // ... existing fields
  }
  ```
- **Backward Compatibility**: All new fields are optional

### 3. Discussion Flow
1. **Initial Analysis**:
   - Pitch is analyzed immediately after submission
   - Results influence discussion context
   - Maintains two-round discussion structure

2. **Response Generation**:
   - First round: Initial reactions (max 50 words)
   - Second round: Follow-up comments
   - Responses tailored based on analysis scores

3. **Voting System**:
   - Simple INVEST/PASS votes
   - Votes influenced by analysis scores
   - Results include context about idea characteristics

### 4. Voting Logic
- **Score Thresholds**:
  - High: > 7/10
  - Medium: 3-7/10
  - Low: < 3/10
- **Voting Guidelines**:
  - Novel ideas (>7): Worth exploring despite risks
  - Feasible ideas (>7): Safer investment bets
  - Underdeveloped ideas (>7): Need more work
  - Joke ideas (>7): Evaluated for entertainment value

## Testing

### Test Suite (`lib/discord/__tests__/pitch.test.ts`)
- **Coverage**:
  - Pitch analysis for different types
  - Command handling
  - Scheduled pitch chat
  - Edge cases
- **Test Cases**:
  - Joke pitches
  - Serious pitches
  - Underdeveloped pitches
  - Novel pitches

### Test Categories
1. **Analysis Tests**:
   - Joke detection
   - Serious pitch evaluation
   - Underdeveloped idea identification

2. **Command Tests**:
   - Valid pitch handling
   - Multiple pitch prevention
   - Error handling

3. **Scheduler Tests**:
   - Successful trigger
   - Invalid channel handling

## Backward Compatibility

### Maintained Features
1. **Command Interface**:
   - `!pitch [idea]` command
   - `!pitchchat-admin [idea]` command
   - No syntax changes

2. **Discussion Structure**:
   - Two-round format
   - Voting phase
   - Results announcement

3. **State Management**:
   - Active pitch tracking
   - Response history
   - Vote recording

## Future Improvements

### Potential Enhancements
1. **Analysis Refinement**:
   - Adjust score thresholds
   - Add more detection patterns
   - Improve accuracy

2. **Voting System**:
   - Add weighted voting
   - Implement consensus rules
   - Enhance result presentation

3. **Discussion Quality**:
   - Improve response relevance
   - Add more context awareness
   - Enhance character consistency

## Notes
- All changes maintain backward compatibility
- New features are optional and don't break existing functionality
- Test suite ensures stability across updates
- Documentation updated with implementation details 