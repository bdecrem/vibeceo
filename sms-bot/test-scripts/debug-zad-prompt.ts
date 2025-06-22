/**
 * DEBUG: Show Complete ZAD Prompt Sent to AI
 * 
 * Shows exactly what prompt the AI receives to understand why authentication logic is missing
 */

import { generateCompletePrompt } from '../engine/wtaf-processor.js';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function debugZadPrompt() {
    console.log("🔍 DEBUGGING ZAD PROMPT CONSTRUCTION");
    console.log("=" + "=".repeat(50));
    
    const userInput = "build a place where me and my friends can share ideas";
    
    try {
        // STEP 1: Get the expanded prompt from classifier
        console.log("📋 STEP 1: Classifier expansion...");
        const classifierConfig = {
            classifierModel: "gpt-4o",
            classifierMaxTokens: 500,
            classifierTemperature: 0.1
        };
        
        const expandedPrompt = await generateCompletePrompt(userInput, classifierConfig);
        console.log("\n📤 CLASSIFIER OUTPUT:");
        console.log("-".repeat(80));
        console.log(expandedPrompt);
        console.log("-".repeat(80));
        
        // STEP 2: Load the ZAD builder prompt
        console.log("\n🔧 STEP 2: ZAD Builder instructions...");
        const builderPath = join(__dirname, '..', '..', 'content', 'builder-zad-app.json');
        const builderContent = await readFile(builderPath, 'utf8');
        const builderPrompt = JSON.parse(builderContent);
        
        console.log("\n📤 ZAD BUILDER SYSTEM PROMPT:");
        console.log("-".repeat(80));
        console.log(builderPrompt.content);
        console.log("-".repeat(80));
        
        // STEP 3: Load WTAF Cookbook
        console.log("\n📖 STEP 3: WTAF Cookbook additions...");
        const cookbookPath = join(__dirname, '..', '..', 'content', 'app-tech-spec.json');
        const cookbookContent = await readFile(cookbookPath, 'utf8');
        const cookbook = JSON.parse(cookbookContent);
        
        console.log("\n📤 WTAF COOKBOOK (abbreviated):");
        console.log("-".repeat(80));
        console.log(`BRAND IDENTITY: ${cookbook.wtaf_design_system_prompt}`);
        console.log(`WRITING STYLE: ${cookbook.writing_style.name}`);
        console.log(`COPY GUIDELINES: ${Object.keys(cookbook.writing_style.copy_guidelines || {}).join(', ')}`);
        console.log("-".repeat(80));
        
        // STEP 4: Analyze what's missing
        console.log("\n🔍 ANALYSIS - What AI receives:");
        console.log("1. USER REQUEST: Clear collaborative intent");
        console.log("2. CLASSIFIER: Detects ZAD, adds metadata");
        console.log("3. BUILDER PROMPT: Has authentication template");
        console.log("4. COOKBOOK: WTAF styling");
        
        console.log("\n❓ POTENTIAL ISSUES:");
        console.log("- Builder template may be too complex");
        console.log("- Authentication flow not emphasized enough");
        console.log("- Missing explicit timeline/posting requirements");
        console.log("- AI may be ignoring template in favor of simple solution");
        
    } catch (error) {
        console.error("💥 Debug error:", error);
    }
}

debugZadPrompt().catch(console.error); 