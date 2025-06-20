# WTAF Simplification Plan: From 8 Files to 4

## Executive Summary

Transform the current 8+ file scattered system into a radically simpler 4-file architecture that supports all current functionality plus future features including composable apps, image generation, and creative constraint-based solutions.

## Vision & Requirements

### Core Value Proposition
**One-shot prompting over SMS** - Users type one sentence and get something super cool back.

### The 5 Use Cases

1. **Games** - Need to actually work with proper gameplay
2. **Simple Pages (No Data)** - "Happy birthday page for Sarah"  
3. **Single Data Pages** - "Landing page for coffee shop" (needs email)
4. **Multi-Data Apps** - Full forms with admin dashboards
5. **Creative/Weird Stuff** - Things that need creative solutions within constraints

### Future Features to Support
- **Coach Injection** - User types `wtaf -alex-` to inject coach personality
- **Image Placeholders** - GPT specifies where images go, future service generates them
- **Composable Apps** - App 2 can read data from App 1's JSON blobs
- **Follow-up Data Collection** - "Want the form to work? Text your email!"

## Proposed Architecture: 2-Stage System

### Overview
```
User Input → Stage 1: Classifier (GPT-4o) → Stage 2: Builder (Claude) → HTML → Save → SMS
```

### Stage 1: The Classifier
**Purpose:** Intelligent routing and creative problem solving

**Responsibilities:**
- Identify which of 5 cases
- Determine data requirements
- Suggest creative solutions for constraints
- Plan image placeholder strategy
- Extract coach personality if specified
- Identify composable app opportunities

**Output:** Structured plan/brief for Stage 2

### Stage 2: The Builder  
**Purpose:** Specialized HTML generation based on classification

**Approach:** One specialized prompt per case type for optimal results

## Core Files Structure

### 1. `wtaf-processor.ts` (Main Logic)
Single entry point for all WTAF processing:

```typescript
// Pseudocode structure
async function processWtaf(userInput: string, userSlug: string, phone: string) {
  // Stage 1: Classify & Plan
  const plan = await classifyRequest(userInput);
  
  // Stage 2: Build based on classification
  const html = await buildPage(plan);
  
  // Handle special cases
  if (plan.needsFollowUp) {
    scheduleFollowUp(phone, plan.followUpMessage);
  }
  
  // Save & notify
  const url = await save(html, plan);
  await notify(phone, url, plan);
}
```

### 2. `prompts/classifier.json`
The intelligent router and creative problem solver:

**Key sections:**
- Case identification logic
- Data requirement detection
- Creative constraint solutions library
- Coach personality extraction
- Image planning guidelines
- Composable app detection

**Example creative solutions:**
- "Chat app" → Avatar-based system using JSON blob
- "Notion clone" → Simple card system with categories
- "Store" → Order form with email notification

### 3. `prompts/builder-*.json` (4 Specialized Builders)

#### `builder-game.json`
- Focus on working controls
- Game loop implementation
- Score/state management
- Mobile-friendly interaction

#### `builder-simple.json`
- Beautiful single-page designs
- Optional email collection
- Birthday pages, landing pages, portfolios
- Emphasis on visual design

#### `builder-data-app.json`
- Form generation
- Admin dashboard creation
- Data validation
- CSV export functionality
- Dual-page output (public + admin)

#### `builder-creative.json`
- Constraint-based solutions
- Creative use of JSON blob storage
- Avatar systems, simple databases
- Whimsical interactions

### 4. `config/design-system.ts`
Centralized design requirements:

```typescript
export const DESIGN_SYSTEM = {
  // Visual standards
  styles: {
    glassmorph: true,
    gradients: "animated 15s",
    fonts: {
      headings: "Space Grotesk",
      body: "Inter"
    },
    colors: "luxury palette"
  },
  
  // Coach personalities
  coaches: {
    alex: "startup bro, matcha enthusiast...",
    donte: "mystic philosopher...",
    // etc
  },
  
  // Standard components
  components: {
    forms: "glass morphism with hover states",
    buttons: "gradient with subtle animations",
    // etc
  }
}
```

## Implementation Examples

### Example 1: Simple Page
```
User: "birthday page for sarah"
Classifier: {
  type: "simple",
  dataNeeded: "none",
  style: "celebratory",
  images: [{id: "hero", desc: "birthday celebration"}]
}
Builder: Creates beautiful birthday page with animations
```

### Example 2: Coffee Shop with Follow-up
```
User: "landing page for my coffee shop"
Classifier: {
  type: "simple",
  dataNeeded: "email",
  followUp: true,
  followUpMessage: "Want the contact form to work? Text your email!"
}
Builder: Creates page with placeholder form
Later: User texts email, system updates form action
```

### Example 3: Creative Chat App
```
User: "chat app for my friends"
Classifier: {
  type: "creative",
  solution: "avatar-chat",
  approach: "Users pick avatar + code to 'login', messages stored in JSON blob"
}
Builder: Implements avatar selection, code system, message display
```

### Example 4: Composable Apps
```
User: "email my coffee shop reviewers weekly"
Classifier: {
  type: "data-app",
  readsFrom: "coffee-shop-reviews",
  action: "weekly-email"
}
Builder: Creates admin interface to trigger emails to previous app's users
```

## Migration Strategy

### Phase 1: Build New System (Week 1)
1. Create `wtaf-processor.ts` with clean architecture
2. Write comprehensive `classifier.json` prompt
3. Create 4 specialized builder prompts
4. Implement design system configuration
5. Test with 10% of traffic

### Phase 2: Validate & Refine (Week 2)
1. A/B test quality vs current system
2. Measure performance metrics
3. Refine prompts based on results
4. Handle edge cases discovered
5. Increase to 50% traffic

### Phase 3: Full Migration (Week 3)
1. Route 100% traffic to new system
2. Delete old 8-file system
3. Update documentation
4. Archive old prompts
5. Celebrate! 🎉

## Success Metrics

### Complexity Reduction
- **Files:** 8+ → 4 core files
- **Code:** ~800 lines → ~300 lines  
- **Prompts:** 6+ JSON files → 5 focused prompts
- **Logic paths:** Scattered → Single entry point

### Performance Targets
- **Processing time:** ≤15 seconds (50% faster)
- **AI calls:** 2 (but smarter)
- **Success rate:** ≥95% (same as current)
- **User satisfaction:** Maintain or improve

### Feature Support
- ✅ All 5 current use cases
- ✅ Coach injection
- ✅ Follow-up data collection
- ✅ Image placeholders
- ✅ Composable apps
- ✅ Creative constraints

## File Comparison

### Before (Current System)
```
sms-bot/
├── lib/sms/handlers.ts         # SMS parsing
├── engine/
│   ├── controller.ts          # Orchestration
│   ├── ai-client.ts          # 2-step prompting
│   ├── file-watcher.ts       # Queue monitoring
│   ├── storage-manager.ts    # Database ops
│   └── notification-client.ts # SMS sending
├── prompts/
│   ├── prompt1-creative-brief.json
│   ├── prompt2-app.json
│   └── edits.json
└── [various shared utilities]
```

### After (New System)
```
sms-bot/
├── wtaf-processor.ts          # ALL logic here
├── prompts/
│   ├── classifier.json        # Intelligent router
│   ├── builder-game.json      # Game specialist
│   ├── builder-simple.json    # Pages specialist  
│   ├── builder-data-app.json  # Apps specialist
│   └── builder-creative.json  # Constraints specialist
└── config/
    └── design-system.ts       # Shared design config
```

## Key Benefits

1. **Radical Simplicity** - Understand entire system by reading 4 files
2. **Future Proof** - Architecture supports all planned features
3. **Maintainable** - Change prompts, change output
4. **Debuggable** - Single entry point, clear flow
5. **Extensible** - Add new cases by adding builder prompts

## Next Steps

1. Review and approve this plan
2. Create proof-of-concept classifier prompt
3. Build simplified wtaf-processor.ts
4. Test with real examples
5. Begin phased rollout

## Conclusion

This architecture achieves the goal of radical simplification while actually increasing capability. By moving from a scattered 8+ file system to a focused 4-file architecture, we make WTAF more powerful, maintainable, and ready for all the exciting features ahead.

The key insight: **Use the 2-stage system intelligently** - let the classifier be the creative problem solver and router, while specialized builders focus on executing specific types of output perfectly. 