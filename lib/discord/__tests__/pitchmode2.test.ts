import { analyzePitch } from '../pitchAnalysis.js';
import { generatePromptContext } from '../context.js';
import { handlePitchCommand } from '../pitch.js';
import { Message } from 'discord.js';

// Test cases with expected outcomes
const TEST_CASES = [
  {
    name: 'Serious B2B SaaS Pitch',
    pitch: 'B2B SaaS platform for enterprise AI integration with real-time analytics and customizable dashboards, targeting Fortune 500 companies with a proven team and $2M in pre-orders',
    expectedFlags: {
      isJoke: false,
      isUnderdeveloped: false
    },
    expectedScores: {
      jokeScore: { min: 1, max: 3 },
      developmentScore: { min: 7, max: 10 },
      feasibilityScore: { min: 7, max: 10 },
      noveltyScore: { min: 4, max: 7 }
    }
  },
  {
    name: 'Joke Pitch',
    pitch: 'AI-powered toaster that writes poetry while making breakfast, needs $1000 funding',
    expectedFlags: {
      isJoke: true,
      isUnderdeveloped: true
    },
    expectedScores: {
      jokeScore: { min: 8, max: 10 },
      developmentScore: { min: 1, max: 4 },
      feasibilityScore: { min: 1, max: 4 },
      noveltyScore: { min: 7, max: 10 }
    }
  },
  {
    name: 'Underdeveloped Pitch',
    pitch: 'social network for dogs',
    expectedFlags: {
      isJoke: false,
      isUnderdeveloped: true
    },
    expectedScores: {
      jokeScore: { min: 3, max: 6 },
      developmentScore: { min: 1, max: 4 },
      feasibilityScore: { min: 3, max: 6 },
      noveltyScore: { min: 2, max: 5 }
    }
  }
];

describe('PitchMode2 Implementation Tests', () => {
  // Test context generation
  describe('Context Generation', () => {
    test.each(TEST_CASES)('generates correct context flags for $name', async ({ pitch, expectedFlags }) => {
      const analysis = await analyzePitch(pitch);
      const context = generatePromptContext({
        isJoke: analysis.jokeScore > 7,
        isUnderdeveloped: analysis.developmentScore < 5,
        pros: [],
        cons: [],
        originalMessage: null as any
      });

      // Context should contain appropriate flags
      if (expectedFlags.isJoke) {
        expect(context).toContain('joke pitch');
      }
      if (expectedFlags.isUnderdeveloped) {
        expect(context).toContain('needs more development');
      }
    });
  });

  // Test prompt effectiveness
  describe('Prompt Effectiveness', () => {
    test.each(TEST_CASES)('generates appropriate scores for $name', async ({ pitch, expectedScores }) => {
      const analysis = await analyzePitch(pitch);

      // Check if scores are within expected ranges
      expect(analysis.jokeScore).toBeGreaterThanOrEqual(expectedScores.jokeScore.min);
      expect(analysis.jokeScore).toBeLessThanOrEqual(expectedScores.jokeScore.max);
      expect(analysis.developmentScore).toBeGreaterThanOrEqual(expectedScores.developmentScore.min);
      expect(analysis.developmentScore).toBeLessThanOrEqual(expectedScores.developmentScore.max);
      expect(analysis.feasibilityScore).toBeGreaterThanOrEqual(expectedScores.feasibilityScore.min);
      expect(analysis.feasibilityScore).toBeLessThanOrEqual(expectedScores.feasibilityScore.max);
      expect(analysis.noveltyScore).toBeGreaterThanOrEqual(expectedScores.noveltyScore.min);
      expect(analysis.noveltyScore).toBeLessThanOrEqual(expectedScores.noveltyScore.max);
    });
  });

  // Test response quality
  describe('Response Quality', () => {
    test.each(TEST_CASES)('generates appropriate responses for $name', async ({ pitch }) => {
      // Mock Message object
      const mockMessage = {
        channelId: 'test-channel',
        reply: jest.fn()
      } as unknown as Message;

      // Process pitch
      await handlePitchCommand(mockMessage, pitch);

      // Get the active pitch state
      const state = (global as any).activePitches?.get('test-channel');
      expect(state).toBeTruthy();

      if (state) {
        // Check responses
        expect(state.responses).toBeInstanceOf(Array);
        state.responses.forEach((response: { message: string }) => {
          expect(response.message.length).toBeLessThanOrEqual(280); // Max response length
          expect(response.message).not.toContain('undefined');
          expect(response.message).not.toContain('null');
        });

        // Check pros and cons
        expect(state.pros).toBeInstanceOf(Array);
        expect(state.cons).toBeInstanceOf(Array);
      }
    });
  });

  // Test performance
  describe('Performance', () => {
    test.each(TEST_CASES)('completes analysis within acceptable time for $name', async ({ pitch }) => {
      const startTime = Date.now();
      
      // Mock Message object
      const mockMessage = {
        channelId: 'test-channel',
        reply: jest.fn()
      } as unknown as Message;

      // Process pitch
      await handlePitchCommand(mockMessage, pitch);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Analysis should complete within 10 seconds
      expect(duration).toBeLessThan(10000);

      // Get timing metrics
      const state = (global as any).activePitches?.get('test-channel');
      if (state?.timing) {
        const { analysisStart, analysisEnd, discussionStart, discussionEnd, votingStart, votingEnd } = state.timing;

        // Check individual phase durations
        expect(analysisEnd! - analysisStart!).toBeLessThan(5000); // Analysis under 5s
        expect(votingEnd! - votingStart!).toBeLessThan(3000); // Voting under 3s
        expect(discussionEnd! - discussionStart!).toBeLessThan(8000); // Discussion under 8s
      }
    });
  });
}); 