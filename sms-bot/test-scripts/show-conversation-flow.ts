/**
 * CONVERSATION FLOW TEST
 * 
 * Shows the EXACT back-and-forth conversation between:
 * 1. What gets sent to ChatGPT (classifier)
 * 2. What ChatGPT sends back
 * 3. What gets sent to Claude (builder)
 * 4. What Claude generates
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { OpenAI } from 'openai';
import { OPENAI_API_KEY, ANTHROPIC_API_KEY } from '../engine/shared/config.js';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Same utility functions from wtaf-processor.ts for loading prompts
async function loadPrompt(filename: string): Promise<ChatCompletionMessageParam | null> {
    try {
        // When compiled, this runs from dist/test-scripts/, so we need to go up 2 levels to reach sms-bot/
        const promptPath = join(__dirname, '..', '..', 'content', filename);
        const content = await readFile(promptPath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.log(`⚠️ Error loading prompt ${filename}: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

async function loadCoachPersonality(coachHandle: string): Promise<string | null> {
    try {
        const coachPath = join(__dirname, '..', '..', 'content', 'coaches', `${coachHandle}.json`);
        const content = await readFile(coachPath, 'utf8');
        const coachData = JSON.parse(content);
        return coachData.personality || null;
    } catch (error) {
        console.log(`⚠️ Error loading coach personality for ${coachHandle}: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

async function loadWtafCookbook(): Promise<string | null> {
    try {
        const cookbookPath = join(__dirname, '..', '..', 'content', 'app-tech-spec.json');
        const content = await readFile(cookbookPath, 'utf8');
        const cookbook = JSON.parse(content);
        
        const cookbookText = `
WTAF COOKBOOK & STYLE GUIDE:

BRAND IDENTITY: ${cookbook.wtaf_design_system_prompt}

WRITING STYLE: ${cookbook.writing_style.name}
${cookbook.writing_style.description}

COPY GUIDELINES:
- Big Attitude: ${cookbook.writing_style.copy_guidelines.big_attitude}
- Punchy Weird: ${cookbook.writing_style.copy_guidelines.punchy_weird}
- Hyper Specific: ${cookbook.writing_style.copy_guidelines.hyper_specific}
- Textable: ${cookbook.writing_style.copy_guidelines.textable}

LAYOUT ARCHETYPES: ${cookbook.layout_variants.archetypes.join(' | ')}

🚨 NON-NEGOTIABLE REQUIREMENTS:
${cookbook.wtaf_content_mandates.non_negotiable_requirements.map((item: string) => `${item}`).join('\n')}

REQUIRED CONTENT:
${cookbook.wtaf_content_mandates.required_additions.map((item: string) => `- ${item}`).join('\n')}

HOUSE GRADIENT SYSTEM:
- Laser Pinks: ${cookbook.technical_framework.house_gradient_system.gradients.laser_pinks}
- Glitch Blues: ${cookbook.technical_framework.house_gradient_system.gradients.glitch_blues}
- Vapor Corals: ${cookbook.technical_framework.house_gradient_system.gradients.vapor_corals}
- Riot Violets: ${cookbook.technical_framework.house_gradient_system.gradients.riot_violets}
- Techno Neons: ${cookbook.technical_framework.house_gradient_system.gradients.techno_neons}

CURATED EMOJI PALETTES:
- Core Set: ${cookbook.technical_framework.curated_emoji_palettes.palettes.core_set}
- Tech Startup: ${cookbook.technical_framework.curated_emoji_palettes.palettes.tech_startup}
- Party App: ${cookbook.technical_framework.curated_emoji_palettes.palettes.party_app}

BRAND REMINDER: ${cookbook.brand_reminder}
        `;
        
        return cookbookText.trim();
    } catch (error) {
        console.log(`⚠️ Error loading WTAF cookbook: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

async function showConversationFlow() {
    console.log('🔍 CONVERSATION FLOW TEST');
    console.log('='.repeat(80));
    
    const userRequest = "Wtaf -rohan- create a bio page for Bart Decrem written in Rohan's unique voice";
    console.log(`📥 USER REQUEST: ${userRequest}`);
    console.log('='.repeat(80));
    
    // STEP 1: Parse coach and clean input (same as wtaf-processor.ts)
    const coachMatch = userRequest.match(/wtaf\s+-([a-z]+)-\s+(.+)/i);
    let coach = null;
    let cleanedInput = userRequest;
    
    if (coachMatch) {
        coach = coachMatch[1].toLowerCase();
        cleanedInput = `wtaf ${coachMatch[2]}`;
        console.log(`🎭 COACH EXTRACTED: ${coach}`);
        console.log(`🧹 CLEANED INPUT: ${cleanedInput}`);
    }
    
    // STEP 2: Load coach personality
    let coachPersonality = null;
    if (coach) {
        coachPersonality = await loadCoachPersonality(coach);
        console.log(`\n🎭 ROHAN'S PERSONALITY:`);
        console.log('-'.repeat(60));
        console.log(coachPersonality?.slice(0, 300) + '...');
        console.log('-'.repeat(60));
    }
    
    // STEP 3: Prepare ChatGPT classifier call
    console.log(`\n🤖 STEP 1: CHATGPT CLASSIFIER STAGE`);
    console.log('='.repeat(80));
    
    const classifierPrompt = await loadPrompt('classifier.json');
    let userMessage = cleanedInput;
    if (coach && coachPersonality) {
        userMessage += `\n\nCOACH: ${coach}\nCOACH PERSONALITY: ${coachPersonality}`;
    }
    
    console.log('📤 SENDING TO CHATGPT:');
    console.log('\n🔧 SYSTEM PROMPT:');
    console.log(JSON.stringify(classifierPrompt, null, 2));
    
    console.log('\n👤 USER MESSAGE:');
    console.log(userMessage);
    console.log('-'.repeat(40));
    
    // Call ChatGPT
    try {
        const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
        const messages: ChatCompletionMessageParam[] = [
            classifierPrompt!,
            { role: "user", content: userMessage } as ChatCompletionMessageParam
        ];
        
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: messages,
            temperature: 0.7,
            max_tokens: 1000
        });
        
        const chatgptResponse = response.choices[0].message.content;
        console.log('📥 CHATGPT RESPONSE:');
        console.log(chatgptResponse);
        
        // STEP 4: Prepare Claude builder call
        console.log(`\n\n🧠 STEP 2: CLAUDE BUILDER STAGE`);
        console.log('='.repeat(80));
        
        const builderPrompt = await loadPrompt('builder-app.json');
        const wtafCookbook = await loadWtafCookbook();
        
        // Prepare full Claude user prompt
        let claudeUserPrompt = chatgptResponse || cleanedInput;
        claudeUserPrompt += `\n\nCOACH_HANDLE: ${coach}`;
        claudeUserPrompt += `\n\nREQUEST_TYPE: app`;
        
        if (coach && coachPersonality) {
            claudeUserPrompt += `\n\nCOACH: ${coach}\nCOACH PERSONALITY: ${coachPersonality}`;
        }
        
        if (wtafCookbook) {
            claudeUserPrompt += `\n\n${wtafCookbook}`;
        }
        
                          console.log('📤 SENDING TO CLAUDE:');
         
         // Call Claude
         const headers: Record<string, string> = {
             "x-api-key": ANTHROPIC_API_KEY!,
             "Content-Type": "application/json",
             "anthropic-version": "2023-06-01"
         };
         
         const payload = {
             model: "claude-3-5-sonnet-20241022",
             max_tokens: 8192,
             temperature: 0.7,
             system: (builderPrompt as any).content,
             messages: [
                 {
                     role: "user",
                     content: claudeUserPrompt
                 }
             ]
         };
         
         console.log('\n🔥 COMPLETE API PAYLOAD SENT TO CLAUDE:');
         console.log('='.repeat(100));
         console.log(JSON.stringify(payload, null, 2));
         console.log('='.repeat(100));
        
        const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });
        
        const claudeJson = await claudeResponse.json();
        const claudeResult = claudeJson.content[0].text;
        
        console.log('📥 CLAUDE RESPONSE:');
        console.log('Length:', claudeResult.length, 'characters');
        console.log('First 500 chars:');
        console.log(claudeResult.slice(0, 500) + '...');
        console.log('\nLast 500 chars:');
        console.log('...' + claudeResult.slice(-500));
        
        console.log('\n✅ CONVERSATION FLOW COMPLETE!');
        console.log('🎯 This shows the exact back-and-forth between the AI models');
        
    } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    }
}

showConversationFlow(); 