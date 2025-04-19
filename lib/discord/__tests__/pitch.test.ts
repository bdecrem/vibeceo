import { analyzePitch } from '../pitchAnalysis.js';
import { handlePitchCommand, triggerPitchChat } from '../pitch.js';
import { Message, Client } from 'discord.js';

// Mock Discord.js Message
const mockMessage = {
  channelId: 'test-channel',
  reply: jest.fn(),
  channel: {
    send: jest.fn()
  }
} as unknown as Message;

// Mock Discord.js Client
const mockClient = {
  channels: {
    fetch: jest.fn().mockResolvedValue({
      isTextBased: () => true,
      send: jest.fn()
    })
  }
} as unknown as Client;

describe('Pitch Analysis', () => {
  test('analyzes joke pitches correctly', () => {
    const jokePitch = 'AI-powered toaster that writes poetry';
    const analysis = analyzePitch(jokePitch);
    expect(analysis.jokeScore).toBeGreaterThan(7);
    expect(analysis.noveltyScore).toBeGreaterThan(5);
  });

  test('analyzes serious pitches correctly', () => {
    const seriousPitch = 'B2B SaaS platform for enterprise AI integration with focus on data security and compliance';
    const analysis = analyzePitch(seriousPitch);
    expect(analysis.jokeScore).toBeLessThan(3);
    expect(analysis.feasibilityScore).toBeGreaterThan(5);
  });

  test('analyzes underdeveloped pitches correctly', () => {
    const underdevelopedPitch = 'waffle stand';
    const analysis = analyzePitch(underdevelopedPitch);
    expect(analysis.developmentScore).toBeGreaterThan(7);
  });
});

describe('Pitch Command Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('handles valid pitch command', async () => {
    const idea = 'AI-powered toaster that writes poetry';
    await handlePitchCommand(mockMessage, idea);
    expect(mockMessage.reply).toHaveBeenCalled();
  });

  test('prevents multiple active pitches', async () => {
    const idea = 'Test idea';
    await handlePitchCommand(mockMessage, idea);
    await handlePitchCommand(mockMessage, idea);
    expect(mockMessage.reply).toHaveBeenCalledWith(
      'There is already an active pitch discussion in this channel. Please wait for it to finish.'
    );
  });
});

describe('Scheduled Pitch Chat', () => {
  test('triggers pitch chat successfully', async () => {
    await triggerPitchChat('test-channel', mockClient);
    expect(mockClient.channels.fetch).toHaveBeenCalledWith('test-channel');
  });

  test('handles invalid channel', async () => {
    const mockInvalidClient = {
      channels: {
        fetch: jest.fn().mockResolvedValue(null)
      }
    } as unknown as Client;
    await triggerPitchChat('invalid-channel', mockInvalidClient);
    // Should not throw error
  });
});

// Test cases for different pitch types
const testCases = [
  {
    name: 'Joke Pitch',
    pitch: 'AI-powered toaster that writes poetry',
    expected: {
      jokeScore: 'high',
      noveltyScore: 'high',
      feasibilityScore: 'low'
    }
  },
  {
    name: 'Serious Pitch',
    pitch: 'B2B SaaS platform for enterprise AI integration with focus on data security and compliance',
    expected: {
      jokeScore: 'low',
      feasibilityScore: 'high',
      developmentScore: 'high'
    }
  },
  {
    name: 'Underdeveloped Pitch',
    pitch: 'waffle stand',
    expected: {
      developmentScore: 'high',
      feasibilityScore: 'medium'
    }
  },
  {
    name: 'Novel Pitch',
    pitch: 'Quantum computing platform for optimizing supply chain logistics',
    expected: {
      noveltyScore: 'high',
      feasibilityScore: 'medium'
    }
  }
];

describe('Pitch Analysis Edge Cases', () => {
  testCases.forEach(({ name, pitch, expected }) => {
    test(`analyzes ${name} correctly`, () => {
      const analysis = analyzePitch(pitch);
      
      if (expected.jokeScore === 'high') {
        expect(analysis.jokeScore).toBeGreaterThan(7);
      } else if (expected.jokeScore === 'low') {
        expect(analysis.jokeScore).toBeLessThan(3);
      }

      if (expected.noveltyScore === 'high') {
        expect(analysis.noveltyScore).toBeGreaterThan(7);
      }

      if (expected.feasibilityScore === 'high') {
        expect(analysis.feasibilityScore).toBeGreaterThan(7);
      } else if (expected.feasibilityScore === 'medium') {
        expect(analysis.feasibilityScore).toBeGreaterThan(3);
        expect(analysis.feasibilityScore).toBeLessThan(7);
      } else if (expected.feasibilityScore === 'low') {
        expect(analysis.feasibilityScore).toBeLessThan(3);
      }

      if (expected.developmentScore === 'high') {
        expect(analysis.developmentScore).toBeGreaterThan(7);
      }
    });
  });
}); 