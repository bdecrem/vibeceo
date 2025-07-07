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
import { OPENAI_API_KEY } from './shared/config.js';
import { logWithTimestamp, logError, logSuccess, logWarning } from './shared/logger.js';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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
            max-width: 900px;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(15px);
            border: 2px solid rgba(255, 0, 128, 0.3);
            border-radius: 25px;
            padding: 30px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.4);
            overflow: hidden;
            transition: transform 0.3s ease;
        }
        
        .meme-container:hover {
            transform: scale(1.02);
        }
        
        .meme-image-wrapper {
            position: relative;
            width: 100%;
            margin-bottom: 30px;
        }
        
        .meme-image {
            width: 100%;
            height: auto;
            min-height: 500px;
            max-height: 80vh;
            object-fit: cover;
            border-radius: 15px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            position: relative;
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 50%, #2c3e50 100%);
        }
        
        .meme-text {
            position: absolute;
            width: 100%;
            text-align: center;
            color: white;
            font-weight: 900;
            text-shadow: 3px 3px 0px black, -3px -3px 0px black, 3px -3px 0px black, -3px 3px 0px black;
            font-size: clamp(28px, 6vw, 48px);
            line-height: 1.1;
            padding: 0 20px;
            letter-spacing: 1px;
        }
        
        .top-text {
            top: 25px;
        }
        
        .bottom-text {
            bottom: 25px;
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
            gap: 12px;
            padding: 18px 35px;
            background: linear-gradient(45deg, #ff00ff, #00ffff);
            color: #000000;
            border: none;
            border-radius: 50px;
            font-family: 'Arial Black', Arial, sans-serif;
            font-weight: 700;
            font-size: 1.1rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow:
                0 8px 25px rgba(255, 0, 255, 0.3),
                0 0 20px rgba(255, 0, 255, 0.2);
            text-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
            text-decoration: none;
        }
        
        .action-btn:hover:not(:disabled) {
            transform: translateY(-3px) scale(1.05);
            box-shadow:
                0 15px 35px rgba(255, 0, 255, 0.4),
                0 0 30px rgba(255, 0, 255, 0.3);
        }
        
        .action-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        .copy-url-btn {
            background: linear-gradient(45deg, #00ffff, #0080ff);
        }
        
        .download-btn {
            background: linear-gradient(45deg, #ff00ff, #ff0080);
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
            background: linear-gradient(45deg, #ff00ff, #00ffff);
            color: #000000;
            padding: 15px 25px;
            border-radius: 50px;
            font-family: 'Arial Black', Arial, sans-serif;
            font-weight: 700;
            font-size: 1rem;
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 
                0 8px 25px rgba(255, 0, 255, 0.3),
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
                padding: 20px;
                max-width: 100%;
            }
            
            .meme-image {
                min-height: 400px;
                max-height: 70vh;
            }
            
            .meme-text {
                font-size: clamp(22px, 5vw, 32px);
                padding: 0 15px;
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
            
            .meme-text {
                font-size: clamp(18px, 4vw, 28px);
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

    <div class="floating-emoji emoji-1">😂</div>
    <div class="floating-emoji emoji-2">🔥</div>
    <div class="floating-emoji emoji-3">💻</div>
    <div class="floating-emoji emoji-4">🎨</div>
    
    <div class="meme-container">
        <div class="meme-image-wrapper">
            <img src="${imageUrl}" alt="${theme}" class="meme-image" id="memeImage">
            <div class="meme-text top-text">${topText}</div>
            <div class="meme-text bottom-text">${bottomText}</div>
        </div>
        
        <div class="action-buttons">
            <button class="action-btn copy-url-btn" onclick="handleCopyUrl()">
                <span class="btn-icon">🔗</span>
                <span class="btn-text">COPY URL</span>
            </button>
            <button class="action-btn download-btn" onclick="handleDownload()" id="downloadBtn">
                <span class="btn-icon" id="downloadIcon">📱</span>
                <span class="btn-text" id="downloadText">SAVE TO DEVICE</span>
            </button>
        </div>
    </div>
    
    <script>
        let isDownloading = false;

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
                await navigator.clipboard.writeText(text);
                return true;
            } catch (err) {
                console.error('Failed to copy text: ', err);
                return false;
            }
        }

        async function handleCopyUrl() {
            const memeUrl = window.location.href;
            const success = await copyToClipboard(memeUrl);
            if (success) {
                showCopiedNotification('Meme URL copied!');
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