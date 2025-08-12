# WTAF Experiments

This folder contains experimental scripts for testing and developing WTAF zero-admin collaborative apps.

## 🚀 Quick Start

### Run the Prompt Test Script

**Option 1: Quick JavaScript version (no build required)**
```bash
# From the sms-bot/experiments directory:
node test-prompt-quick.cjs
```

**Option 2: TypeScript version (with build)**
```bash
# From the sms-bot directory:
npm run experiment
```

Or manually:
```bash
npm run build
node dist/experiments/test-prompt.js
```

### What it does:

1. **Loads prompt.txt** - Reads the WTAF system prompt template
2. **Asks for input** - Prompts you to describe what you want to build
3. **Calls GPT-4** - Sends your request to GPT-4 with the full WTAF prompt
4. **Saves HTML** - Creates a complete HTML file with your generated app
5. **Ready to test** - Open the HTML file in your browser to test

### Example Usage:

```
💭 What would you like to build? a simple voting app for choosing pizza toppings

🎯 Building: "a simple voting app for choosing pizza toppings"
🆔 App ID: test3
🤖 Sending request to GPT-4...
✅ Huge success!
📁 HTML file saved as: a-simple-voting-app-for-choosing-pizza-toppings-2025-01-07T10-30-15-123Z.html
🆔 App ID: test3 (all users will share this instance)
```

## 🧪 Files in this folder:

- **`prompt.txt`** - The master WTAF prompt template
- **`test-prompt.ts`** - TypeScript test script (requires build)
- **`test-prompt-quick.cjs`** - JavaScript test script (run directly, no build)
- **`README.md`** - This file
- **`*.html`** - Generated apps (created when you run the script)

## 🔧 How it works:

The script uses the WTAF zero-admin system to create fully functional collaborative web apps:

### 🆔 Sequential App IDs:
Each time you run the script, it generates a unique app ID (`test1`, `test2`, `test3`, etc.) stored in `.test-counter`. This means:
- **Each test run** = separate app instance
- **Within each app** = all users can collaborate
- **No conflicts** between different test sessions

### Built-in Features:
- **Zero-admin auth** - No signup/login, just pick a username + 4-digit code
- **Multi-user support** - 1-5 users can collaborate simultaneously  
- **Supabase integration** - All data stored in `wtaf_zero_admin_collaborative` table
- **Real-time updates** - Apps poll for changes every few seconds
- **WTAF design system** - Consistent styling with gradients, blur effects, etc.

### Database Schema:
Every action in the app creates a record:
```javascript
{
  app_id: "app-xyz123",           // Unique per app instance
  participant_id: "user1🎯_1234", // user_label + passcode
  action_type: "vote",            // join, message, vote, update, etc.
  participant_data: {...},        // User info (userLabel, passcode, etc)
  content_data: {...}             // Action-specific data
}
```

### Authentication Flow:
1. **Welcome Screen** - New user or returning user?
2. **New User** - Auto-generate username + 4-digit passcode  
3. **Returning User** - Pick username + enter 4-digit passcode
4. **Main App** - Your collaborative functionality

## 💡 Tips:

- **Be specific** in your request (e.g. "voting app for movie nights" vs just "voting app")
- **Think collaborative** - What would multiple people do together?
- **Test with multiple browsers** - Open the HTML in different browser windows/tabs to simulate multiple users
- **Check the console** - Browser dev tools will show any errors or debug info

## 🔍 Debugging:

If an app doesn't work:
1. Check browser console for JavaScript errors
2. Verify Supabase connection (should see database queries in Network tab)
3. Make sure the HTML includes the required authentication screens
4. Check that user capacity limits are working (max 5 users)

## 🎯 Example Requests:

- "a collaborative todo list for a team"
- "voting app for choosing restaurants" 
- "shared brainstorming board with sticky notes"
- "collaborative playlist maker"
- "team decision maker with pros/cons"
- "shared shopping list with real-time updates"
- "group chat with emoji reactions"

Have fun experimenting! 🚀 