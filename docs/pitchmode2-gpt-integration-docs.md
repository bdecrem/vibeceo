# PitchMode2 GPT Integration Documentation

## Overview
The PitchMode2 system has been enhanced with GPT-based analysis while maintaining backward compatibility with the existing system.

## Changes Made

### 1. Types and Interfaces
- Added new `GPTAnalysis` interface for GPT-based scoring
- Extended existing `PitchAnalysis` interface with optional GPT analysis
- Maintained original score fields for backward compatibility

### 2. Analysis Function
- New GPT-based analysis using OpenAI's GPT-4
- Caching mechanism for analysis results
- Fallback to original analysis if GPT fails
- Maintained original function signature

### 3. Voting System
- Updated voting prompts to use GPT analysis
- Added rationale display in voting context
- Maintained INVEST/PASS voting format
- Preserved original voting thresholds

### 4. Context Messages
- Enhanced context messages with GPT scores
- Added rationale display in TEST_MODE
- Maintained original message format for non-GPT cases

## Backward Compatibility

### Function Signatures
All public functions maintain their original signatures:
- `analyzePitch(pitch: string): Promise<PitchAnalysis>`
- `handlePitchCommand(message: Message, idea: string): Promise<void>`
- `triggerPitchChat(channelId: string, client: Client): Promise<void>`

### State Management
- Original `PitchState` interface extended with optional fields
- Existing state management code unchanged
- Active pitches map structure preserved

### Voting System
- Original voting mechanism preserved
- INVEST/PASS format maintained
- Voting thresholds unchanged
- Result display format compatible

## Testing

### TEST_MODE
- Enhanced TEST_MODE output with GPT analysis
- Preserved original TEST_MODE functionality
- Added detailed score display with rationales

### Error Handling
- GPT analysis failures fall back to original analysis
- Error messages preserved
- State cleanup unchanged

## Notes
- GPT analysis is optional and cached for 24 hours
- Original analysis remains as fallback
- No breaking changes to existing functionality
- All changes are additive and optional 