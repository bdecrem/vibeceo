# ZAD (Zero Admin Data) API System Overview

## What is ZAD?

ZAD is a **collaborative data storage system** designed for small group apps (≤5 users) that need **zero admin interface**. It enables rapid prototyping of collaborative apps without complex backend setup, database schemas, or user management systems.

## Architecture

### **Single Shared Database Table**
All ZAD apps share one table: `wtaf_zero_admin_collaborative`
```sql
CREATE TABLE wtaf_zero_admin_collaborative (
    id BIGSERIAL PRIMARY KEY,
    app_id TEXT NOT NULL,           -- UUID isolates apps
    participant_id TEXT NOT NULL,   -- User ID within app
    action_type TEXT NOT NULL,      -- Data category ('task', 'message', 'vote')
    content_data JSONB,            -- Flexible user data
    participant_data JSONB,        -- User metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### **Two-Endpoint API Design**
- **`/api/zad/save`** - All write operations (INSERT/UPDATE)
- **`/api/zad/load`** - All read operations (SELECT)

## Core Helper Functions

### **1. Data Operations**
```javascript
// Save any type of data
await save('task', { title: 'My Task', completed: false });

// Load all data of a specific type
const tasks = await load('task');

// Update existing records (NEW!)
await save('update_task', { 
    taskId: task.id, 
    updates: { completed: true } 
});

// Delete specific records (NEW!)
await save('delete', { recordId: task.id });

// Search/filter records (NEW!)
await save('search', { 
    type: 'task', 
    filters: { 'content_data.completed': false },
    orderBy: 'created_at',
    limit: 10
});

// Count records (NEW!)
await save('count', { 
    type: 'task', 
    filters: { 'content_data.completed': true }
});

// Clear all records of a type (NEW!)
await save('clear', { type: 'task' });
```

### **2. Authentication System**
```javascript
// Initialize 4-screen auth flow
initAuth();

// Get current authenticated user
const user = getCurrentUser(); // Returns { username, id, userLabel }

// Check authentication status
if (!isAuthenticated()) { /* redirect to login */ }
```

### **3. Real-time Features**
```javascript
// Enable live updates for data type
enableLiveUpdates('task', async () => {
    const tasks = await load('task');
    renderTasks(tasks);
});

// Start polling for changes
startRealtime(updateFunction, 2000); // Poll every 2 seconds
```

## Server-Side Helper Functions

The `/api/zad/save` endpoint includes specialized helpers:

### **Authentication Helpers**
- `check_slots` - Check available user slots
- `generate_user` - Generate user credentials
- `register_user` - Register new user
- `authenticate_user` - Validate user login

### **Data Helpers**
- `update_task` - Update existing records (prevents duplicates)
- `delete` - Delete specific records by ID
- `search` - Search/filter records with criteria, ordering, and limits
- `count` - Count records with optional filters
- `clear` - Clear all records of a specific type
- `greet` - Example backend processing helper

## How It Works

### **1. App Initialization**
```javascript
const APP_ID = 'uuid-generated-by-system';
const USER_LABELS = ['AGENT🎯', 'HUNTER⚡', 'PHANTOM🌟'];

// System auto-injects ZAD helpers
initAuth(); // Creates authentication screens
```

### **2. Data Flow**
1. **Create**: `save('task', data)` → INSERT into database
2. **Read**: `load('task')` → SELECT from database  
3. **Update**: `save('update_task', {taskId, updates})` → UPDATE database
4. **Real-time**: Polling updates UI automatically

### **3. Multi-User Collaboration**
- Each app supports up to 5 concurrent users
- Users authenticate with username + 4-digit passcode
- Real-time polling keeps all users synchronized
- No admin required - peer-to-peer collaboration

## WTAF Engine Integration

### **Template System**
- `builder-zad-comprehensive.txt` guides Builder GPT
- Auto-injected helper functions via `zad-helpers.ts`
- API-safe auto-fix processing prevents JavaScript errors

### **Request Processing**
1. User submits collaborative app request
2. Classifier detects ZAD requirement
3. Builder GPT generates HTML with ZAD helpers
4. Auto-fix applies JavaScript corrections
5. System injects UUID and deploys to Supabase

## Benefits

- **Zero Setup**: No database schema design needed
- **Instant Collaboration**: Multi-user out of the box
- **Flexible Data**: JSONB storage handles any data structure
- **Real-time Updates**: Built-in polling and live updates
- **Simple API**: Just `save()` and `load()` functions
- **Proper Updates**: New `update_task` helper prevents duplicates

## Use Cases

Perfect for: Task managers, voting systems, collaborative journals, team dashboards, real-time polls, shared whiteboards, group chat apps, project trackers.

**Not suitable for**: Large-scale apps, complex permissions, enterprise features, >5 users.

---

*The ZAD system enables rapid prototyping of collaborative applications with minimal complexity while maintaining professional functionality.* 