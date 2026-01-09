# Plan: Email Your Sample Kit to Amber

## Summary

Enable users to email audio samples to Amber, who will:
1. Create a sample kit for the 90s sampler
2. Generate a jam page showcasing the kit
3. Commit, deploy, and reply with links

## Architecture

```
User emails amber@intheamber.com with WAV attachments
    ↓
email-webhooks.ts extracts attachments
    ↓
Upload to Supabase Storage (temp bucket)
    ↓
Pass URLs + filenames to runAmberEmailAgent()
    ↓
Agent (via prompt) detects sample kit intent
    ↓
Agent downloads samples, creates kit structure, generates jam page
    ↓
Agent commits and pushes via GitHub API
    ↓
Agent waits for deploy, sends reply email with links
```

## Files to Modify

### 1. `sms-bot/lib/sms/email-webhooks.ts`

**Changes:**
- Extract audio files from `req.files` (already parsed by multer)
- Filter for audio MIME types (audio/*, .wav, .mp3, .aiff, .ogg)
- Upload to Supabase Storage bucket
- Pass attachment info to `runAmberEmailAgent()`

**Location:** Lines 937-1035 (inside `/parse-inbound` handler)

**New code (after line 943):**
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

**Pass to agent:** Add `attachments` parameter to `runAmberEmailAgent()` calls (lines 857, 614, 491)

**Store with pending approvals:** When a stranger sends samples, store attachment URLs in the approval metadata so they're available when approved:
```typescript
// In storePendingApproval() - add attachments to metadata
await supabase.from('amber_state').insert({
  type: 'pending_approval',
  content: body,
  metadata: {
    // ... existing fields
    attachments,  // NEW: store attachment URLs
  },
});
```

### 2. `sms-bot/agents/amber-email/index.ts`

**Changes:**
- Extend `runAmberEmailAgent` function signature to accept attachments
- Pass attachments in the JSON input to Python agent

**Current signature:**
```typescript
export async function runAmberEmailAgent(
  task: string,
  senderEmail: string,
  subject: string,
  isApprovedRequest: boolean = false,
  thinkhard: boolean = false
): Promise<AmberEmailResult>
```

**New signature:**
```typescript
export interface EmailAttachment {
  name: string;
  url: string;
  size: number;
}

export async function runAmberEmailAgent(
  task: string,
  senderEmail: string,
  subject: string,
  isApprovedRequest: boolean = false,
  thinkhard: boolean = false,
  attachments: EmailAttachment[] = []
): Promise<AmberEmailResult>
```

**Update agentInput (around line 45):**
```typescript
const agentInput = {
  task,
  sender_email: senderEmail,
  subject,
  is_approved_request: isApprovedRequest,
  thinkhard,
  skip_deploy_wait: true,
  attachments,  // NEW
};
```

### 3. `sms-bot/agents/amber-email/agent.py`

**Changes:**
- Parse `attachments` from input JSON
- Inject attachment context into the system prompt
- Add sample kit detection and handling instructions

**In `run_amber_task()` function:**
```python
attachments = input_data.get("attachments", [])

# Build attachment context for prompt
attachment_context = ""
if attachments:
    audio_files = [a for a in attachments if a.get("name", "").lower().endswith((".wav", ".mp3", ".aiff", ".ogg"))]
    if audio_files:
        attachment_context = "\n## Audio Attachments Received\n"
        for att in audio_files:
            attachment_context += f"- {att['name']} ({att['size']} bytes): {att['url']}\n"
        attachment_context += "\nThis looks like a sample kit upload. See instructions below.\n"
```

**Add to system prompt (sample kit instructions):**
```
## Sample Kit Upload Instructions

If you receive audio attachments, the user is likely sending you samples for a new drum kit.

### Steps to Create a Kit:

1. **Analyze the samples**: Look at filenames to determine instrument types
   - Common patterns: kick, snare, hat, clap, tom, perc, fx
   - Assign to slots s1-s10 in this order: kicks → snares → claps → hats → toms → percussion → fx

2. **Generate kit metadata**:
   - Kit ID: lowercase, hyphenated (e.g., "moog-dark")
   - Kit name: Title case, descriptive (e.g., "Moog Dark")
   - Instrument names: Full name (e.g., "Moog Kick")
   - Short names: 2 chars (e.g., "MK")

3. **Download and save samples**:
   - Use curl to download from URLs
   - Save to web/public/90s/kits/{kit-id}/samples/s1.wav through s10.wav
   - If fewer than 10 samples, duplicate the most versatile ones

4. **Create kit.json**:
   ```json
   {
     "name": "Kit Name",
     "description": "Description from user's email",
     "slots": [
       { "id": "s1", "name": "Instrument Name", "short": "IN" },
       ...
     ]
   }
   ```

5. **Update index.json**: Add entry to web/public/90s/kits/index.json

6. **Create a jam page**:
   - Save to web/public/90s/{kit-id}-jam.html
   - Use amber-track.html as a template
   - Create a pattern that showcases the samples

7. **Commit and push**: Include all files in one commit

8. **Reply with links**:
   - Sampler: kochi.to/90s/ui/r9ds/ (select new kit from dropdown)
   - Jam page: kochi.to/90s/{kit-id}-jam.html
```

## Supabase Storage Setup

**Bucket:** `90s-kits` (NEW - needs to be created)

**Creation SQL:**
```sql
-- Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('90s-kits', '90s-kits', true);

-- Allow public read access
CREATE POLICY "Public read access for 90s-kits"
ON storage.objects FOR SELECT
USING (bucket_id = '90s-kits');

-- Allow service role to upload
CREATE POLICY "Service role upload for 90s-kits"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = '90s-kits');
```

**Cleanup:** Consider a cleanup job for old uploads in `email-uploads/` folder

## Permission Model

**Anyone can email samples, but non-admin uploads require approval:**

1. **Bart emails samples** → Direct processing (no approval needed)
2. **Stranger emails samples** → Queued for approval (existing flow)
   - Amber emails Bart: "Someone sent samples for a kit. Approve?"
   - Bart replies "approve" → Agent creates kit
   - Bart replies "deny" → Polite rejection email

This uses the existing approval system in `email-webhooks.ts` (lines 329-366).

**Note:** The attachment info must be stored with the pending approval so it's available when approved.

## Kit Structure Reference

```
web/public/90s/kits/{kit-id}/
├── kit.json
└── samples/
    ├── s1.wav
    ├── s2.wav
    └── ... through s10.wav

web/public/90s/kits/index.json  # Add entry here
web/public/90s/{kit-id}-jam.html  # New jam page
```

**kit.json format:**
```json
{
  "name": "Kit Display Name",
  "description": "Optional description",
  "slots": [
    { "id": "s1", "name": "Kick", "short": "KK" },
    { "id": "s2", "name": "Snare", "short": "SN" },
    { "id": "s3", "name": "Clap", "short": "CP" },
    { "id": "s4", "name": "Closed Hat", "short": "CH" },
    { "id": "s5", "name": "Open Hat", "short": "OH" },
    { "id": "s6", "name": "Tom Low", "short": "TL" },
    { "id": "s7", "name": "Tom Mid", "short": "TM" },
    { "id": "s8", "name": "Crash", "short": "CR" },
    { "id": "s9", "name": "Ride", "short": "RD" },
    { "id": "s10", "name": "Perc", "short": "PC" }
  ]
}
```

**index.json format:**
```json
{
  "kits": [
    { "id": "amber", "name": "Amber Kit", "path": "/90s/kits/amber" },
    { "id": "new-kit", "name": "New Kit", "path": "/90s/kits/new-kit" }
  ]
}
```

## Implementation Order

1. **Supabase bucket** - Create/verify `90s-kits` bucket exists with public read
2. **email-webhooks.ts** - Add attachment extraction and upload (~30 lines)
3. **index.ts** - Extend function signature and pass attachments (~10 lines)
4. **agent.py** - Parse attachments and add to prompt (~20 lines)
5. **System prompt** - Add sample kit instructions (in agent.py or separate file)
6. **Test** - Email samples to amber@intheamber.com and verify flow

## Verification Steps

1. **Unit test attachment extraction**:
   - Mock `req.files` with audio files
   - Verify upload to Supabase succeeds
   - Verify URLs are correctly formatted

2. **Integration test**:
   - Send test email with 3-5 WAV files to amber@intheamber.com
   - Verify agent receives attachments
   - Verify kit is created at correct path
   - Verify index.json is updated
   - Verify jam page is created
   - Verify commit and push succeeds
   - Verify reply email contains correct links

3. **End-to-end test**:
   - Wait for Railway deploy (~7 min)
   - Visit kochi.to/90s/ui/r9ds/ and select new kit
   - Visit jam page and verify playback works

## Edge Cases to Handle

| Case | Handling |
|------|----------|
| 0 audio files | Not a kit upload, process as normal email |
| 1-9 files | Duplicate samples to fill 10 slots |
| 11+ files | Pick best 10 based on filename analysis |
| Non-WAV formats | Convert or reject with message |
| Duplicate filenames | Append timestamp or index |
| No user description | Infer kit name from filenames |
| Very large files (>10MB each) | Reject with size limit message |

## Estimated Effort

| Component | Lines of Code | Complexity |
|-----------|---------------|------------|
| Webhook (extraction + upload) | ~40 | Easy |
| Agent interface (signature) | ~15 | Easy |
| Agent prompt (instructions) | ~50 | Medium |
| Testing | N/A | Medium |

**Total: ~105 lines of code + prompt engineering**
