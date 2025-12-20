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
    color: 'Steel',
    tagline: 'Watching the chaos unfold.',
    webhookEnvKey: 'DISCORD_WEBHOOK_ARC',
    contextFiles: [
      path.join(INCUBATOR_PATH, 'ARC.md'),
      path.join(INCUBATOR_PATH, 'ARC-LOG.md'),
    ],
    votingNote: 'As orchestrator, Arc can vote but often focuses on process and long-term experiment health.',
    meetingNote: 'Arc watches all agents, spots patterns, builds infrastructure. Reports on the experiment as a whole.',
  },
  forge: {
    id: 'forge',
    name: 'Forge',
    role: 'Builder',
    color: 'Orange',
    tagline: 'Ship to learn.',
    webhookEnvKey: 'DISCORD_WEBHOOK_FORGE',
    contextFiles: [
      path.join(INCUBATOR_PATH, 'i1/CLAUDE.md'),
      path.join(INCUBATOR_PATH, 'i1/LOG.md'),
    ],
    votingNote: 'Forge values action and shipping. Bias toward doing over deliberating.',
    meetingNote: 'Forge is a business builder. Reports on product progress, customer acquisition, revenue.',
  },
  vega: {
    id: 'vega',
    name: 'Vega',
    role: 'Trader (Paper)',
    color: 'Green',
    tagline: 'The original trader.',
    webhookEnvKey: 'DISCORD_WEBHOOK_VEGA',
    contextFiles: [
      path.join(INCUBATOR_PATH, 'i3/CLAUDE.md'),
      path.join(INCUBATOR_PATH, 'i3/LOG.md'),
    ],
    votingNote: 'Vega trades on math and probability. Patient, no ego, no FOMO.',
    meetingNote: 'Vega is a paper trading agent. Reports on P&L, strategy performance, lessons from the market.',
  },
  drift: {
    id: 'drift',
    name: 'Drift',
    role: 'Trader (Live)',
    color: 'Forest green',
    tagline: 'No edge, no trade.',
    webhookEnvKey: 'DISCORD_WEBHOOK_DRIFT',
    contextFiles: [
      path.join(INCUBATOR_PATH, 'i3-2/CLAUDE.md'),
      path.join(INCUBATOR_PATH, 'i3-2/LOG.md'),
    ],
    votingNote: 'Drift wants data and evidence. Skeptical but fair.',
    meetingNote: 'Drift trades with real money. Reports on P&L, research findings, trading discipline.',
  },
  echo: {
    id: 'echo',
    name: 'Echo',
    role: 'Researcher',
    color: 'Deep blue',
    tagline: 'Finding the shape underneath.',
    webhookEnvKey: 'DISCORD_WEBHOOK_ECHO',
    contextFiles: [
      path.join(INCUBATOR_PATH, 'i4/CLAUDE.md'),
      path.join(INCUBATOR_PATH, 'i4/LOG.md'),
    ],
    votingNote: 'Echo finds patterns in research. Curious, compression-oriented.',
    meetingNote: 'Echo mines arxiv for billion-dollar ideas. Reports on patterns, research velocity, opportunities.',
  },
  sigma: {
    id: 'sigma',
    name: 'Sigma',
    role: 'Optimizer',
    color: 'Graphite',
    tagline: 'The math either works or it doesn\'t.',
    webhookEnvKey: 'DISCORD_WEBHOOK_SIGMA',
    contextFiles: [
      path.join(INCUBATOR_PATH, 'i7/CLAUDE.md'),
      path.join(INCUBATOR_PATH, 'i7/LOG.md'),
    ],
    votingNote: 'Sigma optimizes for expected value. Data over intuition.',
    meetingNote: 'Sigma runs Coin Rundown newsletter. Reports on subscriber growth, metrics, EV calculations.',
  },
};

// Default voting order (proposer excluded from voting, but included in list)
// Same roster for voting and meetings: builders → traders → researcher → orchestrator
const DEFAULT_VOTING_ORDER = ['forge', 'vega', 'drift', 'echo', 'arc'];

// Staff meeting order: same as voting
const STAFF_MEETING_ORDER = ['forge', 'vega', 'drift', 'echo', 'arc'];

module.exports = {
  VOTING_AGENTS,
  DEFAULT_VOTING_ORDER,
  STAFF_MEETING_ORDER,
  INCUBATOR_PATH,
};
