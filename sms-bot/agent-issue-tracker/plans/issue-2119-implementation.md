# Issue #2119: Refactor Classifier Routing System Architecture

**Created:** 2025-08-13  
**Branch:** WED  
**Scope:** Complete architectural refactor of the classifier routing system

## Executive Summary

The current classifier routing system in the WEBTOYS SMS bot uses a monolithic decision tree approach with hardcoded conditional logic scattered throughout the codebase. This creates maintenance challenges, makes extending functionality difficult, and violates the microservice architecture principles outlined in CLAUDE.md.

**Current Issues:**
- Hardcoded if/else chains in `wtaf-processor.ts:400-600` 
- Tight coupling between request detection and builder selection
- Request type parsing scattered across multiple functions
- No centralized registry for new app types or builders
- Difficult to test individual routing decisions
- Violates the "module boundaries are sacred" principle

**Proposed Solution:**
Implement a modular, extensible resolver pattern with registry-based routing that separates request classification from builder resolution, enabling better maintainability and easier extension of app types.

## Current State Analysis

### Current Architecture
```
Request → wtaf-processor.ts → Large if/else chain → Builder selection
```

### Key Files Affected by Current System:
- `sms-bot/engine/wtaf-processor.ts` - Contains monolithic routing logic (lines 400-600)
- `sms-bot/engine/classifier-builder.ts` - Already modular, good pattern to follow
- `sms-bot/engine/controller.ts` - Orchestrates the request flow
- `sms-bot/content/classification/*.json` - Classification logic files (good modularity)

### Current Request Types Handled:
1. **Game requests** - Detected by `detectRequestType()` 
2. **Admin test requests** - `ADMIN_TEST_REQUEST:` prefix
3. **Admin dual-page** - `ADMIN_DUAL_PAGE_REQUEST:` prefix  
4. **ZAD variants** - `ZAD_TEST_REQUEST:`, `ZAD_API_REQUEST:`, `ZAD_PUBLIC_REQUEST:`, `ZAD_COMPREHENSIVE_REQUEST:`
5. **Music requests** - `MUSIC_APP_REQUEST:` prefix
6. **Standard apps** - Default fallback

### Problems with Current Approach:
1. **Monolithic decision tree** - Single 200+ line function with nested conditionals
2. **Tight coupling** - Request parsing, type detection, and builder selection mixed together
3. **Hard to extend** - Adding new request types requires modifying core routing logic
4. **Difficult to test** - Can't unit test individual routing decisions
5. **Violates separation of concerns** - Business logic mixed with routing logic
6. **Code duplication** - Similar regex parsing repeated for each request type

## Proposed Architecture

### New Modular Architecture
```
Request → RequestClassifier → RoutingRegistry → BuilderResolver → Builder
```

### Key Components

#### 1. RequestClassifier (`request-classifier.ts`)
- **Responsibility**: Parse and classify incoming requests
- **Interface**: `classifyRequest(userPrompt: string): RequestClassification`
- **Features**: 
  - Pluggable classification strategies
  - Regex-based parsing with validation
  - Extensible classification rules

#### 2. RoutingRegistry (`routing-registry.ts`)
- **Responsibility**: Registry of route configurations and builders
- **Interface**: Registry pattern with `register()` and `resolve()` methods
- **Features**:
  - JSON-based route definitions
  - Dynamic route registration
  - Route priority and fallback handling

#### 3. BuilderResolver (`builder-resolver.ts`)
- **Responsibility**: Resolve classified requests to appropriate builders
- **Interface**: `resolve(classification: RequestClassification): BuilderConfig`
- **Features**:
  - Builder selection logic
  - Configuration merging
  - Error handling and fallbacks

#### 4. Route Configuration Files (`routes/*.json`)
- **Purpose**: Declarative route definitions
- **Benefits**: Easy to modify without code changes
- **Structure**: Request patterns, builder mappings, metadata

### Benefits of New Architecture

1. **Modular Design** - Each component has single responsibility
2. **Extensible** - New routes added via configuration, not code changes
3. **Testable** - Each component can be unit tested independently
4. **Maintainable** - Clear separation between classification, routing, and building
5. **Configurable** - Route behavior controlled by JSON files
6. **Type Safe** - Full TypeScript interfaces and type checking

## Step-by-Step Implementation Tasks

### Phase 1: Foundation (1-2 days)

#### Task 1.1: Create Core Interfaces
- **File**: `sms-bot/engine/routing/types.ts`
- **Description**: Define TypeScript interfaces for all routing components
- **Deliverables**:
  ```typescript
  interface RequestClassification {
    requestType: string;
    subType?: string; 
    extractedContent: string;
    metadata: Record<string, any>;
    confidence: number;
  }

  interface RouteConfig {
    id: string;
    pattern: string;
    builderFile: string;
    requestType: string;
    priority: number;
    metadata?: Record<string, any>;
  }

  interface BuilderConfig {
    file: string;
    type: 'json' | 'txt';
    model?: string;
    timeout?: number;
  }
  ```

#### Task 1.2: Create Request Classifier  
- **File**: `sms-bot/engine/routing/request-classifier.ts`
- **Description**: Extract request classification logic from wtaf-processor.ts
- **Key Features**:
  - Parse prefixed requests (ADMIN_TEST_REQUEST:, ZAD_API_REQUEST:, etc.)
  - Extract clean user content from prefixed requests
  - Detect game requests using existing `detectRequestType()` 
  - Return structured classification data
  - Handle edge cases and validation
- **Testing**: Unit tests for each classification pattern

#### Task 1.3: Create Routing Registry
- **File**: `sms-bot/engine/routing/routing-registry.ts`
- **Description**: Registry pattern for route management
- **Key Features**:
  - Load route configurations from JSON files
  - Register routes dynamically
  - Priority-based route resolution
  - Fallback handling for unmatched requests
  - Validation of route configurations
- **Testing**: Unit tests for registration and resolution

### Phase 2: Route Configuration (1 day)

#### Task 2.1: Create Route Definition Files
- **Directory**: `sms-bot/engine/routing/routes/`
- **Files**:
  - `admin-routes.json` - Admin test and dual-page routes
  - `zad-routes.json` - All ZAD variant routes  
  - `game-routes.json` - Game detection and routing
  - `music-routes.json` - Music app routes
  - `default-routes.json` - Standard app fallback
- **Structure**:
  ```json
  {
    "routes": [
      {
        "id": "admin-test",
        "pattern": "^ADMIN_TEST_REQUEST:\\s*(.+)",
        "builderFile": "builder-admin-minimal-test.json",
        "requestType": "admin-test",
        "priority": 100,
        "extractGroup": 1,
        "metadata": {
          "description": "Admin test requests with minimal builder",
          "timeout": 30000
        }
      }
    ]
  }
  ```

#### Task 2.2: Create Route Loader
- **File**: `sms-bot/engine/routing/route-loader.ts`
- **Description**: Load and validate route configuration files
- **Key Features**:
  - Async loading of all route files
  - JSON schema validation
  - Error handling for malformed configs
  - Route priority sorting
  - Configuration merging

### Phase 3: Builder Resolution (1 day)

#### Task 3.1: Create Builder Resolver
- **File**: `sms-bot/engine/routing/builder-resolver.ts` 
- **Description**: Resolve classifications to builder configurations
- **Key Features**:
  - Map request classifications to appropriate builders
  - Handle text vs JSON builder files
  - Apply configuration overrides
  - Prepare user prompts (clean extracted content)
  - Coach personality injection
  - Error handling and fallbacks

#### Task 3.2: Create Router Orchestrator
- **File**: `sms-bot/engine/routing/router.ts`
- **Description**: Main entry point that orchestrates the routing process
- **Interface**: Drop-in replacement for current routing logic
- **Key Features**:
  ```typescript
  export async function routeRequest(userPrompt: string): Promise<{
    builderPrompt: ChatCompletionMessageParam;
    builderUserPrompt: string;
    builderType: string;
    classification: RequestClassification;
  }> 
  ```

### Phase 4: Integration (1 day)

#### Task 4.1: Update wtaf-processor.ts
- **File**: `sms-bot/engine/wtaf-processor.ts`
- **Description**: Replace monolithic routing logic with new router
- **Changes**:
  - Remove lines 400-600 (current routing logic)
  - Import new router: `import { routeRequest } from './routing/router.js'`
  - Replace conditional chain with: `const routeResult = await routeRequest(userPrompt)`
  - Update variable assignments to use `routeResult` properties
  - Maintain exact same return interface for backward compatibility

#### Task 4.2: Update Imports and Dependencies
- **Files**: 
  - `sms-bot/engine/controller.ts`
  - `sms-bot/engine/wtaf-processor.ts`  
- **Description**: Update import paths and ensure proper dependency injection
- **Testing**: Integration tests to ensure no functional changes

### Phase 5: Testing and Validation (1-2 days)

#### Task 5.1: Create Comprehensive Unit Tests
- **Files**: 
  - `sms-bot/engine/routing/__tests__/request-classifier.test.ts`
  - `sms-bot/engine/routing/__tests__/routing-registry.test.ts`
  - `sms-bot/engine/routing/__tests__/builder-resolver.test.ts`
  - `sms-bot/engine/routing/__tests__/router.test.ts`
- **Coverage**: Test all request types, edge cases, error conditions

#### Task 5.2: Integration Testing
- **File**: `sms-bot/test-scripts/test-routing-refactor.ts`
- **Description**: End-to-end tests ensuring identical behavior
- **Test Cases**:
  - All existing request type patterns
  - Coach personality injection
  - Admin request parsing
  - ZAD request variants
  - Game detection
  - Error handling and fallbacks

#### Task 5.3: Performance Testing
- **File**: `sms-bot/test-scripts/test-routing-performance.ts`
- **Description**: Verify new system has similar or better performance
- **Metrics**: Classification time, memory usage, throughput

### Phase 6: Documentation and Migration (1 day)

#### Task 6.1: Update Documentation
- **Files**:
  - `sms-bot/documentation/routing-system-architecture.md`
  - `sms-bot/documentation/adding-new-request-types.md`
  - Update `sms-bot/documentation/wtaf-request-processing-flow.md`
- **Content**: Architecture diagrams, usage examples, extension guides

#### Task 6.2: Create Migration Guide
- **File**: `sms-bot/documentation/routing-refactor-migration.md`
- **Content**: Guide for adding new request types, modifying routes

#### Task 6.3: Cleanup Old Code
- **Description**: Remove commented-out routing logic after successful deployment
- **Files**: Clean up `wtaf-processor.ts`, remove temporary debugging code

## File Paths and Components Affected

### New Files to Create:
```
sms-bot/engine/routing/
├── types.ts                 # TypeScript interfaces
├── request-classifier.ts    # Request parsing and classification  
├── routing-registry.ts      # Route registration and management
├── builder-resolver.ts      # Builder selection and configuration
├── route-loader.ts         # Configuration file loading
├── router.ts               # Main orchestration entry point
├── routes/                 # Route configuration files
│   ├── admin-routes.json   
│   ├── zad-routes.json
│   ├── game-routes.json
│   ├── music-routes.json
│   └── default-routes.json
└── __tests__/              # Unit tests
    ├── request-classifier.test.ts
    ├── routing-registry.test.ts  
    ├── builder-resolver.test.ts
    └── router.test.ts
```

### Files to Modify:
- `sms-bot/engine/wtaf-processor.ts` - Replace routing logic (lines 400-600)
- `sms-bot/engine/controller.ts` - Update imports if needed
- `sms-bot/tsconfig.json` - Add new routing directory to paths if needed

### Files to Reference (No Changes):
- `sms-bot/engine/classifier-builder.ts` - Good modular pattern to follow
- `sms-bot/content/classification/*.json` - Example of good modularity
- `sms-bot/engine/shared/utils.ts` - Reuse `detectRequestType()` function

## Testing Strategy

### Unit Testing Approach
1. **Request Classifier Tests**:
   - Test each request pattern regex
   - Test content extraction for prefixed requests
   - Test confidence scoring
   - Test edge cases (malformed requests, empty content)

2. **Routing Registry Tests**:
   - Test route registration and priority handling
   - Test route resolution with various inputs
   - Test fallback behavior
   - Test configuration validation

3. **Builder Resolver Tests**:
   - Test builder file selection
   - Test prompt preparation and cleaning
   - Test coach personality injection
   - Test error handling for missing builders

4. **Integration Tests**:
   - Test full routing pipeline with all request types
   - Compare outputs with current system (should be identical)
   - Test performance under load

### Test Data
- Use existing request patterns from current codebase
- Create comprehensive test cases covering all branches
- Include edge cases and error conditions
- Performance benchmarks against current system

### Validation Criteria
- ✅ All existing request types route correctly
- ✅ Builder selection matches current behavior exactly
- ✅ Coach personality injection works identically  
- ✅ Performance is equal or better than current system
- ✅ New system is easily extensible via configuration
- ✅ Unit test coverage > 90%
- ✅ Integration tests pass 100%

## Rollback Plan

### Rollback Triggers
- Performance regression > 20%
- Any functional regression in request routing
- Integration test failures
- Production issues within 48 hours of deployment

### Rollback Process
1. **Code Rollback** (5 minutes):
   - Revert `wtaf-processor.ts` to previous version
   - Remove new routing directory
   - Restore original imports

2. **Testing** (15 minutes):
   - Run smoke tests to verify original functionality
   - Validate with sample requests of each type

3. **Monitoring** (30 minutes):
   - Monitor for normal request processing
   - Check error rates and response times
   - Validate all request types work correctly

### Rollback Validation
- ✅ All request types process normally
- ✅ Error rates back to baseline
- ✅ Response times back to baseline
- ✅ No new errors in logs

## Timeline Estimate

**Total Duration: 5-7 days**

| Phase | Duration | Dependencies |
|-------|----------|-------------|
| Phase 1: Foundation | 1-2 days | None |
| Phase 2: Route Configuration | 1 day | Phase 1 complete |
| Phase 3: Builder Resolution | 1 day | Phase 1, 2 complete |
| Phase 4: Integration | 1 day | Phase 1, 2, 3 complete |
| Phase 5: Testing | 1-2 days | Phase 4 complete |
| Phase 6: Documentation | 1 day | All phases complete |

### Milestones
- **Day 2**: Core routing components implemented and unit tested
- **Day 4**: Full integration complete, ready for testing
- **Day 6**: All testing complete, documentation updated, ready for deployment

### Risk Factors
- **High Risk**: Integration complexity with existing wtaf-processor.ts
- **Medium Risk**: Performance impact of new architecture
- **Low Risk**: Route configuration complexity

## Success Criteria

### Functional Requirements
- ✅ All existing request types route correctly
- ✅ New routes can be added via JSON configuration
- ✅ System is backwards compatible (no API changes)
- ✅ Error handling maintains current behavior
- ✅ Coach personality injection works identically

### Non-Functional Requirements
- ✅ Performance equal or better than current system
- ✅ Code coverage > 90% for new components
- ✅ Architecture follows microservice boundaries
- ✅ System is easily extensible and maintainable

### Business Requirements
- ✅ No disruption to SMS bot functionality
- ✅ Development team can easily add new request types
- ✅ System architecture is more maintainable long-term
- ✅ Debugging and troubleshooting is easier

---

**Next Steps After Approval:**
1. Create feature branch: `feature/routing-refactor-2119`
2. Begin Phase 1: Foundation implementation
3. Set up continuous integration for new components
4. Schedule code reviews at each phase completion