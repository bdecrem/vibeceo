# Implementation Plan: Refactor Classifier Routing System Architecture

**Issue ID**: 2117  
**Branch**: WED  
**Date**: August 13, 2025  

## Executive Summary

This plan outlines a comprehensive refactoring of the WEBTOYS SMS bot classifier routing system from the current hybrid modular/monolithic architecture to a modern, scalable event-driven microservice architecture. The refactor will improve maintainability, testability, and performance while maintaining backward compatibility.

## Current State Analysis

### Existing Architecture Issues
1. **Hybrid System Complexity**: Mix of modular components (`classifier-builder.ts`) and monolithic processing in `controller.ts`
2. **Tight Coupling**: Business logic scattered across controller, processors, and managers
3. **Hard-coded Decision Trees**: Fixed 4-step classification sequence with limited extensibility
4. **No Dynamic Routing**: Cannot add new app types without code changes
5. **Single Point of Failure**: All routing logic concentrated in one massive controller file (38,324 tokens)

### Current Classification Flow
```
User Request → controller.ts → classifier-builder.ts → modular JSON files
                    ↓
              Decision Tree (4 steps):
              1. simple_email
              2. zero_admin_data  
              3. data_collection
              4. standard_app (fallback)
                    ↓
              Fixed routing to builders/processors
```

### Technical Debt
- **Controller.ts**: Oversized file handling multiple responsibilities
- **Hard-coded Types**: Game detection (`contains "GAME"`), ZAD detection via database lookups
- **Rate Limiting**: Mixed with business logic instead of middleware
- **No Plugin System**: Cannot extend classification types without core changes

## Proposed Architecture: Event-Driven Classifier Router

### Core Design Principles
1. **Single Responsibility**: Each component handles one concern
2. **Open/Closed**: Open for extension, closed for modification
3. **Dependency Inversion**: High-level modules don't depend on low-level modules
4. **Event-Driven**: Loose coupling via message passing

### New Architecture Overview
```
SMS Request → Request Gateway → Classification Pipeline → Route Dispatcher → Builders
              │                        │                      │
              ├─ Rate Limiter          ├─ Classifier Registry  ├─ Builder Registry
              ├─ Auth Middleware       ├─ Rule Engine          ├─ Processing Queue
              └─ Input Validator       └─ Context Enricher     └─ Result Aggregator
```

## Step-by-Step Implementation Plan

### Phase 1: Foundation (Days 1-3)

#### Task 1.1: Create Core Interfaces
**File**: `sms-bot/engine/interfaces/classifier-types.ts`
```typescript
interface ClassificationRequest {
  id: string;
  userMessage: string;
  userPhone: string;
  userRole?: string;
  context: RequestContext;
}

interface ClassificationResult {
  appType: string;
  confidence: number;
  metadata: Record<string, any>;
  builderConfig: BuilderConfig;
}

interface ClassificationRule {
  name: string;
  priority: number;
  matcher: (request: ClassificationRequest) => Promise<boolean>;
  classifier: (request: ClassificationRequest) => Promise<ClassificationResult>;
}
```

#### Task 1.2: Implement Request Gateway
**File**: `sms-bot/engine/routing/request-gateway.ts`
- Extract rate limiting from controller
- Add request validation and sanitization
- Implement middleware pipeline pattern
- Add request ID tracking and correlation

#### Task 1.3: Create Classification Pipeline
**File**: `sms-bot/engine/routing/classification-pipeline.ts`
- Event-driven processing engine
- Configurable classification stages
- Error handling and fallback mechanisms
- Performance metrics collection

### Phase 2: Classification Engine (Days 4-6)

#### Task 2.1: Build Classifier Registry
**File**: `sms-bot/engine/routing/classifier-registry.ts`
- Dynamic classifier registration system
- Priority-based rule evaluation
- Plugin loading mechanism
- Configuration hot-reloading

#### Task 2.2: Implement Rule Engine
**File**: `sms-bot/engine/routing/rule-engine.ts`
- Replace hard-coded decision tree with configurable rules
- Support for complex boolean logic (AND, OR, NOT)
- Context-aware rule evaluation
- Rule debugging and tracing

#### Task 2.3: Create Built-in Classifiers
**Files**: `sms-bot/engine/classifiers/`
- `game-classifier.ts` - Replace "GAME" string matching
- `zad-classifier.ts` - Database-driven ZAD detection
- `admin-classifier.ts` - Submission-based classification  
- `email-classifier.ts` - Simple email collection detection
- `fallback-classifier.ts` - Default classification

### Phase 3: Route Dispatcher (Days 7-9)

#### Task 3.1: Build Route Dispatcher
**File**: `sms-bot/engine/routing/route-dispatcher.ts`
- Dynamic routing based on classification results
- Builder registry integration
- Load balancing for multiple builders
- Request tracing and monitoring

#### Task 3.2: Create Builder Registry
**File**: `sms-bot/engine/routing/builder-registry.ts`
- Dynamic builder registration
- Builder health checking
- Failover and retry logic
- Builder-specific configuration

#### Task 3.3: Implement Processing Queue
**File**: `sms-bot/engine/routing/processing-queue.ts`
- Async processing for heavy operations
- Priority queuing for different user types
- Worker pool management
- Progress tracking and status updates

### Phase 4: Configuration System (Days 10-11)

#### Task 4.1: Create Configuration Schema
**File**: `sms-bot/config/routing-config.json`
```json
{
  "classifiers": [
    {
      "name": "game-classifier",
      "priority": 100,
      "enabled": true,
      "config": {
        "keywords": ["game", "GAME", "play"],
        "confidence_threshold": 0.8
      }
    }
  ],
  "routing_rules": [
    {
      "appType": "GAME", 
      "builder": "game-builder-v5",
      "fallback": "game-builder"
    }
  ]
}
```

#### Task 4.2: Implement Config Manager
**File**: `sms-bot/engine/config/routing-config-manager.ts`
- Configuration validation
- Hot-reloading without restart
- Environment-specific overrides
- Configuration versioning

### Phase 5: Migration and Testing (Days 12-14)

#### Task 5.1: Create Migration Layer
**File**: `sms-bot/engine/migration/legacy-adapter.ts`
- Backward compatibility wrapper
- Gradual migration from old controller
- Feature flag toggles
- Performance comparison metrics

#### Task 5.2: Refactor Controller
**File**: `sms-bot/engine/controller-v2.ts`
- Extract business logic to new architecture
- Maintain existing API interfaces
- Add feature flags for progressive rollout
- Comprehensive error handling

#### Task 5.3: Update Tests
**Files**: `sms-bot/test/routing/`
- Unit tests for each component
- Integration tests for end-to-end flow
- Performance benchmarks
- Chaos engineering tests

### Phase 6: Monitoring and Observability (Days 15-16)

#### Task 6.1: Add Metrics Collection
**File**: `sms-bot/engine/monitoring/metrics-collector.ts`
- Classification accuracy tracking
- Performance metrics (latency, throughput)
- Error rate monitoring
- Resource utilization metrics

#### Task 6.2: Implement Request Tracing
**File**: `sms-bot/engine/monitoring/request-tracer.ts`
- Distributed tracing for request flow
- Debug logging with correlation IDs
- Performance bottleneck identification
- User journey analytics

## Files and Components Affected

### New Files Created (16 files)
```
sms-bot/engine/interfaces/classifier-types.ts
sms-bot/engine/routing/request-gateway.ts
sms-bot/engine/routing/classification-pipeline.ts
sms-bot/engine/routing/classifier-registry.ts
sms-bot/engine/routing/rule-engine.ts
sms-bot/engine/routing/route-dispatcher.ts
sms-bot/engine/routing/builder-registry.ts
sms-bot/engine/routing/processing-queue.ts
sms-bot/engine/classifiers/game-classifier.ts
sms-bot/engine/classifiers/zad-classifier.ts
sms-bot/engine/classifiers/admin-classifier.ts
sms-bot/engine/classifiers/email-classifier.ts
sms-bot/engine/classifiers/fallback-classifier.ts
sms-bot/engine/config/routing-config-manager.ts
sms-bot/engine/monitoring/metrics-collector.ts
sms-bot/engine/monitoring/request-tracer.ts
```

### Modified Files (5 files)
```
sms-bot/engine/controller.ts - Extract logic, add feature flags
sms-bot/engine/classifier-builder.ts - Integrate with new registry
sms-bot/engine/wtaf-processor.ts - Update builder interfaces
sms-bot/engine/storage-manager.ts - Add routing metrics storage
sms-bot/engine/shared/config.ts - Add routing configuration
```

### Configuration Files (2 files)
```
sms-bot/config/routing-config.json - Main routing configuration
sms-bot/config/classifier-rules.json - Classification rule definitions
```

## Testing Strategy

### Unit Testing
- **Coverage Target**: 90%+ for all new components
- **Test Framework**: Jest with TypeScript support
- **Mock Strategy**: Mock all external dependencies
- **Test Categories**: 
  - Classification accuracy tests
  - Rule engine logic tests
  - Registry behavior tests
  - Error handling tests

### Integration Testing
- **End-to-End Flow**: SMS → Classification → Routing → Builder
- **Database Integration**: Test with real Supabase connections
- **Performance Testing**: Load testing with concurrent requests
- **Backward Compatibility**: Ensure existing apps still work

### A/B Testing
- **Feature Flags**: Gradual rollout to percentage of users
- **Metrics Comparison**: Old vs new system performance
- **Fallback Strategy**: Automatic rollback on error thresholds
- **User Experience**: Measure response times and success rates

## Rollback Plan

### Immediate Rollback (< 5 minutes)
1. **Feature Flag Toggle**: Disable new routing system via environment variable
2. **Traffic Routing**: Automatic fallback to legacy controller
3. **Database Rollback**: Restore previous configuration if needed
4. **Monitoring**: Alert on rollback activation

### Planned Rollback (< 30 minutes)
1. **Code Revert**: Git revert to last stable commit
2. **Database Migration**: Run rollback scripts if schema changed
3. **Configuration Reset**: Restore original classification files
4. **Service Restart**: Restart SMS bot with old configuration

### Data Recovery
1. **Request Logs**: All classification decisions logged for replay
2. **Metrics Preservation**: Keep performance data for analysis
3. **Error Tracking**: Detailed error logs for debugging
4. **User Impact**: Minimize disruption during rollback

## Timeline Estimate

### Development Phase: 16 days
- **Phase 1 (Foundation)**: 3 days
- **Phase 2 (Classification Engine)**: 3 days  
- **Phase 3 (Route Dispatcher)**: 3 days
- **Phase 4 (Configuration System)**: 2 days
- **Phase 5 (Migration and Testing)**: 3 days
- **Phase 6 (Monitoring)**: 2 days

### Testing and QA Phase: 5 days
- **Unit Testing**: 2 days
- **Integration Testing**: 2 days
- **Performance Testing**: 1 day

### Deployment Phase: 4 days
- **Staging Deployment**: 1 day
- **A/B Testing Setup**: 1 day
- **Gradual Production Rollout**: 2 days

**Total Project Duration**: 25 days (5 weeks)

## Success Criteria

### Performance Metrics
- **Response Time**: < 2 seconds for 95th percentile
- **Throughput**: Support 100+ concurrent requests
- **Classification Accuracy**: > 95% correct app type detection
- **System Uptime**: > 99.9% availability

### Maintainability Goals
- **Code Complexity**: Reduce controller.ts from 38K to < 5K tokens
- **Test Coverage**: > 90% for all routing components
- **Documentation**: Complete API docs and architecture diagrams
- **Extensibility**: Add new app type in < 1 hour

### Business Impact
- **Zero Downtime**: No service interruption during migration
- **Feature Compatibility**: All existing features work unchanged
- **Performance Improvement**: 30% faster classification times
- **Developer Velocity**: 50% faster to add new classification types

## Risk Assessment

### High Risk Items
1. **Data Loss**: Classification decisions not properly logged
   - **Mitigation**: Comprehensive logging and audit trails
2. **Performance Regression**: New system slower than current
   - **Mitigation**: Extensive performance testing and benchmarking
3. **Breaking Changes**: Existing integrations fail
   - **Mitigation**: Backward compatibility layer and thorough testing

### Medium Risk Items
1. **Configuration Complexity**: New config system too complex
   - **Mitigation**: Simple defaults and clear documentation
2. **Memory Usage**: Event-driven system uses more resources
   - **Mitigation**: Memory profiling and optimization
3. **Learning Curve**: Team needs time to understand new architecture
   - **Mitigation**: Training sessions and comprehensive documentation

## Next Steps

1. **Approval Required**: Get stakeholder sign-off on architecture design
2. **Resource Allocation**: Assign developers to implementation phases
3. **Environment Setup**: Prepare staging environment for testing
4. **Documentation**: Create detailed technical specifications
5. **Kickoff Meeting**: Align team on implementation approach and timeline

## Appendix

### Architecture Diagrams
*(Would include detailed system architecture diagrams showing data flow, component relationships, and deployment architecture)*

### Configuration Examples
*(Would include sample configuration files for different deployment scenarios)*

### Performance Benchmarks
*(Would include current system performance baseline for comparison)*

---

**Plan Status**: Draft  
**Next Review**: Pending stakeholder approval  
**Implementation Start**: TBD