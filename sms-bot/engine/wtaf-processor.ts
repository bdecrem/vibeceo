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

// Configuration interfaces for type safety
export interface ClassifierConfig {
    classifierModel: string;
    classifierMaxTokens: number;
    classifierTemperature: number;
}

export interface BuilderConfig {
    model: string;
    maxTokens: number;
    temperature: number;
    cookbook?: string; // Optional WTAF cookbook content for apps
}

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
        const promptPath = join(__dirname, '..', '..', 'content', filename);
        const content = await readFile(promptPath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        logWarning(`Error loading prompt ${filename}: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/**
 * Load ZAD template HTML from builder-zad-v0.json
 * Returns complete HTML ready for deployment
 */
async function loadZadTemplate(): Promise<string | null> {
    try {
        const templatePath = join(__dirname, '..', '..', 'content', 'builder-zad-v0.json');
        const content = await readFile(templatePath, 'utf8');
        
        // The template file contains raw HTML, need to wrap it properly
        const completeHtml = `<!DOCTYPE html>
<html lang="en">
${content}
</html>`;
        
        logWithTimestamp("📖 ZAD template loaded successfully");
        return completeHtml;
    } catch (error) {
        logWarning(`Error loading ZAD template: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/**
 * Load coach personality from coaches/ folder
 * Returns the personality text for the classifier to interpret
 */
async function loadCoachPersonality(coachHandle: string): Promise<string | null> {
    try {
        const coachPath = join(__dirname, '..', '..', 'content', 'coaches', `${coachHandle}.json`);
        const content = await readFile(coachPath, 'utf8');
        const coachData = JSON.parse(content);
        return coachData.personality || null;
    } catch (error) {
        logWarning(`Error loading coach personality for ${coachHandle}: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
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
export async function generateCompletePrompt(userInput: string, config: ClassifierConfig): Promise<string> {
    logWithTimestamp("=" + "=".repeat(79));
    logWithTimestamp("🎯 NEW WTAF PROCESSOR: Intelligent prompt generation...");
    logWithTimestamp(`📥 ORIGINAL INPUT: ${userInput}`);
    logWithTimestamp(`🤖 Using classifier: ${config.classifierModel} (${config.classifierMaxTokens} tokens)`);
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
        logWithTimestamp("📋 APP detected - using modular classifier to expand prompt...");
        
        const { buildClassifierPrompt } = await import('./classifier-builder.js');
        const classifierPrompt = await buildClassifierPrompt();
        if (!classifierPrompt) {
            logWarning("Failed to build classifier prompt, using original input");
            expandedPrompt = cleanedInput;
        } else {
            try {
                // Pass coach info as part of user message for classifier to interpret
                let userMessage = cleanedInput;
                if (coach && coachPersonality) {
                    userMessage += `\n\nCOACH: ${coach}\nCOACH PERSONALITY: ${coachPersonality}`;
                    logWithTimestamp(`🎭 Passing ${coach}'s personality to classifier for interpretation`);
                }
                
                const messages: ChatCompletionMessageParam[] = [
                    classifierPrompt,
                    { role: "user", content: userMessage } as ChatCompletionMessageParam
                ];
                
                const response = await getOpenAIClient().chat.completions.create({
                    model: config.classifierModel,
                    messages: messages,
                    temperature: config.classifierTemperature,
                    max_tokens: config.classifierMaxTokens
                });
                
                const content = response.choices[0].message.content;
                if (content) {
                    // Check if classifier detected a ZAD request with custom title
                    if (content.includes('ZAD_DETECTED')) {
                        logWithTimestamp("🤝 ZAD detected by classifier");
                        
                        // Extract custom title if provided
                        const titleMatch = content.match(/ZAD_TITLE:\s*(.+)/);
                        if (titleMatch) {
                            const customTitle = titleMatch[1].trim();
                            logWithTimestamp(`🎨 Custom ZAD title extracted: ${customTitle}`);
                            
                            // For ZAD remix, return minimal prompt - don't include verbose classifier response
                            expandedPrompt = `ZAD_REMIX_REQUEST: Change title to "${customTitle}"`;
                            expandedPrompt += `\n\nZAD_REMIX_TITLE: ${customTitle}`;
                            logWithTimestamp("🎨 ZAD remix mode - using clean prompt for Builder");
                        } else {
                            // No custom title, use static template
                            const zadTemplate = await loadZadTemplate();
                            if (zadTemplate) {
                                logWithTimestamp("🚀 ZAD template loaded - using static version");
                                return `\`\`\`html\n${zadTemplate}\n\`\`\``;
                            } else {
                                logWarning("Failed to load ZAD template, falling back to AI generation");
                                expandedPrompt = content.trim();
                            }
                        }
                    } else {
                        expandedPrompt = content.trim();
                        logWithTimestamp(`📤 EXPANDED PROMPT: ${expandedPrompt.slice(0, 200)}...`);
                        
                        // ZAD apps now have comprehensive product briefs from classifier
                        if (expandedPrompt.includes('ZERO_ADMIN_DATA: true')) {
                            logWithTimestamp("🤝 ZAD app detected - comprehensive product brief included from classifier");
                        }
                    }
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
 * - Uses provided config instead of hardcoded values
 * - Returns raw HTML ready for extractCodeBlocks processing
 */
export async function callClaude(systemPrompt: string, userPrompt: string, config: BuilderConfig): Promise<string> {
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
    
    // STEP 2: Extract coach info and load personality for builder
    const coachMatch = userPrompt.match(/COACH_HANDLE:\s*([a-z]+)/i);
    let coach = null;
    let coachPersonality = null;
    if (coachMatch) {
        coach = coachMatch[1].toLowerCase();
        coachPersonality = await loadCoachPersonality(coach);
        logWithTimestamp(`🎭 Coach detected for builder: ${coach}`);
    }
    
    // STEP 3: Load the appropriate specialized builder
    let builderFile: string;
    if (requestType === 'game') {
        builderFile = 'builder-game.json';
    } else if (userPrompt.includes('ZAD_REMIX_TITLE:')) {
        // ZAD REMIX MODE: Load template and prepare for title customization
        logWithTimestamp("🎨 ZAD remix detected - preparing template for title customization");
        
        const titleMatch = userPrompt.match(/ZAD_REMIX_TITLE:\s*(.+)/);
        const customTitle = titleMatch ? titleMatch[1].trim() : 'Custom Chat';
        
        const zadTemplate = await loadZadTemplate();
        if (zadTemplate) {
            logWithTimestamp(`🎨 ZAD template loaded, will change title to: ${customTitle}`);
            
            // Load ZAD remix builder prompt
            const zadRemixBuilder = await loadPrompt('builder-zad-remix.json');
            if (zadRemixBuilder) {
                logWithTimestamp("🎨 ZAD remix builder loaded from JSON");
                
                // Prepare user prompt with template and title
                const remixUserPrompt = `Change the title to "${customTitle}".

${zadTemplate}

Do NOT rewrite the code. Do not make other changes. KEEP EVERYTHING ELSE THE SAME.`;

                // Use the loaded builder prompt and call Claude
                return await callClaudeAPI(config.model, (zadRemixBuilder as any).content, remixUserPrompt, config.maxTokens, config.temperature);
            } else {
                logWarning("Failed to load ZAD remix builder, falling back to standard builder");
                builderFile = 'builder-app.json';
            }
        } else {
            logWarning("Failed to load ZAD template for remix, falling back to standard builder");
            builderFile = 'builder-app.json';
        }
    } else {
        // Standard app
        builderFile = 'builder-app.json';
        logWithTimestamp(`📱 Standard app detected - using general app builder`);
    }
    
    const builderPrompt = await loadPrompt(builderFile);
    
    // STEP 5: Prepare coach-aware user prompt for builder
    let builderUserPrompt = userPrompt;
    if (coach && coachPersonality) {
        builderUserPrompt += `\n\nCOACH: ${coach}\nCOACH PERSONALITY: ${coachPersonality}`;
        logWithTimestamp(`🎭 Prepared ${coach}'s full personality data for builder`);
    }
    
    // Add WTAF Cookbook if provided by controller (only for apps)
    if (config.cookbook && requestType === 'app') {
        builderUserPrompt += `\n\nWTAF STYLE GUIDE & DESIGN SYSTEM:\n${config.cookbook}`;
        logWithTimestamp(`📖 Added WTAF Cookbook to builder prompt (provided by controller)`);
    }
    
    if (!builderPrompt) {
        logWarning(`Failed to load ${builderFile}, falling back to system prompt`);
        // Use the provided system prompt as fallback
    } else {
        logWithTimestamp(`🔧 Using specialized builder: ${builderFile}`);
        // Use specialized builder prompt directly - classifier handles coach interpretation
        systemPrompt = (builderPrompt as any).content || systemPrompt;
    }
    
    // PARTY TRICK: Inject email placeholder instructions when needed
    const emailMetadataMatch = userPrompt.match(/EMAIL_NEEDED:\s*true/i);
    if (emailMetadataMatch && requestType === 'app') {
        logWithTimestamp(`✨ PARTY TRICK: Injecting email placeholder instructions`);
        systemPrompt += `\n\n📧 EMAIL PLACEHOLDER SYSTEM:
- Use [CONTACT_EMAIL] as placeholder in ALL email contexts
- Examples: 
  * Contact links: <a href="mailto:[CONTACT_EMAIL]">Email me: [CONTACT_EMAIL]</a>
  * Contact info: "Questions? Email us at [CONTACT_EMAIL]"
  * Business contact: "Hire me: [CONTACT_EMAIL]"
- NEVER use fake emails like "example@email.com" or "your-email@domain.com"
- ALWAYS use the exact placeholder [CONTACT_EMAIL] - this will be replaced later`;
    }
    
    // STEP 7: Call AI with provided config and fallback logic
    logWithTimestamp(`🧠 Using ${config.model} with ${config.maxTokens} tokens...`);
    
    try {
        if (config.model.startsWith('claude')) {
            return await callClaudeAPI(config.model, systemPrompt, builderUserPrompt, config.maxTokens, config.temperature);
        } else if (config.model.startsWith('gpt')) {
            return await callOpenAIAPI(config.model, systemPrompt, builderUserPrompt, config.maxTokens, config.temperature);
        } else {
            throw new Error(`Unsupported model: ${config.model}`);
        }
    } catch (error) {
        logWarning(`Primary model ${config.model} failed, trying fallbacks: ${error instanceof Error ? error.message : String(error)}`);
        
        // Fallback chain: Claude Sonnet → Claude Haiku → GPT-4o
        const fallbackModels = [
            { model: "claude-3-5-sonnet-20241022", maxTokens: 8192 },
            { model: "claude-3-5-haiku-20241022", maxTokens: 4000 },
            { model: "gpt-4o", maxTokens: 16000 }
        ];
        
        for (const fallback of fallbackModels) {
            if (fallback.model === config.model) continue; // Skip if it's the same model that just failed
            
            try {
                logWithTimestamp(`🔄 Trying fallback: ${fallback.model}`);
                
                if (fallback.model.startsWith('claude')) {
                    return await callClaudeAPI(fallback.model, systemPrompt, builderUserPrompt, fallback.maxTokens, config.temperature);
                } else {
                    return await callOpenAIAPI(fallback.model, systemPrompt, builderUserPrompt, fallback.maxTokens, config.temperature);
                }
            } catch (fallbackError) {
                logWarning(`Fallback ${fallback.model} also failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
                continue;
            }
        }
        
        throw new Error(`All models failed. Last error: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Call Claude API directly
 */
async function callClaudeAPI(model: string, systemPrompt: string, userPrompt: string, maxTokens: number, temperature: number): Promise<string> {
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
        temperature: temperature,
        system: systemPrompt,
        messages: [
            {
                role: "user",
                content: userPrompt
            }
        ]
    };
    
    logWithTimestamp(`🔍 Sending ${model} request with token limit: ${maxTokens}`);
    
    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
    });
    
    const responseJson = await response.json();
    logWithTimestamp(`📊 Claude response received - status code: ${response.status}`);
    
    if (responseJson.content && responseJson.content.length > 0) {
        const result = responseJson.content[0].text;
        logSuccess(`${model} response received, length: ${result.length} chars`);
        return result;
    } else {
        logWarning(`Unexpected Claude API response structure: ${JSON.stringify(responseJson)}`);
        throw new Error("Invalid Claude response structure");
    }
}

/**
 * Call OpenAI API directly
 */
async function callOpenAIAPI(model: string, systemPrompt: string, userPrompt: string, maxTokens: number, temperature: number): Promise<string> {
    const response = await getOpenAIClient().chat.completions.create({
        model: model,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ],
        temperature: temperature,
        max_tokens: maxTokens
    });
    
    const result = response.choices[0].message.content;
    if (!result) {
        throw new Error("No content in OpenAI response");
    }
    logSuccess(`${model} response received, length: ${result.length} chars`);
    return result;
} 