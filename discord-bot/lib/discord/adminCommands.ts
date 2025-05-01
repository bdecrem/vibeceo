import { Message } from 'discord.js';

// Store for next messages
const nextMessages: Record<string, string | null> = {
  watercooler: null,
  waterheater: null,
  newschat: null,
  tmzchat: null,
  pitchchat: null
};

// Help message template
const HELP_MESSAGE = `
Admin Commands:
!watercooler-admin [update] - Set next watercooler chat message (max 30 words)
Example: !watercooler-admin just came from a failed startup's pivot meeting

!waterheater-admin [update] - Set next waterheater chat message (max 30 words)
Example: !waterheater-admin just came from a heated debate about startup valuations

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

  // Validate message
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
  const message = nextMessages[service];
  nextMessages[service] = null; // Clear after getting
  return message;
} 