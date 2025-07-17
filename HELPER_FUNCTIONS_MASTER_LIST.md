# ZAD Helper Functions Master List

## Core Data Functions (Available Everywhere)
1. `save(type, data)` - Save data to ZAD database
2. `load(type)` - Load all data of a specific type  
3. `query(type, options)` - Advanced queries with filtering/sorting

## Authentication & User Functions (Available Everywhere)
4. `initAuth()` - Initialize authentication system
5. `getAppId()` - Get current app's UUID
6. `getParticipantId()` - Get current user's participant ID
7. `getUsername()` - Get current user's username
8. `getCurrentUser()` - Get complete user object
9. `updateZadAuth(userLabel, participantId)` - Update auth state

## Backend Helper Functions (Available Everywhere)
10. `checkAvailableSlots()` - Check if new users can join
11. `generateUser()` - Generate new user credentials
12. `registerUser(userLabel, passcode, participantId)` - Register new user
13. `authenticateUser(userLabel, passcode)` - Authenticate existing user
14. `greet(name)` - Backend greeting function

## Real-time Features (Advanced)
15. `enableLiveUpdates(type, callback)` - Enable live data updates
16. `startRealtime(callback, interval)` - Start polling for changes
17. `stopRealtime()` - Stop live updates

## Advanced Auth Functions (Advanced)
18. `onUserLogin(callback)` - Auth event handler
19. `isAuthenticated()` - Check if user is logged in
20. `requireAuth()` - Force authentication

## Data Function Variants (Advanced)
21. `loadAll()` - Load all data across types

## Legacy Auth Functions (Backwards Compatibility)
22. `generateNewUser()` - Legacy auth function
23. `registerNewUser()` - Legacy auth function  
24. `showNewUserScreen()` - Legacy auth function
25. `loginReturningUser()` - Legacy auth function
26. `showScreen(screenId)` - Legacy screen function
27. `showReturningUserScreen()` - Legacy auth function
28. `enterMainScreen()` - Legacy auth function
29. `leaveApp()` - Legacy auth function

## Convenience Aliases (Backwards Compatibility)
30. `saveEntry()` / `loadEntries()` - Alias for save/load
31. `saveData()` / `loadData()` - Alias for save/load
32. `saveItem()` / `loadItems()` - Alias for save/load  
33. `saveNote()` / `loadNotes()` - Alias for save/load
34. `saveMessage()` / `loadMessages()` - Alias for save/load

## Status
- [x] All functions consolidated in zad-helpers.ts (34 functions total)
- [x] All functions documented in Claude template (comprehensive reference added)
- [ ] Backend implementations verified
- [ ] Inline injection updated to use zad-helpers.ts
- [ ] Testing completed 