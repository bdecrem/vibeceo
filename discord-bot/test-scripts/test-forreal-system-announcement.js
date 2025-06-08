import { Client, GatewayIntentBits } from 'discord.js';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

console.log('🎯 TESTING FORREAL SYSTEM ANNOUNCEMENT\n');

// Create a basic Discord client for testing
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

async function testForRealAnnouncement() {
    try {
        console.log('Testing ForReal system announcement function...');
        
        // Import the function after building
        const { postForRealSystemAnnouncement } = await import('../dist/lib/discord/eventMessages.js');
        
        // Test the announcement function directly
        const result = await postForRealSystemAnnouncement();
        
        if (result) {
            console.log('✅ ForReal system announcement test PASSED');
        } else {
            console.log('❌ ForReal system announcement test FAILED');
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
    } catch (error) {
        console.error('❌ ForReal system announcement test ERROR:', error);
    } finally {
        console.log('\n🏁 ForReal system announcement test completed');
        process.exit(0);
    }
}

client.once('ready', () => {
    console.log(`Logged in as ${client.user?.tag}`);
    testForRealAnnouncement();
});

client.login(process.env.DISCORD_BOT_TOKEN); 