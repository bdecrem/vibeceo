// Direct system announcement test
// This bypasses all the module dependency issues

import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env.local') });

// Set up Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Main function
async function directSystemAnnouncementTest() {
  console.log("=== Direct System Announcement Test ===");
  
  try {
    // Login to Discord
    console.log("Logging in to Discord...");
    await client.login(process.env.DISCORD_BOT_TOKEN);
    console.log(`Logged in as ${client.user.tag}`);
    
    // Get the channel
    const GENERAL_CHANNEL_ID = '1354474492629618831';
    console.log(`Using channel ID: ${GENERAL_CHANNEL_ID}`);
    
    // Create mock story arc data
    console.log("Creating mock story arc data...");
    const storyArcsDir = path.join(process.cwd(), 'data', 'story-themes');
    if (!fs.existsSync(storyArcsDir)) {
      fs.mkdirSync(storyArcsDir, { recursive: true });
    }
    
    const storyArcsPath = path.join(storyArcsDir, 'story-arcs.json');
    const mockData = {
      currentIrritation: {
        coach: "kailey",
        target: "donte",
        incident: "typo in presentation",
        intensity: {
          morning: [1, 2, 3, 4, 5, 6, 7, 8],
          midday: [2, 3, 4, 5, 6, 7, 8, 9],
          afternoon: [3, 4, 5, 6, 7, 8, 9, 10]
        }
      }
    };
    fs.writeFileSync(storyArcsPath, JSON.stringify(mockData, null, 2));
    console.log("Mock data created at:", storyArcsPath);
    
    // Directly implement postSystemAnnouncement functionality
    const testScenes = [5, 11, 17, 23];
    
    for (const sceneIndex of testScenes) {
      console.log(`\nPosting system announcement for scene ${sceneIndex}...`);
      
      try {
        // Get the channel
        const channel = await client.channels.fetch(GENERAL_CHANNEL_ID);
        if (!channel || !channel.isTextBased()) {
          throw new Error("Channel not found or not a text channel");
        }
        
        console.log(`Successfully found channel: ${channel.name}`);
        
        // Get coach and target information from our mock data
        const { currentIrritation } = mockData;
        const coachId = currentIrritation.coach;
        const targetId = currentIrritation.target;
        const incident = currentIrritation.incident;
        
        // Gender-specific pronouns
        const genderPronouns = {
          'alex': 'She',
          'rohan': 'He',
          'eljas': 'He',
          'venus': 'She',
          'kailey': 'She',
          'donte': 'He'
        };
        
        const pronoun = genderPronouns[coachId] || 'They';
        const lowerPronoun = pronoun.toLowerCase();
        
        // Format the announcement
        const announcement = `📢 **The AF System Update**
Welcome to the AF. Over in #thelounge: Someone started mocking ${coachId.charAt(0).toUpperCase() + coachId.slice(1)}'s ${incident}. ${pronoun}'s still salty with ${targetId.charAt(0).toUpperCase() + targetId.slice(1)} after bringing it up in chat and not loving how the convo went.

Type !help to see just how triggered ${lowerPronoun} is—and for how to pitch your $B idea, summon a coach, or stir more chaos.

Carry on accordingly. 🌀`;
        
        // Send the announcement
        await channel.send(announcement);
        console.log(`System announcement for scene ${sceneIndex} successfully sent`);
      } catch (error) {
        console.error(`Error posting system announcement for scene ${sceneIndex}:`, error);
      }
      
      // Wait between announcements
      console.log(`Waiting 3 seconds before the next announcement...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log("\nAll test announcements completed");
  } catch (error) {
    console.error("Error during test:", error);
  } finally {
    // Clean up
    console.log("Logging out...");
    client.destroy();
    console.log("Test completed");
  }
}

// Run the test
directSystemAnnouncementTest(); 