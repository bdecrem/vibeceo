#!/usr/bin/env node

// HTMLCSStoImage credentials
const HTMLCSS_USER_ID = "dcd2b5ae-670d-463c-aa39-0e4a81345fd3";
const HTMLCSS_API_KEY = "45661b89-cb82-403f-947a-0894614f3594";

function extractMainTitle(htmlContent) {
    // Look for h1 tags first
    const h1Match = htmlContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
    if (h1Match) {
        return h1Match[1].replace(/<[^>]*>/g, '').trim();
    }
    
    // Look for title tag
    const titleMatch = htmlContent.match(/<title[^>]*>(.*?)<\/title>/i);
    if (titleMatch) {
        const title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
        if (title && !title.includes('WTAF')) {
            return title;
        }
    }
    
    return "WTAF Creation";
}

function extractThemeColors(htmlContent) {
    // Look for gradient backgrounds
    if (htmlContent.includes('#FF6B6B') || htmlContent.includes('#4ECDC4')) {
        return {
            background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4, #45B7D1, #96E6B3)',
            textColor: '#2D3436'
        };
    }
    
    // Default teal theme
    return {
        background: 'linear-gradient(135deg, #14b8a6, #0891b2)',
        textColor: 'white'
    };
}

function createOGTemplate(title, theme, userSlug, appSlug) {
    return `
    <div style="
        width: 1200px;
        height: 630px;
        background: ${theme.background};
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: ${theme.textColor};
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        padding: 80px;
        box-sizing: border-box;
        text-align: center;
    ">
        <div style="
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 60px;
            max-width: 900px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        ">
            <div style="
                font-size: 48px;
                font-weight: bold;
                margin-bottom: 30px;
                text-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">
                WTAF.me
            </div>
            
            <div style="
                font-size: ${title.length > 40 ? '32px' : '40px'};
                font-weight: 600;
                line-height: 1.2;
                margin-bottom: 30px;
                text-shadow: 0 1px 2px rgba(0,0,0,0.2);
            ">
                ${title}
            </div>
            
            <div style="
                font-size: 20px;
                opacity: 0.9;
                margin-bottom: 20px;
            ">
                Vibecoded chaos, shipped via SMS
            </div>
            
            <div style="
                font-size: 16px;
                opacity: 0.7;
                font-family: monospace;
            ">
                wtaf.me/${userSlug}/${appSlug}
            </div>
        </div>
    </div>`;
}

async function generateOGForPage(userSlug, appSlug) {
    console.log(`🎨 Generating PROPER OG image for: ${userSlug}/${appSlug}`);
    
    try {
        // 1. Fetch the real page content
        console.log("📄 Fetching page content...");
        const contentResponse = await fetch(`http://localhost:3000/api/wtaf-content?user=${userSlug}&app=${appSlug}`);
        
        if (!contentResponse.ok) {
            throw new Error(`Failed to fetch content: ${contentResponse.status}`);
        }
        
        const contentData = await contentResponse.json();
        console.log("✅ Got page content");
        
        // 2. Extract key elements
        const mainTitle = extractMainTitle(contentData.html_content);
        const theme = extractThemeColors(contentData.html_content);
        
        console.log(`📝 Extracted title: "${mainTitle}"`);
        console.log(`🎨 Theme: ${theme.background}`);
        
        // 3. Create proper OG template
        const ogHTML = createOGTemplate(mainTitle, theme, userSlug, appSlug);
        
        // 4. Send to HTMLCSStoImage
        console.log("🖼️  Sending OG template to HTMLCSStoImage...");
        
        const auth = Buffer.from(`${HTMLCSS_USER_ID}:${HTMLCSS_API_KEY}`).toString('base64');
        
        const imageResponse = await fetch('https://hcti.io/v1/image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
            },
            body: JSON.stringify({
                html: ogHTML,
                viewport_width: 1200,
                viewport_height: 630,
                device_scale_factor: 1
            })
        });
        
        if (!imageResponse.ok) {
            throw new Error(`HTMLCSStoImage failed: ${imageResponse.status}`);
        }
        
        const imageData = await imageResponse.json();
        
        console.log("🎉 SUCCESS!");
        console.log(`🖼️  Clean OG Image URL: ${imageData.url}`);
        console.log(`📋 Original page: https://www.wtaf.me/${userSlug}/${appSlug}`);
        
        return imageData.url;
        
    } catch (error) {
        console.error("❌ Error:", error.message);
        return null;
    }
}

// Run it
if (require.main === module) {
    const userSlug = process.argv[2] || 'bart';
    const appSlug = process.argv[3] || 'pearl-fox-racing';
    
    generateOGForPage(userSlug, appSlug);
}

module.exports = { generateOGForPage }; 