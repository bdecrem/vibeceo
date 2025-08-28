#!/usr/bin/env node

/**
 * Enhance Pet Rock with Friendly Affirming Messages
 * 
 * This script updates the Pet Rock to provide different friendly, 
 * affirming messages each time it's clicked after being named.
 */

import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './safe-update-wrapper.js';

// Array of friendly, affirming messages
const affirmingMessages = [
    "loves spending time with you! 💕",
    "thinks you're amazing! ✨",
    "is grateful to have you as a friend! 🤗",
    "believes in you completely! 💪",
    "is proud of everything you've accomplished! 🌟",
    "thinks you have a wonderful heart! ❤️",
    "knows you can handle anything! 🦸",
    "appreciates your kindness! 🌸",
    "thinks you make the world brighter! ☀️",
    "is lucky to know you! 🍀",
    "admires your creativity! 🎨",
    "thinks you're doing great! 👏",
    "sends you positive vibes! ✌️",
    "believes you're capable of wonderful things! 🌈",
    "thinks you have an amazing spirit! 🕊️",
    "is cheering you on always! 📣",
    "knows you're special! 💎",
    "thinks you're a ray of sunshine! 🌅",
    "appreciates your unique perspective! 👁️",
    "believes in your dreams! 💫"
];

// Enhanced Pet Rock function that picks random messages
const enhancedPetRockCode = `
function enhancedPetRock() {
    // If no name yet, ask for name
    if (!localStorage.rockName) {
        localStorage.rockName = prompt('Name your pet rock:') || 'Rocky';
        alert('Hello ' + localStorage.rockName + '! Click me again anytime for some encouragement! 🪨💕');
        return;
    }
    
    // Array of affirming messages
    const messages = [
        "loves spending time with you! 💕",
        "thinks you're amazing! ✨", 
        "is grateful to have you as a friend! 🤗",
        "believes in you completely! 💪",
        "is proud of everything you've accomplished! 🌟",
        "thinks you have a wonderful heart! ❤️",
        "knows you can handle anything! 🦸",
        "appreciates your kindness! 🌸",
        "thinks you make the world brighter! ☀️",
        "is lucky to know you! 🍀",
        "admires your creativity! 🎨",
        "thinks you're doing great! 👏",
        "sends you positive vibes! ✌️",
        "believes you're capable of wonderful things! 🌈",
        "thinks you have an amazing spirit! 🕊️",
        "is cheering you on always! 📣",
        "knows you're special! 💎",
        "thinks you're a ray of sunshine! 🌅",
        "appreciates your unique perspective! 👁️",
        "believes in your dreams! 💫"
    ];
    
    // Pick a random message
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    // Show the affirming message
    alert(localStorage.rockName + ' ' + randomMessage);
}
`;

async function enhancePetRock() {
    try {
        console.log('🪨 Enhancing Pet Rock with affirming messages...');
        
        // Fetch current ToyBox OS HTML
        const current = await fetchCurrentToyBoxOS();
        let htmlContent = current.html_content;
        
        // First, add the enhanced function to the script section
        const scriptEndPattern = /<\/script>/;
        const functionToAdd = enhancedPetRockCode;
        
        // Find the last </script> tag and add our function before it
        const scriptMatches = [...htmlContent.matchAll(/<\/script>/g)];
        if (scriptMatches.length === 0) {
            throw new Error('Could not find script section to add enhanced function');
        }
        
        const lastScriptIndex = scriptMatches[scriptMatches.length - 1].index;
        
        // Insert the function before the last </script>
        htmlContent = htmlContent.slice(0, lastScriptIndex) + 
                     functionToAdd + '\n        ' + 
                     htmlContent.slice(lastScriptIndex);
        
        // Now replace the Pet Rock onclick handler
        const oldPetRockPattern = /onclick="localStorage\.rockName=prompt\('Name your pet rock:'\)\|\|localStorage\.rockName\|\|'Rocky';alert\('Your pet rock '\+localStorage\.rockName\+' loves you!'\)"/;
        
        const newPetRockHandler = `onclick="enhancedPetRock()"`;
        
        if (!oldPetRockPattern.test(htmlContent)) {
            throw new Error('Could not find existing Pet Rock onclick handler to replace');
        }
        
        htmlContent = htmlContent.replace(oldPetRockPattern, newPetRockHandler);
        
        // Update the database
        await safeUpdateToyBoxOS(htmlContent, 'Enhanced Pet Rock with friendly affirming messages');
        
        console.log('✅ Pet Rock enhanced successfully!');
        console.log('🎉 Now provides 20 different affirming messages');
        console.log('🔗 Test at: https://webtoys.ai/public/toybox-os');
        
    } catch (error) {
        console.error('❌ Failed to enhance Pet Rock:', error.message);
        throw error;
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    enhancePetRock().catch(console.error);
}

export { enhancePetRock };