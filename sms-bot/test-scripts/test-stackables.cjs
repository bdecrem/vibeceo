const readline = require('readline');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
require('dotenv').config({ path: '../.env.local' });

// Hardcoded user info (as requested)
const HARDCODED_USER_SLUG = 'bart';
const HARDCODED_USER_ID = 'a5167b9a-a718-4567-a22d-312b7bf9e773';

// Initialize clients
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
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

// Load aesthetic data from database
async function loadStackedData(appSlug) {
    console.log(`🔍 Looking up app: ${appSlug} for user: ${HARDCODED_USER_SLUG}`);
    
    // Step 1: Verify ownership - check if user owns this app
    const { data: appData, error: appError } = await supabase
        .from('wtaf_content')
        .select('app_slug, user_id')
        .eq('app_slug', appSlug)
        .eq('user_id', HARDCODED_USER_ID)
        .single();
    
    if (appError || !appData) {
        throw new Error(`❌ App '${appSlug}' not found or you don't own it`);
    }
    
    console.log(`✅ Ownership verified: ${HARDCODED_USER_SLUG} owns ${appSlug}`);
    
    // Step 2: Load submission data (aesthetic JSON)
    const { data: submissions, error: subError } = await supabase
        .from('wtaf_submissions')
        .select('submission_data, created_at')
        .eq('app_id', appSlug)
        .order('created_at', { ascending: false })
        .limit(5); // Get recent submissions for aesthetic data
    
    if (subError) {
        throw new Error(`❌ Error loading submissions: ${subError.message}`);
    }
    
    if (!submissions || submissions.length === 0) {
        console.log(`⚠️  No submission data found for ${appSlug} - creating blank aesthetic template`);
        return {
            gradient: "linear-gradient(45deg, #3F88FF, #6E7FFF)",
            emojis: ["✨", "🌟", "💫"],
            hasData: false
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
    
    return aestheticData;
}

// Enhance user prompt with aesthetic data
function enhancePromptWithAesthetics(userRequest, aestheticData) {
    let enhancedPrompt = `Build: ${userRequest}

AESTHETIC INHERITANCE FROM PREVIOUS APP:
`;

    if (aestheticData.hasData) {
        enhancedPrompt += `
🎨 INHERITED DESIGN DNA:
- Color Gradients: ${aestheticData.gradients.join(', ')}
- Background Colors: ${aestheticData.colors.join(', ')}
- Emoji Palette: ${aestheticData.emojis.join(' ')}
- Design Samples: ${aestheticData.sampleCount} previous creations

REQUIREMENTS:
1. Use the SAME color gradients and emoji palette from the inherited design
2. Maintain the same aesthetic "feel" and energy
3. Apply this design DNA to the new request while making it functional
4. Keep the visual style consistent with the original app's aesthetic
`;
    } else {
        enhancedPrompt += `
⚠️  NO INHERITED DATA - using default WTAF aesthetic:
- Gradient: linear-gradient(45deg, #3F88FF, #6E7FFF)  
- Emojis: ✨ 🌟 💫
- Style: Clean, modern, tech-forward
`;
    }
    
    enhancedPrompt += `
OUTPUT: Return complete HTML with embedded CSS and JavaScript. Make it responsive and visually stunning.`;

    return enhancedPrompt;
}

// Send to GPT-4o
async function sendToGPT(enhancedPrompt) {
    console.log(`🤖 Sending enhanced prompt to GPT-4o...`);
    console.log(`📏 Prompt length: ${enhancedPrompt.length} characters`);
    
    const systemPrompt = `You are an expert web designer specializing in aesthetic inheritance. When given design DNA from a previous app, you create new applications that maintain the same visual language while serving different purposes.

CRITICAL REQUIREMENTS:
- Use the EXACT gradients and colors provided
- Use the EXACT emojis provided  
- Maintain consistent aesthetic feel
- Create complete, functional HTML with embedded CSS/JS
- Make it responsive and production-ready
- Return ONLY the HTML code wrapped in \`\`\`html code blocks`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: enhancedPrompt }
            ],
            max_tokens: 4000,
            temperature: 0.7
        });
        
        const result = response.choices[0].message.content;
        console.log(`✅ GPT-4o response received (${result.length} chars)`);
        return result;
        
    } catch (error) {
        throw new Error(`GPT-4o error: ${error.message}`);
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
    
    throw new Error('No HTML found in GPT response');
}

// Save HTML to file
function saveHTML(html, appSlug, userRequest) {
    const fs = require('fs');
    const path = require('path');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `stackable-${appSlug}-${timestamp}.html`;
    const filepath = path.join(__dirname, filename);
    
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
        
        // Step 2: Load aesthetic data
        console.log(`\n📊 Loading aesthetic data...`);
        const aestheticData = await loadStackedData(appSlug);
        
        // Step 3: Enhance prompt  
        console.log(`\n🎨 Enhancing prompt with aesthetic inheritance...`);
        const enhancedPrompt = enhancePromptWithAesthetics(userRequest, aestheticData);
        
        // Step 4: Send to GPT
        console.log(`\n🚀 Sending to GPT-4o...`);
        const response = await sendToGPT(enhancedPrompt);
        
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