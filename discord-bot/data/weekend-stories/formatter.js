/**
 * Discord Formatter for Weekend Stories
 * Utilities to format structured weekend story data into Discord-compatible messages
 */

/**
 * Format a single scene for Discord
 * @param {Object} scene - A scene object from the WeekendStory
 * @returns {string} Formatted message for Discord
 */
export function formatSceneForDiscord(scene) {
  // Format intro
  let introText;
  if (scene.intro.time && scene.intro.location && scene.intro.behavior) {
    // Use the standard format with "and"
    introText = `**It's ${scene.intro.time} in ${scene.intro.location} and ${scene.intro.behavior}.**`;
  } else {
    // Fallback to the original behavior field
    introText = `**${scene.intro.behavior}**`;
  }
  
  // Format conversation
  const conversationText = scene.conversation.map(message => {
    return `> **${message.coach}** ${message.timestamp}\n> ${message.content}\n`;
  }).join('\n');
  
  return `${introText}\n\n${conversationText}`;
}

/**
 * Format the entire story for Discord as a series of messages
 * @param {Object} story - The complete WeekendStory object
 * @returns {Array} Array of formatted messages, one per scene
 */
export function formatStoryForDiscord(story) {
  // Format metadata header
  const metadataText = `**Weekend Story: ${story.metadata.city}**\n` +
    `*Goal: ${story.metadata.locationGoal} | Object: ${story.metadata.object}*\n`;
  
  // Format each scene
  const sceneMessages = story.scenes.map((scene, index) => {
    return `**SCENE ${scene.number}/24**\n\n${formatSceneForDiscord(scene)}`;
  });
  
  // Add metadata to the first scene
  if (sceneMessages.length > 0) {
    sceneMessages[0] = `${metadataText}\n${sceneMessages[0]}`;
  }
  
  return sceneMessages;
}

/**
 * Format a scene for a Discord webhook message
 * @param {Object} scene - A scene object from the WeekendStory
 * @returns {Object} Webhook payload for Discord
 */
export function formatSceneForWebhook(scene) {
  return {
    content: formatSceneForDiscord(scene),
    username: "Weekend Story",
    avatar_url: "https://your-avatar-url-here.png" // Can be customized
  };
}

/**
 * Format the entire story for a series of Discord webhook messages
 * @param {Object} story - The complete WeekendStory object
 * @returns {Array} Array of webhook payloads, one per scene
 */
export function formatStoryForWebhooks(story) {
  return formatStoryForDiscord(story).map((content, index) => {
    return {
      content,
      username: `Weekend Story ${index + 1}/24`,
      avatar_url: "https://your-avatar-url-here.png" // Can be customized
    };
  });
} 