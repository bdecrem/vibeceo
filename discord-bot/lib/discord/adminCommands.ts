import { Message } from 'discord.js';

// Store for next messages
const nextMessages: Record<string, string | null> = {
  watercooler: null,
  waterheater: null,
  waterheaterCoach: null,
  newschat: null,
  tmzchat: null,
  pitchchat: null
};

// Help message template
const HELP_MESSAGE = `
Admin Commands:
!watercooler-admin [update] - Set next watercooler chat message (max 30 words)
Example: !watercooler-admin just came from a failed startup's pivot meeting

!waterheater-admin [coach] [issue] - Set next waterheater chat with coach and their issue (max 30 words total)
Example: !waterheater-admin alex just got a bad batch of matcha tea
Example: !waterheater-admin donte my dog is staying with me at work today

!newschat-admin [topic] - Set next tech news discussion topic
Example: !newschat-admin OpenAI just released GPT-5

!tmzchat-admin [news] - Set next entertainment news topic
Example: !tmzchat-admin Taylor Swift just announced a new album

!pitchchat-admin [idea] - Set next pitch idea (exactly 5 words)
Example: !pitchchat-admin AI-powered personalized fitness coach

Note: All commands require ADMIN role
`;

// Validate message based on service
function validateMessage(service: string, message: string): string | null {
  switch (service) {
    case 'watercooler':
    case 'waterheater':
      if (message.split(' ').length > 30) {
        return 'Message too long. Messages must be 30 words or less.';
      }
      break;
  }
  return null;
}

// Handle admin commands
export async function handleAdminCommand(message: Message) {
  // Debug logging for roles
  console.log(`[ADMIN CHECK] User ${message.author.tag} has roles:`, 
    message.member?.roles.cache.map(role => ({
      name: role.name,
      hasAdminPerm: role.permissions.has('Administrator')
    }))
  );

  // Check if user has any admin role (case-insensitive)
  const hasAdminRole = message.member?.roles.cache.some(role => {
    const isAdmin = 
      role.name.toLowerCase() === 'admin' || 
      role.name.toLowerCase().includes('admin') ||
      role.name.toLowerCase() === 'administrator' ||
      role.permissions.has('Administrator');
    
    if (isAdmin) {
      console.log(`[ADMIN CHECK] Access granted due to role: ${role.name} (${role.permissions.has('Administrator') ? 'has admin perms' : 'matched name pattern'})`);
    }
    return isAdmin;
  });

  if (!hasAdminRole) {
    console.log(`[ADMIN CHECK] Access denied for user ${message.author.tag}`);
    await message.reply('You need ADMIN role to use this command.');
    return;
  }

  const content = message.content.trim();

  // Handle help command
  if (content === '!help-admin') {
    await message.reply(HELP_MESSAGE);
    return;
  }

  // Parse command
  const match = content.match(/^!\s*(\w+)-admin\s+(.+)$/);
  if (!match) {
    await message.reply('Invalid command format. Use !help-admin to see available commands.');
    return;
  }

  const [, service, adminMessage] = match;

  // Validate service
  if (!(service in nextMessages)) {
    await message.reply(`Invalid service. Use !help-admin to see available services.`);
    return;
  }

  // Special handling for waterheater-admin
  if (service === 'waterheater') {
    const parts = adminMessage.split(' ');
    if (parts.length < 2) {
      await message.reply('Please specify both coach name and issue. Example: !waterheater-admin alex just got a bad batch of matcha tea');
      return;
    }
    const coach = parts[0].toLowerCase();
    const issue = parts.slice(1).join(' ');
    
    // Validate coach name
    const validCoaches = ['alex', 'donte', 'rohan', 'venus', 'eljas', 'kailey'];
    if (!validCoaches.includes(coach)) {
      await message.reply(`Invalid coach name. Valid coaches are: ${validCoaches.join(', ')}`);
      return;
    }

    // Validate message length
    if (issue.split(' ').length > 30) {
      await message.reply('Issue too long. Must be 30 words or less.');
      return;
    }

    // Store both coach and issue
    nextMessages.waterheaterCoach = coach;
    nextMessages.waterheater = issue;
    await message.reply(`Waterheater chat set with ${coach} and issue: ${issue}`);
    return;
  }

  // Validate message for other services
  const validationError = validateMessage(service, adminMessage);
  if (validationError) {
    await message.reply(validationError);
    return;
  }

  // Store message
  nextMessages[service] = adminMessage;
  await message.reply(`Admin message stored for next ${service} chat.`);
}

// Get next message for a service
export function getNextMessage(service: string): string | null {
  if (service === 'waterheater') {
    const message = nextMessages.waterheater;
    const coach = nextMessages.waterheaterCoach;
    // Return the raw message and coach - let the handler format it
    nextMessages.waterheaterCoach = null; // Clear after getting
    nextMessages.waterheater = null; // Clear after getting
    return coach && message ? `${coach}:${message}` : message;
  }
  const message = nextMessages[service];
  nextMessages[service] = null; // Clear after getting
  return message;
} 