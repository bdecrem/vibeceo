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
import { OPENAI_API_KEY } from './shared/config.js';
import { logWithTimestamp, logError, logSuccess, logWarning } from './shared/logger.js';

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

        const response = await getOpenAIClient().chat.completions.create({
            model: config.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Generate meme content for: ${userIdea}` }
            ],
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
        
        const response = await getOpenAIClient().images.generate({
            model: "dall-e-3",
            prompt: imagePrompt,
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
 * Generate HTML page for the meme
 */
function generateMemeHTML(memeContent: MemeContent, imageUrl: string, userSlug: string): string {
    const { topText, bottomText, theme } = memeContent;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${topText} ${bottomText} - WTAF Meme</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial Black', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .meme-container {
            position: relative;
            width: 100%;
            max-width: 600px;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            overflow: hidden;
            transition: transform 0.3s ease;
        }
        
        .meme-container:hover {
            transform: scale(1.02);
        }
        
        .meme-image {
            width: 100%;
            height: 400px;
            object-fit: cover;
            position: relative;
        }
        
        .meme-text {
            position: absolute;
            width: 100%;
            text-align: center;
            color: white;
            font-weight: 900;
            text-shadow: 3px 3px 0px black, -3px -3px 0px black, 3px -3px 0px black, -3px 3px 0px black;
            font-size: clamp(24px, 5vw, 36px);
            line-height: 1.1;
            padding: 0 20px;
            letter-spacing: 1px;
        }
        
        .top-text {
            top: 20px;
        }
        
        .bottom-text {
            bottom: 20px;
        }
        
        .meme-info {
            padding: 30px;
            text-align: center;
            background: white;
        }
        
        .meme-title {
            font-size: 24px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
        }
        
        .meme-creator {
            color: #666;
            font-size: 16px;
            margin-bottom: 20px;
        }
        
        .wtaf-branding {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 2px solid #eee;
            color: #999;
            font-size: 14px;
        }
        
        .wtaf-branding a {
            color: #667eea;
            text-decoration: none;
            font-weight: bold;
        }
        
        .floating-emoji {
            position: fixed;
            font-size: 30px;
            pointer-events: none;
            animation: float 6s ease-in-out infinite;
            z-index: 1000;
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(5deg); }
        }
        
        .emoji-1 { top: 10%; left: 10%; animation-delay: 0s; }
        .emoji-2 { top: 20%; right: 15%; animation-delay: 1s; }
        .emoji-3 { bottom: 20%; left: 20%; animation-delay: 2s; }
        .emoji-4 { bottom: 30%; right: 10%; animation-delay: 3s; }
        
        @media (max-width: 768px) {
            .meme-container {
                margin: 10px;
            }
            
            .meme-text {
                font-size: clamp(20px, 4vw, 28px);
                padding: 0 15px;
            }
            
            .meme-info {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="floating-emoji emoji-1">😂</div>
    <div class="floating-emoji emoji-2">🔥</div>
    <div class="floating-emoji emoji-3">💻</div>
    <div class="floating-emoji emoji-4">🎨</div>
    
    <div class="meme-container">
        <div style="position: relative;">
            <img src="${imageUrl}" alt="${theme}" class="meme-image">
            <div class="meme-text top-text">${topText}</div>
            <div class="meme-text bottom-text">${bottomText}</div>
        </div>
        
        <div class="meme-info">
            <div class="meme-title">${topText} ${bottomText}</div>
            <div class="meme-creator">Created by ${userSlug}</div>
            
            <div class="wtaf-branding">
                Generated with <a href="https://wtaf.me" target="_blank">WTAF</a> - The AI-powered meme generator
                <br>Text START to +1-866-330-0015 to make your own memes!
            </div>
        </div>
    </div>
    
    <script>
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
        \`;
        document.head.appendChild(style);
    </script>
</body>
</html>`;
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

        // Step 3: Generate HTML page
        const html = generateMemeHTML(memeContent, imageUrl, userSlug);
        
        logSuccess("🎉 Meme generation complete!");
        logWithTimestamp(`🖼️ Image URL: ${imageUrl}`);
        logWithTimestamp(`📄 HTML generated (${html.length} characters)`);
        logWithTimestamp("=" + "=".repeat(79));

        return {
            success: true,
            html,
            imageUrl,
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