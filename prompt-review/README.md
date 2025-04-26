# Prompt Generation System

## Key Files
- `sceneFramework.ts` - Core scene generation logic, including:
  - Conversation prompt generation
  - Scene introduction generation
  - Scene conclusion generation
  - Coach selection and dynamics
- `ai.ts` - GPT API integration and response handling
- `episodeContext.ts` - Episode theme and context management
- Type definitions in `types/` directory

## File Structure Explanation
The prompt generation system is more consolidated than initially expected. Some files that were requested don't exist as separate files because their functionality is integrated into `sceneFramework.ts`:

- `generateConvoPrompt.ts` - Functionality is in `sceneFramework.ts`
- `generateIntroPrompt.ts` - Functionality is in `sceneFramework.ts`
- `generateOutroPrompt.ts` - Functionality is in `sceneFramework.ts`
- `playEpisode.ts` - Pacing and scheduling is handled in `scheduler.ts` in the main codebase

This consolidation was likely done to:
1. Keep related functionality together
2. Reduce code duplication
3. Maintain a single source of truth for scene generation logic

## Current Issues
1. Linter errors in prompt generation files
2. Need to verify all type definitions are properly imported
3. Need to ensure all dependencies are correctly referenced

## Recent Fixes
1. Removed regenerated files and copied originals
2. Fixed file structure to match original codebase
3. Added proper type definitions

## Testing Instructions
1. Run the Discord bot locally
2. Monitor scene generation in the watercooler channel
3. Verify that:
   - Scene introductions are properly formatted
   - Conversations flow naturally
   - Scene conclusions tie back to episode themes
   - Coach dynamics are accurately reflected

## Next Steps
1. Fix remaining linter errors
2. Add comprehensive testing
3. Consider extracting prompt generation into separate files if needed
4. Document the prompt generation process in detail

Last updated: 2024-04-25 