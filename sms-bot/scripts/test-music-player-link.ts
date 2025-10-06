import assert from 'node:assert/strict';
import { buildAiDailyMusicPlayerUrl, buildMusicPlayerUrl } from '../lib/utils/music-player-link.js';
import type { AiDailyEpisode } from '../lib/sms/ai-daily.js';

function createEpisode(overrides: Partial<AiDailyEpisode>): AiDailyEpisode {
  return {
    topicId: 'ai-daily',
    topicTitle: 'AI Daily',
    episodeId: 123,
    episodeNumber: 123,
    title: 'Custom Title',
    publishedAt: '2025-10-05T14:00:00Z',
    audioUrl: 'https://example.com/audio.mp3',
    snippet: 'Short snippet',
    transcriptLength: 0,
    wordCount: 0,
    updatedAt: '2025-10-05T14:00:00Z',
    currentEpisodeNumber: 123,
    ...overrides,
  } as AiDailyEpisode;
}

function assertTruncation(value: string | null): asserts value {
  assert.ok(value, 'description should be set');
  assert.ok(value.endsWith('…'), 'description should end with ellipsis');
  assert.ok(value.length <= 160, 'description should be capped at 160 chars');
}

const originalBaseUrl = process.env.SHORTLINK_BASE_URL;
process.env.SHORTLINK_BASE_URL = 'https://player.test/';

try {
  const episode = createEpisode({});
  const url = buildAiDailyMusicPlayerUrl(episode);
  const parsed = new URL(url);
  assert.equal(`${parsed.protocol}//${parsed.host}`, 'https://player.test');
  assert.equal(parsed.pathname, '/music-player');

  const params = parsed.searchParams;
  assert.equal(params.get('src'), episode.audioUrl);
  assert.equal(params.get('title'), episode.title);
  assert.equal(params.get('description'), episode.snippet);
  assert.equal(params.get('autoplay'), '1');

  const longSnippet = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. '.repeat(3);
  const fallbackEpisode = createEpisode({
    title: '   ',
    snippet: longSnippet,
  });

  const fallbackUrl = buildAiDailyMusicPlayerUrl(fallbackEpisode);
  const fallbackParsed = new URL(fallbackUrl);
  assert.equal(`${fallbackParsed.protocol}//${fallbackParsed.host}`, 'https://player.test');

  const fallbackParams = fallbackParsed.searchParams;
  const expectedTitleFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'short',
    day: 'numeric',
  });
  const expectedTitle = `AI Daily ${expectedTitleFormatter.format(new Date(fallbackEpisode.publishedAt))}`;
  assert.equal(fallbackParams.get('title'), expectedTitle);
  assertTruncation(fallbackParams.get('description'));
  assert.equal(fallbackParams.get('autoplay'), '1');

  const genericUrl = buildMusicPlayerUrl({
    src: 'https://cdn.example.com/audio.mp3',
    title: ' Generic Title ',
    description: '   Short generic description.   ',
  });

  const genericParsed = new URL(genericUrl);
  assert.equal(genericParsed.searchParams.get('title'), 'Generic Title');
  assert.equal(genericParsed.searchParams.get('description'), 'Short generic description.');
  assert.equal(genericParsed.searchParams.get('autoplay'), '1');

  const fallbackGenericUrl = buildMusicPlayerUrl({
    src: 'https://cdn.example.com/audio.mp3',
    title: '   ',
    description: '   ',
    autoplay: false,
  });

  const fallbackGenericParsed = new URL(fallbackGenericUrl);
  assert.equal(fallbackGenericParsed.searchParams.get('title'), 'Audio track');
  assert.equal(fallbackGenericParsed.searchParams.get('description'), null);
  assert.equal(fallbackGenericParsed.searchParams.get('autoplay'), null);

  console.log('✅ music player link helper tests passed');
} finally {
  if (originalBaseUrl === undefined) {
    delete process.env.SHORTLINK_BASE_URL;
  } else {
    process.env.SHORTLINK_BASE_URL = originalBaseUrl;
  }
}
