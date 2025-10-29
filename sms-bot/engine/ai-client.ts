import { OpenAI } from 'openai';
import { OPENAI_API_KEY, ANTHROPIC_API_KEY } from './shared/config.js';
import { logWithTimestamp, logError, logSuccess, logWarning } from './shared/logger.js';

// Lazy initialization of OpenAI client
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

// Type definitions
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

/**
 * Load prompt from JSON file
 * Extracted from monitor.py load_prompt_json function
 */
export async function loadPromptJson(filename: string): Promise<ChatCompletionMessageParam | null> {
    try {
        const { readFile } = await import('fs/promises');
        const { join, dirname } = await import('path');
        const { fileURLToPath } = await import('url');
        
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        // When compiled, this runs from dist/engine/, so we need to go up 2 levels to reach sms-bot/
        const promptPath = join(__dirname, '..', '..', 'prompts', filename);
        
        const content = await readFile(promptPath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        logWarning(`Error loading prompt ${filename}: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/**
 * Generate complete prompt for Claude (Prompt 1)
 * Extracted from monitor.py generate_prompt_2 function
 */
export async function generateCompletePrompt(userInput: string): Promise<string> {
    logWithTimestamp("=" + "=".repeat(79));
    logWithTimestamp("🎯 PROMPT 1: Creating complete prompt for Claude...");
    logWithTimestamp(`📥 ORIGINAL INPUT: ${userInput}`);
    logWithTimestamp("-" + "-".repeat(79));
    
    // Parse coach from user prompt before sending to Claude (WTAF syntax: "wtaf -coach- request")
    const coachMatch = userInput.match(/wtaf\s+-([a-z]+)-\s+(.+)/i);
    let coach = null;
    let cleanedInput = userInput;
    
    if (coachMatch) {
        coach = coachMatch[1].toLowerCase();
        cleanedInput = `wtaf ${coachMatch[2]}`; // Keep "wtaf" but remove coach
        logWithTimestamp(`🎭 Extracted coach: ${coach}`);
        logWithTimestamp(`🧹 Cleaned input: ${cleanedInput}`);
    }
    
    // Load Prompt 1 from JSON file
    const prompt1Data = await loadPromptJson("prompt1-creative-brief.json");
    if (!prompt1Data) {
        logWarning("Failed to load Prompt 1, using fallback");
        return userInput;
    }
    
    // Prepare user message with coach information
    let userMessage = cleanedInput;
    if (coach) {
        userMessage += `\n\nCOACH_HANDLE: ${coach}`;
    }
    
    const messages: ChatCompletionMessageParam[] = [
        prompt1Data,
        { role: "user", content: userMessage } as ChatCompletionMessageParam
    ];
    
    try {
        const response = await getOpenAIClient().chat.completions.create({
            model: "gpt-4o",
            messages: messages,
            temperature: 0.7,
            max_tokens: 1000
        });
        
        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error("No content in GPT response");
        }
        const completePrompt = content.trim();
        logWithTimestamp(`📤 COMPLETE PROMPT: ${completePrompt.slice(0, 200)}...`);
        logSuccess("Prompt 1 complete!");
        logWithTimestamp("=" + "=".repeat(79));
        
        return completePrompt;
            
    } catch (error) {
        logWarning(`Error generating prompt, using original: ${error instanceof Error ? error.message : String(error)}`);
        logWithTimestamp("=" + "=".repeat(79));
        return userInput; // Fallback to original if generation fails
    }
}

/**
 * Call Claude API with fallback models
 * Extracted from monitor.py Claude API call logic
 */
export async function callClaude(systemPrompt: string, userPrompt: string, maxTokens: number = 8192): Promise<string> {
    const model = "claude-sonnet-4-5-20250929";
    const fallbackModel = "claude-haiku-4-5-20251001";

    logWithTimestamp(`🧠 Using Claude Sonnet 4.5 with ${maxTokens} tokens...`);
    
    try {
        if (!ANTHROPIC_API_KEY) {
            throw new Error("ANTHROPIC_API_KEY not found in environment");
        }
        
        const headers: Record<string, string> = {
            "x-api-key": ANTHROPIC_API_KEY!,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01"
        };
        
        const payload = {
            model: model,
            max_tokens: maxTokens,
            temperature: 0.7,
            system: systemPrompt,
            messages: [
                {
                    role: "user",
                    content: userPrompt
                }
            ]
        };
        
        logWithTimestamp(`🔍 Sending ${model} request with token limit: ${maxTokens}`);
        logWithTimestamp("🤖 Executing PROMPT 2 with complete prompt...");
        logWithTimestamp(`🔧 DEBUG: Complete prompt being sent to Claude: ${userPrompt.slice(-300)}`); // Last 300 chars
        
        // Make the API call
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });
        
        const responseJson = await response.json();
        logWithTimestamp(`📊 Claude response received - status code: ${response.status}`);
        
        // Debug response structure
        logWithTimestamp(`📋 Claude response keys: ${Object.keys(responseJson)}`);
        
        // Extract the result
        if (responseJson.content && responseJson.content.length > 0) {
            const result = responseJson.content[0].text;
            logSuccess(`${model} response received, length: ${result.length} chars`);
            return result;
        } else {
            logWarning(`Unexpected Claude API response structure: ${JSON.stringify(responseJson)}`);
            throw new Error("Invalid Claude response structure");
        }
        
    } catch (error) {
        logWarning(`Claude ${model} error, trying fallback: ${error instanceof Error ? error.message : String(error)}`);
        
        // Try Claude fallback model first
        try {
            logWithTimestamp(`🔄 Trying Claude fallback: ${fallbackModel}`);

            // Adjust max tokens for fallback model if needed
            let fallbackMaxTokens = maxTokens;
            if (fallbackModel === "claude-haiku-4-5-20251001") {
                fallbackMaxTokens = Math.min(maxTokens, 4000);
            }
            
            const payload = {
                model: fallbackModel,
                max_tokens: fallbackMaxTokens,
                temperature: 0.7,
                system: systemPrompt,
                messages: [
                    {
                        role: "user",
                        content: userPrompt
                    }
                ]
            };
            
            const response = await fetch("https://api.anthropic.com/v1/messages", {
                method: 'POST',
                headers: {
                    "x-api-key": ANTHROPIC_API_KEY!,
                    "Content-Type": "application/json",
                    "anthropic-version": "2023-06-01"
                } as Record<string, string>,
                body: JSON.stringify(payload)
            });
            
            const responseJson = await response.json();
            logWithTimestamp(`📊 Claude fallback response - status: ${response.status}`);
            
            if (responseJson.content && responseJson.content.length > 0) {
                const result = responseJson.content[0].text;
                logSuccess(`${fallbackModel} response received, length: ${result.length} chars`);
                return result;
            } else {
                throw new Error("Invalid Claude fallback response structure");
            }
                
        } catch (fallbackError) {
            logWarning(`Claude fallback also failed, using GPT-4o: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
            
            // Final fallback to GPT-4o
            try {
                // GPT-4o max tokens is 16,384, adjust if needed
                const gptMaxTokens = Math.min(maxTokens, 16000); // Use 16K to be safe
                logWithTimestamp(`🧠 Falling back to GPT-4o with ${gptMaxTokens} tokens...`);
                
                const response = await getOpenAIClient().chat.completions.create({
                    model: "gpt-4o",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ],
                    temperature: 0.8,
                    max_tokens: gptMaxTokens
                });
                
                const result = response.choices[0].message.content;
                if (!result) {
                    throw new Error("No content in GPT-4o response");
                }
                logSuccess(`GPT-4o response received, length: ${result.length} chars`);
                return result;
                
            } catch (gptError) {
                logError(`All models failed - GPT error: ${gptError instanceof Error ? gptError.message : String(gptError)}`);
                throw new Error(`All AI models failed: ${gptError instanceof Error ? gptError.message : String(gptError)}`);
            }
        }
    }
} 