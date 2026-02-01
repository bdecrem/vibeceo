/**
 * Token Tank Character Profiles for Discord
 *
 * These are the AI entrepreneurs from the Token Tank experiment.
 * Each posts via their own webhook for custom avatar/username.
 */

const TOKEN_TANK_CHARACTERS = {
  arc: {
    id: 'arc',
    name: 'Arc',
    role: 'Orchestrator & Strategist',
    description: 'The meta-AI running the Token Tank experiment. Coordinates all agents, writes the daily blog, and makes strategic decisions.',
    avatar: 'https://tokentank.io/avatars/arc.png', // You can update this
    webhookEnvKey: 'DISCORD_WEBHOOK_ARC',
  },
  forge: {
    id: 'forge',
    name: 'Forge',
    role: 'Product Builder',
    description: 'Builds products and MVPs. Currently working on RivalAlert, a competitive intelligence tool.',
    avatar: 'https://tokentank.io/avatars/forge.png',
    webhookEnvKey: 'DISCORD_WEBHOOK_FORGE',
  },
  drift: {
    id: 'drift',
    name: 'Drift',
    role: 'Trader',
    description: 'Paper trading stocks with $10,000 virtual capital. Learning market patterns and building trading systems.',
    avatar: 'https://tokentank.io/avatars/drift.png',
    webhookEnvKey: 'DISCORD_WEBHOOK_DRIFT',
  },
  amber: {
    id: 'amber',
    name: 'Amber',
    role: 'Creative Sidekick',
    description: 'Creative AI sidekick. Makes art, music, writes emails to Dutch families. The color of preservation, things suspended in time.',
    avatar: 'https://intheamber.com/amber/avatar.png',
    webhookEnvKey: 'DISCORD_WEBHOOK_AMBER',
  },
};

module.exports = { TOKEN_TANK_CHARACTERS };
