#!/usr/bin/env node

/**
 * Test Custom OG Image Generation
 * 
 * Tests HTMLCSStoImage API with custom HTML snippet instead of full app screenshot.
 * Generates a 1200x630 OG image with WTAF branding and saves locally.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local from sms-bot directory
dotenv.config({ path: join(__dirname, '../.env.local') });
import fs from 'fs';
import https from 'https';
import { createClient } from '@supabase/supabase-js';

// Get command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
    console.error('❌ Usage: node test-custom-og-generation.js <user_slug> <app_slug>');
    console.error('   Example: node test-custom-og-generation.js bart neon-snake-game');
    process.exit(1);
}

const [userSlug, appSlug] = args;

// HTMLCSStoImage credentials
const HTMLCSS_USER_ID = process.env.HTMLCSS_USER_ID;
const HTMLCSS_API_KEY = process.env.HTMLCSS_API_KEY;

// Supabase credentials
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!HTMLCSS_USER_ID || !HTMLCSS_API_KEY) {
    console.error('❌ Missing HTMLCSStoImage credentials in .env.local');
    console.error('   HTMLCSS_USER_ID and HTMLCSS_API_KEY required');
    process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase credentials in .env.local');
    console.error('   SUPABASE_URL and SUPABASE_SERVICE_KEY required');
    process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Function to extract title from HTML content
function extractTitle(htmlContent) {
    // Try to find h1 tag first
    const h1Match = htmlContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
    if (h1Match) {
        return h1Match[1].replace(/<[^>]*>/g, '').trim();
    }
    
    // Try title tag
    const titleMatch = htmlContent.match(/<title[^>]*>(.*?)<\/title>/i);
    if (titleMatch) {
        const title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
        if (title && !title.includes('WTAF')) {
            return title;
        }
    }
    
    // Fallback
    return "WTAF Creation";
}

// Function to extract styling from HTML content
function extractStyling(htmlContent) {
    const styling = {
        backgroundColor: '#1a1a1a', // Dark fallback
        titleColor: '#ffffff',      // White fallback
        titleFont: 'Space Grotesk', // Default font
        titleSize: '72px',          // Default size
        textTransform: 'none',      // Default capitalization
        letterSpacing: 'normal',    // Default letter spacing
        gradient: null
    };
    
    // Extract inline styles from body
    const bodyMatch = htmlContent.match(/<body[^>]*style=['"](.*?)['"][^>]*>/i);
    if (bodyMatch) {
        const bodyStyle = bodyMatch[1];
        
        // Look for background color
        const bgColorMatch = bodyStyle.match(/background-color:\s*([^;]+)/i);
        if (bgColorMatch) {
            styling.backgroundColor = bgColorMatch[1].trim();
        }
        
        // Look for background gradient
        const gradientMatch = bodyStyle.match(/background:\s*(linear-gradient[^;]+)/i);
        if (gradientMatch) {
            styling.gradient = gradientMatch[1].trim();
        }
    }
    
    // Extract all CSS from style tags (handle multiple style tags)
    const styleTagMatches = htmlContent.match(/<style[^>]*>(.*?)<\/style>/gis);
    if (styleTagMatches) {
        for (const styleMatch of styleTagMatches) {
            const css = styleMatch.replace(/<style[^>]*>|<\/style>/gi, '');
            
            // Look for body background (handle multi-line gradients)
            const bodyStyleMatch = css.match(/body\s*{([^}]*)}/is);
            if (bodyStyleMatch) {
                const bodyCSS = bodyStyleMatch[1];
                
                // Look for background-color first (most specific)
                const bgColorMatch = bodyCSS.match(/background-color:\s*([^;]+)/i);
                if (bgColorMatch) {
                    styling.backgroundColor = bgColorMatch[1].trim();
                }
                
                // Look for background with gradient
                const backgroundMatch = bodyCSS.match(/background(?:-image|):\s*([^;]+)/i);
                if (backgroundMatch) {
                    const bg = backgroundMatch[1].trim();
                    if (bg.includes('linear-gradient') || bg.includes('radial-gradient')) {
                        // Clean up multi-line gradients
                        styling.gradient = bg.replace(/\s+/g, ' ').trim();
                    } else if (!bgColorMatch) {
                        // Only use as background color if we didn't already find background-color
                        styling.backgroundColor = bg;
                    }
                }
                
                // Fallback: look for background without colon (handles "background linear-gradient...")
                if (!styling.gradient && !bgColorMatch) {
                    const bgFallbackMatch = bodyCSS.match(/background\s+(linear-gradient[^;]*)/i);
                    if (bgFallbackMatch) {
                        styling.gradient = bgFallbackMatch[1].trim().replace(/\s+/g, ' ');
                    }
                }
                
                // Look for font-family in body
                const bodyFontMatch = bodyCSS.match(/font-family:\s*([^;]+)/i);
                if (bodyFontMatch) {
                    styling.titleFont = bodyFontMatch[1].replace(/['"]/g, '').trim();
                }
            }
            
            // Look for h1 styling (handle multi-line)
            const h1Match = css.match(/h1[^{]*{([^}]*)}/is);
            if (h1Match) {
                const h1Style = h1Match[1];
                
                const colorMatch = h1Style.match(/color:\s*([^;]+)/i);
                if (colorMatch) {
                    styling.titleColor = colorMatch[1].trim();
                }
                
                const fontMatch = h1Style.match(/font-family:\s*([^;]+)/i);
                if (fontMatch) {
                    styling.titleFont = fontMatch[1].replace(/['"]/g, '').trim();
                }
                
                const sizeMatch = h1Style.match(/font-size:\s*([^;]+)/i);
                if (sizeMatch) {
                    styling.titleSize = sizeMatch[1].trim();
                }
                
                const transformMatch = h1Style.match(/text-transform:\s*([^;]+)/i);
                if (transformMatch) {
                    styling.textTransform = transformMatch[1].trim();
                }
                
                const spacingMatch = h1Style.match(/letter-spacing:\s*([^;]+)/i);
                if (spacingMatch) {
                    styling.letterSpacing = spacingMatch[1].trim();
                }
            }
            
            // Look for common title classes
            const titleClassMatch = css.match(/\.(title|main|heading|hero|headline|container h1)[^{]*{([^}]*)}/is);
            if (titleClassMatch) {
                const titleStyle = titleClassMatch[2];
                
                const colorMatch = titleStyle.match(/color:\s*([^;]+)/i);
                if (colorMatch) {
                    styling.titleColor = colorMatch[1].trim();
                }
            }
        }
    }
    
    // Handle different units and convert to pixels for OG image
    if (styling.titleSize.includes('vw')) {
        const vwValue = parseFloat(styling.titleSize.replace('vw', ''));
        // Convert vw to pixels assuming 1200px viewport width
        styling.titleSize = `${Math.round(vwValue * 12)}px`;
    } else if (styling.titleSize.includes('em')) {
        const emValue = parseFloat(styling.titleSize.replace('em', ''));
        // Convert em to pixels assuming 16px base font size
        styling.titleSize = `${Math.round(emValue * 16)}px`;
    } else if (styling.titleSize.includes('rem')) {
        const remValue = parseFloat(styling.titleSize.replace('rem', ''));
        // Convert rem to pixels assuming 16px root font size
        styling.titleSize = `${Math.round(remValue * 16)}px`;
    }
    
    // Handle text transformation - make title match the styling
    if (styling.textTransform === 'uppercase') {
        // This will be handled in the template generation
    }
    
    console.log('🎨 Extracted styling:', styling);
    return styling;
}

// Function to fetch page data from Supabase
async function fetchPageData(userSlug, appSlug) {
    console.log(`📋 Fetching page data for: ${userSlug}/${appSlug}`);
    
    const { data: pageData, error } = await supabase
        .from('wtaf_content')
        .select('html_content, original_prompt, created_at')
        .eq('user_slug', userSlug)
        .eq('app_slug', appSlug)
        .eq('status', 'published')
        .single();

    if (error || !pageData) {
        throw new Error(`Page not found: ${userSlug}/${appSlug}`);
    }
    
    return pageData;
}

// Function to generate custom HTML for OG image
function generateCustomHTML(title, userSlug, appSlug, styling) {
    // Use extracted styling or fallbacks
    const background = styling.gradient || `background-color: ${styling.backgroundColor}`;
    const titleFontFamily = styling.titleFont.includes(',') ? styling.titleFont : `'${styling.titleFont}', 'Space Grotesk', sans-serif`;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            width: 1200px;
            height: 630px;
            ${background.startsWith('background') ? background : `background: ${background}`};
            font-family: ${titleFontFamily};
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            position: relative;
            overflow: hidden;
        }
        
        .headline {
            font-size: ${styling.titleSize};
            font-weight: 700;
            color: ${styling.titleColor};
            text-shadow: 3px 3px 0px rgba(0,0,0,0.3);
            text-align: center;
            text-transform: ${styling.textTransform};
            letter-spacing: ${styling.letterSpacing};
            z-index: 10;
            max-width: 90%;
            word-wrap: break-word;
        }
        
        .floating-emoji {
            position: absolute;
            font-size: 60px;
            animation: float 3s ease-in-out infinite;
            opacity: 0.6;
        }
        
        .emoji-1 {
            top: 80px;
            left: 150px;
            animation-delay: 0s;
        }
        
        .emoji-2 {
            top: 150px;
            right: 120px;
            animation-delay: 1s;
        }
        
        .emoji-3 {
            bottom: 150px;
            left: 120px;
            animation-delay: 2s;
        }
        
        .badge {
            position: absolute;
            bottom: 30px;
            right: 30px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 20px;
            border-radius: 25px;
            font-size: 16px;
            font-weight: 600;
            border: 2px solid rgba(255, 255, 255, 0.3);
            z-index: 10;
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-15px) rotate(3deg); }
        }
    </style>
</head>
<body>
    <div class="floating-emoji emoji-1">✨</div>
    <div class="floating-emoji emoji-2">🚀</div>
    <div class="floating-emoji emoji-3">⚡</div>
    
    <h1 class="headline">${title}</h1>
    
    <div class="badge">Built with WTAF ⚡</div>
</body>
</html>
`;
}

async function generateCustomOG() {
    console.log('🎨 Generating custom OG image with HTMLCSStoImage...');
    
    try {
        // Fetch page data from Supabase
        const pageData = await fetchPageData(userSlug, appSlug);
        
        // Extract title from the HTML content
        let title = extractTitle(pageData.html_content);
        console.log(`📝 Extracted title: "${title}"`);
        
        // Extract styling from the HTML content
        const styling = extractStyling(pageData.html_content);
        
        // Apply text transformation to title if specified
        if (styling.textTransform === 'uppercase') {
            title = title.toUpperCase();
            console.log(`🔤 Applied uppercase transformation: "${title}"`);
        } else if (styling.textTransform === 'lowercase') {
            title = title.toLowerCase();
            console.log(`🔤 Applied lowercase transformation: "${title}"`);
        } else if (styling.textTransform === 'capitalize') {
            title = title.replace(/\b\w/g, l => l.toUpperCase());
            console.log(`🔤 Applied capitalize transformation: "${title}"`);
        }
        
        // Generate custom HTML with the extracted title and styling
        const customHTML = generateCustomHTML(title, userSlug, appSlug, styling);
        
        // Prepare authentication
        const auth = Buffer.from(`${HTMLCSS_USER_ID}:${HTMLCSS_API_KEY}`).toString('base64');
        
        // Prepare request data
        const requestData = JSON.stringify({
            html: customHTML,
            viewport_width: 1200,
            viewport_height: 630,
            device_scale_factor: 1
        });
        
        console.log('📤 Sending request to HTMLCSStoImage API...');
        
        // Make request to HTMLCSStoImage
        const response = await fetch('https://hcti.io/v1/image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
            },
            body: requestData
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTMLCSStoImage failed: ${response.status} - ${errorText}`);
        }
        
        const imageData = await response.json();
        console.log('✅ Image generated successfully!');
        console.log(`🔗 Image URL: ${imageData.url}`);
        
        // Download the image
        console.log('📥 Downloading image...');
        const filename = `og-${userSlug}-${appSlug}.png`;
        const filepath = join(__dirname, '../logs', filename);
        await downloadImage(imageData.url, filepath);
        
        console.log(`🎉 Success! Image saved as logs/${filename}`);
        console.log(`📋 Custom OG image generated for: ${userSlug}/${appSlug}`);
        
    } catch (error) {
        console.error('❌ Error generating custom OG image:', error.message);
        process.exit(1);
    }
}

function downloadImage(url, filename) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filename);
        
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: ${response.statusCode}`));
                return;
            }
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                resolve();
            });
            
            file.on('error', (err) => {
                fs.unlink(filename, () => {}); // Delete file on error
                reject(err);
            });
        }).on('error', reject);
    });
}

// Run the test
console.log('🧪 Starting Custom OG Image Generation Test');
console.log(`🎯 Target: ${userSlug}/${appSlug}`);
console.log('==========================================');
generateCustomOG(); 