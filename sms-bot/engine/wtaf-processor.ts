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
import { OPENAI_API_KEY, ANTHROPIC_API_KEY, WORKER_TIMEOUT_MS, ZAD_TIMEOUT_MS } from './shared/config.js';
import { logWithTimestamp, logError, logSuccess, logWarning } from './shared/logger.js';
import { detectRequestType as utilsDetectRequestType } from './shared/utils.js';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Timeout wrapper for AI calls
 * Uses different timeouts for ZAD vs regular requests
 */
async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operation: string
): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`${operation} timeout after ${timeoutMs}ms`)), timeoutMs);
    });
    
    return Promise.race([promise, timeoutPromise]);
}

// Configuration interfaces for type safety
export interface ClassifierConfig {
    classifierModel: string;
    classifierMaxTokens: number;
    classifierTemperature: number;
    classifierTopP?: number;
    classifierPresencePenalty?: number;
    classifierFrequencyPenalty?: number;
    forceAdminOverride?: boolean; // 🔧 Admin override flag
}

export interface BuilderConfig {
    model: string;
    maxTokens: number;
    temperature: number;
    designSystem?: string; // Optional WTAF design system content for apps
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
 * Load text prompt from .txt file (for comprehensive prompts)
 */
async function loadTextPrompt(filename: string): Promise<string | null> {
    try {
        // When compiled, this runs from dist/engine/, so we need to go up 2 levels to reach sms-bot/
        const promptPath = join(__dirname, '..', '..', 'content', filename);
        const content = await readFile(promptPath, 'utf8');
        logWithTimestamp(`📖 Text prompt loaded: ${filename} (${content.length} chars)`);
        return content;
    } catch (error) {
        logWarning(`Error loading text prompt ${filename}: ${error instanceof Error ? error.message : String(error)}`);
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
        // 🔧 ADMIN OVERRIDE CHECK: Skip classifier entirely if admin override is set
        if (config.forceAdminOverride) {
            // Check if this is a minimal test request (passed via cleanedInput containing ADMIN_TEST marker)
            if (cleanedInput.includes('ADMIN_TEST_MARKER')) {
                logWithTimestamp("🧪 ADMIN-TEST OVERRIDE: Skipping classifier, going to minimal test builder");
                expandedPrompt = `ADMIN_TEST_REQUEST: ${cleanedInput.replace('ADMIN_TEST_MARKER', '').trim()}

EMAIL_NEEDED: false
ZERO_ADMIN_DATA: false
APP_TYPE: data_collection`;
                logWithTimestamp("🧪 Admin-test override: Created minimal test prompt without classifier");
            } else {
                logWithTimestamp("🔧 ADMIN OVERRIDE: Skipping classifier entirely, going straight to admin generation");
                expandedPrompt = `ADMIN_DUAL_PAGE_REQUEST: ${cleanedInput}

EMAIL_NEEDED: false
ZERO_ADMIN_DATA: false
APP_TYPE: data_collection`;
                logWithTimestamp("🔧 Admin override: Created admin dual-page prompt without classifier");
            }
        }
        
        // 🧪 ZAD TEST OVERRIDE CHECK: Skip classifier entirely if zad test is set
        if (cleanedInput.includes('ZAD_TEST_MARKER')) {
            logWithTimestamp("🧪 ZAD-TEST OVERRIDE: Skipping classifier, going to simple ZAD test builder");
            expandedPrompt = `ZAD_TEST_REQUEST: ${cleanedInput.replace('ZAD_TEST_MARKER', '').trim()}

EMAIL_NEEDED: false
ZERO_ADMIN_DATA: true
APP_TYPE: zero_admin_data`;
            logWithTimestamp("🧪 ZAD-test override: Created simple ZAD test prompt without classifier");
        }
        else {
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
                    
                    logWithTimestamp(`\n🔍 SENDING TO GPT-4o CLASSIFIER:`);
                    logWithTimestamp(`⚙️ Config: ${config.classifierModel}, ${config.classifierMaxTokens} tokens, temp ${config.classifierTemperature}`);
                    logWithTimestamp(`📋 SYSTEM PROMPT: ${(classifierPrompt as any).content?.length || 0} chars (includes ZAD template)`);
                    logWithTimestamp(`📋 FULL CLASSIFIER SYSTEM PROMPT CONTENT:`);
                    logWithTimestamp("=" + "=".repeat(80));
                    logWithTimestamp((classifierPrompt as any).content || "No content");
                    logWithTimestamp("=" + "=".repeat(80));
                    logWithTimestamp(`📤 USER MESSAGE (${userMessage.length} chars): ${userMessage}`);
                    
                    const response = await getOpenAIClient().chat.completions.create({
                        model: config.classifierModel,
                        messages: messages,
                        temperature: config.classifierTemperature,
                        max_tokens: config.classifierMaxTokens,
                        top_p: config.classifierTopP || 1,
                        presence_penalty: config.classifierPresencePenalty || 0,
                        frequency_penalty: config.classifierFrequencyPenalty || 0
                    });
                    
                    const content = response.choices[0].message.content;
                    logWithTimestamp(`\n📥 CLASSIFIER RESPONSE (${content?.length || 0} chars):`);
                    logWithTimestamp("=" + "=".repeat(80));
                    logWithTimestamp(content || "No content");
                    logWithTimestamp("=" + "=".repeat(80));
                    if (content) {
                        // STEP 1: Check if classifier detected a ZAD request
                        if (content.includes('ZERO_ADMIN_DATA: true')) {
                            logWithTimestamp("🤝 ZAD detected by classifier (ZERO_ADMIN_DATA: true found)");
                            
                            // NEW ELEGANT ZAD SYSTEM: Route to comprehensive builder
                            // Pass the original user input for the comprehensive ZAD builder
                            expandedPrompt = `ZAD_COMPREHENSIVE_REQUEST: ${cleanedInput}`;
                            logWithTimestamp("🎨 NEW ZAD SYSTEM: Routing to comprehensive ZAD builder");
                        }
                        // STEP 2: Check if classifier detected admin need (APP_TYPE: data_collection)
                        else if (content.includes('APP_TYPE: data_collection') || content.includes('APP_TYPE=data_collection')) {
                            logWithTimestamp("📊 ADMIN detected by classifier (APP_TYPE: data_collection found)");
                            expandedPrompt = `ADMIN_DUAL_PAGE_REQUEST: ${cleanedInput}

${content.trim()}`;
                            logWithTimestamp("📊 ADMIN SYSTEM: Routing to admin dual-page builder");
                        }
                        // STEP 3: Normal expanded prompt
                        else {
                            expandedPrompt = content.trim();
                            logWithTimestamp(`📤 EXPANDED PROMPT: ${expandedPrompt.slice(0, 200)}...`);
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
    let builderType: string;
    
    if (requestType === 'game') {
        builderFile = 'builder-game.json';
        builderType = 'Game Builder';
        logWithTimestamp(`🎮 Game detected - using game builder`);
    } else if (userPrompt.includes('ADMIN_TEST_REQUEST:')) {
        logWithTimestamp(`🧪 ADMIN_TEST_REQUEST detected - using minimal test builder`);
        // Extract the user request from the admin test request
        const requestMatch = userPrompt.match(/ADMIN_TEST_REQUEST:\s*(.+)/);
        if (!requestMatch) {
            throw new Error("ADMIN_TEST_REQUEST detected but no content found - parsing error");
        }
        const userRequest = requestMatch[1].trim();
        logWithTimestamp(`🧪 Extracted user request: ${userRequest}`);
        
        builderFile = 'builder-admin-minimal-test.json';
        builderType = 'Minimal Test Builder';
        logWithTimestamp(`🧪 Using minimal test builder for: ${userRequest.slice(0, 50)}...`);
    } else if (userPrompt.includes('ADMIN_DUAL_PAGE_REQUEST:')) {
        logWithTimestamp(`📊 ADMIN_DUAL_PAGE_REQUEST detected - using admin dual-page builder`);
        // Extract the user request from the admin request
        const requestMatch = userPrompt.match(/ADMIN_DUAL_PAGE_REQUEST:\s*(.+)/);
        if (!requestMatch) {
            throw new Error("ADMIN_DUAL_PAGE_REQUEST detected but no content found - parsing error");
        }
        const userRequest = requestMatch[1].trim();
        logWithTimestamp(`📊 Extracted user request: ${userRequest}`);
        
        builderFile = 'builder-admin-technical.json';
        builderType = 'Admin Technical Builder';
        logWithTimestamp(`📊 Using admin dual-page builder for: ${userRequest.slice(0, 50)}...`);
    } else if (userPrompt.includes('ZAD_TEST_REQUEST:')) {
        logWithTimestamp(`🧪 ZAD_TEST_REQUEST detected - using ultra-simple ZAD builder`);
        // Extract the user request from the ZAD test request
        const requestMatch = userPrompt.match(/ZAD_TEST_REQUEST:\s*(.+)/);
        if (!requestMatch) {
            throw new Error("ZAD_TEST_REQUEST detected but no content found - parsing error");
        }
        const userRequest = requestMatch[1].trim();
        logWithTimestamp(`🧪 Extracted user request: ${userRequest}`);
        
        builderFile = 'builder-zad-ultra-simple.txt';
        builderType = 'Ultra-Simple ZAD Builder';
        logWithTimestamp(`🧪 Using ultra-simple ZAD builder for: ${userRequest.slice(0, 50)}...`);
    } else if (userPrompt.includes('ZAD_COMPREHENSIVE_REQUEST:')) {
        logWithTimestamp(`🎨 ZAD_COMPREHENSIVE_REQUEST detected - using comprehensive ZAD builder (.txt format)`);
        // Extract the user request from the comprehensive ZAD request
        const requestMatch = userPrompt.match(/ZAD_COMPREHENSIVE_REQUEST:\s*(.+)/);
        if (!requestMatch) {
            throw new Error("ZAD_COMPREHENSIVE_REQUEST detected but no content found - parsing error");
        }
        const userRequest = requestMatch[1].trim();
        logWithTimestamp(`🎨 Extracted user request: ${userRequest}`);
        
        // Use the comprehensive ZAD builder (.txt format to avoid JSON escaping issues)
        builderFile = 'builder-zad-comprehensive.txt';
        builderType = 'Comprehensive ZAD Builder (.txt)';
        logWithTimestamp(`🎨 Using .txt comprehensive ZAD builder for: ${userRequest.slice(0, 50)}...`);
    } else {
        // Standard app
        builderFile = 'builder-app.json';
        builderType = 'Standard App Builder';
        logWithTimestamp(`📱 Standard app detected - using general app builder`);
    }
    
    logWithTimestamp(`🔧 Loading builder: ${builderFile} (${builderType})`);
    
    let builderPrompt: ChatCompletionMessageParam | null = null;
    let promptContent = '';
    
    // Handle different file formats
    if (builderFile.endsWith('.txt')) {
        // Load text file directly for comprehensive prompts
        const textContent = await loadTextPrompt(builderFile);
        if (textContent) {
            builderPrompt = { role: 'system', content: textContent } as ChatCompletionMessageParam;
            promptContent = textContent;
            logWithTimestamp(`📋 Text builder prompt loaded (${promptContent.length} chars):`);
            logWithTimestamp(`📝 First 200 chars: ${promptContent.substring(0, 200)}...`);
        } else {
            logWarning(`❌ Failed to load text builder prompt from ${builderFile}`);
        }
    } else {
        // Load JSON file for regular prompts
        builderPrompt = await loadPrompt(builderFile);
        if (builderPrompt) {
            promptContent = (builderPrompt as any).content || '';
            logWithTimestamp(`📋 JSON builder prompt loaded (${promptContent.length} chars):`);
            logWithTimestamp(`📝 First 200 chars: ${promptContent.substring(0, 200)}...`);
        } else {
            logWarning(`❌ Failed to load JSON builder prompt from ${builderFile}`);
        }
    }
    
    // STEP 5: Prepare coach-aware user prompt for builder
    let builderUserPrompt = userPrompt;
    
    // For admin test requests, replace with the actual user request
    if (userPrompt.includes('ADMIN_TEST_REQUEST:')) {
        const requestMatch = userPrompt.match(/ADMIN_TEST_REQUEST:\s*(.+)/);
        if (requestMatch) {
            const userRequest = requestMatch[1].trim();
            builderUserPrompt = userRequest; // Use the clean user request for the minimal test builder
            logWithTimestamp(`🧪 ADMIN-TEST: Using clean user request for minimal test builder: ${userRequest.slice(0, 50)}...`);
        }
    }
    // For admin dual-page requests, replace with the actual user request but preserve metadata
    else if (userPrompt.includes('ADMIN_DUAL_PAGE_REQUEST:')) {
        const requestMatch = userPrompt.match(/ADMIN_DUAL_PAGE_REQUEST:\s*(.+)/);
        if (requestMatch) {
            const userRequest = requestMatch[1].trim();
            builderUserPrompt = userRequest; // Use the clean user request for the admin builder
            logWithTimestamp(`📊 ADMIN: Using clean user request for admin builder: ${userRequest.slice(0, 50)}...`);
        }
    }
    // For ZAD comprehensive requests, replace with the actual user request
    else if (userPrompt.includes('ZAD_COMPREHENSIVE_REQUEST:')) {
        const requestMatch = userPrompt.match(/ZAD_COMPREHENSIVE_REQUEST:\s*(.+)/);
        if (requestMatch) {
            const userRequest = requestMatch[1].trim();
            builderUserPrompt = userRequest; // Use the clean user request for the comprehensive builder
            logWithTimestamp(`🎨 ZAD: Using clean user request for comprehensive builder: ${userRequest.slice(0, 50)}...`);
        }
    }
    // For ZAD test requests, replace with the actual user request
    else if (userPrompt.includes('ZAD_TEST_REQUEST:')) {
        const requestMatch = userPrompt.match(/ZAD_TEST_REQUEST:\s*(.+)/);
        if (requestMatch) {
            const userRequest = requestMatch[1].trim();
            builderUserPrompt = userRequest; // Use the clean user request for the simple test builder
            logWithTimestamp(`🧪 ZAD TEST: Using clean user request for simple test builder: ${userRequest.slice(0, 50)}...`);
        }
    }
    
    if (coach && coachPersonality) {
        builderUserPrompt += `\n\nCOACH: ${coach}\nCOACH PERSONALITY: ${coachPersonality}`;
        logWithTimestamp(`🎭 Prepared ${coach}'s full personality data for builder`);
    }
    
    // 🔧 ADMIN STITCHING: For admin requests, stitch together 3 pieces dynamically
    if (userPrompt.includes('ADMIN_DUAL_PAGE_REQUEST:')) {
        try {
            // Load app-tech-spec.json dynamically
            const appTechSpecPath = join(__dirname, '..', '..', 'content', 'app-tech-spec.json');
            const appTechSpecContent = await readFile(appTechSpecPath, 'utf8');
            const appTechSpec = JSON.parse(appTechSpecContent);
            
            // Stitch together: User request + App tech spec + Admin technical (already in systemPrompt)
            builderUserPrompt += `\n\nWTAF STYLE GUIDE & DESIGN SYSTEM:\n${JSON.stringify(appTechSpec, null, 2)}`;
            logWithTimestamp(`📖 Added app-tech-spec.json dynamically for admin request`);
        } catch (error) {
            logWarning(`Failed to load app-tech-spec.json: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    // Dynamic WTAF Design System injection for standard apps
    if (config.designSystem && requestType === 'app' && !userPrompt.includes('ZAD_COMPREHENSIVE_REQUEST:') && !userPrompt.includes('ADMIN_DUAL_PAGE_REQUEST:')) {
        builderUserPrompt += `\n\nWTAF DESIGN SYSTEM & STYLE GUIDE:\n${config.designSystem}`;
        logWithTimestamp(`🎨 Added WTAF Design System to builder prompt (${config.designSystem.length} chars)`);
    }
    
    if (!builderPrompt) {
        logWarning(`Failed to load ${builderFile}, falling back to system prompt`);
        // Use the provided system prompt as fallback
    } else {
        logWithTimestamp(`🔧 Using specialized builder: ${builderFile}`);
        // Use specialized builder prompt directly - classifier handles coach interpretation
        systemPrompt = promptContent || systemPrompt;
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
    logWithTimestamp(`\n🧠 SENDING TO BUILDER: ${config.model} with ${config.maxTokens} tokens...`);
    logWithTimestamp(`📋 BUILDER SYSTEM PROMPT (${systemPrompt.length} chars):`);
    logWithTimestamp("=" + "=".repeat(80));
    logWithTimestamp(systemPrompt);
    logWithTimestamp("=" + "=".repeat(80));
    logWithTimestamp(`📤 BUILDER USER PROMPT (${builderUserPrompt.length} chars):`);
    logWithTimestamp("-" + "-".repeat(80));
    logWithTimestamp(builderUserPrompt);
    logWithTimestamp("-" + "-".repeat(80));
    
    // Determine timeout based on request type (declare before try-catch for scope)
    const isZadRequest = userPrompt.includes('ZAD_COMPREHENSIVE_REQUEST:') || 
                         userPrompt.includes('ZAD_TEST_REQUEST:') ||
                         userPrompt.includes('ZERO_ADMIN_DATA: true');
    const timeout = isZadRequest ? ZAD_TIMEOUT_MS : WORKER_TIMEOUT_MS;
    
    try {
        
        logWithTimestamp(`⏱️ Using ${timeout/1000}s timeout for ${isZadRequest ? 'ZAD' : 'regular'} request`);
        
        let result: string;
        if (config.model.startsWith('claude')) {
            result = await withTimeout(
                callClaudeAPI(config.model, systemPrompt, builderUserPrompt, config.maxTokens, config.temperature),
                timeout,
                `Claude ${config.model} call`
            );
        } else if (config.model.startsWith('gpt')) {
            result = await withTimeout(
                callOpenAIAPI(config.model, systemPrompt, builderUserPrompt, config.maxTokens, config.temperature),
                timeout,
                `GPT ${config.model} call`
            );
        } else {
            throw new Error(`Unsupported model: ${config.model}`);
        }
        
        // Validate ZAD responses for completeness (reuse isZadRequest from above)
        if (isZadRequest) {
            const hasPlaceholderComments = result.includes('[Previous authentication functions remain exactly the same]') || 
                                          result.includes('Include all the required authentication functions here') ||
                                          result.includes('Include all remaining authentication functions exactly as provided');
            
            if (hasPlaceholderComments) {
                logWarning(`🎨 ZAD response contains placeholder comments - incomplete response detected`);
                throw new Error(`ZAD response incomplete: Contains placeholder comments instead of actual authentication functions`);
            }
            
            // Check for minimum expected ZAD functions (updated to match comprehensive builder)
            const hasShowNewUserScreen = result.includes('showNewUserScreen');
            const hasGenerateNewUser = result.includes('generateNewUser');
            const hasRegisterNewUser = result.includes('registerNewUser');
            
            if (!hasShowNewUserScreen || !hasGenerateNewUser || !hasRegisterNewUser) {
                logWarning(`🎨 ZAD response missing critical functions - incomplete response detected`);
                throw new Error(`ZAD response incomplete: Missing required authentication functions`);
            }
            
            logWithTimestamp(`🎨 ZAD response validation passed - all required functions present`);
        }
        
        logWithTimestamp(`\n📥 BUILDER RESPONSE (${result.length} chars):`);
        logWithTimestamp("=" + "=".repeat(80));
        logWithTimestamp(result.substring(0, 1000) + (result.length > 1000 ? "\n... [TRUNCATED - showing first 1000 chars] ..." : ""));
        logWithTimestamp("=" + "=".repeat(80));
        
        return result;
    } catch (error) {
        logWarning(`Primary model ${config.model} failed, trying fallbacks: ${error instanceof Error ? error.message : String(error)}`);
        
        // Smart fallback chain: Skip Haiku for ZAD apps (insufficient tokens)
        // (reuse isZadRequest from above)
        
        let fallbackModels = [
            { model: "claude-3-5-sonnet-20241022", maxTokens: 8192 },
            { model: "claude-3-5-haiku-20241022", maxTokens: 4000 },
            { model: "gpt-4o", maxTokens: 16000 }
        ];
        
        // For ZAD apps, skip Haiku (4000 tokens insufficient) and go straight to GPT-4o
        if (isZadRequest) {
            fallbackModels = [
                { model: "claude-3-5-sonnet-20241022", maxTokens: 8192 },
                { model: "gpt-4o", maxTokens: 16000 }
            ];
            logWithTimestamp(`🎨 ZAD detected: Using ZAD-optimized fallback chain (skipping Haiku)`);
        }
        
        for (const fallback of fallbackModels) {
            if (fallback.model === config.model) continue; // Skip if it's the same model that just failed
            
            try {
                logWithTimestamp(`🔄 Trying fallback: ${fallback.model}`);
                
                let fallbackResult: string;
                if (fallback.model.startsWith('claude')) {
                    fallbackResult = await withTimeout(
                        callClaudeAPI(fallback.model, systemPrompt, builderUserPrompt, fallback.maxTokens, config.temperature),
                        timeout,
                        `Claude ${fallback.model} fallback call`
                    );
                } else {
                    fallbackResult = await withTimeout(
                        callOpenAIAPI(fallback.model, systemPrompt, builderUserPrompt, fallback.maxTokens, config.temperature),
                        timeout,
                        `GPT ${fallback.model} fallback call`
                    );
                }
                
                // Validate ZAD responses for completeness (same validation as primary model)
                if (isZadRequest) {
                    const hasPlaceholderComments = fallbackResult.includes('[Previous authentication functions remain exactly the same]') || 
                                                  fallbackResult.includes('Include all the required authentication functions here') ||
                                                  fallbackResult.includes('Include all remaining authentication functions exactly as provided');
                    
                    if (hasPlaceholderComments) {
                        logWarning(`🎨 Fallback ${fallback.model} ZAD response contains placeholder comments - incomplete response detected`);
                        throw new Error(`ZAD response incomplete: Contains placeholder comments instead of actual authentication functions`);
                    }
                    
                    // Check for minimum expected ZAD functions (updated to match comprehensive builder)
                    const hasShowNewUserScreen = fallbackResult.includes('showNewUserScreen');
                    const hasGenerateNewUser = fallbackResult.includes('generateNewUser');
                    const hasRegisterNewUser = fallbackResult.includes('registerNewUser');
                    
                    if (!hasShowNewUserScreen || !hasGenerateNewUser || !hasRegisterNewUser) {
                        logWarning(`🎨 Fallback ${fallback.model} ZAD response missing critical functions - incomplete response detected`);
                        throw new Error(`ZAD response incomplete: Missing required authentication functions`);
                    }
                    
                    logWithTimestamp(`🎨 Fallback ${fallback.model} ZAD response validation passed - all required functions present`);
                }
                
                return fallbackResult;
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
        logSuccess(`✅ ${model} response received, length: ${result.length} chars`);
        return result;
    } else {
        logWarning(`Unexpected Claude API response structure: ${JSON.stringify(responseJson)}`);
        throw new Error("Invalid Claude response structure");
    }
}

/**
 * Call OpenAI API directly
 */
async function callOpenAIAPI(model: string, systemPrompt: string, userPrompt: string, maxTokens: number, temperature: number, topP?: number, presencePenalty?: number, frequencyPenalty?: number): Promise<string> {
    const response = await getOpenAIClient().chat.completions.create({
        model: model,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ],
        temperature: temperature,
        max_tokens: maxTokens,
        top_p: topP || 1,
        presence_penalty: presencePenalty || 0,
        frequency_penalty: frequencyPenalty || 0
    });
    
    const result = response.choices[0].message.content;
    if (!result) {
        throw new Error("No content in OpenAI response");
    }
    logSuccess(`✅ ${model} response received, length: ${result.length} chars`);
    return result;
} 