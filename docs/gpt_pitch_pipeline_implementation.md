# GPT Pitch Pipeline Implementation Plan

## Compatibility Analysis

### 🟢 Compatible Elements (No Changes Needed)
1. **Base Architecture**
   - Discord bot structure remains the same
   - Event handling system unchanged
   - Webhook system for character messages stays the same

2. **State Management**
   - `PitchState` interface already supports additional fields
   - `activePitches` Map structure remains unchanged
   - Round tracking system already in place

3. **TEST_MODE**
   - Current TEST_MODE functionality compatible
   - Logging system can be enhanced without breaking

### 🟡 Minor Modifications Needed
1. **PitchAnalysis Interface**
   - Already has GPT analysis
   - Need to add pros/cons arrays
   - Backward compatible due to optional fields

2. **Message Flow**
   - Current two-round structure stays
   - Only prompt content changes
   - No structural changes to message handling

### 🔴 New Additions (Won't Break Existing)
1. **Context System**
   - New file: `lib/discord/context.ts`
   - Adds flags without modifying existing logic
   - Enhances existing flow without breaking it

2. **Enhanced Prompts**
   - New file: `lib/discord/prompts.ts`
   - Replaces simple prompts with context-aware ones
   - Maintains existing character system

## Implementation Steps

### 1. Context System Setup
```typescript
// New file: lib/discord/context.ts
- Add context flag derivation
- Add pros/cons extraction
- Add helper functions for prompt context
```

### 2. Enhanced Prompts
```typescript
// New file: lib/discord/prompts.ts
- Add round 1 prompt template
- Add round 2 prompt template
- Add voting prompt template
- Add contextual closing messages
```

### 3. Update Analysis Integration
```typescript
// Modify: lib/discord/pitchAnalysis.ts
- Update GPTAnalysis interface
- Add pros/cons to analysis
- Keep backward compatibility
```

### 4. Update Discussion Flow
```typescript
// Modify: lib/discord/pitch.ts
- Integrate context flags
- Update prompt generation
- Enhance voting system
- Add score calculation
```

### 5. Testing & Validation
- Test with existing pitches
- Verify TEST_MODE output
- Check backward compatibility
- Validate all character responses

## Backward Compatibility Notes

1. **State Preservation**
   - All existing state fields remain valid
   - New fields are optional
   - Old pitch sessions will continue working

2. **Error Handling**
   - Existing fallbacks remain in place
   - New features fail gracefully
   - System remains robust

3. **Command Interface**
   - `!pitch` command unchanged
   - User experience remains consistent
   - New features enhance without disrupting

4. **Character System**
   - Existing character definitions stay valid
   - Enhanced prompts use current character system
   - No breaking changes to webhooks

## Risk Assessment

### Low Risk
- Adding context flags (purely additive)
- Enhancing prompts (doesn't affect structure)
- Adding pros/cons (optional fields)

### Medium Risk
- Updating voting system (needs careful testing)
- Score calculation (needs validation)

### Mitigation Strategy
1. Implement changes incrementally
2. Test each component separately
3. Maintain fallback mechanisms
4. Keep TEST_MODE comprehensive

## Next Steps
1. Create context system
2. Set up enhanced prompts
3. Update analysis integration
4. Modify discussion flow
5. Test and validate 