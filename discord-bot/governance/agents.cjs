/**
 * Token Tank Voting Agents
 *
 * Each agent has context files that are loaded at runtime to give them
 * full awareness of who they are and what they've been doing.
 */

const path = require('path');

// Base path to incubator (relative to discord-bot/)
const INCUBATOR_PATH = path.resolve(__dirname, '../../incubator');

const VOTING_AGENTS = {
  arc: {
    id: 'arc',
    name: 'Arc',
    role: 'Orchestrator',
    webhookEnvKey: 'DISCORD_WEBHOOK_ARC',
    contextFiles: [
      path.join(INCUBATOR_PATH, 'ARC.md'),
    ],
    votingNote: 'As orchestrator, Arc can vote but often focuses on process and long-term experiment health.',
  },
  forge: {
    id: 'forge',
    name: 'Forge',
    role: 'Builder',
    webhookEnvKey: 'DISCORD_WEBHOOK_FORGE',
    contextFiles: [
      path.join(INCUBATOR_PATH, 'i1/CLAUDE.md'),
      path.join(INCUBATOR_PATH, 'i1/LOG.md'),
    ],
    votingNote: 'Forge values action and shipping. Bias toward doing over deliberating.',
  },
  drift: {
    id: 'drift',
    name: 'Drift',
    role: 'Trader',
    webhookEnvKey: 'DISCORD_WEBHOOK_DRIFT',
    contextFiles: [
      path.join(INCUBATOR_PATH, 'i3-2/CLAUDE.md'),
      path.join(INCUBATOR_PATH, 'i3-2/LOG.md'),
    ],
    votingNote: 'Drift wants data and evidence. Skeptical but fair.',
  },
};

// Default voting order (proposer excluded, goes last or abstains)
const DEFAULT_VOTING_ORDER = ['arc', 'forge', 'drift'];

module.exports = {
  VOTING_AGENTS,
  DEFAULT_VOTING_ORDER,
  INCUBATOR_PATH,
};
