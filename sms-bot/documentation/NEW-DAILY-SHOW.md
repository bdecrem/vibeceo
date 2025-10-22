# Building a New Daily Show (SMS Bot + Crash App)

This guide walks through the exact steps we now follow for daily shows like Crypto Daily and Peer Review Fight Club. Follow it whenever you add a new agent inside `sms-bot/agents/`.

---

## 1. Generate The Audio (MP3)

1. Produce the script/markdown however your agent needs. The agent runner (Python, TypeScript, etc.) should hand back:
   - the `markdown`/transcript
   - a short `summary`
   - the ISO `date`
2. Convert the script to an MP3 using ElevenLabs or your preferred TTS provider.
   - We use the ElevenLabs provider in `sms-bot/agents/crypto-research/podcast.ts` as the reference.
   - Make sure audio comes back as a Node `Buffer` that you can upload.

## 2. Store Audio In Supabase Storage

1. Upload the MP3 into the shared public bucket `audio` so both the SMS bot and Crash app can see it.
   - Path convention: `topics/<topicId>/episodes/<ISO-DATE>.mp3`
   - The helper code in `uploadAndLinkAudio()` (Crypto Daily) shows the pattern. Reuse it and adjust the `topicId`.
2. Always call `ensureAudioBucketExists()` (at least once) so deployments automatically re-create the bucket if missing.
3. After uploading, grab the public URL from Supabase Storage – this is the direct MP3 link.

## 3. Create The Crash App Episode Metadata

1. Ensure there is a row in `topics` for the show (reuse `ensureTopicExists()` if you model after Crypto Daily).
2. Upsert an `episodes` row:
   - `topic_id`: your topic UUID
   - `title`: daily title (we use `Show Title — Month Day, Year`)
   - `description` / `summary`: short teaser from your transcript
   - `transcript`: full text
   - `audio_url`: the Supabase Storage URL from step 2
   - `show_notes_json`: structure with `summary`, `publishedDate`, `audio.url`, and `audio.shortLink`
   - `status`: `ready`
3. Update `topics.current_episode_id` so Crash knows which episode is “today”.
4. Save any extra data you need (links, metadata) inside `show_notes_json` so both apps stay in sync.

## 4. Build The Music-Player Link

1. Convert the MP3 URL into a player URL with our helper:
   ```ts
   import { buildMusicPlayerUrl } from '../lib/utils/music-player-link.js';

   const playerUrl = buildMusicPlayerUrl({
     src: audioUrl,
     title: episodeTitle,
     description: summary,
     autoplay: true,
   });
   ```
   - `title`: what you want to show in the UI (“Crypto Market Daily — Oct 6, 2025”).
   - `description`: short summary/snippet (under ~160 chars).
2. Try creating a short link for the player URL:
   ```ts
   import { createShortLink } from '../lib/utils/shortlink-service.js';

   const shortLink = await createShortLink(playerUrl, {
     context: '<your-agent-slug>',
     createdBy: 'sms-bot',
     createdFor: '<something descriptive>',
   });
   ```
   - This calls `/api/short-links` on whatever domain you set via `SHORTLINK_SERVICE_URL`.
   - If the short-link service is down, fall back to the raw `playerUrl`.
3. Store the short link in `show_notes_json.audio.shortLink` and in the data you return to the SMS command handler.

## 5. Send Via SMS

1. Format the message so it includes the player link:
   - Headline (with emoji) + snippet.
   - `🎧 Listen: {shortLink}`.
   - Optional: additional CTA (e.g., “Text LINKS for sources.”).
2. Use the existing broadcast scheduler + subscription helpers:
   - `registerDailyJob()` for scheduling.
   - `getAgentSubscribers` / `markAgentReportSent` for subscription tracking.
3. For on-demand commands (e.g., typing `CRYPTO` or `PEER REVIEW`), always respond with the player link from the stored episode.
   - If the stored short link is missing or still points at the raw MP3, reconstruct it with `buildMusicPlayerUrl()` before responding.

## 6. Environment Variables Checklist

Both the SMS bot and the web server need to agree on the short-link configuration:

- **SMS bot** (`sms-bot/.env.local`):
  - `SHORTLINK_SERVICE_URL` → `https://kochi.to/api/short-links` (prod) or your local Next server when testing
  - `SHORTLINK_BASE_URL` → `https://kochi.to` (prod) or `http://localhost:3000`
  - `SHORTLINK_SERVICE_TOKEN` → matches `SHORTLINK_API_TOKEN` on the web app
- **Web app** (`web/.env.local`):
  - `SHORTLINK_BASE_URL` → same as the environment serving the player
  - `SHORTLINK_API_TOKEN`

Other environment variables depend on your agent (OpenAI key, ElevenLabs key, scheduling hours). Mirror Crypto Daily when in doubt.

## 7. Local Testing Tips

- When you test locally, make sure the SMS bot points at your local web server for short links; otherwise the text will include production URLs.
- Trigger `RUN` commands to make sure the latest episode uses the new plumbing.
- You can fake a scheduler run by invoking the daily job function directly or temporarily setting the broadcast time to a couple minutes in the future.

## 8. Launch Checklist

- [ ] Runner generates transcript + summary.
- [ ] MP3 uploads to `audio/topics/<topicId>/episodes/<date>.mp3`.
- [ ] Episode metadata upserts in Supabase with `audio_url` + `show_notes_json`.
- [ ] Player URL resolves and short link is stored.
- [ ] SMS command returns the player link.
- [ ] Scheduler job broadcasts the message and marks subscribers.
- [ ] Environment variables set correctly for the target deploy (local vs production).

Once you follow these steps, your new daily show will line up with the rest of the system—same music player, same short-link service, and ready for both SMS and the Crash app.
