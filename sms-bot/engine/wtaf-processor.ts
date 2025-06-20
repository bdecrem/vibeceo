/**
 * NEW WTAF PROCESSOR - MICROSERVICE ARCHITECTURE
 * 
 * This replaces the old ai-client.ts 2-step prompt mess with a clean, smart system.
 * 
 * MICROSERVICE RESPONSIBILITIES:
 * - Smart routing (game vs app detection)
 * - Coach extraction and injection
 * - Intelligent prompt orchestration  
 * - HTML generation with proper fallbacks
 * 
 * INTERFACES WITH OTHER MICROSERVICES:
 * - Uses shared/config.ts for API keys and settings
 * - Uses shared/logger.ts for consistent logging
 * - Uses shared/utils.ts for code extraction and detection
 * - Returns HTML ready for storage-manager.ts to save
 * - Provides same interface as old ai-client.ts for drop-in replacement
 */

import { OpenAI } from 'openai';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { OPENAI_API_KEY, ANTHROPIC_API_KEY } from './shared/config.js';
import { logWithTimestamp, logError, logSuccess, logWarning } from './shared/logger.js';
import { detectRequestType as utilsDetectRequestType } from './shared/utils.js';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize OpenAI client with lazy loading (same pattern as ai-client.ts)
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

/**
 * Load prompt from JSON file
 * Same utility function from ai-client.ts for consistent prompt loading
 */
async function loadPrompt(filename: string): Promise<ChatCompletionMessageParam | null> {
    try {
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
 * Load coach personality from coaches/ folder
 * Returns the personality injection text for the given coach
 */
async function loadCoachPersonality(coachHandle: string): Promise<string | null> {
    try {
        const coachPath = join(__dirname, '..', '..', 'prompts', 'coaches', `${coachHandle}.json`);
        const content = await readFile(coachPath, 'utf8');
        const coachData = JSON.parse(content);
        return coachData.personality || null;
    } catch (error) {
        logWarning(`Error loading coach personality for ${coachHandle}: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/**
 * Inject coach personality into a prompt
 * Modifies the prompt content to include the coach's voice and style
 */
function injectCoachPersonality(originalPrompt: string, coachPersonality: string, coachHandle: string): string {
    // Add coach personality injection at the beginning of the prompt
    const personalityInjection = `\n\n🎭 COACH PERSONALITY INJECTION:\n${coachPersonality}\n\nIMPORTANT: You must write in ${coachHandle.toUpperCase()}'S voice and style as described above. This is not optional - the personality must come through strongly in your response.\n\n---\n\nORIGINAL TASK: `;
    
    return originalPrompt + personalityInjection;
}

/**
 * GENERATE COMPLETE PROMPT (Drop-in replacement for ai-client.ts function)
 * 
 * This replaces the old generateCompletePrompt function but with our smart routing.
 * - Extracts coach injection from user input (preserves existing coach functionality)
 * - Routes games vs apps intelligently  
 * - For apps: uses classifier to expand the prompt
 * - For games: passes through directly (games don't need expansion)
 * 
 * Returns expanded prompt ready for the builder stage.
 */
export async function generateCompletePrompt(userInput: string): Promise<string> {
    logWithTimestamp("=" + "=".repeat(79));
    logWithTimestamp("🎯 NEW WTAF PROCESSOR: Intelligent prompt generation...");
    logWithTimestamp(`📥 ORIGINAL INPUT: ${userInput}`);
    logWithTimestamp("-" + "-".repeat(79));
    
    // STEP 1: Extract coach information (preserve existing functionality)
    // Parse coach from user prompt before processing (WTAF syntax: "wtaf -coach- request")
    const coachMatch = userInput.match(/wtaf\s+-([a-z]+)-\s+(.+)/i);
    let coach = null;
    let cleanedInput = userInput;
    
    if (coachMatch) {
        coach = coachMatch[1].toLowerCase();
        cleanedInput = `wtaf ${coachMatch[2]}`; // Keep "wtaf" but remove coach
        logWithTimestamp(`🎭 Extracted coach: ${coach}`);
        logWithTimestamp(`🧹 Cleaned input: ${cleanedInput}`);
    }
    
    // STEP 2: Smart routing - detect if this is a game or app
    const requestType = utilsDetectRequestType(cleanedInput);
    logWithTimestamp(`🔀 Request type detected: ${requestType.toUpperCase()}`);
    
    let expandedPrompt = cleanedInput;
    
    // STEP 3: Load coach personality if present
    let coachPersonality = null;
    if (coach) {
        coachPersonality = await loadCoachPersonality(coach);
        if (coachPersonality) {
            logWithTimestamp(`🎭 Coach personality loaded for ${coach}`);
        } else {
            logWarning(`Coach personality not found for ${coach}, proceeding without injection`);
        }
    }

    if (requestType === 'app') {
        // APP PATH: Use classifier to expand and clarify the request
        logWithTimestamp("📋 APP detected - using classifier to expand prompt...");
        
        const classifierPrompt = await loadPrompt('classifier.json');
        if (!classifierPrompt) {
            logWarning("Failed to load classifier prompt, using original input");
            expandedPrompt = cleanedInput;
        } else {
            try {
                // Inject coach personality into classifier prompt if present
                let modifiedClassifierPrompt = classifierPrompt;
                if (coach && coachPersonality) {
                    const originalContent = (classifierPrompt as any).content;
                    const injectedContent = injectCoachPersonality(originalContent, coachPersonality, coach);
                    modifiedClassifierPrompt = {
                        ...classifierPrompt,
                        content: injectedContent
                    };
                    logWithTimestamp(`🎭 Injected ${coach}'s personality into classifier`);
                }
                
                const messages: ChatCompletionMessageParam[] = [
                    modifiedClassifierPrompt,
                    { role: "user", content: cleanedInput } as ChatCompletionMessageParam
                ];
                
                const response = await getOpenAIClient().chat.completions.create({
                    model: "gpt-4o",
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 1000
                });
                
                const content = response.choices[0].message.content;
                if (content) {
                    expandedPrompt = content.trim();
                    logWithTimestamp(`📤 EXPANDED PROMPT: ${expandedPrompt.slice(0, 200)}...`);
                } else {
                    logWarning("No content in classifier response, using original");
                    expandedPrompt = cleanedInput;
                }
            } catch (error) {
                logWarning(`Classifier error, using original: ${error instanceof Error ? error.message : String(error)}`);
                expandedPrompt = cleanedInput;
            }
        }
    } else {
        // GAME PATH: Games don't need expansion, pass through directly
        logWithTimestamp("🎮 GAME detected - skipping classifier (games don't need expansion)");
        expandedPrompt = cleanedInput;
    }
    
    // STEP 4: Add metadata to expanded prompt for builder stage
    if (coach) {
        expandedPrompt += `\n\nCOACH_HANDLE: ${coach}`;
        logWithTimestamp(`🎭 Added coach handle to final prompt: ${coach}`);
    }
    
    // Add request type metadata to prevent mis-detection in builder stage
    expandedPrompt += `\n\nREQUEST_TYPE: ${requestType}`;
    logWithTimestamp(`🔀 Added request type metadata: ${requestType}`);
    
    logSuccess("Prompt generation complete!");
    logWithTimestamp("=" + "=".repeat(79));
    
    return expandedPrompt;
}

/**
 * CALL CLAUDE (Drop-in replacement for ai-client.ts function)
 * 
 * This replaces the old callClaude function but with our smart builder selection.
 * - Automatically selects the right builder based on request type detection
 * - Uses same fallback logic as original (Claude → Haiku → GPT-4o)
 * - Returns raw HTML ready for extractCodeBlocks processing
 */
export async function callClaude(systemPrompt: string, userPrompt: string, maxTokens: number = 8192): Promise<string> {
    // STEP 1: Extract request type from metadata to avoid re-detection issues
    let requestType: 'game' | 'app' = 'app'; // default to app
    const typeMatch = userPrompt.match(/REQUEST_TYPE:\s*(game|app)/i);
    if (typeMatch) {
        requestType = typeMatch[1].toLowerCase() as 'game' | 'app';
        logWithTimestamp(`🔀 Using metadata request type: ${requestType.toUpperCase()}`);
    } else {
        // Fallback to detection if no metadata found (shouldn't happen with new system)
        logWarning("No REQUEST_TYPE metadata found, falling back to detection");
        requestType = utilsDetectRequestType(userPrompt);
        logWithTimestamp(`🔀 Fallback detection: ${requestType.toUpperCase()}`);
    }
    
    // STEP 2: Extract coach information from user prompt for builder injection
    const coachMatch = userPrompt.match(/COACH_HANDLE:\s*([a-z]+)/i);
    let coach = null;
    if (coachMatch) {
        coach = coachMatch[1].toLowerCase();
        logWithTimestamp(`🎭 Coach detected in builder stage: ${coach}`);
    }
    
    // STEP 3: Load the appropriate specialized builder
    const builderFile = requestType === 'game' ? 'builder-game.json' : 'builder-app.json';
    const builderPrompt = await loadPrompt(builderFile);
    
    if (!builderPrompt) {
        logWarning(`Failed to load ${builderFile}, falling back to system prompt`);
        // Use the provided system prompt as fallback
    } else {
        logWithTimestamp(`🔧 Using specialized builder: ${builderFile}`);
        
        // STEP 4: Inject coach personality into builder if present
        let finalSystemPrompt = (builderPrompt as any).content || systemPrompt;
        
        if (coach) {
            const coachPersonality = await loadCoachPersonality(coach);
            if (coachPersonality) {
                finalSystemPrompt = injectCoachPersonality(finalSystemPrompt, coachPersonality, coach);
                logWithTimestamp(`🎭 Injected ${coach}'s personality into builder`);
            }
        }
        
        systemPrompt = finalSystemPrompt;
    }
    
    // STEP 3: Call AI with same fallback logic as original ai-client.ts
    const model = "claude-3-5-sonnet-20241022";
    const fallbackModel = "claude-3-5-haiku-20241022";
    
    logWithTimestamp(`🧠 Using Claude 3.5 Sonnet with ${maxTokens} tokens...`);
    
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
        logWithTimestamp("🤖 Executing specialized builder prompt...");
        logWithTimestamp(`🔧 Request type: ${requestType}, Builder: ${builderFile}`);
        
        // Make the API call
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });
        
        const responseJson = await response.json();
        logWithTimestamp(`📊 Claude response received - status code: ${response.status}`);
        
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
            if (fallbackModel === "claude-3-5-haiku-20241022") {
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