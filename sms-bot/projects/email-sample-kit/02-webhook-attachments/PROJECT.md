# Project: Webhook Attachment Handling

## Context
Modify the email webhook to extract audio attachments, upload them to Supabase Storage, and pass URLs to the agent.

## Tasks
- [x] Extract `req.files` from multer (already parsed, just not accessed)
- [x] Filter for audio MIME types (audio/*, .wav, .mp3, .aiff, .ogg)
- [x] Upload audio files to Supabase Storage bucket
- [x] Pass attachment URLs to `runAmberEmailAgent()` calls (3 locations)
- [x] Store attachments in pending approval metadata for stranger emails

## Completion Criteria
- [x] Audio files extracted from emails
- [x] Files uploaded to Supabase with public URLs
- [x] Agent receives attachment info

## Notes
**File:** `sms-bot/lib/sms/email-webhooks.ts`

**Key locations:**
- Line 934: multer already configured with `memoryStorage()`
- Line 937: `/parse-inbound` handler
- Line 943: Currently only extracts `from, to, subject, text`
- Lines 857, 614, 491: `runAmberEmailAgent()` calls to update

**New code after line 943:**
```typescript
// Extract audio attachments
const files = (req.files as Express.Multer.File[]) || [];
const audioFiles = files.filter(f =>
  f.mimetype?.startsWith('audio/') ||
  /\.(wav|mp3|aiff|ogg|flac)$/i.test(f.originalname)
);

// Upload to Supabase Storage if we have audio
const attachments: { name: string; url: string; size: number }[] = [];
if (audioFiles.length > 0) {
  for (const file of audioFiles) {
    const path = `email-uploads/${Date.now()}-${file.originalname}`;
    const { error } = await supabase.storage
      .from('90s-kits')
      .upload(path, file.buffer, { contentType: file.mimetype });

    if (!error) {
      const { data } = supabase.storage.from('90s-kits').getPublicUrl(path);
      attachments.push({
        name: file.originalname,
        url: data.publicUrl,
        size: file.size
      });
    }
  }
}
```
