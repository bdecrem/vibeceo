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

## SMS Bot Infrastructure Pattern

### Request Processing Pipeline
```
SMS Webhook → Handler Logic → File Writer → Monitor System → Database → Response
```

### Key Components
- **Port 3030:** Single HTTP endpoint for all SMS processing
- **File-based Queue:** `data/wtaf/` directory for processing queue
- **Python Monitor:** `monitor.py` watches files and generates content
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
- **Content Generation:** Same monitor.py for all requests
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
- **Monitor System:** Python script (independent process)
- **Database:** External service (Supabase)

### Benefits
- **Independent Scaling:** Each service scales based on load
- **Independent Deployment:** Services can be updated separately
- **Fault Isolation:** Failure in one service doesn't affect others

## Data Flow Patterns

### Unified Content Pipeline
```
[SMS Input] ──┐
               ├── File Queue ──→ Monitor.py ──→ Database ──→ Live Pages
[Web Input] ──┘
```

### Response Strategies
- **SMS:** Immediate acknowledgment + later notification with URL
- **Web:** Real-time progress + database polling for final result
- **Both:** Backup notifications ensure user always gets result

This architecture enables rapid expansion to new interfaces (mobile app, API, etc.) without disrupting existing functionality. 