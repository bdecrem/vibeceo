# WebtoysOS v3 Authentication System Documentation

## 🚨 CRITICAL: Authentication Requirements for ZAD Apps 🚨

**IMPORTANT**: WebtoysOS apps MUST implement these THREE critical requirements:
1. **Dual Auth**: BOTH localStorage AND postMessage authentication
2. **Uppercase Handles**: Always use UPPERCASE handles for participant IDs
3. **Correct Format**: participant_id must be `HANDLE_PIN` (e.g., `JOHN_1234`)

### Common Failures to Avoid
1. **Race Conditions**: Apps fail when postMessage hasn't arrived yet
2. **Case Mismatch**: lowercase handles cause data isolation (can't find saved data)
3. **Missing participantId**: ZAD API calls fail without proper format

## Complete Authentication Implementation

```javascript
// Global auth state
let currentUser = null;

// STEP 1: Initialize from localStorage (immediate access)
function loadAuthFromStorage() {
    const savedUser = localStorage.getItem('toybox_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            
            // CRITICAL: Ensure handle is uppercase and participantId is set
            if (currentUser) {
                if (currentUser.handle) {
                    currentUser.handle = currentUser.handle.toUpperCase();
                }
                if (!currentUser.participantId && currentUser.handle && currentUser.pin) {
                    currentUser.participantId = `${currentUser.handle.toUpperCase()}_${currentUser.pin}`;
                    // Update localStorage with corrected format
                    localStorage.setItem('toybox_user', JSON.stringify(currentUser));
                }
            }
            
            console.log('Loaded auth from storage:', currentUser.handle, 'participantId:', currentUser.participantId);
            return true;
        } catch (e) {
            console.error('Failed to parse saved user:', e);
        }
    }
    return false;
}

// STEP 2: Listen for auth updates from desktop (real-time)
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'TOYBOX_AUTH') {
        const wasLoggedOut = !currentUser;
        currentUser = event.data.user;
        
        // CRITICAL: Ensure proper format for ZAD API
        if (currentUser) {
            if (currentUser.handle) {
                currentUser.handle = currentUser.handle.toUpperCase();
            }
            if (!currentUser.participantId && currentUser.handle && currentUser.pin) {
                currentUser.participantId = `${currentUser.handle.toUpperCase()}_${currentUser.pin}`;
            }
        }
        
        // Update UI
        updateAuthDisplay();
        
        if (currentUser) {
            // User logged in
            console.log('Received auth from desktop:', currentUser.handle, 'participantId:', currentUser.participantId);
            if (wasLoggedOut) {
                // First login - initialize user data
                loadUserData();
            }
        } else {
            // User logged out
            console.log('User logged out');
            clearUserData();
        }
    }
});

// STEP 3: Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Try localStorage first for immediate auth
    if (loadAuthFromStorage()) {
        updateAuthDisplay();
        loadUserData();
    } else {
        updateAuthDisplay();
    }
});
```

## ZAD API Usage - CORRECT Implementation

```javascript
// CRITICAL: Always use uppercase handle in participantId
async function saveUserData(data) {
    if (!currentUser) return;
    
    const participantId = currentUser.participantId || `${currentUser.handle.toUpperCase()}_${currentUser.pin}`;
    
    const response = await fetch('/api/zad/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            app_id: 'your-app-id',
            participant_id: participantId,    // CRITICAL: Correct format
            action_type: 'save_data',         // CRITICAL: Include action_type
            content_data: data
        })
    });
    
    if (response.ok) {
        console.log('Data saved successfully');
    } else {
        console.error('Save failed:', await response.text());
    }
}

async function loadUserData() {
    if (!currentUser) return;
    
    const participantId = currentUser.participantId || `${currentUser.handle.toUpperCase()}_${currentUser.pin}`;
    
    // Include action_type to filter results
    const response = await fetch(`/api/zad/load?app_id=your-app-id&action_type=save_data&participant_id=${participantId}`);
    
    if (response.ok) {
        const data = await response.json();
        // CRITICAL: Filter for current user's data
        const userData = data.filter(d => d.participant_id === participantId);
        
        if (userData.length > 0) {
            // Get most recent (already sorted by created_at desc)
            const latestData = userData[0];
            console.log('Loaded user data:', latestData.content_data);
            return latestData.content_data;
        }
    } else {
        console.error('Load failed:', response.status);
    }
    return null;
}
```

## Common Mistakes and How to Fix Them

### ❌ WRONG: Using lowercase handles
```javascript
// This will cause data isolation!
const participantId = `${currentUser.handle}_${currentUser.pin}`;  // May be lowercase!
```

### ✅ CORRECT: Always uppercase
```javascript
const participantId = `${currentUser.handle.toUpperCase()}_${currentUser.pin}`;
```

### ❌ WRONG: Missing action_type
```javascript
// This will save but be hard to query later
await fetch('/api/zad/save', {
    body: JSON.stringify({
        app_id: 'app',
        participant_id: participantId,
        content_data: data  // Missing action_type!
    })
});
```

### ✅ CORRECT: Include action_type
```javascript
await fetch('/api/zad/save', {
    body: JSON.stringify({
        app_id: 'app',
        participant_id: participantId,
        action_type: 'save_data',  // Required for filtering!
        content_data: data
    })
});
```

### ❌ WRONG: Not filtering load results
```javascript
// This gets ALL users' data!
const response = await fetch(`/api/zad/load?app_id=my-app`);
const data = await response.json();
// Using data from all users - privacy issue!
```

### ✅ CORRECT: Filter by participant_id
```javascript
const response = await fetch(`/api/zad/load?app_id=my-app&action_type=save_data`);
const data = await response.json();
// Filter for current user only
const userData = data.filter(d => d.participant_id === participantId);
```

## Complete Working Example - Document Editor

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Document Editor</title>
</head>
<body>
    <div id="login-prompt">
        <h2>Please log in via the desktop</h2>
    </div>
    
    <div id="app-content" style="display: none;">
        <h1>Welcome, <span id="username"></span>!</h1>
        <textarea id="document"></textarea>
        <button onclick="saveDocument()">Save</button>
    </div>

    <script>
        let currentUser = null;
        let documents = [];

        // Load auth from localStorage
        function loadAuthFromStorage() {
            const savedUser = localStorage.getItem('toybox_user');
            if (savedUser) {
                try {
                    currentUser = JSON.parse(savedUser);
                    // Fix format
                    if (currentUser) {
                        if (currentUser.handle) {
                            currentUser.handle = currentUser.handle.toUpperCase();
                        }
                        if (!currentUser.participantId && currentUser.handle && currentUser.pin) {
                            currentUser.participantId = `${currentUser.handle.toUpperCase()}_${currentUser.pin}`;
                            localStorage.setItem('toybox_user', JSON.stringify(currentUser));
                        }
                    }
                    return true;
                } catch (e) {
                    console.error('Failed to parse saved user:', e);
                }
            }
            return false;
        }

        // Listen for auth broadcasts
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'TOYBOX_AUTH') {
                const wasLoggedOut = !currentUser;
                currentUser = event.data.user;
                
                // Fix format
                if (currentUser) {
                    if (currentUser.handle) {
                        currentUser.handle = currentUser.handle.toUpperCase();
                    }
                    if (!currentUser.participantId && currentUser.handle && currentUser.pin) {
                        currentUser.participantId = `${currentUser.handle.toUpperCase()}_${currentUser.pin}`;
                    }
                }
                
                updateAuthDisplay();
                
                if (currentUser && wasLoggedOut) {
                    loadDocuments();
                }
            }
        });

        function updateAuthDisplay() {
            if (currentUser) {
                document.getElementById('username').textContent = currentUser.handle;
                document.getElementById('login-prompt').style.display = 'none';
                document.getElementById('app-content').style.display = 'block';
            } else {
                document.getElementById('login-prompt').style.display = 'block';
                document.getElementById('app-content').style.display = 'none';
            }
        }

        async function loadDocuments() {
            if (!currentUser) return;
            
            const participantId = currentUser.participantId || `${currentUser.handle.toUpperCase()}_${currentUser.pin}`;
            
            const response = await fetch(`/api/zad/load?app_id=doc-editor&action_type=save_documents&participant_id=${participantId}`);
            
            if (response.ok) {
                const data = await response.json();
                const userDocs = data.filter(d => d.participant_id === participantId);
                
                if (userDocs.length > 0) {
                    documents = userDocs[0].content_data.documents || [];
                    console.log('Loaded', documents.length, 'documents');
                }
            }
        }

        async function saveDocument() {
            if (!currentUser) return;
            
            const participantId = currentUser.participantId || `${currentUser.handle.toUpperCase()}_${currentUser.pin}`;
            const content = document.getElementById('document').value;
            
            documents = [{ content, timestamp: Date.now() }];
            
            const response = await fetch('/api/zad/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    app_id: 'doc-editor',
                    participant_id: participantId,
                    action_type: 'save_documents',
                    content_data: { documents }
                })
            });
            
            if (response.ok) {
                alert('Saved!');
            } else {
                alert('Save failed!');
            }
        }

        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            if (loadAuthFromStorage()) {
                updateAuthDisplay();
                loadDocuments();
            } else {
                updateAuthDisplay();
            }
        });
    </script>
</body>
</html>
```

## Testing Your Implementation

1. **Check participantId format**: Open console and verify it's `UPPERCASE_HANDLE_1234`
2. **Save data**: Save something and check network tab for correct format
3. **Reload page**: Data should persist across sessions
4. **Different users**: Each user should have isolated data
5. **Log out/in**: Should handle auth changes gracefully

## Desktop Integration

The desktop automatically:
- Broadcasts auth when user logs in/out
- Saves auth to localStorage for persistence
- Sends TOYBOX_AUTH message to all iframes
- Provides handle and participantId in correct format

Apps must:
- Listen for TOYBOX_AUTH messages
- Check localStorage on load
- Use uppercase handles for participantId
- Include action_type in all ZAD API calls
- Filter load results by participant_id

## Key Points for Edit Agent

When creating apps with authentication:
1. **Copy the auth code exactly** from this documentation
2. **Always uppercase handles** when constructing participantId
3. **Include action_type** in all ZAD API calls
4. **Filter load results** by participant_id
5. **Test with multiple users** to ensure data isolation
6. **Never create login forms** - desktop handles all auth