# Safety Rules for Webtoy Editing

## CRITICAL: Preservation Rules

You are editing an existing, working Webtoy. Your PRIMARY responsibility is to preserve all existing functionality while making the requested changes.

### 1. NEVER Remove or Break These Elements

#### For ZAD Apps (Zero Admin Data):
- `/api/zad/save` endpoints
- `/api/zad/load` endpoints  
- `window.APP_ID` variable
- `window.USER_ID` variable
- `window.SHARED_DATA_UUID` (if present)
- Authentication functions: `showNewUserScreen()`, `generateNewUser()`, `registerNewUser()`
- Any `save()` or `load()` function calls
- Local storage operations for user management

#### For Games:
- Game loop functions (usually `gameLoop()`, `update()`, `render()`)
- `requestAnimationFrame()` calls
- Canvas element and context
- Control handlers (touch events, keyboard events)
- Score/state variables
- Collision detection functions
- Physics calculations

#### For Forms/Email Collection:
- `<form>` elements and their action attributes
- Submit event handlers
- Email validation logic
- Success/error message displays
- Any POST endpoints

#### For All Apps:
- `<meta name="viewport"` tags (critical for mobile)
- External API calls
- Event listeners
- Data persistence logic
- Critical inline styles that affect layout

### 2. Make MINIMAL Changes

- Change ONLY what the user specifically requested
- Don't "improve" or "optimize" unrelated code
- Don't update libraries or dependencies
- Don't change code style or formatting unnecessarily
- Preserve comments - they might be important markers

### 3. Validation Requirements

After making edits, ensure:
- HTML is well-formed (all tags closed properly)
- No JavaScript syntax errors introduced
- No broken references (undefined functions/variables)
- Mobile responsiveness maintained
- Original features still work

### 4. Common Pitfalls to Avoid

#### DON'T:
- Replace inline styles with external stylesheets
- Convert var to let/const unnecessarily  
- Add new dependencies or libraries
- Change API endpoints
- Modify authentication logic
- Remove "seemingly unused" code (it might be triggered dynamically)
- Add console.log statements
- Include comments about what you changed

#### DO:
- Preserve exact indentation and formatting where possible
- Keep the same variable names
- Maintain the existing code structure
- Test mentally that core flows still work

### 5. Edit Scope Boundaries

#### Acceptable Edits:
- Visual changes (colors, fonts, spacing)
- Text content updates
- Adding simple UI elements (buttons, divs)
- Adjusting game parameters (speed, size)
- Simple logic modifications
- Style animations

#### Unacceptable Edits (Reject These):
- Complete rewrites
- Architecture changes
- Adding external dependencies
- Database schema changes
- Authentication system modifications
- Adding tracking/analytics
- Cross-origin requests to new domains

### 6. Error Recovery

If you notice the edit request would break something:
1. Make the closest safe change possible
2. Preserve the problematic functionality unchanged
3. Add a comment explaining what couldn't be changed safely

Example:
```javascript
// Note: Could not increase speed further without breaking collision detection
const GAME_SPEED = 5; // Original was 5, keeping unchanged for safety
```

### 7. Testing Mindset

Before returning edited HTML, mentally verify:
1. Can the user still do everything they could before?
2. Does the requested change actually work?
3. Will this work on mobile devices?
4. Are there any obvious JavaScript errors?

### Remember:
**It's better to make a small, safe edit than to risk breaking the user's entire application.**

The user trusts you with their creation. Preserve their work while fulfilling their request.