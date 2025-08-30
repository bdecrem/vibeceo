# ZAD Save/Load Patterns - CRITICAL REFERENCE

## 🚨 MANDATORY: Get This Right EVERY TIME 🚨

This document contains the EXACT patterns for ZAD save/load functionality. **Copy these patterns exactly** - do not improvise or "improve" them.

## The Complete Working Pattern

```javascript
// ============================================
// COMPLETE WORKING ZAD SAVE/LOAD IMPLEMENTATION
// Copy this EXACTLY for document-based apps
// ============================================

// 1. Authentication helper
function getCurrentUser() {
    // Check localStorage first (immediate availability)
    const savedUser = localStorage.getItem('toybox_user');
    if (savedUser) {
        const user = JSON.parse(savedUser);
        // CRITICAL: Ensure uppercase format
        if (user?.handle) {
            user.handle = user.handle.toUpperCase();
            if (user.pin && !user.participantId) {
                user.participantId = `${user.handle}_${user.pin}`;
            }
        }
        return user;
    }
    return null;
}

// 2. Get participant ID in correct format
function getParticipantId() {
    const currentUser = getCurrentUser();
    if (!currentUser?.handle || !currentUser?.pin) return null;
    
    // CRITICAL: MUST be UPPERCASE_HANDLE_PIN format
    return `${currentUser.handle.toUpperCase()}_${currentUser.pin}`;
}

// 3. Save document
async function saveDocument(docId, title, content) {
    const participantId = getParticipantId();
    const currentUser = getCurrentUser();
    
    if (!participantId) {
        alert('Please log in first');
        return false;
    }
    
    try {
        const response = await fetch('/api/zad/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_id: window.APP_ID || 'your-app-id',
                participant_id: participantId,
                action_type: 'document',  // REQUIRED for filtering
                content_data: {
                    id: docId,
                    title: title,
                    content: content,
                    author: currentUser.handle.toUpperCase(),
                    updatedAt: new Date().toISOString()
                }
            })
        });
        
        if (!response.ok) {
            const error = await response.text();
            console.error('Save failed:', error);
            alert('Failed to save document');
            return false;
        }
        
        const result = await response.json();
        console.log('Document saved:', result);
        return true;
        
    } catch (error) {
        console.error('Save error:', error);
        alert('Error saving document');
        return false;
    }
}

// 4. Load documents with proper deduplication
async function loadDocuments() {
    const participantId = getParticipantId();
    if (!participantId) {
        console.log('No user logged in');
        return [];
    }
    
    try {
        // Load ALL documents of this type (ZAD filters by app_id automatically)
        const response = await fetch(
            `/api/zad/load?app_id=${window.APP_ID || 'your-app-id'}&action_type=document`
        );
        
        if (!response.ok) {
            console.error('Load failed:', await response.text());
            return [];
        }
        
        const allDocs = await response.json();
        console.log('All documents from ZAD:', allDocs);
        
        // CRITICAL: ZAD returns FLATTENED data structure
        // The content_data properties are directly on the object
        
        // Filter for current user's documents
        const userDocs = allDocs.filter(doc => {
            // Check both formats for compatibility
            return doc.participant_id === participantId || 
                   doc.author === getCurrentUser()?.handle?.toUpperCase();
        });
        
        console.log('User documents:', userDocs);
        
        // CRITICAL: Handle append-only nature - deduplicate by ID
        const uniqueDocs = {};
        
        userDocs.forEach(doc => {
            // ZAD flattens content_data, so properties are directly on doc
            const docId = doc.id || doc.content_data?.id;
            const docTime = doc.updatedAt || doc.content_data?.updatedAt || doc.created_at;
            
            // Keep only the latest version of each document
            if (!uniqueDocs[docId]) {
                uniqueDocs[docId] = {
                    id: docId,
                    title: doc.title || doc.content_data?.title || 'Untitled',
                    content: doc.content || doc.content_data?.content || '',
                    author: doc.author || doc.content_data?.author,
                    updatedAt: docTime,
                    participant_id: doc.participant_id
                };
            } else {
                // Update if this version is newer
                const existingTime = new Date(uniqueDocs[docId].updatedAt || 0);
                const newTime = new Date(docTime || 0);
                if (newTime > existingTime) {
                    uniqueDocs[docId] = {
                        id: docId,
                        title: doc.title || doc.content_data?.title || 'Untitled',
                        content: doc.content || doc.content_data?.content || '',
                        author: doc.author || doc.content_data?.author,
                        updatedAt: docTime,
                        participant_id: doc.participant_id
                    };
                }
            }
        });
        
        // Convert to array and sort by most recent
        const documents = Object.values(uniqueDocs)
            .sort((a, b) => {
                const dateA = new Date(a.updatedAt || 0);
                const dateB = new Date(b.updatedAt || 0);
                return dateB - dateA;
            });
        
        console.log('Deduplicated documents:', documents);
        return documents;
        
    } catch (error) {
        console.error('Load error:', error);
        return [];
    }
}

// 5. Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Load user from localStorage immediately
    const currentUser = getCurrentUser();
    if (currentUser) {
        console.log('Logged in as:', currentUser.handle);
        // Load documents for this user
        loadDocuments().then(docs => {
            console.log('Loaded documents:', docs);
            // Update UI with documents
        });
    }
    
    // Also listen for auth updates from desktop
    window.addEventListener('message', (e) => {
        if (e.data.type === 'TOYBOX_AUTH') {
            const user = e.data.user;
            if (user) {
                // Save to localStorage for persistence
                localStorage.setItem('toybox_user', JSON.stringify(user));
                console.log('Auth updated:', user.handle);
                // Reload documents
                loadDocuments().then(docs => {
                    console.log('Reloaded documents:', docs);
                    // Update UI
                });
            }
        }
    });
});
```

## Critical Points to Remember

### 1. ZAD Data Structure
**ZAD returns FLATTENED data**, not nested:
```javascript
// ❌ WRONG - Expecting nested structure
const title = doc.content_data.title;  // Will be undefined!

// ✅ CORRECT - Data is flattened
const title = doc.title || doc.content_data?.title;  // Handles both formats
```

### 2. Participant ID Format
**MUST be uppercase with underscore**:
```javascript
// ❌ WRONG
participant_id: `${handle}_${pin}`  // lowercase breaks filtering

// ✅ CORRECT
participant_id: `${handle.toUpperCase()}_${pin}`  // JOHN_1234
```

### 3. Action Type is REQUIRED
**Always include action_type for filtering**:
```javascript
// ❌ WRONG - No action_type
body: JSON.stringify({
    app_id: 'my-app',
    participant_id: participantId,
    content_data: data  // Missing action_type!
})

// ✅ CORRECT - With action_type
body: JSON.stringify({
    app_id: 'my-app',
    participant_id: participantId,
    action_type: 'document',  // Enables filtering
    content_data: data
})
```

### 4. Append-Only Deduplication
**ZAD is append-only, must deduplicate**:
```javascript
// ❌ WRONG - Shows duplicates
return userDocs;  // Will show every save as separate item

// ✅ CORRECT - Deduplicate by ID and timestamp
const uniqueDocs = {};
userDocs.forEach(doc => {
    const docId = doc.id || doc.content_data?.id;
    if (!uniqueDocs[docId] || 
        new Date(doc.updatedAt) > new Date(uniqueDocs[docId].updatedAt)) {
        uniqueDocs[docId] = doc;
    }
});
return Object.values(uniqueDocs);
```

### 5. Authentication Loading
**Must check localStorage AND listen for updates**:
```javascript
// ✅ CORRECT - Both localStorage and postMessage
// 1. Check localStorage on load (immediate)
const savedUser = localStorage.getItem('toybox_user');

// 2. Listen for desktop updates (real-time)
window.addEventListener('message', (e) => {
    if (e.data.type === 'TOYBOX_AUTH') {
        // Update and save to localStorage
    }
});
```

## Common Failure Scenarios

### Scenario 1: "Save works but Open shows nothing"
**Cause**: Participant ID mismatch or missing action_type
**Fix**: Ensure uppercase format and include action_type in both save and load

### Scenario 2: "Shows undefined/invalid date"
**Cause**: Trying to access nested content_data that doesn't exist
**Fix**: Access properties directly on doc object with fallbacks

### Scenario 3: "Shows duplicate entries"
**Cause**: Not handling append-only nature of ZAD
**Fix**: Deduplicate by document ID, keeping latest version

### Scenario 4: "Works locally but not on desktop"
**Cause**: Not loading auth from localStorage on startup
**Fix**: Check localStorage immediately on page load

## Testing Checklist

Before deploying any ZAD app, verify:

- [ ] Save creates document with correct participant_id format
- [ ] Load filters to show only current user's documents
- [ ] No duplicates appear after multiple saves
- [ ] Document titles and dates display correctly
- [ ] Works when opened directly (localStorage auth)
- [ ] Works in desktop iframe (postMessage auth)
- [ ] Console shows no errors about undefined properties
- [ ] action_type is included in all save/load calls

## Reference Implementation

For a working example, see:
- `/apps/rhymes.html` - Poetry editor with save/load
- `/apps/t3xt.html` - Text editor with documents

**ALWAYS** refer to this document when implementing ZAD save/load functionality.