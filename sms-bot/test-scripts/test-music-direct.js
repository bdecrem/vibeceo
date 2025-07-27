#!/usr/bin/env node

/**
 * Direct test of music generation through wtaf-processor
 */

import { generateCompletePrompt } from '../dist/engine/wtaf-processor.js';
import { callClaude } from '../dist/engine/wtaf-processor.js';
import { writeFile } from 'fs/promises';

async function testMusicGeneration() {
    console.log("🎵 Testing Music App Generation\n");
    
    // Test with MUSIC_MARKER to trigger music builder
    const userInput = "make me a simple music generator where I type a prompt and get a song MUSIC_MARKER";
    
    try {
        // Step 1: Process through classifier/router
        console.log("1️⃣ Processing prompt with MUSIC_MARKER...");
        const expandedPrompt = await generateCompletePrompt(userInput, {
            classifierModel: 'gpt-4o',
            classifierMaxTokens: 600,
            classifierTemperature: 0.7
        });
        
        console.log("\n✅ Expanded prompt:");
        console.log(expandedPrompt.slice(0, 300) + "...\n");
        
        // Step 2: Generate HTML with builder
        console.log("2️⃣ Generating HTML with music builder...");
        
        // Load the music builder prompt
        const fs = await import('fs/promises');
        const builderPromptPath = './content/builder-music.txt';
        const builderPrompt = await fs.readFile(builderPromptPath, 'utf8');
        
        const html = await callClaude(builderPrompt, expandedPrompt, {
            model: 'claude-3-5-sonnet-20241022',
            maxTokens: 8000,
            temperature: 0.7
        });
        
        console.log("\n✅ HTML generated successfully!");
        console.log("First 300 chars:", html.slice(0, 300) + "...\n");
        
        // Save the output
        const outputPath = './test-music-output.html';
        await writeFile(outputPath, html, 'utf8');
        console.log(`💾 Saved to ${outputPath}`);
        console.log(`📱 Open in browser to test the music app!`);
        
    } catch (error) {
        console.error("\n❌ Error:", error.message);
        console.error(error.stack);
    }
}

testMusicGeneration();