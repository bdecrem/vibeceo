#!/usr/bin/env npx tsx
/**
 * Quick script to upload audio to Supabase storage
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { loadEnv } from './lib/env.js';

loadEnv();

const audioPath = process.argv[2];
if (!audioPath) {
  console.error('Usage: npx tsx upload-audio.ts <audio-file>');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const audioBuffer = fs.readFileSync(audioPath);
const fileName = 'talking-head-' + Date.now() + '.mp3';

const { data, error } = await supabase.storage
  .from('audio')
  .upload(fileName, audioBuffer, {
    contentType: 'audio/mpeg',
    upsert: true
  });

if (error) {
  console.error('Upload error:', error);
  process.exit(1);
}

const { data: urlData } = supabase.storage
  .from('audio')
  .getPublicUrl(fileName);

console.log('\nAudio URL:', urlData.publicUrl);
