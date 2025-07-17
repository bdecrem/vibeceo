# ZAD Complete Reference Guide

## Overview
This is the complete reference for the ZAD (Zero Admin Data) system, including all client-side helper functions and server-side action types.

## ZAD Auto-Fix System

The ZAD system includes automatic fixes for common JavaScript issues that break deployed apps:

### API-Safe Auto-Fixes (Applied to ZAD API Apps)

**Fix 7: Onclick Quote Escaping**
- Converts nested quotes in onclick handlers to prevent JavaScript parsing errors
- `onclick="toggleCompleted('123')"` → `onclick="toggleCompleted(&quot;123&quot;)"`
- Only affects onclick attributes, never touches JSON/API calls

**Fix 8: String ID to Number Conversion**  
- Fixes "RECORD NOT FOUND" errors when frontend sends string IDs but database expects numbers
- `item.id === itemId` → `item.id === parseInt(itemId)`
- Applies to record_id and generic id comparisons

**Other API-Safe Fixes:**
- Async function corrections
- Duplicate variable removal  
- Enhanced error handling
- Malformed quote fixing (outside JSON contexts)

These fixes solve the major onclick/checkbox issues that occurred after the API migration while preserving API call integrity.

## Complete ZAD Capabilities

### Frontend Helper Functions (34 functions)

### Core Data Functions (Available Everywhere)
1. `save(type, data)` - Save data to ZAD database
2. `load(type)` - Load all data of a specific type  
3. `query(type, options)` - Advanced queries with filtering/sorting
4. `loadAll()` - Load all data across all types (advanced)

### Authentication & User Functions (Available Everywhere)
5. `initAuth()` - Initialize authentication system
6. `getAppId()` - Get current app's UUID
7. `getParticipantId()` - Get current user's participant ID
8. `getUsername()` - Get current user's username
9. `getCurrentUser()` - Get complete user object
10. `updateZadAuth(userLabel, participantId)` - Update auth state

### Backend Helper Functions (Available Everywhere)
11. `checkAvailableSlots()` - Check if new users can join
12. `generateUser()` - Generate new user credentials
13. `registerUser(userLabel, passcode, participantId)` - Register new user
14. `authenticateUser(userLabel, passcode)` - Authenticate existing user
15. `greet(name)` - Backend greeting function

### Real-time Features (Advanced)
16. `enableLiveUpdates(type, callback)` - Enable live data updates
17. `startRealtime(callback, interval)` - Start polling for changes
18. `stopRealtime()` - Stop live updates

### Advanced Auth Functions (Advanced)
19. `onUserLogin(callback)` - Auth event handler
20. `isAuthenticated()` - Check if user is logged in
21. `requireAuth()` - Force authentication

### Legacy Auth Functions (Backwards Compatibility)
22. `generateNewUser()` - Legacy auth function
23. `registerNewUser()` - Legacy auth function  
24. `showNewUserScreen()` - Legacy auth function
25. `loginReturningUser()` - Legacy auth function
26. `showScreen(screenId)` - Legacy screen function
27. `showReturningUserScreen()` - Legacy auth function
28. `enterMainScreen()` - Legacy auth function
29. `leaveApp()` - Legacy auth function

### Convenience Aliases (Backwards Compatibility)
30. `saveEntry()` / `loadEntries()` - Alias for save/load
31. `saveData()` / `loadData()` - Alias for save/load
32. `saveItem()` / `loadItems()` - Alias for save/load  
33. `saveNote()` / `loadNotes()` - Alias for save/load
34. `saveMessage()` / `loadMessages()` - Alias for save/load

## 🌐 SERVER-SIDE ACTION TYPES (12 Total)

### Backend Helper Action Types
These are triggered by calling client helper functions:

1. `'check_slots'` - Triggered by `checkAvailableSlots()`
2. `'generate_user'` - Triggered by `generateUser()`  
3. `'register_user'` - Triggered by `registerUser()`
4. `'authenticate_user'` - Triggered by `authenticateUser()`
5. `'greet'` - Triggered by `greet()`
6. `'query'` - Triggered by `query()`

### Data Operation Action Types
These are triggered by calling `save()` with specific action types:

7. `'update_task'` - Update existing records
   ```javascript
   await save('update_task', { taskId: item.id, updates: {...} });
   ```

8. `'delete'` - Delete specific records
   ```javascript
   await save('delete', { recordId: item.id });
   ```

9. `'search'` - Search/filter records  
   ```javascript
   await save('search', { type: 'message', filters: {...}, limit: 10 });
   ```

10. `'count'` - Count records
    ```javascript
    await save('count', { type: 'task', filters: {...} });
    ```

11. `'clear'` - Clear all records of a type
    ```javascript
    await save('clear', { type: 'task' });
    ```

### Regular Data Types
12. **Any custom data type** - Regular data saving
    ```javascript
    await save('message', { content: 'Hello', timestamp: Date.now() });
    await save('vote', { choice: 'option_a', timestamp: Date.now() });
    await save('person', { name: 'John', notes: [] });
    ```

## 📊 COMMON DATA TYPES

### Standard Data Types Used in Templates
- `'message'` - Chat/messaging data
- `'vote'` - Voting/polling data  
- `'habit'` - Habit tracking data
- `'goal'` - Goal setting data
- `'task'` - Task/todo data
- `'person'` - People/contact data
- `'entry'` - Journal/diary entries
- `'note'` - Note-taking data

## 🏗️ ARCHITECTURE

### Client → Server Flow
1. **Claude generates code** using documented helper functions
2. **Client functions** make API calls to `/api/zad/save` or `/api/zad/load`
3. **Backend processes** the action type and executes appropriate logic
4. **Database operations** are performed on `wtaf_zero_admin_collaborative` table
5. **Results returned** to client in standardized format

### File Locations
- **Client Functions**: `sms-bot/engine/zad-helpers.ts` (single source of truth)
- **Claude Template**: `sms-bot/content/builder-zad-comprehensive.txt`
- **Backend API**: `web/app/api/zad/save/route.ts` and `web/app/api/zad/load/route.ts`

## ✅ VERIFICATION CHECKLIST

### For Developers
- [ ] All 34 client functions work in test apps
- [ ] All 12 action types process correctly in backend  
- [ ] Claude template documents all functions with examples
- [ ] Demo mode overrides work for new functions
- [ ] TypeScript types are consistent

### For Generated Apps
- [ ] Authentication flow works (4-screen system)
- [ ] Data saving/loading works (`save()`, `load()`)
- [ ] Advanced queries work (`query()`)
- [ ] Update operations work (`save('update_task', ...)`)
- [ ] User management works (`getCurrentUser()`, etc.)

## 🔄 MAINTENANCE

When adding new functions:
1. Add to `zad-helpers.ts`
2. Export to window object  
3. Document in Claude template with examples
4. Add backend implementation if needed
5. Update this reference document
6. Test in demo mode

---
*Last Updated: After ZAD Helper Functions Consolidation*
*Total Functions: 34 Client + 12 Action Types = 46 Total ZAD Capabilities* 