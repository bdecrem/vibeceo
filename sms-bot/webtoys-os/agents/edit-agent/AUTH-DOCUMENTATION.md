# WebtoysOS v3 Authentication System Documentation

## How Authentication Works

WebtoysOS v3 uses a **postMessage-based authentication broadcast system** where the desktop broadcasts auth state to all apps running in iframes.

## Desktop Side (desktop-v3.html)

The desktop manages authentication and broadcasts it to all apps:

```javascript
// When user logs in/out, desktop broadcasts:
function broadcastAuth() {
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
        iframe.contentWindow.postMessage({
            type: 'TOYBOX_AUTH',
            user: currentUser  // null if logged out
        }, '*');
    });
}
```

The `currentUser` object contains:
```javascript
{
    handle: "bart",           // username (3-15 chars, alphanumeric)
    participantId: "bart_1234" // stored as HANDLE_PIN format
}
```

## App Side (Any app in /apps)

Apps should listen for auth broadcasts from the desktop:

```javascript
// Add this to any app that needs auth:
let currentUser = null;

// Listen for auth from desktop
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'TOYBOX_AUTH') {
        currentUser = event.data.user;
        // Update UI based on auth state
        updateAuthDisplay();
    }
});

function updateAuthDisplay() {
    if (currentUser) {
        // User is logged in
        document.getElementById('username').textContent = currentUser.handle;
        document.getElementById('login-prompt').style.display = 'none';
        document.getElementById('user-content').style.display = 'block';
    } else {
        // User is logged out
        document.getElementById('username').textContent = 'Not logged in';
        document.getElementById('login-prompt').style.display = 'block';
        document.getElementById('user-content').style.display = 'none';
    }
}
```

## Data Storage

Apps store user-specific data using the participantId:

```javascript
// Save user data (using ZAD API or direct Supabase)
await fetch('/api/zad/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        app_id: 'my-app',
        participant_id: currentUser.participantId,  // e.g., "bart_1234"
        content_data: { /* user's data */ }
    })
});

// Load user data
const response = await fetch(`/api/zad/load?app_id=my-app&participant_id=${currentUser.participantId}`);
```

## Complete App Template with Auth

```html
<!DOCTYPE html>
<html>
<head>
    <title>My App</title>
    <style>
        #login-prompt { 
            padding: 20px; 
            text-align: center;
        }
        #user-content { 
            display: none; 
        }
        .user-badge {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #4CAF50;
            color: white;
            padding: 5px 10px;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <!-- User badge -->
    <div class="user-badge">
        User: <span id="username">Not logged in</span>
    </div>

    <!-- Show when not logged in -->
    <div id="login-prompt">
        <h2>Please log in via the desktop</h2>
        <p>Click the user icon in the desktop menu bar to log in</p>
    </div>

    <!-- Show when logged in -->
    <div id="user-content">
        <h1>Welcome, <span class="user-name"></span>!</h1>
        <!-- Your app content here -->
    </div>

    <script>
        let currentUser = null;

        // Listen for auth from desktop
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'TOYBOX_AUTH') {
                currentUser = event.data.user;
                updateAuthDisplay();
                
                if (currentUser) {
                    // User logged in - load their data
                    loadUserData();
                } else {
                    // User logged out - clear data
                    clearUserData();
                }
            }
        });

        function updateAuthDisplay() {
            const username = document.getElementById('username');
            const loginPrompt = document.getElementById('login-prompt');
            const userContent = document.getElementById('user-content');
            const userNames = document.querySelectorAll('.user-name');

            if (currentUser) {
                username.textContent = currentUser.handle;
                loginPrompt.style.display = 'none';
                userContent.style.display = 'block';
                userNames.forEach(el => el.textContent = currentUser.handle);
            } else {
                username.textContent = 'Not logged in';
                loginPrompt.style.display = 'block';
                userContent.style.display = 'none';
            }
        }

        async function loadUserData() {
            // Load user-specific data
            const response = await fetch(`/api/zad/load?app_id=my-app&participant_id=${currentUser.participantId}`);
            if (response.ok) {
                const data = await response.json();
                // Use the data
            }
        }

        function clearUserData() {
            // Clear any user-specific UI/data
        }

        async function saveUserData(data) {
            if (!currentUser) return;
            
            await fetch('/api/zad/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    app_id: 'my-app',
                    participant_id: currentUser.participantId,
                    content_data: data
                })
            });
        }

        // Initial check
        updateAuthDisplay();
    </script>
</body>
</html>
```

## Key Points for Edit Agent

1. **Auth is automatic** - Desktop broadcasts to all apps when user logs in/out
2. **Apps must listen** - Use `window.addEventListener('message', ...)` to receive auth
3. **Check for TOYBOX_AUTH** - Message type must be exactly 'TOYBOX_AUTH'
4. **User object** - Contains `handle` (username) and `participantId` (for data storage)
5. **participantId format** - Always "HANDLE_PIN" format (e.g., "bart_1234")
6. **No app-side login UI** - Login happens only via desktop menu bar

## Testing Auth in Apps

1. Open the desktop at `/public/toybox-os-v3-test`
2. Click user icon in menu bar to log in
3. Your app will automatically receive auth via postMessage
4. Check browser console for auth messages

## Common Mistakes to Avoid

❌ **Don't create login forms in apps** - Auth is handled by desktop only
❌ **Don't store passwords** - Desktop uses PIN-based auth
❌ **Don't poll for auth** - Use event listener for broadcasts
❌ **Don't hardcode users** - Always use `currentUser` from auth broadcast