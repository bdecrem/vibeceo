/**
 * App Creation Detection and Handler Module
 * Add this to worker.js to handle app creation requests intelligently
 */

/**
 * Detect if this is an app creation request vs an edit request
 */
export function isAppCreationRequest(description, appSlug) {
    // If targeting the desktop and asking to create/make/add an app
    if (appSlug === 'toybox-os-v3-test') {
        const createPatterns = [
            /\b(create|make|build|add|develop)\s+.*\s+(app|application|game|tool|editor|calculator)/i,
            /\b(add|create|make)\s+(a|an)\s+\w+\s+(to|on|for)\s+(the\s+)?desktop/i,
            /\bmake\s+(a|an)\s+\w+\s+(app|game|tool)/i,
            /\b(sudoku|chess|calculator|notepad|editor|paint)\s+(app|game|tool)?/i
        ];
        
        return createPatterns.some(pattern => pattern.test(description));
    }
    return false;
}

/**
 * Extract app name from creation request
 */
export function extractAppInfo(description) {
    // Common app names that might be mentioned
    const knownApps = {
        'sudoku': { name: 'Sudoku', icon: '🔢', type: 'game' },
        'chess': { name: 'Chess', icon: '♟️', type: 'game' },
        'checkers': { name: 'Checkers', icon: '🎯', type: 'game' },
        'calculator': { name: 'Calculator', icon: '🧮', type: 'tool' },
        'calc': { name: 'Calculator', icon: '🧮', type: 'tool' },
        'notepad': { name: 'Notepad', icon: '📝', type: 'tool' },
        'text editor': { name: 'Text Editor', icon: '📝', type: 'tool' },
        'paint': { name: 'Paint', icon: '🎨', type: 'tool' },
        'draw': { name: 'Draw', icon: '🎨', type: 'tool' },
        'b3rt': { name: 'B3rt', icon: '📝', type: 'editor' },
        'bert': { name: 'Bert', icon: '📝', type: 'editor' }
    };
    
    const lowerDesc = description.toLowerCase();
    
    // Check for known apps
    for (const [key, info] of Object.entries(knownApps)) {
        if (lowerDesc.includes(key)) {
            return {
                name: info.name,
                icon: info.icon,
                type: info.type,
                slug: `toybox-${info.name.toLowerCase().replace(/\s+/g, '-')}`
            };
        }
    }
    
    // Try to extract custom app name
    const patterns = [
        /(?:called|named)\s+(\w+)/i,
        /(?:create|make|build|add)\s+(?:a|an)?\s*(?:simple|basic)?\s*(\w+)/i,
        /(\w+)\s+(?:app|application|game|tool)/i
    ];
    
    for (const pattern of patterns) {
        const match = description.match(pattern);
        if (match && match[1]) {
            const name = match[1];
            return {
                name: name.charAt(0).toUpperCase() + name.slice(1),
                icon: '📱',
                type: 'app',
                slug: `toybox-${name.toLowerCase()}`
            };
        }
    }
    
    // Fallback
    return {
        name: 'New App',
        icon: '📱',
        type: 'app',
        slug: 'toybox-new-app'
    };
}

/**
 * Build a better prompt for app creation
 */
export function buildAppCreationPrompt(appInfo, description) {
    const templates = {
        game: `Create a ${appInfo.name} game with:
- Canvas-based gameplay
- Touch and keyboard controls
- Score tracking
- Clean, modern UI
- Fun and engaging mechanics`,
        
        tool: `Create a ${appInfo.name} tool with:
- Functional UI with buttons and inputs
- Clean, modern design
- Useful features
- Data persistence using ZAD`,
        
        editor: `Create a ${appInfo.name} text editor with:
- Text area for editing
- Save/load functionality using ZAD
- Clean toolbar with common actions
- Modern, minimal design`,
        
        app: `Create a ${appInfo.name} application based on: ${description}`
    };
    
    const basePrompt = templates[appInfo.type] || templates.app;
    
    return `You are creating a new WebtoysOS application.

${basePrompt}

Technical Requirements:
1. Single-file HTML application
2. Works in an iframe (windowed environment)
3. Responsive design
4. Include ALL JavaScript inline
5. Use modern, clean CSS

CRITICAL WebtoysOS Integration:
\`\`\`javascript
// Required at the top of your script
window.APP_ID = '${appInfo.slug.replace('toybox-', '')}';
let currentUser = null;

// Auth listener
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'TOYBOX_AUTH') {
        currentUser = event.data.user;
        // Update your UI based on login
    }
});

// ZAD API helpers for data persistence
async function save(dataType, data) {
    const participantId = currentUser ? 
        \`\${currentUser.handle.toUpperCase()}_\${currentUser.pin}\` : 
        'anonymous';
    
    const response = await fetch('/api/zad/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            app_id: window.APP_ID,
            participant_id: participantId,
            action_type: dataType,
            content_data: data
        })
    });
    return response.ok;
}

async function load(dataType) {
    const url = \`/api/zad/load?app_id=\${window.APP_ID}&action_type=\${dataType}\`;
    const response = await fetch(url);
    return await response.json() || [];
}
\`\`\`

Create a complete, working ${appInfo.name} application.
Return ONLY the HTML code, starting with <!DOCTYPE html> and ending with </html>.
No explanations or markdown blocks.`;
}

/**
 * Process app creation with proper deployment
 */
export async function handleAppCreation(request, supabase, CLAUDE_PATH) {
    console.log('  🎨 Handling app creation request');
    
    const appInfo = extractAppInfo(request.description);
    console.log(`  📱 Creating: ${appInfo.name} (${appInfo.slug})`);
    
    // Step 1: Generate the app HTML using Claude
    const prompt = buildAppCreationPrompt(appInfo, request.description);
    
    // [Call Claude CLI with this prompt - use existing executeClaudeWithSpawn]
    // ... returns appHtml
    
    // Step 2: Deploy to wtaf_content
    const timestamp = new Date().toISOString();
    await supabase
        .from('wtaf_content')
        .upsert({
            user_slug: 'public',
            app_slug: appInfo.slug,
            html_content: appHtml,
            created_at: timestamp,
            updated_at: timestamp,
            original_prompt: `${appInfo.name} - Created by Edit Agent`
        });
    
    // Step 3: Register in desktop config
    const { data: config } = await supabase
        .from('wtaf_desktop_config')
        .select('*')
        .eq('desktop_version', 'webtoys-os-v3')
        .is('user_id', null)
        .single();
    
    let appRegistry = config.app_registry || [];
    const appId = appInfo.slug.replace('toybox-', '');
    
    // Add or update app entry
    const appEntry = {
        id: appId,
        name: appInfo.name,
        url: `/public/${appInfo.slug}`,
        icon: appInfo.icon,
        width: 800,
        height: 600,
        resizable: true
    };
    
    const existingIndex = appRegistry.findIndex(app => app.id === appId);
    if (existingIndex >= 0) {
        appRegistry[existingIndex] = appEntry;
    } else {
        appRegistry.push(appEntry);
    }
    
    // Update desktop config
    await supabase
        .from('wtaf_desktop_config')
        .update({
            app_registry: appRegistry,
            updated_at: timestamp
        })
        .eq('id', config.id);
    
    console.log(`  🎉 Successfully created ${appInfo.name}!`);
    
    return {
        success: true,
        summary: `Created ${appInfo.name} and added to desktop`,
        url: `https://webtoys.ai/public/${appInfo.slug}`
    };
}