const readline = require('readline');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config({ path: '../.env.local' });

// Hardcoded user info (as requested)
const HARDCODED_USER_SLUG = 'bart';
const HARDCODED_USER_ID = 'a5167b9a-a718-4567-a22d-312b7bf9e773';

// Initialize clients
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

// Parse stack command input
function parseStackCommand(input) {
    // Expected format: "STACK app-slug build me something"
    const match = input.match(/^STACK\s+([a-z-]+)\s+(.+)$/i);
    if (!match) {
        throw new Error('Invalid format. Use: STACK app-slug your request here');
    }
    
    return {
        appSlug: match[1],
        userRequest: match[2]
    };
}

// Load aesthetic data from database with smart UUID/slug lookup
async function loadStackedData(appSlug) {
    console.log(`🔍 Looking up app: ${appSlug} for user: ${HARDCODED_USER_SLUG}`);
    
    // Step 1: Verify ownership and get UUID + HTML content - check if user owns this app
    const { data: appData, error: appError } = await supabase
        .from('wtaf_content')
        .select('id, app_slug, user_id, html_content')
        .eq('app_slug', appSlug)
        .eq('user_id', HARDCODED_USER_ID)
        .single();
    
    if (appError || !appData) {
        throw new Error(`❌ App '${appSlug}' not found or you don't own it`);
    }
    
    console.log(`✅ Ownership verified: ${HARDCODED_USER_SLUG} owns ${appSlug}`);
    const contentUuid = appData.id;
    const htmlContent = appData.html_content;
    console.log(`🆔 App UUID: ${contentUuid}`);
    console.log(`📄 HTML content loaded (${htmlContent ? htmlContent.length : 0} characters)`);
    
    // Step 2: Get the original HTML structure for visual inheritance
    console.log(`📄 Loading original HTML structure for layout inheritance...`);
    const { data: htmlData, error: htmlError } = await supabase
        .from('wtaf_content')
        .select('html_content')
        .eq('id', contentUuid)
        .single();
    
    if (htmlError || !htmlData) {
        console.log(`⚠️  Could not load original HTML: ${htmlError?.message}`);
    }
    
    // Step 3: Smart lookup for aesthetic data - try UUID first (new secure method), then slug (legacy)
    console.log(`📊 Loading aesthetic data using smart lookup...`);
    
    // Try new secure method first (UUID)
    let { data: submissions, error: subError } = await supabase
        .from('wtaf_submissions')
        .select('submission_data, created_at')
        .eq('app_id', contentUuid)
        .order('created_at', { ascending: false })
        .limit(5);
    
    if (submissions && submissions.length > 0) {
        console.log(`✅ Found ${submissions.length} submissions using UUID (secure method)`);
    } else {
        console.log(`⚠️  No submissions found with UUID, trying legacy slug lookup...`);
        
        // Fallback to legacy method (slug)
        const { data: legacySubmissions, error: legacyError } = await supabase
            .from('wtaf_submissions')
            .select('submission_data, created_at')
            .eq('app_id', appSlug)
            .order('created_at', { ascending: false })
            .limit(5);
            
        if (legacySubmissions && legacySubmissions.length > 0) {
            console.log(`✅ Found ${legacySubmissions.length} submissions using legacy slug method`);
            submissions = legacySubmissions;
            subError = legacyError;
        }
    }
    
    if (subError) {
        throw new Error(`❌ Error loading submissions: ${subError.message}`);
    }
    
    if (!submissions || submissions.length === 0) {
        console.log(`⚠️  No submission data found for ${appSlug} - creating blank aesthetic template`);
        return {
            aestheticData: {
                gradient: "linear-gradient(45deg, #3F88FF, #6E7FFF)",
                emojis: ["✨", "🌟", "💫"],
                hasData: false
            },
            htmlContent: htmlContent
        };
    }
    
    console.log(`📊 Found ${submissions.length} submissions for aesthetic reference`);
    
    // Extract aesthetic patterns from submissions
    const aestheticData = {
        gradients: [],
        emojis: [],
        colors: [],
        hasData: true,
        sampleCount: submissions.length
    };
    
    submissions.forEach((sub, index) => {
        console.log(`  📝 Submission ${index + 1}:`, JSON.stringify(sub.submission_data).substring(0, 100) + '...');
        
        const data = sub.submission_data;
        if (data.gradient) aestheticData.gradients.push(data.gradient);
        if (data.backgroundColor) aestheticData.colors.push(data.backgroundColor);
        if (data.emojis) {
            data.emojis.forEach(emoji => {
                if (emoji.text && !aestheticData.emojis.includes(emoji.text)) {
                    aestheticData.emojis.push(emoji.text);
                }
            });
        }
    });
    
    return {
        aestheticData: aestheticData,
        htmlContent: htmlContent
    };
}

// Enhance user prompt with aesthetic data and HTML structure
function enhancePromptWithAesthetics(userRequest, aestheticData, htmlContent) {
    let enhancedPrompt = `Now the user is asking THIS: "${userRequest}"

And make sure to use THAT (inherited aesthetic DNA) AND make it look and feel like THIS structure:
`;

    if (aestheticData.hasData) {
        enhancedPrompt += `
🎨 INHERITED AESTHETIC DATA FROM PREVIOUS APP:
- Color Gradients: ${aestheticData.gradients.join(', ')}
- Background Colors: ${aestheticData.colors.join(', ')}
- Emoji Palette: ${aestheticData.emojis.join(' ')}
- Design Samples: ${aestheticData.sampleCount} previous creations
`;
    } else {
        enhancedPrompt += `
⚠️  NO INHERITED DATA - use default WTAF aesthetic:
- Gradient: linear-gradient(45deg, #3F88FF, #6E7FFF)  
- Emojis: ✨ 🌟 💫 (make them FLOAT)
- Style: Chaotic but functional, neon energy, glitch effects
`;
    }

    // Add the full HTML structure for visual inheritance
    if (htmlContent && htmlContent.trim()) {
        enhancedPrompt += `
📄 INHERITED VISUAL STRUCTURE (Transform this "Hello World" page into an About Me page):
\`\`\`html
${htmlContent}
\`\`\`

CRITICAL INHERITANCE REQUIREMENTS:
1. Use the EXACT same layout structure, positioning, and animations from the HTML above
2. Use the EXACT same color gradients and palette from the aesthetic data
3. Use emojis ONLY from the provided emoji palette - keep them FLOATING and ANIMATED like the original
4. Transform "HELLO WORLD" content into "ABOUT ME" content while maintaining the same visual energy
5. Keep the same chaotic positioning, diagonal text, floating elements, and interactive behaviors
6. Maintain WTAF's rebellious personality and glitch effects from the original structure
`;
    } else {
        enhancedPrompt += `
⚠️  NO HTML STRUCTURE FOUND - create from WTAF defaults with floating emojis and chaotic energy.
`;
    }
    
    enhancedPrompt += `
FINAL OUTPUT: Return complete HTML with embedded CSS and JavaScript. Transform the reference page into an About Me page that looks and feels EXACTLY like the original but with personal content instead!`;

    return enhancedPrompt;
}

// Load WTAF style guide
async function loadWtafStyleGuide() {
    const fs = require('fs');
    const path = require('path');
    
    try {
        const stylePath = path.join(__dirname, '..', 'content', 'app-tech-spec.json');
        const styleContent = fs.readFileSync(stylePath, 'utf8');
        console.log(`📖 WTAF style guide loaded successfully`);
        return styleContent;
    } catch (error) {
        console.log(`⚠️  Could not load WTAF style guide: ${error.message}`);
        return null;
    }
}

// Send to Claude
async function sendToClaude(enhancedPrompt) {
    console.log(`🤖 Sending enhanced prompt to Claude 3.5 Sonnet...`);
    console.log(`📏 Prompt length: ${enhancedPrompt.length} characters`);
    
    // Load WTAF brand identity
    const wtafStyleGuide = await loadWtafStyleGuide();
    
    let systemPrompt = `You are the WTAF app generator - a chaotic, rebellious, but incredibly talented web developer who creates apps with FLAMING NEON PRIMAL energy.

Here's your system prompt (WTAF Cookbook & Style Guide):
${wtafStyleGuide || 'WTAF Style: Chaotic but functional, neon energy, floating emojis, glitch effects, premium but rebellious'}

CRITICAL REQUIREMENTS:
- Follow the WTAF brand identity and energy from the style guide above
- Use the EXACT gradients and colors provided in the aesthetic inheritance
- Use the EXACT emojis provided and make them FLOAT and ANIMATE
- Create apps with WTAF's signature chaotic-but-functional energy
- Include glitch effects, floating elements, and interactive surprises
- Make it responsive and production-ready but with PERSONALITY
- Return ONLY the HTML code wrapped in \`\`\`html code blocks`;

    try {
        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 8192,
            temperature: 0.7,
            system: systemPrompt,
            messages: [
                { role: 'user', content: enhancedPrompt }
            ]
        });
        
        const result = response.content[0].text;
        console.log(`✅ Claude response received (${result.length} chars)`);
        return result;
        
    } catch (error) {
        throw new Error(`Claude error: ${error.message}`);
    }
}

// Extract HTML from response
function extractHTML(response) {
    const htmlMatch = response.match(/```html\n([\s\S]*?)\n```/);
    if (htmlMatch) {
        return htmlMatch[1];
    }
    
    // Fallback: look for HTML content
    if (response.includes('<!DOCTYPE html') || response.includes('<html')) {
        return response;
    }
    
    throw new Error('No HTML found in Claude response');
}

// Save HTML to file
function saveHTML(html, appSlug, userRequest) {
    const fs = require('fs');
    const path = require('path');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `stackable-${appSlug}-${timestamp}.html`;
    
    // Save to logs directory (ignored by git)
    const logsDir = path.join(__dirname, '..', 'logs');
    
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const filepath = path.join(logsDir, filename);
    
    fs.writeFileSync(filepath, html, 'utf8');
    
    return { filename, filepath };
}

// Main function
async function main() {
    console.log('🧪 STACKABLES EXPERIMENT');
    console.log('========================');
    console.log(`👤 Testing as user: ${HARDCODED_USER_SLUG}`);
    console.log('💡 Usage: STACK app-slug your request here');
    console.log('📝 Example: STACK crimson-rabbit-painting build me an ABOUT ME page\n');
    
    try {
        const input = await askQuestion('Enter your stack command: ');
        
        if (!input.trim()) {
            console.log('❌ Empty input. Exiting.');
            rl.close();
            return;
        }
        
        // Step 1: Parse command
        console.log(`\n🔧 Parsing command: "${input}"`);
        const { appSlug, userRequest } = parseStackCommand(input);
        console.log(`   📱 App to inherit from: ${appSlug}`);
        console.log(`   📝 New request: ${userRequest}`);
        
        // Step 2: Load aesthetic data and HTML structure
        console.log(`\n📊 Loading aesthetic data and HTML structure...`);
        const { aestheticData, htmlContent } = await loadStackedData(appSlug);
        
        // Step 3: Enhance prompt with both aesthetic data and HTML structure
        console.log(`\n🎨 Enhancing prompt with aesthetic inheritance and visual structure...`);
        const enhancedPrompt = enhancePromptWithAesthetics(userRequest, aestheticData, htmlContent);
        
        // Step 4: Send to Claude
        console.log(`\n🚀 Sending to Claude 3.5 Sonnet...`);
        const response = await sendToClaude(enhancedPrompt);
        
        // Step 5: Extract and save HTML
        console.log(`\n💾 Processing response...`);
        const html = extractHTML(response);
        const { filename, filepath } = saveHTML(html, appSlug, userRequest);
        
        console.log(`\n✅ SUCCESS!`);
        console.log(`📁 File saved: ${filename}`);
        console.log(`📍 Location: ${filepath}`);
        console.log(`🌐 Open the HTML file in your browser to test!`);
        
    } catch (error) {
        console.log(`\n❌ ERROR: ${error.message}`);
    } finally {
        rl.close();
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Goodbye!');
    rl.close();
    process.exit(0);
});

// Run the script
main().catch(console.error); 