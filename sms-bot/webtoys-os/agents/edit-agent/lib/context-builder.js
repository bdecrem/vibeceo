/**
 * Context Builder - Smart context generation based on issue analysis
 * 
 * Only includes relevant documentation and instructions
 * Reduces prompt size by 80-90% compared to v1
 */

import fs from 'fs';
import path from 'path';

// Pattern matchers for different app types
const APP_PATTERNS = {
    text_editor: /text editor|notepad|writer|word processor|document|typing/i,
    paint: /paint|draw|sketch|canvas|art|illustration|graphic/i,
    calculator: /calculator|calc|math|compute|arithmetic/i,
    game: /game|play|puzzle|fun|entertainment|score/i,
    music: /music|audio|sound|player|playlist|song/i,
    calendar: /calendar|schedule|appointment|date|event/i,
    todo: /todo|task|list|checklist|reminder/i,
    chat: /chat|message|conversation|talk|communicate/i,
    weather: /weather|forecast|temperature|climate/i,
    timer: /timer|countdown|stopwatch|clock|alarm/i,
    notes: /notes|memo|sticky|quick note/i,
    browser: /browser|web|internet|surf|navigate/i
};

// Feature patterns that require specific context
const FEATURE_PATTERNS = {
    auth: /login|user|auth|account|profile|personal|private|save my|my data/i,
    data: /save|store|database|persist|remember|load|retrieve/i,
    api: /api|fetch|request|endpoint|server|backend/i,
    realtime: /realtime|live|update|sync|refresh|websocket/i,
    file: /file|upload|download|export|import|csv|json/i,
    share: /share|collaborate|multi-user|together|team/i
};

/**
 * Analyze issue description to determine app type and features
 */
export function analyzeIssue(description) {
    const analysis = {
        appType: null,
        features: [],
        isModification: false,
        targetApp: null,
        complexity: 'simple' // simple, medium, complex
    };
    
    const lower = description.toLowerCase();
    
    // Check if it's a modification request
    if (/update|fix|modify|change|improve|enhance|add to|edit/i.test(description)) {
        analysis.isModification = true;
        
        // Try to extract target app name
        const patterns = [
            /(?:update|fix|modify|change|improve|enhance|edit)\s+(?:the\s+)?([a-z0-9\-]+)/i,
            /([a-z0-9\-]+)\s+(?:app|application|game|tool)/i
        ];
        
        for (const pattern of patterns) {
            const match = description.match(pattern);
            if (match) {
                analysis.targetApp = match[1].replace(/[^a-z0-9\-]/g, '');
                break;
            }
        }
    }
    
    // Determine app type
    for (const [type, pattern] of Object.entries(APP_PATTERNS)) {
        if (pattern.test(description)) {
            analysis.appType = type;
            break;
        }
    }
    
    // Games ALWAYS need leaderboard
    if (analysis.appType === 'game') {
        analysis.features.push('leaderboard');
        analysis.features.push('auth'); // Need auth for leaderboard
        analysis.features.push('data'); // Need data storage for scores
    }
    
    // Detect required features
    for (const [feature, pattern] of Object.entries(FEATURE_PATTERNS)) {
        if (pattern.test(description)) {
            analysis.features.push(feature);
        }
    }
    
    // Estimate complexity
    if (analysis.features.length > 3) {
        analysis.complexity = 'complex';
    } else if (analysis.features.length > 1) {
        analysis.complexity = 'medium';
    }
    
    // Special complexity cases
    if (analysis.features.includes('realtime') || analysis.features.includes('share')) {
        analysis.complexity = 'complex';
    }
    
    return analysis;
}

/**
 * Build minimal context based on analysis
 */
export function buildContext(analysis) {
    const contexts = [];
    
    // Import context templates
    const CONTEXT_TEMPLATES = {
        data_storage: `Data Storage: Use ZAD API endpoints:
- Save: POST /api/zad/save with {app_id, participant_id, action_type, content_data}
- Load: GET /api/zad/load?app_id=...&participant_id=...
Never use direct Supabase access.`
    };
    
    // Base context for modifications
    if (analysis.isModification && analysis.targetApp) {
        contexts.push(`Modifying existing app: ${analysis.targetApp}.html in /apps directory`);
    }
    
    // Authentication context - CRITICAL for user content apps
    if (analysis.features.includes('auth') || analysis.features.includes('data')) {
        contexts.push(`CRITICAL Authentication Requirements:
- Apps that save/load user content MUST use desktop auth
- Listen for TOYBOX_AUTH messages from parent window
- If user not logged in when saving/loading, prompt to sign up/login
- Use participant_id format: HANDLE_PIN (uppercase)
- Do NOT create your own login forms
See AUTH-DOCUMENTATION.md for full implementation.`);
    }
    
    // Data storage context
    if (analysis.features.includes('data')) {
        contexts.push(CONTEXT_TEMPLATES.data_storage);
    }
    
    // API/External data context
    if (analysis.features.includes('api')) {
        contexts.push(`External APIs: Use fetch() with CORS considerations.
For APIs requiring keys, prompt user to add them to the HTML.`);
    }
    
    // Realtime features
    if (analysis.features.includes('realtime')) {
        contexts.push(`Realtime: Use polling with setInterval for updates.
WebSockets not available in current environment.`);
    }
    
    // File handling
    if (analysis.features.includes('file')) {
        contexts.push(`File Handling: Use FileReader API for uploads.
For downloads, create blob URLs with download attribute.`);
    }
    
    // Multi-user/sharing (also needs data storage)
    if (analysis.features.includes('share')) {
        contexts.push(`Sharing: Use ZAD API with shared app_id.
Multiple users can access same data via common app identifier.`);
        // Sharing implies data storage
        if (!analysis.features.includes('data')) {
            contexts.push(CONTEXT_TEMPLATES.data_storage);
        }
    }
    
    // Game-specific context
    if (analysis.appType === 'game' || analysis.features.includes('leaderboard')) {
        contexts.push(`MANDATORY Game Requirements:
- MUST include a leaderboard showing top 10 scores
- Use WebtoysOS auth for player names (handle display)
- Store scores with ZAD API using action_type: 'leaderboard'
- If not logged in, prompt to login when saving score
- Display scores as: [Rank] [Handle] [Score]`);
    }
    
    // Modern design principles (ALWAYS include)
    contexts.push(`DESIGN PRINCIPLES:
- Think like a 2025 designer, not a 1980s engineer
- Clean minimal UI - content is king
- NO redundant user info (desktop shows it)
- NO export/import buttons
- Use subtle gradients for accents only
- Floating save buttons that appear on change
- Modern fonts and smooth animations`);
    
    // Deployment reminder (always include but keep minimal)
    contexts.push(`Deploy: node scripts/auto-deploy-app.js apps/[filename].html`);
    
    return contexts.join('\n\n');
}

/**
 * Get relevant code examples if needed
 */
export function getRelevantExamples(analysis) {
    const examples = [];
    
    // Only include examples for complex features
    if (analysis.features.includes('auth')) {
        examples.push(`// Auth listener example:
window.addEventListener('message', (e) => {
    if (e.data.type === 'TOYBOX_AUTH') {
        currentUser = e.data.user;
        // user.handle and user.participantId available
    }
});`);
    }
    
    if (analysis.features.includes('data')) {
        examples.push(`// ZAD save example:
await fetch('/api/zad/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        app_id: 'my-app',
        participant_id: currentUser.participantId,
        action_type: 'save_data',
        content_data: { /* your data */ }
    })
});`);
    }
    
    return examples.length > 0 ? '\nExamples:\n' + examples.join('\n\n') : '';
}

/**
 * Main function to build complete smart context
 */
export function buildSmartContext(description, existingComments = []) {
    const analysis = analyzeIssue(description);
    
    // Start with the original description
    let prompt = description;
    
    // Add relevant comments (filter out noise)
    const relevantComments = existingComments
        .filter(c => c.text && c.text.length > 20)
        .filter(c => !c.text.includes('Processing'))
        .filter(c => !c.text.includes('Edit Agent'))
        .slice(-2); // Only last 2 relevant comments
    
    if (relevantComments.length > 0) {
        prompt += '\n\nFeedback:\n';
        relevantComments.forEach(c => {
            prompt += `- ${c.text.substring(0, 200)}\n`;
        });
    }
    
    // Add analyzed context
    const context = buildContext(analysis);
    if (context) {
        prompt += '\n\n' + context;
    }
    
    // Add examples only if complex
    if (analysis.complexity === 'complex') {
        prompt += getRelevantExamples(analysis);
    }
    
    // Return prompt and analysis for logging
    return {
        prompt,
        analysis,
        promptSize: prompt.length,
        reduction: Math.round((1 - prompt.length / 2000) * 100) // % reduction from v1 avg
    };
}

export default {
    analyzeIssue,
    buildContext,
    buildSmartContext
};