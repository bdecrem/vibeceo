#!/usr/bin/env node

const https = require('https');
const http = require('http');

// HTMLCSStoImage credentials
const HTMLCSS_USER_ID = "dcd2b5ae-670d-463c-aa39-0e4a81345fd3";
const HTMLCSS_API_KEY = "45661b89-cb82-403f-947a-0894614f3594";

async function generateOGForPage(userSlug, appSlug) {
    console.log(`🎨 Generating OG image for: ${userSlug}/${appSlug}`);
    
    try {
        // 1. Fetch the real page content
        console.log("📄 Fetching page content...");
        const contentResponse = await fetch(`http://localhost:3000/api/wtaf-content?user=${userSlug}&app=${appSlug}`);
        
        if (!contentResponse.ok) {
            throw new Error(`Failed to fetch content: ${contentResponse.status}`);
        }
        
        const contentData = await contentResponse.json();
        console.log("✅ Got page content");
        
        // 2. Send the REAL HTML to HTMLCSStoImage
        console.log("🖼️  Sending to HTMLCSStoImage...");
        
        const auth = Buffer.from(`${HTMLCSS_USER_ID}:${HTMLCSS_API_KEY}`).toString('base64');
        
        const imageResponse = await fetch('https://hcti.io/v1/image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
            },
            body: JSON.stringify({
                html: contentData.html_content,
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
        console.log(`🖼️  Image URL: ${imageData.url}`);
        console.log(`📋 This should match your page: https://www.wtaf.me/${userSlug}/${appSlug}`);
        
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