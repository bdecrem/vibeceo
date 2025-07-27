#!/usr/bin/env node

/**
 * Simple test for music generation through wtaf-processor
 */

import { generateCompletePrompt, generateHTML } from '../dist/engine/wtaf-processor.js';

const testPrompts = [
    "make me a simple music generator where I type a prompt and get a song MUSIC_MARKER",
    "make me a beats machine where i can type in BPM, then start by creating a drum beat, then add bass, then a melody line MUSIC_MARKER",
    "create a mood radio where I click buttons for different moods and it generates matching music MUSIC_MARKER"
];

async function testMusicGeneration() {
    console.log("🎵 Testing Music App Generation\n");
    
    const prompt = testPrompts[0]; // Test the simple generator
    console.log(`Testing prompt: ${prompt}\n`);
    
    try {
        // Test classifier phase
        console.log("1️⃣ Testing generateCompletePrompt...");
        const expandedPrompt = await generateCompletePrompt(prompt, {
            classifierModel: 'gpt-4o',
            classifierMaxTokens: 600,
            classifierTemperature: 0.7
        });
        
        console.log("✅ Expanded prompt generated:");
        console.log(expandedPrompt.slice(0, 200) + "...\n");
        
        // Test builder phase
        console.log("2️⃣ Testing generateHTML...");
        const html = await generateHTML(expandedPrompt, {
            model: 'gpt-4o',
            maxTokens: 4000,
            temperature: 0.7
        });
        
        console.log("✅ HTML generated:");
        console.log(html.slice(0, 200) + "...\n");
        
        // Save the output
        const fs = await import('fs/promises');
        const outputPath = './test-music-output.html';
        await fs.writeFile(outputPath, html, 'utf8');
        console.log(`💾 Saved to ${outputPath}`);
        
    } catch (error) {
        console.error("❌ Error:", error.message);
        console.error(error.stack);
    }
}

testMusicGeneration();