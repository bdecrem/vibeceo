# System Patterns

## Core Architecture Pattern: Interface Independence

### Design Philosophy
**Principle:** Multiple interfaces (SMS, Web) share core processing infrastructure without tight coupling.

### Pattern Implementation
```
User Interface Layer → API Gateway → Core Processing → Shared Database
```

**Benefits:**
- Interfaces can evolve independently
- Core logic reused across platforms
- Zero risk when adding new interfaces
- Consistent output quality

## NEW: Microservices Architecture Pattern

### Design Philosophy
**Principle:** Break monolithic components into focused, single-responsibility modules that are easier for Code Agents to understand and modify.

### Monitor.py → TypeScript Engine Transformation
```
Monolithic monitor.py (1133 lines)
↓
TypeScript Microservices Architecture:
sms-bot/engine/
├── controller.ts           # Main orchestrator, process WTAF requests
├── ai-client.ts           # 2-step prompt system (GPT-4o → Claude)  
├── storage-manager.ts     # Database & OG image operations
├── file-watcher.ts        # Directory monitoring
├── notification-client.ts # SMS notifications
└── shared/
    ├── config.ts          # Environment, paths, constants
    ├── logger.ts          # Centralized logging
    └── utils.ts           # Utilities (slug generation, code extraction)
```

### Module Responsibilities
- **controller.ts**: Main orchestrator with processWtafRequest() workflow
- **ai-client.ts**: Complex 2-step prompt system (unnecessarily complex)
- **storage-manager.ts**: Supabase operations, OG image generation/updates
- **file-watcher.ts**: Directory monitoring with race condition prevention
- **notification-client.ts**: SMS sending via TypeScript/Node
- **shared modules**: Configuration, logging, utilities

### Current Architecture Issues (NEEDS SIMPLIFICATION)
⚠️ **OVERLY COMPLEX**: 2-step prompting (GPT-4o → Claude) with 3-model fallback chain
⚠️ **HOT MESS**: File-based queuing, multiple prompt JSONs, 120-line system prompt
⚠️ **SHOULD BE**: Single AI call with direct function calls

### Benefits of Current TypeScript Pattern
1. **Type Safety**: Full TypeScript compilation with error checking
2. **Modular**: Smaller focused files vs 1133-line monolith  
3. **Maintainable**: Clear separation of concerns
4. **Production Ready**: Successfully handles WTAF creation + OG images
5. **BUT**: Way more complex than necessary for the task

### Deployment Model
**Current:** `node dist/scripts/start-engine.js` (after `npm run build`)
**Should Be:** Much simpler single-file processor

## SMS Bot Infrastructure Pattern

### Request Processing Pipeline
```