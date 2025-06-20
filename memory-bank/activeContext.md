# Active Context: WTAF TypeScript Engine - Complex Page Generation System

## Current Focus: ARCHITECTURE SIMPLIFICATION NEEDED
**The TypeScript engine is working but is unnecessarily complex. Priority: Simplify the hot mess of 2-step prompting.**

## COMPLETED: TypeScript Engine Refactoring (100% Done)
✅ **Successfully refactored** monolithic monitor.py (1133 lines) into TypeScript microservices
✅ **All functionality working**: WTAF creation, EDIT commands, OG image generation
✅ **Production ready**: Deployed and processing real requests
✅ **OpenGraph fixed**: Meta tags now use actual Supabase Storage URLs

### ✅ Final Architecture
```
sms-bot/engine/
├── controller.ts           # Main orchestrator (processWtafRequest)
├── ai-client.ts           # 2-step prompt system (GPT-4o → Claude)
├── storage-manager.ts     # Database operations, OG image handling
├── file-watcher.ts        # Directory monitoring  
├── notification-client.ts # SMS notifications
└── shared/
    ├── config.ts          # Environment, paths, constants
    ├── logger.ts          # Centralized logging
    └── utils.ts           # Utilities
```

### ✅ What Works Perfectly
- **WTAF Creation**: User input → HTML generation → Database → SMS notification
- **EDIT Commands**: Degen users can modify existing pages via natural language
- **OG Images**: Generated and cached with proper meta tag updates
- **Type Safety**: Full TypeScript compilation and error checking
- **Reliability**: All original functionality preserved

## 🔥 NEW FOCUS: Page Generation Workflow Simplification

### Current Complex Workflow (HOT MESS)
```
User Input 
→ generateCompletePrompt() [loads prompt1-creative-brief.json → GPT-4o] 
→ callClaude() [120-line SYSTEM_PROMPT → Claude 3.5 Sonnet → Haiku → GPT-4o fallbacks]
→ extractCodeBlocks() 
→ saveToDatabase() 
→ generateOGImage() 
→ sendSMS()
```

### What Makes It Overly Complex
1. **2-Step Prompting**: GPT-4o to expand prompt → Claude to generate code
2. **3-Model Fallback Chain**: Claude Sonnet → Claude Haiku → GPT-4o  
3. **Multiple Prompt Files**: prompt1-creative-brief.json, prompt2-app.json, etc.
4. **Massive System Prompt**: 120 lines of hardcoded design requirements
5. **File-Based Queuing**: Instead of direct function calls
6. **Complex Parsing**: Coach injection, dual-page detection, delimiter parsing

### What It Should Be
```
User Input → Single Claude Call → Extract HTML → Save → Generate OG → Send SMS
```

**4 steps instead of the current Rube Goldberg machine.**

## Key Files for Page Generation

### Core Workflow Files
- **controller.ts lines 130-265**: `processWtafRequest()` - main workflow orchestration
- **ai-client.ts lines 40-90**: `generateCompletePrompt()` - Step 1 (GPT-4o expansion)  
- **ai-client.ts lines 95-240**: `callClaude()` - Step 2 (Claude generation with fallbacks)
- **controller.ts lines 38-123**: `SYSTEM_PROMPT` - massive hardcoded design requirements

### Prompt Files (Overcomplicated)
- **prompts/prompt1-creative-brief.json**: "Creative director" that expands user requests
- **prompts/edits.json**: Special prompts for EDIT commands
- **prompts/prompt2-*.json**: Various unused specialized prompts

### Processing Logic  
- **storage-manager.ts**: Database operations, OG image coordination
- **shared/utils.ts**: HTML code extraction, dual-page detection

## Simplification Plan

### Phase 1: Create Parallel Simple System
Build new streamlined processor alongside existing complex one:
```typescript
async function processWtafSimple(userInput: string): Promise<string> {
  const html = await claude.generate({
    prompt: `${SIMPLE_DESIGN_REQUIREMENTS}\n\nUser wants: ${userInput}`
  });
  
  const url = await saveToDatabase(html);
  await generateOGImage(url);
  await sendSMS(url);
  return url;
}
```

### Phase 2: A/B Test & Compare
- Route 10% of traffic to simple system
- Compare quality, speed, reliability
- Ensure no regression in user experience

### Phase 3: Full Migration
- Gradually increase traffic to simple system
- Remove complex 2-step prompting
- Delete unused prompt files
- Celebrate massive code reduction 🎉

### Target Metrics
- **Lines of Code**: ~800 lines → ~200 lines
- **AI API Calls**: 2 calls → 1 call
- **Processing Time**: ~30 seconds → ~15 seconds
- **Maintainability**: Complex → Simple

## Current Status: Production Ready But Needs Cleanup

The TypeScript engine is **fully functional and handling real traffic**, but the page generation workflow is a **hot mess of unnecessary complexity**. The refactoring from Python is complete and successful, but now we need a **simplification phase** to make it maintainable long-term.

**Next Priority**: Build simple parallel system to replace the complex 2-step prompting workflow.

## Architecture Issues to Address

### What's Working Well
✅ TypeScript microservices architecture
✅ Type safety and error checking  
✅ Modular, focused components
✅ Reliable file processing and database operations
✅ OpenGraph image generation and caching

### What Needs Simplification
❌ 2-step prompting (GPT-4o → Claude) - unnecessary
❌ 3-model fallback chain - overkill  
❌ Multiple JSON prompt files - consolidate
❌ 120-line hardcoded system prompt - make modular
❌ Complex parsing logic - simplify

The system works great but is way more complex than it needs to be for the task at hand. 