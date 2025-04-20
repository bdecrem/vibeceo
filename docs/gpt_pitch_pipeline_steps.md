# GPT Pitch Pipeline Implementation Steps

## Phase 1: Context System
1. Create `lib/discord/context.ts`:
   ```typescript
   - Add PitchContext interface
   - Implement context flag derivation (jokeMode, underdevelopedMode)
   - Add pros/cons extraction from GPT analysis
   - Add helper functions for prompt context generation
   ```

2. Update `lib/discord/pitchAnalysis.ts`:
   ```typescript
   - Update GPTAnalysis interface to include pros/cons
   - Modify GPT prompt to extract pros/cons
   - Update analysis caching to include new fields
   ```

## Phase 2: Enhanced Prompts
1. Create `lib/discord/prompts.ts`:
   ```typescript
   - Add base prompt template
   - Add round-specific modifiers
   - Add character-specific customization
   - Add voting prompt generation
   ```

2. Add prompt types:
   ```typescript
   - Round 1 discussion prompts
   - Round 2 reaction prompts
   - Voting prompts with scoring
   - Final summary prompts
   ```

## Phase 3: Discussion Flow Update
1. Update `lib/discord/pitch.ts` state:
   ```typescript
   - Add numeric scores to voting
   - Add contextual flags to state
   - Add pros/cons tracking
   ```

2. Modify discussion flow:
   ```typescript
   - Update continuePitchDiscussion for context-aware prompts
   - Enhance character response generation
   - Add round-specific behavior
   ```

3. Update voting system:
   ```typescript
   - Add numeric scoring (0-10)
   - Add score aggregation
   - Add contextual closing messages
   ```

## Phase 4: TEST_MODE Enhancements
1. Update test output:
   ```typescript
   - Add context flag display
   - Show pros/cons in analysis
   - Display numeric scores
   - Show round-specific prompts
   ```

2. Add validation checks:
   ```typescript
   - Verify score ranges
   - Check prompt generation
   - Validate character consistency
   ```

## Phase 5: Testing & Validation
1. Test basic functionality:
   ```typescript
   - Test context flag generation
   - Verify prompt generation
   - Check character responses
   - Validate scoring system
   ```

2. Test edge cases:
   ```typescript
   - Very short pitches
   - Very long pitches
   - Extreme scores
   - Missing GPT analysis
   ```

3. Test backward compatibility:
   ```typescript
   - Verify old commands work
   - Check state management
   - Validate error handling
   ```

## Implementation Order

### Step 1: Context System (Day 1)
- [ ] Create context.ts
- [ ] Update pitchAnalysis.ts
- [ ] Test context generation

### Step 2: Prompts (Day 1-2)
- [ ] Create prompts.ts
- [ ] Implement templates
- [ ] Test prompt generation

### Step 3: Discussion Flow (Day 2)
- [ ] Update state management
- [ ] Modify discussion logic
- [ ] Implement scoring

### Step 4: Testing (Day 3)
- [ ] Update TEST_MODE
- [ ] Add validation
- [ ] Test edge cases

### Step 5: Final Integration (Day 3)
- [ ] Full system testing
- [ ] Performance validation
- [ ] Documentation update

## Checkpoints
After each phase:
1. Run existing test suite
2. Verify TEST_MODE output
3. Test with sample pitches
4. Check error handling
5. Validate state management

## Rollback Plan
Each phase has a rollback point:
1. Context: Remove context.ts, revert pitchAnalysis.ts
2. Prompts: Remove prompts.ts, revert to old templates
3. Discussion: Revert pitch.ts changes
4. TEST_MODE: Revert to original output format

## Success Criteria
- All existing functionality works
- New features integrate seamlessly
- TEST_MODE shows enhanced output
- Error handling remains robust
- Performance stays consistent 