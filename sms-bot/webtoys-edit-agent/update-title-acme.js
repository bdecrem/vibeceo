#!/usr/bin/env node

/**
 * Update the title to ACME IDEA REPO with tagline
 */

import { safeUpdateApp, fetchCurrentApp } from './safe-update-wrapper.js';

async function updateTitleAndTagline() {
    try {
        console.log('🏆 Updating title to ACME IDEA REPO...');
        
        // Fetch current app
        const current = await fetchCurrentApp('bart', 'tide-worm-speaking');
        let html = current.html_content;
        
        // 1. Update the main title in the auth screen
        html = html.replace(
            '<h1>Message Board</h1>',
            '<h1>ACME IDEA REPO</h1>\n            <p style="font-style: italic; color: #666; margin-top: -10px; margin-bottom: 20px;">Because Google Docs was too stable.</p>'
        );
        
        // 2. Update the title in the main screen
        const oldMainTitle = '<div class="card">\n            <h1>Message Board</h1>';
        const newMainTitle = '<div class="card">\n            <h1>ACME IDEA REPO</h1>\n            <p style="font-style: italic; color: #666; margin-top: -10px; margin-bottom: 15px;">Because Google Docs was too stable.</p>';
        
        html = html.replace(oldMainTitle, newMainTitle);
        
        // 3. Update the page title in the head
        html = html.replace(
            '<title>Message Board</title>',
            '<title>ACME IDEA REPO</title>'
        );
        
        // 4. Update the Create Post screen title for consistency
        html = html.replace(
            '<div id="create-post-screen" class="screen">\n        <div class="card">\n            <h1>Create Post</h1>',
            '<div id="create-post-screen" class="screen">\n        <div class="card">\n            <h1>Create New Idea</h1>'
        );
        
        // 5. Update the Edit Post screen title
        html = html.replace(
            '<h1>Edit Post</h1>',
            '<h1>Edit Idea</h1>'
        );
        
        // 6. Update button text for consistency
        html = html.replace(
            '<button class="button" onclick="showCreatePostScreen()">Create Post</button>',
            '<button class="button" onclick="showCreatePostScreen()">New Idea</button>'
        );
        
        // 7. Update placeholder text
        html = html.replace(
            'placeholder="Post Title"',
            'placeholder="Idea Title"'
        );
        
        html = html.replace(
            'placeholder="What\'s on your mind?"',
            'placeholder="Describe your idea..."'
        );
        
        // Deploy with safe wrapper
        console.log('\n🚀 Deploying title and tagline update...');
        const success = await safeUpdateApp(
            'bart',
            'tide-worm-speaking',
            html,
            'Changed title to ACME IDEA REPO with tagline'
        );
        
        if (success) {
            console.log('\n🎉 Title updated successfully!');
            console.log('\n✨ Changes:');
            console.log('  • Title: ACME IDEA REPO');
            console.log('  • Tagline: "Because Google Docs was too stable."');
            console.log('  • Updated button text to "New Idea"');
            console.log('  • Updated placeholders for idea context');
        }
        
    } catch (error) {
        console.error('\n❌ Error:', error);
    }
}

updateTitleAndTagline();