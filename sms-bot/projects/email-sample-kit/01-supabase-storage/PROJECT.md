# Project: Supabase Storage Setup

## Context
Create a storage bucket for email attachments. Samples are uploaded here temporarily before the agent downloads and commits them to git.

## Tasks
- [x] Create `90s-kits` bucket in Supabase
- [x] Add policies: public read, service role write

## Completion Criteria
- [x] Bucket exists and is publicly readable
- [x] Can upload via service role key

## Notes
**SQL to run:**
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

Can run via Supabase dashboard SQL editor or MCP tool.
