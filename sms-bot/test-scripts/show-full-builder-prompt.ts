#!/usr/bin/env node

/**
 * Show the EXACT full prompt sent to Builder GPT for "Build a chat page for me and my friend"
 * This includes both the system prompt and the complete user prompt
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import { generateCompletePrompt } from '../engine/wtaf-processor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function showFullBuilderPrompt() {
    console.log("🔍 Showing EXACT FULL prompt sent to Builder GPT\n");
    
    try {
        const exactRequest = "Build a chat page for me and my friend";
        
        // Step 1: Get the classifier output (this becomes the user prompt base)
        const classifierOutput = await generateCompletePrompt(exactRequest, {
            classifierModel: 'gpt-4o',
            classifierMaxTokens: 1000,
            classifierTemperature: 0.7
        });
        
        // Step 2: Load the system prompt (builder-app.json)
        const builderAppPath = join(__dirname, '..', '..', 'content', 'builder-app.json');
        const builderContent = await readFile(builderAppPath, 'utf8');
        const builderPrompt = JSON.parse(builderContent);
        const systemPrompt = builderPrompt.content;
        
        // Step 3: Load WTAF Cookbook (gets added to user prompt)
        const cookbookPath = join(__dirname, '..', '..', 'content', 'app-tech-spec.json');
        const cookbookContent = await readFile(cookbookPath, 'utf8');
        const cookbook = JSON.parse(cookbookContent);
        
        // Convert cookbook to the exact format added to user prompt
        const wtafCookbook = `
WTAF COOKBOOK & STYLE FUCKGUIDE:

BRAND IDENTITY: ${cookbook.wtaf_design_system_prompt}

WRITING STYLE: ${cookbook.writing_style.name}
${cookbook.writing_style.description}
Elements: ${cookbook.writing_style.elements.join(', ')}

COPY GUIDELINES:
- Big Attitude: ${cookbook.writing_style.copy_guidelines.big_attitude}
- Punchy Weird: ${cookbook.writing_style.copy_guidelines.punchy_weird}
- Hyper Specific: ${cookbook.writing_style.copy_guidelines.hyper_specific}
- Textable: ${cookbook.writing_style.copy_guidelines.textable}

DESIGN EXTENSIONS: ${cookbook.design_system_extensions.poolsuite_additions.join(', ')}

LAYOUT ARCHETYPES: ${cookbook.layout_variants.archetypes.join(' | ')}

🚨 NON-NEGOTIABLE REQUIREMENTS:
${cookbook.wtaf_content_mandates.non_negotiable_requirements.map((item: string) => `${item}`).join('\n')}

REQUIRED CONTENT:
${cookbook.wtaf_content_mandates.required_additions.map((item: string) => `- ${item}`).join('\n')}
${cookbook.wtaf_content_mandates.mouse_parallax_required ? `- Mouse Parallax: ${cookbook.wtaf_content_mandates.mouse_parallax_required}` : ''}

INTERACTION RULES: ${cookbook.wtaf_content_mandates.interaction_rules.join(', ')}

TECHNICAL FRAMEWORK:
- Fonts: ${cookbook.technical_framework.fonts}
- Floating Emojis: ${cookbook.technical_framework.floating_emojis}

HOUSE GRADIENT SYSTEM:
${cookbook.technical_framework.house_gradient_system ? `
- Laser Pinks: ${cookbook.technical_framework.house_gradient_system.gradients.laser_pinks}
- Glitch Blues: ${cookbook.technical_framework.house_gradient_system.gradients.glitch_blues}
- Vapor Corals: ${cookbook.technical_framework.house_gradient_system.gradients.vapor_corals}
- Riot Violets: ${cookbook.technical_framework.house_gradient_system.gradients.riot_violets}
- Techno Neons: ${cookbook.technical_framework.house_gradient_system.gradients.techno_neons}
- Animation Rule: ${cookbook.technical_framework.house_gradient_system.animation_rule}` : 'Use WTAF house gradients'}

CURATED EMOJI PALETTES:
${cookbook.technical_framework.curated_emoji_palettes ? `
- Core Set: ${cookbook.technical_framework.curated_emoji_palettes.palettes.core_set}
- Tech Startup: ${cookbook.technical_framework.curated_emoji_palettes.palettes.tech_startup}
- Party App: ${cookbook.technical_framework.curated_emoji_palettes.palettes.party_app}
- Tattoo Chaos: ${cookbook.technical_framework.curated_emoji_palettes.palettes.tattoo_chaos}
- Wellness Cult: ${cookbook.technical_framework.curated_emoji_palettes.palettes.wellness_cult}
- Cafe Chill: ${cookbook.technical_framework.curated_emoji_palettes.palettes.cafe_chill}
- Style Rule: ${cookbook.technical_framework.curated_emoji_palettes.style_rule}` : 'Use themed emoji sets'}

ANIMATION SNIPPETS:
${cookbook.technical_framework.animation_snippets ? `
- Float Drift: ${cookbook.technical_framework.animation_snippets.examples.float_drift}
- Glitch Flicker: ${cookbook.technical_framework.animation_snippets.examples.glitch_flicker}
- Button Pulse: ${cookbook.technical_framework.animation_snippets.examples.button_pulse}
- Mouse Parallax: ${cookbook.technical_framework.animation_snippets.examples.mouse_parallax}` : 'Use WTAF animations'}

IMPLEMENTATION EXAMPLES:
${cookbook.technical_framework.implementation_examples ? `
- Call-to-Text: ${cookbook.technical_framework.implementation_examples.call_to_text_line}
- Prompt Display: ${cookbook.technical_framework.implementation_examples.prompt_display}
- Easter Egg (Click Logo): ${cookbook.technical_framework.implementation_examples.easter_egg_examples.click_logo}` : 'Use WTAF attitude elements'}

- JS Effects: ${cookbook.technical_framework.js_effects.join(', ')}

BRAND REMINDER: ${cookbook.brand_reminder}
        `;
        
        // Step 4: Construct the complete user prompt (as sent to builder)
        const completeUserPrompt = classifierOutput + '\n\n' + wtafCookbook.trim();
        
        // Show both parts
        console.log("╔" + "═".repeat(100) + "╗");
        console.log("║" + " ".repeat(40) + "SYSTEM PROMPT TO BUILDER GPT" + " ".repeat(31) + "║");
        console.log("╚" + "═".repeat(100) + "╝");
        console.log(systemPrompt);
        
        console.log("\n\n╔" + "═".repeat(100) + "╗");
        console.log("║" + " ".repeat(41) + "USER PROMPT TO BUILDER GPT" + " ".repeat(32) + "║");
        console.log("╚" + "═".repeat(100) + "╝");
        console.log(completeUserPrompt);
        
    } catch (error) {
        console.log("❌ Error:", error instanceof Error ? error.message : String(error));
    }
}

// Run it
showFullBuilderPrompt().catch(console.error); 