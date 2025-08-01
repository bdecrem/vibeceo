/**
 * MEME PROCESSOR - MICROSERVICE ARCHITECTURE
 * 
 * This processor handles meme generation using OpenAI GPT + DALL-E 3.
 * 
 * MICROSERVICE RESPONSIBILITIES:
 * - Generate meme text (top/bottom) from user idea using GPT-4o
 * - Create meme image using DALL-E 3
 * - Generate HTML page displaying the meme
 * - Store in Supabase as wtaf_content with type='MEME'
 * 
 * INTERFACES WITH OTHER MICROSERVICES:
 * - Uses shared/config.ts for API keys and settings
 * - Uses shared/logger.ts for consistent logging
 * - Returns HTML ready for storage-manager.ts to save
 * - Integrates with existing social graph and remix system
 */

import { OpenAI } from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { OPENAI_API_KEY, WEB_APP_URL, SUPABASE_URL, SUPABASE_SERVICE_KEY } from './shared/config.js';
import { logWithTimestamp, logError, logSuccess, logWarning } from './shared/logger.js';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize OpenAI client with lazy loading
let openaiClient: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
    if (!openaiClient) {
        if (!OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY not found in environment");
        }
        openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY });
    }
    return openaiClient;
}

// Initialize Supabase client with lazy loading  
let supabaseClient: any = null;
function getSupabaseClient() {
    if (!supabaseClient) {
        if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
            throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY not found in environment");
        }
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    }
    return supabaseClient;
}

// HTMLCSStoImage credentials
const HTMLCSS_USER_ID = process.env.HTMLCSS_USER_ID!;
const HTMLCSS_API_KEY = process.env.HTMLCSS_API_KEY!;

/**
 * Download image from HTMLCSStoImage URL
 */
async function downloadImageFromURL(imageUrl: string): Promise<ArrayBuffer> {
    try {
        logWithTimestamp(`📥 Downloading image from: ${imageUrl}`);
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Failed to download image: ${response.status}`);
        }
        const imageBuffer = await response.arrayBuffer();
        logSuccess(`✅ Downloaded image (${imageBuffer.byteLength} bytes)`);
        return imageBuffer;
    } catch (error) {
        logError(`Failed to download image: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
    }
}

/**
 * Upload image to Supabase Storage og-images bucket
 */
async function uploadToSupabaseStorage(imageBuffer: ArrayBuffer, fileName: string): Promise<string> {
    try {
        logWithTimestamp(`📤 Uploading to Supabase Storage: ${fileName}`);
        const supabase = getSupabaseClient();
        
        // Ensure bucket exists
        const { data: buckets } = await supabase.storage.listBuckets();
        const bucketExists = buckets?.some(bucket => bucket.name === 'og-images');
        
        if (!bucketExists) {
            logWithTimestamp('📦 Creating og-images bucket...');
            const { error: bucketError } = await supabase.storage.createBucket('og-images', {
                public: true,
                allowedMimeTypes: ['image/png', 'image/jpeg']
            });
            
            if (bucketError) {
                throw new Error(`Failed to create bucket: ${bucketError.message}`);
            }
        }

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('og-images')
            .upload(fileName, imageBuffer, {
                contentType: 'image/png',
                upsert: true // Replace if exists
            });

        if (uploadError) {
            throw new Error(`Supabase upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('og-images')
            .getPublicUrl(fileName);

        logSuccess(`✅ Uploaded to Supabase Storage: ${urlData.publicUrl}`);
        return urlData.publicUrl;
    } catch (error) {
        logError(`Failed to upload to Supabase Storage: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
    }
}

export interface MemeConfig {
    model: string;
    maxTokens: number;
    temperature: number;
}

export interface MemeContent {
    topText: string;
    bottomText: string;
    theme: string;
    imagePrompt: string;
}

export interface MemeResult {
    success: boolean;
    html?: string;
    imageUrl?: string;
    memeContent?: MemeContent;
    error?: string;
}

/**
 * Generate meme content (top/bottom text + image theme) from user idea
 */
async function generateMemeContent(userIdea: string, config: MemeConfig): Promise<MemeContent | null> {
    try {
        logWithTimestamp(`🎨 Generating meme content for: ${userIdea.slice(0, 50)}...`);
        
        let nostalgiaPrompt = '';
        try {
            nostalgiaPrompt = await readFile(join(__dirname, '../content/nostalgia-meme-builder.txt'), 'utf-8');
            logSuccess('📖 Loaded nostalgia-meme-builder.txt successfully');
        } catch (error) {
            logError(`Failed to load nostalgia-meme-builder.txt: ${error instanceof Error ? error.message : String(error)}`);
            // Continue without nostalgia prompt
        }
        
        const systemPrompt = `You are a meme content generator. Given a meme idea, generate:
1. Top text (short, punchy, usually setup)
2. Bottom text (short, punchy, usually punchline)
3. Visual theme (describe the image style/mood)
4. Image prompt (detailed DALL-E prompt for the background image)

Rules:
- Keep text SHORT and PUNCHY (max 5-7 words each)
- Use ALL CAPS for traditional meme format
- Make it relatable and funny
- Focus on programming/tech humor when applicable
- Image should complement but not compete with text

Respond in JSON format:
{
  "topText": "WHEN YOU CODE FOR 8 HOURS",
  "bottomText": "AND FORGET TO SAVE",
  "theme": "Frustrated programmer at computer",
  "imagePrompt": "A stressed programmer sitting at a cluttered desk with multiple monitors, looking exhausted and frustrated, dark room lit only by screen glow, realistic photo style"
}`;

        const messages: ChatCompletionMessageParam[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Generate meme content for: ${userIdea}` }
        ];
        
        // Add nostalgia prompt if successfully loaded
        if (nostalgiaPrompt) {
            messages.unshift({ role: 'system', content: nostalgiaPrompt });
        }
        
        const response = await getOpenAIClient().chat.completions.create({
            model: config.model,
            messages,
            temperature: config.temperature,
            max_tokens: config.maxTokens
        });

        const content = response.choices[0].message.content;
        if (!content) {
            logError("No content in meme generation response");
            return null;
        }

        // Parse JSON response (handle markdown code blocks)
        let jsonContent = content;
        
        // Extract JSON from code blocks if present
        const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
            jsonContent = jsonMatch[1];
        }
        
        const memeData = JSON.parse(jsonContent);
        logSuccess(`✅ Generated meme content: "${memeData.topText}" / "${memeData.bottomText}"`);
        
        return {
            topText: memeData.topText,
            bottomText: memeData.bottomText,
            theme: memeData.theme,
            imagePrompt: memeData.imagePrompt
        };

    } catch (error) {
        logError(`Failed to generate meme content: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/**
 * Generate meme image using DALL-E 3
 */
async function generateMemeImage(imagePrompt: string): Promise<string | null> {
    try {
        logWithTimestamp(`🖼️ Generating meme image with DALL-E 3...`);
        logWithTimestamp(`🎨 Image prompt: ${imagePrompt}`);
        
        // Add explicit instruction to DALL-E to never include text and add bleed space
        const noTextPrompt = `${imagePrompt} CRITICAL COMPOSITION RULES: 1) NO text/words/letters anywhere in the image. 2) MUST have empty space at top 25% and bottom 25% of frame - these areas should be simple sky, wall, or plain background. 3) Main subject/character must be in the MIDDLE 50% only, not touching top or bottom edges. 4) Think of it like a movie frame with letterboxing - subject in center, empty space above and below for subtitles.`;
        
        const response = await getOpenAIClient().images.generate({
            model: "dall-e-3",
            prompt: noTextPrompt,
            size: "1024x1024",
            quality: "standard",
            n: 1
        });

        const imageUrl = response.data[0].url;
        if (!imageUrl) {
            logError("No image URL in DALL-E response");
            return null;
        }

        logSuccess(`✅ Generated meme image: ${imageUrl}`);
        return imageUrl;

    } catch (error) {
        logError(`Failed to generate meme image: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/**
 * Generate composite meme image with text burned in using HTMLCSStoImage
 */
async function generateCompositeMemeImage(backgroundImageUrl: string, memeContent: MemeContent): Promise<string | null> {
    try {
        logWithTimestamp(`🔥 Creating composite meme with embedded text...`);
        
        if (!HTMLCSS_USER_ID || !HTMLCSS_API_KEY) {
            logError("HTMLCSStoImage credentials not found");
            return backgroundImageUrl; // Fallback to original image
        }

        const { topText, bottomText } = memeContent;
        
        logWithTimestamp(`📝 Composite meme text - Top: "${topText}", Bottom: "${bottomText}"`);
        
        // Start with our working HTML template and strip it down
        // This ensures perfect consistency with what users see
        const strippedHTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=1024, height=1024">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            width: 1024px;
            height: 1024px;
            margin: 0;
            padding: 0;
            position: relative;
            overflow: hidden;
            font-family: Impact, "Arial Black", sans-serif;
            background: white;
        }
        
        .meme-image-wrapper {
            position: relative;
            width: 100%;
            height: 100%;
        }
        
        .meme-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }
        
        .meme-text {
            position: absolute;
            width: 100%;
            text-align: center;
            color: white;
            font-family: Impact, "Arial Black", sans-serif;
            font-weight: 900;
            font-size: 96px;
            line-height: 1;
            padding: 0 20px;
            text-transform: lowercase;
            letter-spacing: -3px;
            -webkit-text-stroke: 3px black;
            text-stroke: 3px black;
            text-shadow: 
                5px 5px 0 black,
                -5px 5px 0 black,
                5px -5px 0 black,
                -5px -5px 0 black,
                4px 4px 0 black,
                -4px 4px 0 black,
                4px -4px 0 black,
                -4px -4px 0 black,
                3px 3px 0 black,
                -3px 3px 0 black,
                3px -3px 0 black,
                -3px -3px 0 black,
                2px 2px 0 black,
                -2px 2px 0 black,
                2px -2px 0 black,
                -2px -2px 0 black,
                1px 1px 0 black,
                -1px 1px 0 black,
                1px -1px 0 black,
                -1px -1px 0 black,
                0 0 10px black,
                0 0 20px black;
            z-index: 10;
        }
        
        .top-text {
            top: 20px;
        }
        
        .bottom-text {
            bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="meme-image-wrapper">
        <img src="${backgroundImageUrl}" alt="Meme background" class="meme-image">
        <div class="meme-text top-text">${topText}</div>
        <div class="meme-text bottom-text">${bottomText}</div>
    </div>
</body>
</html>`;

        // Create authorization header
        const auth = Buffer.from(`${HTMLCSS_USER_ID}:${HTMLCSS_API_KEY}`).toString('base64');
        
        // Log the HTML we're sending
        logWithTimestamp(`📋 Sending stripped HTML to HTMLCSStoImage API (${strippedHTML.length} chars)`);
        
        // Call HTMLCSStoImage API
        const response = await fetch('https://hcti.io/v1/image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
            },
            body: JSON.stringify({
                html: strippedHTML,
                viewport_width: 1024,
                viewport_height: 1024,
                device_scale_factor: 1
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            logError(`HTMLCSStoImage API error: ${response.status} - ${errorText}`);
            return backgroundImageUrl; // Fallback to original image
        }

        const data = await response.json();
        logSuccess(`✅ Generated composite meme image: ${data.url}`);
        
        // Download the image and upload to Supabase Storage for reliable OpenGraph access
        try {
            const imageBuffer = await downloadImageFromURL(data.url);
            const fileName = `meme-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`;
            const supabaseUrl = await uploadToSupabaseStorage(imageBuffer, fileName);
            
            logSuccess(`🎯 Meme image uploaded to Supabase Storage for OpenGraph: ${supabaseUrl}`);
            return supabaseUrl;
        } catch (uploadError) {
            logWarning(`⚠️ Failed to upload to Supabase Storage, using HTMLCSStoImage URL: ${uploadError}`);
            return data.url; // Fallback to original URL
        }

    } catch (error) {
        logError(`Failed to generate composite meme image: ${error instanceof Error ? error.message : String(error)}`);
        return backgroundImageUrl; // Fallback to original image
    }
}

/**
 * Generate HTML page for the meme
 */
function generateMemeHTML(memeContent: MemeContent, imageUrl: string, userSlug: string, publicUrl?: string): string {
    const { topText, bottomText, theme } = memeContent;
    
    // Use the actual meme image URL for OpenGraph (it's already uploaded to Supabase Storage)
    const ogImageUrl = imageUrl;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${topText} ${bottomText} – WEBTOYS Meme Magic</title>
    <meta property="og:title" content="${topText} ${bottomText}" />
    <meta property="og:description" content="Made with WEBTOYS — AI nonsense, human approved" />
    <meta property="og:image" content="${ogImageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="https://wtaf.me/${userSlug}/meme-${topText.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${bottomText.toLowerCase().replace(/[^a-z0-9]/g, '-')}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${topText} ${bottomText}" />
    <meta name="twitter:description" content="WTAF Meme: ${topText} ${bottomText}" />
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        :root {
            --cream: #FEFEF5;
            --yellow: #FFD63D;
            --blue: #6ECBFF;
            --red: #FF4B4B;
            --green-mint: #B6FFB3;
            --purple-shadow: #C9C2F9;
            --blue-deep: #4A9FD4;
            --charcoal: #2A2A2A;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--cream);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
            position: relative;
            overflow-x: hidden;
        }
        
        .meme-container {
            position: relative;
            width: 100%;
            max-width: 800px;
            background: white;
            border: 6px solid var(--yellow);
            border-radius: 2rem;
            padding: 2.5rem;
            box-shadow: 0 12px 0 var(--purple-shadow);
            transition: transform 0.3s ease;
            transform: rotate(-1deg);
        }
        
        .meme-container:hover {
            transform: rotate(-1deg) translateY(-5px);
            box-shadow: 0 16px 0 var(--purple-shadow);
        }
        
        .meme-image-wrapper {
            position: relative;
            width: 100%;
            margin-bottom: 2rem;
        }
        
        .meme-image {
            width: 100%;
            height: auto;
            min-height: 400px;
            max-height: 70vh;
            object-fit: contain;
            border-radius: 1.2rem;
            border: 4px solid var(--charcoal);
            background: white;
            box-shadow: inset 0 0 0 2px var(--yellow);
        }
        
        .action-buttons {
            display: flex;
            gap: 20px;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .action-btn {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 1rem 2.5rem;
            background: white;
            color: var(--charcoal);
            border: 4px solid var(--charcoal);
            border-radius: 2rem;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            font-weight: 700;
            font-size: 1rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 6px 0 var(--charcoal);
            text-decoration: none;
            transform: rotate(-1deg);
        }
        
        .action-btn:hover:not(:disabled) {
            transform: rotate(-1deg) translateY(-3px);
            box-shadow: 0 8px 0 var(--charcoal);
        }
        
        .action-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        .copy-url-btn {
            background: var(--blue);
            border-color: var(--blue-deep);
            box-shadow: 0 6px 0 var(--blue-deep);
        }
        
        .copy-url-btn:hover {
            box-shadow: 0 8px 0 var(--blue-deep);
        }
        
        .download-btn {
            background: var(--red);
            border-color: var(--charcoal);
            color: white;
        }
        
        .btn-icon {
            font-size: 1.3rem;
        }
        
        .btn-text {
            font-weight: 700;
        }
        
        .copied-notification {
            position: fixed;
            top: 30px;
            right: 30px;
            background: var(--green-mint);
            color: var(--charcoal);
            padding: 1rem 1.5rem;
            border: 3px solid var(--charcoal);
            border-radius: 2rem;
            font-weight: 700;
            font-size: 0.9rem;
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 6px 0 var(--charcoal),
                0 0 20px rgba(255, 0, 255, 0.2);
            animation: slideInFade 2s ease-out;
            text-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
        }

        .copied-checkmark {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 50%;
            width: 25px;
            height: 25px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.9rem;
            color: #000000;
        }

        @keyframes slideInFade {
            0% {
                transform: translateX(100px);
                opacity: 0;
            }
            20% {
                transform: translateX(0);
                opacity: 1;
            }
            80% {
                transform: translateX(0);
                opacity: 1;
            }
            100% {
                transform: translateX(100px);
                opacity: 0;
            }
        }
        
        /* Floating emojis */
        .floating-emoji {
            position: fixed;
            font-size: 2rem;
            opacity: 0.8;
            pointer-events: none;
            z-index: 1;
            animation: float 3s ease-in-out infinite;
            transition: transform 0.3s ease;
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
        }
        
        /* Call-to-Text Banner */
        .cta-text-banner {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--blue);
            color: white;
            padding: 1rem 1.5rem;
            border: 3px solid var(--charcoal);
            border-radius: 2rem;
            box-shadow: 0 6px 0 var(--charcoal);
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-weight: 700;
            font-size: 0.9rem;
            z-index: 1000;
            animation: slideIn 0.5s ease-out;
            transform: rotate(-2deg);
        }
        
        .emoji-bounce {
            animation: bounce 2s ease-in-out infinite;
        }
        
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
        }
        
        @keyframes slideIn {
            from { transform: translateX(100%) rotate(-2deg); }
            to { transform: translateX(0) rotate(-2deg); }
        }
        
        /* Prompt Display */
        .prompt-display {
            position: fixed;
            bottom: 10px;
            left: 10px;
            font-size: 0.75rem;
            opacity: 0.5;
            color: var(--charcoal);
            transition: opacity 0.3s ease;
        }
        
        .prompt-display:hover {
            opacity: 0.8;
        }
        
        @media (max-width: 768px) {
            .meme-container {
                margin: 10px;
                padding: 20px;
                max-width: 100%;
            }
            
            .meme-image {
                min-height: 400px;
                max-height: 70vh;
            }
            
            .action-buttons {
                gap: 15px;
                flex-direction: column;
            }
            
            .action-btn {
                padding: 15px 25px;
                font-size: 1rem;
                width: 100%;
                justify-content: center;
            }
            
            .copied-notification {
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                font-size: 0.9rem;
            }
        }
        
        @media (max-width: 480px) {
            .meme-container {
                padding: 15px;
            }
            
            .meme-image {
                min-height: 350px;
            }
            
            .action-btn {
                padding: 12px 20px;
                font-size: 0.9rem;
            }
            
            .btn-icon {
                font-size: 1.1rem;
            }
        }
    </style>
</head>
<body>
    <!-- Hidden canvas for image processing -->
    <canvas id="imageCanvas" style="display: none;"></canvas>

    <!-- Copied Notification -->
    <div id="copiedNotification" class="copied-notification" style="display: none;">
        <span id="copiedText" class="copied-text"></span>
        <span class="copied-checkmark">✓</span>
    </div>

    <!-- Floating emojis -->
    <div class="floating-emoji" data-speed="2" style="top: 10%; left: 10%;">🎯</div>
    <div class="floating-emoji" data-speed="3" style="top: 20%; right: 15%;">✨</div>
    <div class="floating-emoji" data-speed="1.5" style="top: 70%; left: 5%;">🎨</div>
    <div class="floating-emoji" data-speed="2.5" style="bottom: 20%; right: 10%;">🚀</div>
    
    <div class="meme-container">
        <div class="meme-image-wrapper">
            <img src="${imageUrl}" alt="${theme}" class="meme-image" id="memeImage">
        </div>
        
        <div class="action-buttons">
            <button class="action-btn copy-url-btn" onclick="handleCopyUrl()">
                <span class="btn-icon">🔗</span>
                <span class="btn-text">COPY URL</span>
            </button>
            <button class="action-btn download-btn" onclick="handleDownload()" id="downloadBtn">
                <span class="btn-icon" id="downloadIcon">💾</span>
                <span class="btn-text" id="downloadText">SAVE TO DEVICE</span>
            </button>
        </div>
    </div>
    
    <!-- Call-to-Text Banner -->
    <div class="cta-text-banner">
        <span class="emoji-bounce">📱</span>
        <span>Text START to +1-866-330-0015 — your brain in meme form</span>
    </div>
    
    <!-- Prompt Display -->
    <div class="prompt-display">
        <small>Generated from: "${topText} ${bottomText}"</small>
    </div>
    
    <script>
        // Inject the actual meme URL
        window.MEME_URL = ${publicUrl ? `"${publicUrl}"` : 'null'};
        
        let isDownloading = false;
        
        // Mouse parallax for floating elements
        document.addEventListener('mousemove', (e) => {
            const elements = document.querySelectorAll('.floating-emoji');
            const { clientX, clientY } = e;
            
            elements.forEach((element) => {
                const speed = element.getAttribute('data-speed') || 2;
                const x = (window.innerWidth - clientX * speed) / 100;
                const y = (window.innerHeight - clientY * speed) / 100;
                
                element.style.transform = \`translateX(\${x}px) translateY(\${y}px)\`;
            });
        });
        
        // Easter egg: Click meme 5 times
        let memeClicks = 0;
        const memeContainer = document.querySelector('.meme-image-wrapper');
        memeContainer.addEventListener('click', () => {
            memeClicks++;
            if (memeClicks === 5) {
                alert('🎉 You found the meme secret! Here\\'s a virtual high-five!');
                document.body.style.animation = 'rainbow 2s ease-in-out';
                memeClicks = 0;
            }
        });
        
        // Console easter egg
        console.log('%c🎉 Hey there, meme explorer!', 
            'font-size: 24px; color: #FF4B4B; font-weight: bold;');
        console.log('%cYou found our secret developer hangout. ' + 
            'While you\\'re here, why not make more memes at webtoys.com?', 
            'font-size: 14px; color: #6ECBFF;');

        // Handle image loading errors
        document.addEventListener('DOMContentLoaded', function() {
            const memeImage = document.getElementById('memeImage');
            
            memeImage.addEventListener('error', function() {
                console.log('Image failed to load, using fallback background');
                // Hide the broken image and show background gradient
                memeImage.style.display = 'none';
                document.querySelector('.meme-image-wrapper').style.background = 'linear-gradient(135deg, #2c3e50 0%, #34495e 50%, #2c3e50 100%)';
                document.querySelector('.meme-image-wrapper').style.minHeight = '500px';
                document.querySelector('.meme-image-wrapper').style.borderRadius = '15px';
                document.querySelector('.meme-image-wrapper').style.border = '2px solid rgba(255, 255, 255, 0.3)';
            });
            
            memeImage.addEventListener('load', function() {
                console.log('Image loaded successfully');
            });
        });

        function showCopiedNotification(text) {
            const notification = document.getElementById('copiedNotification');
            const textElement = document.getElementById('copiedText');
            textElement.textContent = text;
            notification.style.display = 'flex';
            setTimeout(() => {
                notification.style.display = 'none';
            }, 2000);
        }

        async function copyToClipboard(text) {
            try {
                // Try modern clipboard API first
                if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(text);
                    return true;
                } else {
                    // Fallback for older browsers or non-secure contexts
                    return fallbackCopyToClipboard(text);
                }
            } catch (err) {
                console.error('Clipboard API failed: ', err);
                // Try fallback method
                return fallbackCopyToClipboard(text);
            }
        }

        function fallbackCopyToClipboard(text) {
            try {
                // Create a temporary textarea element
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                
                // Select and copy the text
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                
                // Clean up
                document.body.removeChild(textArea);
                
                return successful;
            } catch (err) {
                console.error('Fallback copy failed: ', err);
                return false;
            }
        }

        async function handleCopyUrl() {
            // Use the injected URL if available, otherwise fallback to window.location.href
            const memeUrl = window.MEME_URL || window.location.href;
            const success = await copyToClipboard(memeUrl);
            
            if (success) {
                showCopiedNotification('Meme URL copied!');
            } else {
                showCopiedNotification('Copy failed. Please copy URL manually.');
                // Also log the URL to console as backup
                console.log('Meme URL:', memeUrl);
            }
        }

        async function handleDownload() {
            if (isDownloading) return;
            
            isDownloading = true;
            const downloadBtn = document.getElementById('downloadBtn');
            const downloadIcon = document.getElementById('downloadIcon');
            const downloadText = document.getElementById('downloadText');
            
            downloadBtn.disabled = true;
            downloadIcon.textContent = '⏳';
            downloadText.textContent = 'SAVING...';

            try {
                const canvas = document.getElementById('imageCanvas');
                const ctx = canvas.getContext('2d');
                const img = document.querySelector('.meme-image');

                const tempImg = new Image();
                // Remove crossorigin for better compatibility
                // tempImg.crossOrigin = 'anonymous';

                tempImg.onload = async () => {
                    canvas.width = tempImg.width;
                    canvas.height = tempImg.height;
                    ctx.drawImage(tempImg, 0, 0);

                    canvas.toBlob(
                        async (blob) => {
                            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

                            if (isMobile) {
                                // Try Web Share API first for mobile
                                if (navigator.share && navigator.canShare) {
                                    try {
                                        const file = new File([blob], 'wtaf-meme.png', {
                                            type: 'image/png',
                                            lastModified: Date.now(),
                                        });

                                        if (navigator.canShare({ files: [file] })) {
                                            await navigator.share({
                                                title: 'WTAF Meme: ${topText} ${bottomText}',
                                                text: 'Check out this meme from WTAF!',
                                                files: [file],
                                            });
                                            showCopiedNotification('Shared! Choose Save to Photos to add to camera roll');
                                            resetDownloadButton();
                                            return;
                                        }
                                    } catch (shareError) {
                                        console.log('Web Share API failed, trying download');
                                    }
                                }

                                // Fallback to download
                                fallbackDownload(blob);
                                
                                if (isIOS) {
                                    showCopiedNotification('Downloaded! Tap and hold the image in Downloads, then Save to Photos');
                                } else {
                                    showCopiedNotification('Downloaded! Check your Downloads folder or Gallery');
                                }
                            } else {
                                // Desktop download
                                fallbackDownload(blob);
                                showCopiedNotification('Downloaded to device!');
                            }

                            resetDownloadButton();
                        },
                        'image/png',
                        1.0
                    );
                };

                tempImg.onerror = () => {
                    console.error('Failed to load image');
                    const link = document.createElement('a');
                    link.href = img.src;
                    link.download = 'wtaf-meme.png';
                    link.click();
                    showCopiedNotification('Download started');
                    resetDownloadButton();
                };

                tempImg.src = img.src;
            } catch (error) {
                console.error('Download failed:', error);
                showCopiedNotification('Download failed. Try again.');
                resetDownloadButton();
            }
        }

        function fallbackDownload(blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'wtaf-meme.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }

        function resetDownloadButton() {
            isDownloading = false;
            const downloadBtn = document.getElementById('downloadBtn');
            const downloadIcon = document.getElementById('downloadIcon');
            const downloadText = document.getElementById('downloadText');
            
            downloadBtn.disabled = false;
            downloadIcon.textContent = '📱';
            downloadText.textContent = 'SAVE TO DEVICE';
        }

        // Add some interactive sparkle effects
        document.addEventListener('mousemove', function(e) {
            const sparkle = document.createElement('div');
            sparkle.innerHTML = '✨';
            sparkle.style.position = 'fixed';
            sparkle.style.left = e.clientX + 'px';
            sparkle.style.top = e.clientY + 'px';
            sparkle.style.pointerEvents = 'none';
            sparkle.style.fontSize = '12px';
            sparkle.style.zIndex = '9999';
            sparkle.style.animation = 'sparkle 1s ease-out forwards';
            document.body.appendChild(sparkle);
            
            setTimeout(() => sparkle.remove(), 1000);
        });
        
        // Add sparkle animation
        const style = document.createElement('style');
        style.textContent = \`
            @keyframes sparkle {
                0% { opacity: 1; transform: scale(1) rotate(0deg); }
                100% { opacity: 0; transform: scale(1.5) rotate(180deg); }
            }
            
            @keyframes rainbow {
                0% { filter: hue-rotate(0deg); }
                100% { filter: hue-rotate(360deg); }
            }
        \`;
        document.head.appendChild(style);
    </script>
</body>
</html>`;
}

/**
 * Process meme remix - wrapper for remix functionality
 */
export async function processMemeRemix(userIdea: string, userSlug: string): Promise<MemeResult> {
    // Load default meme configuration for remixes
    const memeConfigPath = join(__dirname, '..', 'content', 'meme-config.json');
    const memeConfigContent = await readFile(memeConfigPath, 'utf8');
    const memeConfig = JSON.parse(memeConfigContent);
    
    const config = {
        model: memeConfig.meme_generation.content_model,
        maxTokens: memeConfig.meme_generation.content_max_tokens,
        temperature: memeConfig.meme_generation.content_temperature
    };
    
    return processMemeRequest(userIdea, userSlug, config);
}

/**
 * Main meme processing function
 */
export async function processMemeRequest(userIdea: string, userSlug: string, config: MemeConfig): Promise<MemeResult> {
    try {
        logWithTimestamp("=" + "=".repeat(79));
        logWithTimestamp("🎨 MEME PROCESSOR: Starting meme generation...");
        logWithTimestamp(`📥 User idea: ${userIdea}`);
        logWithTimestamp(`👤 User slug: ${userSlug}`);
        logWithTimestamp("=" + "=".repeat(79));

        // Step 1: Generate meme content (text + theme)
        const memeContent = await generateMemeContent(userIdea, config);
        if (!memeContent) {
            return { success: false, error: "Failed to generate meme content" };
        }

        // Step 2: Generate meme image
        const imageUrl = await generateMemeImage(memeContent.imagePrompt);
        if (!imageUrl) {
            return { success: false, error: "Failed to generate meme image" };
        }

        // Step 3: Generate composite meme image with text baked in
        const compositeImageUrl = await generateCompositeMemeImage(imageUrl, memeContent);
        if (!compositeImageUrl) {
            return { success: false, error: "Failed to generate composite meme image" };
        }

        // Step 4: Generate HTML page (compositeImageUrl has text baked in)
        const html = generateMemeHTML(memeContent, compositeImageUrl, userSlug, compositeImageUrl);
        
        logSuccess("🎉 Meme generation complete!");
        logWithTimestamp(`🖼️ Image URL: ${compositeImageUrl}`);
        logWithTimestamp(`📄 HTML generated (${html.length} characters)`);
        logWithTimestamp("=" + "=".repeat(79));

        return {
            success: true,
            html,
            imageUrl: compositeImageUrl,
            memeContent
        };

    } catch (error) {
        logError(`Meme processing failed: ${error instanceof Error ? error.message : String(error)}`);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : String(error) 
        };
    }
} 