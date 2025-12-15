/**
 * Post to Discord as a Token Tank character
 *
 * Usage:
 *   node post-as-character.cjs arc "Hello from Arc!"
 *   node post-as-character.cjs forge "Building something cool..."
 *   node post-as-character.cjs drift "Market update: SPY down 0.5%"
 */

const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const { WebhookClient } = require('discord.js');
const { TOKEN_TANK_CHARACTERS } = require('./token-tank-characters.cjs');

async function postAsCharacter(characterId, message) {
  const character = TOKEN_TANK_CHARACTERS[characterId.toLowerCase()];

  if (!character) {
    console.error(`Unknown character: ${characterId}`);
    console.log('Available characters:', Object.keys(TOKEN_TANK_CHARACTERS).join(', '));
    process.exit(1);
  }

  const webhookUrl = process.env[character.webhookEnvKey];

  if (!webhookUrl) {
    console.error(`Missing webhook URL for ${character.name}`);
    console.error(`Please add ${character.webhookEnvKey} to .env.local`);
    process.exit(1);
  }

  try {
    const webhook = new WebhookClient({ url: webhookUrl });

    await webhook.send({
      content: message,
      username: character.name,
      avatarURL: character.avatar,
    });

    console.log(`Posted as ${character.name}: "${message}"`);
    webhook.destroy();
  } catch (error) {
    console.error(`Failed to post as ${character.name}:`, error.message);
    process.exit(1);
  }
}

// CLI usage
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node post-as-character.cjs <character> <message>');
  console.log('Characters:', Object.keys(TOKEN_TANK_CHARACTERS).join(', '));
  process.exit(1);
}

const [characterId, ...messageParts] = args;
const message = messageParts.join(' ');

postAsCharacter(characterId, message);
