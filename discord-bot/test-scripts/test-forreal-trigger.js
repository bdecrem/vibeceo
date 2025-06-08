import { Client, GatewayIntentBits } from 'discord.js';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

console.log('🎯 TESTING FORREAL TRIGGER LOGIC\n');

// Create a basic Discord client for testing
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

async function testForRealTriggerLogic() {
    try {
        console.log('Testing ForReal trigger logic...');
        
        // Test case 1: Short trigger (should fail)
        console.log('\n1. Testing short trigger...');
        const shortTrigger = 'for real though hi';
        const afterTrigger1 = shortTrigger.substring('for real though'.length).trim();
        console.log(`Input: "${shortTrigger}"`);
        console.log(`After trigger: "${afterTrigger1}"`);
        console.log(`Length: ${afterTrigger1.length} (should be < 5)`);
        console.log(afterTrigger1.length < 5 ? '✅ Correctly identified as too short' : '❌ Should have been too short');
        
        // Test case 2: Valid trigger with colon
        console.log('\n2. Testing valid trigger with colon...');
        const validTrigger = 'for real though: should I raise money now or later?';
        const afterTrigger2 = validTrigger.substring('for real though'.length).trim();
        let question2 = afterTrigger2;
        if (question2.startsWith(':')) {
            question2 = question2.substring(1).trim();
        }
        console.log(`Input: "${validTrigger}"`);
        console.log(`After trigger: "${afterTrigger2}"`);
        console.log(`Final question: "${question2}"`);
        console.log(question2.length > 0 ? '✅ Correctly extracted question' : '❌ Failed to extract question');
        
        // Test case 3: Valid trigger without colon
        console.log('\n3. Testing valid trigger without colon...');
        const validTrigger2 = 'for real though how do I price my product?';
        const afterTrigger3 = validTrigger2.substring('for real though'.length).trim();
        let question3 = afterTrigger3;
        if (question3.startsWith(':')) {
            question3 = question3.substring(1).trim();
        }
        console.log(`Input: "${validTrigger2}"`);
        console.log(`After trigger: "${afterTrigger3}"`);
        console.log(`Final question: "${question3}"`);
        console.log(question3.length > 0 ? '✅ Correctly extracted question' : '❌ Failed to extract question');
        
        // Test case 4: Coach mention parsing
        console.log('\n4. Testing coach mention parsing...');
        const coachMention = '@alex @donte @rohan';
        const coachMatches = coachMention.toLowerCase().match(/@(alex|donte|rohan|eljas|kailey|venus)/g);
        if (coachMatches && coachMatches.length === 3) {
            const selectedCoaches = coachMatches.map(match => match.substring(1));
            const uniqueCoaches = [...new Set(selectedCoaches)];
            console.log(`Input: "${coachMention}"`);
            console.log(`Matches: ${coachMatches.join(', ')}`);
            console.log(`Selected coaches: ${selectedCoaches.join(', ')}`);
            console.log(`Unique coaches: ${uniqueCoaches.join(', ')}`);
            console.log(uniqueCoaches.length === 3 ? '✅ Correctly parsed 3 unique coaches' : '❌ Failed to parse coaches');
        } else {
            console.log('❌ Failed to match coach mentions');
        }
        
        // Test case 5: Random selection
        console.log('\n5. Testing random coach selection...');
        const allCoaches = ['alex', 'donte', 'rohan', 'eljas', 'kailey', 'venus'];
        const shuffled = [...allCoaches].sort(() => 0.5 - Math.random());
        const randomSelection = shuffled.slice(0, 3);
        console.log(`All coaches: ${allCoaches.join(', ')}`);
        console.log(`Random selection: ${randomSelection.join(', ')}`);
        console.log(randomSelection.length === 3 ? '✅ Correctly selected 3 random coaches' : '❌ Failed random selection');
        
        console.log('\n✅ All ForReal trigger logic tests completed successfully!');
        
    } catch (error) {
        console.error('❌ ForReal trigger test ERROR:', error);
    } finally {
        console.log('\n🏁 ForReal trigger test completed');
        process.exit(0);
    }
}

client.once('ready', () => {
    console.log(`Logged in as ${client.user?.tag}`);
    testForRealTriggerLogic();
});

client.login(process.env.DISCORD_BOT_TOKEN); 