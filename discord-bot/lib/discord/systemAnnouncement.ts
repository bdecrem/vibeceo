import { Client, TextChannel } from 'discord.js';
import * as path from 'path';
import * as fs from 'fs';
import { ceos } from '../../data/ceos.js';

/**
 * Post system announcement to the general channel
 * 
 * @param client Discord client
 * @param sceneIndex Current scene index (0-23)
 * @returns Promise resolving to true if successful, false otherwise
 */
export async function postSystemAnnouncement(
  client: Client,
  sceneIndex: number
): Promise<boolean> {
  try {
    console.log(`\n\n*******************************************************************************`);
    console.log(`***** ATTEMPTING SYSTEM ANNOUNCEMENT AFTER SCENE ${sceneIndex} *****`);
    console.log(`*******************************************************************************\n\n`);
    
    // Get the general channel ID from environment variables
    // Using hard-coded fallback ID instead of environment variable
    const GENERAL_CHANNEL_ID = '1354474492629618831';
    console.log(`Using channel ID: ${GENERAL_CHANNEL_ID}`);
    
    // Get the channel
    const channel = await client.channels.fetch(GENERAL_CHANNEL_ID);
    if (!channel || !(channel instanceof TextChannel)) {
      console.error(`[SystemAnnouncement] Could not find or access general channel ${GENERAL_CHANNEL_ID}`);
      return false;
    }
    
    console.log(`Successfully found channel: ${channel.name}`);
    
    // Get current irritation data
    const storyArcsPath = path.join(process.cwd(), 'data', 'story-themes', 'story-arcs.json');
    let currentIrritation: any = null;
    try {
      const storyArcs = JSON.parse(fs.readFileSync(storyArcsPath, 'utf-8'));
      currentIrritation = storyArcs.currentIrritation;
    } catch (e) {
      console.error("[SystemAnnouncement] Error loading irritation data:", e);
      return false;
    }
    
    if (!currentIrritation) {
      console.warn("[SystemAnnouncement] No irritation data available for system announcement");
      return false;
    }
    
    // Get coach and target information
    const coachId = currentIrritation.coach;
    const targetId = currentIrritation.target;
    const incident = currentIrritation.incident;
    
    const coach = ceos.find(c => c.id === coachId);
    const target = ceos.find(c => c.id === targetId);
    
    // Use first names only
    const coachName = coach?.name?.split(' ')[0] || (coachId ? coachId.charAt(0).toUpperCase() + coachId.slice(1) : "Unknown");
    const targetName = target?.name?.split(' ')[0] || (targetId ? targetId.charAt(0).toUpperCase() + targetId.slice(1) : "Unknown");
    
    // Gender-specific pronouns
    const genderPronouns: Record<string, string> = {
      'alex': 'She',
      'rohan': 'He',
      'eljas': 'He',
      'venus': 'She',
      'kailey': 'She',
      'donte': 'He'
    };
    
    const pronoun = genderPronouns[coachId] || 'They';
    const lowerPronoun = pronoun.toLowerCase();
    
    // Calculate intensity
    let intensity = '?';
    const intensityObj = currentIrritation?.intensity;
    if (intensityObj && typeof sceneIndex === 'number' && sceneIndex >= 0 && sceneIndex < 24) {
      let timeOfDay: 'morning' | 'midday' | 'afternoon';
      if (sceneIndex < 8) timeOfDay = 'morning';
      else if (sceneIndex < 16) timeOfDay = 'midday';
      else timeOfDay = 'afternoon';
      const arr = intensityObj[timeOfDay];
      const idx = sceneIndex % 8;
      if (Array.isArray(arr) && arr.length > idx && typeof arr[idx] === 'number') {
        intensity = arr[idx].toString();
      }
    }
    
    // Format the announcement with the system update
    const announcement = `📢 **The AF System Update**
Welcome to the AF. Over in #thelounge: Someone started mocking ${coachName}'s ${incident}. ${pronoun}'s still salty with ${targetName} after bringing it up in chat and not loving how the convo went.

Type !help to see just how triggered ${lowerPronoun} is—and for how to pitch your $B idea, summon a coach, or stir more chaos.

Carry on accordingly. 🌀`;
    
    console.log(`Sending announcement: ${announcement}`);
    
    // Send the announcement
    await channel.send(announcement);
    console.log(`\n\n*******************************************************************************`);
    console.log(`***** SYSTEM ANNOUNCEMENT FOR SCENE ${sceneIndex} SUCCESSFULLY SENT *****`);
    console.log(`*******************************************************************************\n\n`);
    
    return true;
  } catch (error) {
    console.error(`\n\n*******************************************************************************`);
    console.error(`***** SYSTEM ANNOUNCEMENT ERROR FOR SCENE ${sceneIndex} *****`);
    console.error(`*******************************************************************************`);
    console.error("[SystemAnnouncement] Error details:", error);
    console.error(`*******************************************************************************\n\n`);
    return false;
  }
} 