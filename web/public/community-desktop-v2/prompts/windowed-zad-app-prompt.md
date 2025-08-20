# Prompt for Generating Windowed ZAD Apps

## Context
You are creating a ZAD (Zero Admin Data) app that will run inside a window on the Community Desktop. The app should be fully functional, save data using the ZAD API, and work well in an iframe.

## Requirements

### 1. ZAD Integration
- Use `/api/zad/save` and `/api/zad/load` for ALL data operations
- Include proper app_id and participant_id
- Handle errors gracefully
- Support multi-user collaboration where appropriate

### 2. Window Compatibility
- Design for iframe embedding (no full-page layouts)
- Avoid using window.top or parent references
- Keep UI compact and functional
- Use relative URLs for any assets

### 3. Visual Design
- Match Windows 95/98 aesthetic when possible
- Use system fonts (Tahoma, MS Sans Serif)
- Gray backgrounds (#c0c0c0) for toolbars
- Simple, functional UI elements
- Avoid modern CSS features (gradients, shadows OK for depth)

### 4. App Structure Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[App Name]</title>
    <style>
        /* Windows 95 style theme */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Tahoma', 'MS Sans Serif', sans-serif;
            background: white;
            height: 100vh;
            overflow: hidden;
        }
        /* Toolbar, content area, status bar styles */
    </style>
</head>
<body>
    <!-- App UI here -->
    
    <script>
        // ZAD Configuration
        window.APP_ID = '[unique-app-id]';
        window.USER_ID = localStorage.getItem('community_user_id') || 'guest';
        
        // ZAD Helper Functions (REQUIRED)
        async function save(dataType, data) {
            const response = await fetch('/api/zad/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    app_id: window.APP_ID,
                    action_type: dataType,
                    participant_id: window.USER_ID,
                    content_data: data
                })
            });
            return await response.json();
        }
        
        async function load(dataType, participantId = window.USER_ID) {
            const response = await fetch('/api/zad/load', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    app_id: window.APP_ID,
                    action_type: dataType,
                    participant_id: participantId
                })
            });
            const result = await response.json();
            return result.data || [];
        }
        
        // App logic here
    </script>
</body>
</html>
```

## Example App Ideas

### Simple Apps
1. **Community Sticky Notes** - Shared sticky notes board
2. **Community Calculator** - Calculator with shared history
3. **Community Paint** - Simple drawing app with gallery
4. **Community Chat** - Basic chat room

### Intermediate Apps
1. **Community Todo List** - Shared task manager
2. **Community Polls** - Create and vote on polls
3. **Community Whiteboard** - Collaborative drawing
4. **Community Radio** - Shared playlist/DJ booth

### Advanced Apps
1. **Community Code Editor** - Syntax highlighting editor
2. **Community Spreadsheet** - Simple Excel clone
3. **Community Calendar** - Shared event calendar
4. **Community Wiki** - Collaborative documentation

## User Submission Processing

When a user submits: "[App Name]: [Description]"

1. Parse the app name and functionality
2. Choose appropriate UI components
3. Implement core features using ZAD
4. Keep it simple but functional
5. Add collaborative features where sensible

## Output Format

Generate a complete HTML file that:
- Is fully self-contained
- Uses only ZAD APIs for data
- Works in an iframe
- Has a retro aesthetic
- Includes error handling
- Provides user feedback for actions

## Important Notes

- NEVER use direct database access
- NEVER require external dependencies
- ALWAYS handle offline/error cases
- ALWAYS provide visual feedback for saves/loads
- Keep file size under 50KB if possible