# ZAD Developer Guide

## What is ZAD?

ZAD (Zero Admin Data) is a collaborative app system that enables up to 5 users to share data without requiring any admin interface or complex setup. Perfect for rapid prototyping of team tools, collaborative journals, shared task lists, and small group applications.

## When to Use ZAD

### Perfect For
- Task managers for small teams (2-5 people)
- Collaborative journals or diaries
- Voting/polling systems
- Shared whiteboards or idea boards
- Group chat or message boards
- Project trackers
- Habit tracking with friends

### Not Suitable For
- Large-scale applications (>5 users)
- Apps requiring complex permissions
- Enterprise features
- Apps needing real-time sync (uses polling)

## How ZAD Apps Work

1. **User requests a collaborative app** via SMS/web
2. **Classifier detects ZAD patterns** like "me and my friends", "our team", "shared"
3. **Builder GPT generates app** with authentication and data sharing
4. **Users join with username + passcode** (up to 5 per app)
5. **Data automatically syncs** between all users via polling

## Complete Function Reference

### Core Data Functions

#### save(type, data)
Saves data to the ZAD database. Always creates a NEW record (append-only).
```javascript
// Save a task
await save('task', {
    text: 'Complete project proposal',
    completed: false,
    author: getUsername()
});

// Save a message
await save('message', {
    content: 'Hello team!',
    timestamp: Date.now(),
    author: getUsername()
});
```

#### load(type)
Loads all records of a specific type. Returns ALL versions - you must deduplicate!
```javascript
// Load all tasks
const allTasks = await load('task');

// Load all messages
const messages = await load('message');
```

#### query(type, options)
Advanced queries with filtering and sorting (NOT YET IMPLEMENTED IN CLIENT).
```javascript
// This is documented but not available in zad-helpers.ts
// Use load() and filter client-side instead
```

### Authentication Functions

#### initAuth()
Initializes the 4-screen authentication flow. Call this on app load.
```javascript
window.addEventListener('DOMContentLoaded', () => {
    initAuth();
});
```

#### getCurrentUser()
Returns the current authenticated user object.
```javascript
const user = getCurrentUser();
// Returns: { username: 'CHAOS_AGENT', id: 'user-uuid', userLabel: 'CHAOS_AGENT' }
```

#### getUsername()
Returns just the username string.
```javascript
const myName = getUsername(); // 'CHAOS_AGENT'
```

#### getParticipantId()
Returns the user's unique ID within this app.
```javascript
const myId = getParticipantId(); // 'user-uuid'
```

#### isAuthenticated()
Checks if user is logged in.
```javascript
if (!isAuthenticated()) {
    // Redirect to login
}
```

### Backend Helper Functions

#### checkAvailableSlots()
Checks how many user slots are available.
```javascript
const slots = await checkAvailableSlots();
// Returns: { totalSlots: 5, usedSlots: 2, availableSlots: 3, ... }
```

#### generateUser()
Generates credentials for a new user.
```javascript
const newUser = await generateUser();
// Returns: { userLabel: 'NEON_PHANTOM', passcode: '4829', ... }
```

#### registerUser(userLabel, passcode, participantId)
Registers a new user with the app.
```javascript
const result = await registerUser('NEON_PHANTOM', '4829', 'user-uuid');
```

#### authenticateUser(userLabel, passcode)
Validates user credentials.
```javascript
const auth = await authenticateUser('CHAOS_AGENT', '1234');
```

### AI Generation Functions

#### generateImage(prompt, style?)
Generates AI images using DALL-E 3. **EXPENSIVE - USE SPARINGLY!**
```javascript
// Basic usage
const imageUrl = await generateImage('futuristic city skyline');
document.getElementById('hero').src = imageUrl;

// With style
const logo = await generateImage('minimalist coffee logo', 'artistic');
```

#### generateText(prompt, options?)
Generates text using GPT-4. **EXPENSIVE - USE SPARINGLY!**
```javascript
// Basic usage
const suggestion = await generateText('Suggest a healthy breakfast');

// With options
const story = await generateText('Write a short story about space', {
    maxTokens: 500,
    temperature: 0.8
});
```

### Real-time Features

#### enableLiveUpdates(type, callback)
Enables automatic polling for a specific data type.
```javascript
enableLiveUpdates('message', async () => {
    const messages = await load('message');
    renderMessages(messages);
});
```

#### startRealtime(callback, interval)
Generic polling mechanism.
```javascript
startRealtime(async () => {
    await updateUI();
}, 3000); // Poll every 3 seconds
```

## Critical: Deduplication Pattern

**ZAD is append-only!** Every `save()` creates a NEW record. You MUST deduplicate when displaying data.

### Standard Deduplication Pattern
```javascript
function deduplicate(items, uniqueField = 'id') {
    const latest = {};
    
    // Keep only the newest version of each item
    items.forEach(item => {
        const key = item[uniqueField];
        if (!latest[key] || new Date(item.created_at) > new Date(latest[key].created_at)) {
            latest[key] = item;
        }
    });
    
    return Object.values(latest);
}

// Usage in every load function
async function loadTasks() {
    const all = await load('task');
    const mine = all.filter(t => t.author === getUsername());
    const unique = deduplicate(mine, 'text'); // Deduplicate by task text
    const active = unique.filter(t => !t.completed);
    renderTasks(active);
}
```

## Advanced Operations (Server-Side Only)

These operations are supported by the API but **NOT available in client helper functions**. To use them, you must make direct API calls:

### Update Records
```javascript
// NOT AVAILABLE via helper functions
// Must use direct API call:
await fetch('/api/zad/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        action_type: 'update_task',
        app_id: getAppId(),
        participant_id: getParticipantId(),
        content_data: { taskId: 123, updates: { completed: true } }
    })
});
```

### Delete Records
```javascript
// NOT AVAILABLE via helper functions
// Would need direct API call
```

### Search/Filter
```javascript
// NOT AVAILABLE via helper functions
// Use load() and filter client-side instead
```

## Common Data Patterns

### Task Manager Pattern
```javascript
// Save a task
async function addTask(text) {
    await save('task', {
        text: text,
        completed: false,
        author: getUsername(),
        created_at: Date.now()
    });
    await loadTasks();
}

// Toggle completion (creates new record)
async function toggleTask(task) {
    await save('task', {
        ...task,
        completed: !task.completed,
        updated_at: Date.now()
    });
    await loadTasks();
}

// Load and display
async function loadTasks() {
    const all = await load('task');
    const unique = deduplicate(all, 'text');
    const active = unique.filter(t => !t.completed);
    renderTasks(active);
}
```

### Message Board Pattern
```javascript
// Post a message
async function postMessage(content) {
    await save('message', {
        content: content,
        author: getUsername(),
        timestamp: Date.now(),
        id: Date.now() // Simple ID
    });
}

// Load messages
async function loadMessages() {
    const all = await load('message');
    const sorted = all.sort((a, b) => a.timestamp - b.timestamp);
    renderMessages(sorted); // No dedup - show all messages
}
```

### Voting Pattern
```javascript
// Cast a vote
async function vote(option) {
    await save('vote', {
        voter: getUsername(),
        choice: option,
        timestamp: Date.now()
    });
    await updateResults();
}

// Tally votes
async function updateResults() {
    const all = await load('vote');
    // Get latest vote per user
    const byUser = {};
    all.forEach(vote => {
        if (!byUser[vote.voter] || vote.timestamp > byUser[vote.voter].timestamp) {
            byUser[vote.voter] = vote;
        }
    });
    
    // Count votes
    const tally = {};
    Object.values(byUser).forEach(vote => {
        tally[vote.choice] = (tally[vote.choice] || 0) + 1;
    });
    
    renderResults(tally);
}
```

## AI Function Best Practices

### ❌ NEVER Do This
```javascript
// BAD: AI calls in polling loops
setInterval(async () => {
    const tip = await generateText('Daily tip'); // 💸 EXPENSIVE!
    showTip(tip);
}, 5000);

// BAD: Regenerating on every render
function updateUI() {
    const img = await generateImage('random art'); // 💸 NEW IMAGE EVERY TIME!
    setBanner(img);
}
```

### ✅ ALWAYS Do This
```javascript
// GOOD: Cache AI responses
let aiCache = { prompt: null, result: null };

async function getAISuggestion(data) {
    const prompt = buildPrompt(data);
    
    // Return cached if same prompt
    if (aiCache.prompt === prompt) {
        return aiCache.result;
    }
    
    // Generate and cache
    const result = await generateText(prompt);
    aiCache = { prompt, result };
    return result;
}

// GOOD: Use localStorage for persistence
async function getCachedImage(prompt, cacheKey) {
    const cached = localStorage.getItem(`img_${cacheKey}`);
    if (cached) {
        const { url, timestamp } = JSON.parse(cached);
        // Cache for 1 hour
        if (Date.now() - timestamp < 3600000) {
            return url;
        }
    }
    
    const url = await generateImage(prompt);
    localStorage.setItem(`img_${cacheKey}`, JSON.stringify({
        url,
        timestamp: Date.now()
    }));
    return url;
}

// GOOD: Manual refresh option
let lastGenerated = 0;
async function refreshAIContent(force = false) {
    // Rate limit: once per minute
    if (!force && Date.now() - lastGenerated < 60000) {
        showMessage('Please wait before regenerating');
        return;
    }
    
    const content = await generateText(getPrompt());
    lastGenerated = Date.now();
    displayContent(content);
}
```

## User Experience Guidelines

### Authentication Flow
1. **Welcome Screen** - App name and description
2. **Choice Screen** - "I'M NEW HERE" or "RETURNING USER"
3. **New User** - Shows available slots and generates credentials
4. **Login** - Username dropdown + passcode input
5. **Main App** - Full functionality unlocked

### Visual Hierarchy
- Use emojis for user labels (🎯⚡🌟💫👾)
- Show current user prominently
- Different colors/styles per user
- Clear "Sign Out" option

### Polling Intervals
- Messages/Chat: 2-3 seconds
- Tasks/Todos: 5 seconds
- Votes/Polls: 10 seconds
- AI content: Never poll - manual refresh only

## Testing Your ZAD App

### Local Testing
1. Use demo mode by starting participant_id with 'demo'
2. Open multiple browser tabs to simulate users
3. Test with 5 users to verify limits

### Common Issues
1. **Duplicates showing** - Missing deduplication
2. **Old data persisting** - Not filtering by completion/deletion flags
3. **Slow updates** - Polling interval too long
4. **AI timeout** - Requests taking too long, add loading states
5. **Authentication loop** - Check initAuth() is called once

## Integration with WTAF Engine

### How ZAD Apps Are Built
1. User request contains collaborative keywords
2. Classifier detects ZAD requirement
3. Classifier writes comprehensive product brief
4. Builder GPT uses `builder-zad-comprehensive.txt` template
5. Auto-fix system corrects common JavaScript issues
6. UUID injection adds app isolation
7. App deployed with full functionality

### Stack Commands
- `--stackzad [app] [request]` - Create app sharing another's data
- `--stackpublic [app] [request]` - Use PUBLIC data (read-only)
- `--stackobjectify [app] [request]` - Turn data into individual pages (OPERATOR only)

## Example: Complete Todo App
```javascript
<!DOCTYPE html>
<html>
<head>
    <title>Team Todos</title>
    <style>
        .task { display: flex; align-items: center; padding: 10px; }
        .task.completed { opacity: 0.6; text-decoration: line-through; }
        .task-author { font-size: 0.8em; color: #666; }
    </style>
</head>
<body>
    <h1>Team Todos 🚀</h1>
    <div id="auth-container"></div>
    <div id="app" style="display: none;">
        <input type="text" id="new-task" placeholder="Add a task...">
        <button onclick="addTask()">Add</button>
        <div id="tasks"></div>
    </div>

    <script>
    // Deduplication helper
    function deduplicate(items, field) {
        const latest = {};
        items.forEach(item => {
            const key = item[field];
            if (!latest[key] || new Date(item.created_at) > new Date(latest[key].created_at)) {
                latest[key] = item;
            }
        });
        return Object.values(latest);
    }

    // Add a task
    async function addTask() {
        const input = document.getElementById('new-task');
        if (!input.value.trim()) return;
        
        await save('task', {
            text: input.value,
            completed: false,
            author: getUsername(),
            id: Date.now()
        });
        
        input.value = '';
        await loadTasks();
    }

    // Toggle task
    async function toggleTask(taskId) {
        const all = await load('task');
        const task = all.find(t => t.id === taskId);
        if (!task) return;
        
        await save('task', {
            ...task,
            completed: !task.completed,
            updatedBy: getUsername()
        });
        
        await loadTasks();
    }

    // Load and display tasks
    async function loadTasks() {
        const all = await load('task');
        const unique = deduplicate(all, 'id');
        const active = unique.filter(t => !t.completed);
        const completed = unique.filter(t => t.completed);
        
        const tasksDiv = document.getElementById('tasks');
        tasksDiv.innerHTML = `
            <h3>Active (${active.length})</h3>
            ${active.map(t => `
                <div class="task">
                    <input type="checkbox" onchange="toggleTask(${t.id})">
                    <div>
                        <div>${t.text}</div>
                        <div class="task-author">by ${t.author}</div>
                    </div>
                </div>
            `).join('')}
            
            <h3>Completed (${completed.length})</h3>
            ${completed.map(t => `
                <div class="task completed">
                    <input type="checkbox" checked onchange="toggleTask(${t.id})">
                    <div>
                        <div>${t.text}</div>
                        <div class="task-author">by ${t.author}</div>
                    </div>
                </div>
            `).join('')}
        `;
    }

    // Initialize
    window.addEventListener('DOMContentLoaded', () => {
        initAuth();
        
        // Show app after auth
        onUserLogin(() => {
            document.getElementById('app').style.display = 'block';
            loadTasks();
            
            // Enable live updates
            enableLiveUpdates('task', loadTasks);
        });
    });
    </script>
</body>
</html>
```

## Summary

ZAD makes it easy to build collaborative apps for small groups. Remember:
1. **Always deduplicate** - ZAD is append-only
2. **Cache AI responses** - They're expensive
3. **Use polling wisely** - Not too frequent
4. **Handle auth properly** - Use the built-in flow
5. **Test with multiple users** - Verify the experience

For technical details and API information, see [ZAD-API-REFERENCE.md](./ZAD-API-REFERENCE.md).

---
*Last Updated: January 2025*
*For questions: Contact WEBTOYS Support*