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

### Monitor.py Microservices Transformation
```
Monolithic monitor.py (1133 lines)
↓
Microservices Architecture:
Controller → File Watcher → WTAF Processor → AI Client → Storage Manager → Notification Client
```

### Module Responsibilities
- **controller.js**: Main orchestrator, replaces monitor.py entry point
- **file-watcher.js**: Directory monitoring with race condition prevention
- **wtaf-processor.js**: Complete WTAF workflow orchestration
- **ai-client.js**: OpenAI/Anthropic API interactions with fallbacks
- **storage-manager.js**: Supabase database operations, file system
- **notification-client.js**: SMS sending via spawn process calls

### Shared Infrastructure Modules
- **config.js**: Environment variables, paths, constants, coach data
- **logger.js**: Centralized logging with timestamps and emoji indicators
- **utils.js**: Utility functions (slug generation, code extraction)

### Benefits of Microservices Pattern
1. **Code Agent Friendly**: Smaller files (100-300 lines) vs monolithic 1133 lines
2. **Single Responsibility**: Each module has one clear purpose
3. **Maintainable**: Clear separation of concerns
4. **Testable**: Individual modules can be tested in isolation
5. **Debuggable**: Easier to locate and fix issues
6. **Scalable**: Components can be scaled independently

### Deployment Model Change
**Before:** `python3 scripts/monitor.py`
**After:** `node scripts/controller.js`

## SMS Bot Infrastructure Pattern

### Request Processing Pipeline
```
SMS Webhook → Handler Logic → File Writer → Monitor System → Database → Response
```

### Key Components
- **Port 3030:** Single HTTP endpoint for all SMS processing
- **File-based Queue:** `data/wtaf/` directory for processing queue
- **Engine System:** Node.js microservices (replacing Python monitor)
- **Database Storage:** Results stored in `wtaf_content` table

### Why This Pattern Works
- **Async Processing:** SMS responds immediately, processing happens in background
- **Reliability:** File-based queue survives restarts
- **Debuggability:** Easy to inspect queued requests
- **Scalability:** Monitor can be scaled independently

## Web Interface Integration Pattern

### HTTP-to-SMS Bridge
```
Web Chat → HTTP POST → SMS Webhook Endpoint → Same Processing Pipeline
```

### Implementation Details
- **Endpoint:** `/sms/webhook` on port 3030
- **Format:** Standard Twilio webhook format (`From`, `Body`)
- **User Mapping:** Real phone numbers maintain user context
- **Response Strategy:** Database polling for results

### Why This Pattern
- **Zero Risk:** No changes to proven SMS infrastructure
- **Consistency:** Identical processing regardless of input source
- **Maintainability:** Single codebase for core logic

## Database Polling Pattern

### Real-time Result Detection
```
Web Request → Trigger Processing → Poll Database → Return Real URL
```

### Implementation
- **Polling Frequency:** Every 2 seconds
- **Timeout:** 60 seconds maximum
- **Query Strategy:** Filter by user_slug and timestamp
- **Fallback:** Graceful degradation if timeout occurs

## Component Relationships

### Shared Infrastructure
- **Database:** Single source of truth (Supabase)
- **User Management:** Unified across interfaces
- **Content Generation:** Same engine for all requests
- **URL Structure:** Consistent `wtaf.me/[user]/[app]` pattern

### Interface-Specific Components
- **SMS:** Twilio integration, phone number management
- **Web:** Next.js UI, real-time chat, clickable links
- **Both:** Same backend processing, different UX

## Security Patterns

### User Authentication
- **SMS:** Phone number verification through Twilio
- **Web:** User slug mapping to verified phone numbers
- **Database:** Role-based permissions (coder, user, admin)

### Request Validation
- **Input Sanitization:** Both interfaces validate user input
- **Rate Limiting:** Built into SMS provider and web middleware
- **User Context:** Validated against database before processing

## Deployment Architecture

### Service Separation
- **SMS Bot:** Independent service on port 3030
- **Web Platform:** Next.js application (separate process)
- **Engine System:** Node.js microservices (replacing Python monitor)
- **Database:** External service (Supabase)

### Benefits
- **Independent Scaling:** Each service scales based on load
- **Independent Deployment:** Services can be updated separately
- **Fault Isolation:** Failure in one service doesn't affect others

## Data Flow Patterns

### Unified Content Pipeline
```
[SMS Input] ──┐
               ├── File Queue ──→ Engine Services ──→ Database ──→ Live Pages
[Web Input] ──┘
```

### Response Strategies
- **SMS:** Immediate acknowledgment + later notification with URL
- **Web:** Real-time progress + database polling for final result
- **Both:** Backup notifications ensure user always gets result

This architecture enables rapid expansion to new interfaces (mobile app, API, etc.) without disrupting existing functionality. The new microservices pattern makes the system much more maintainable and Code Agent friendly. 