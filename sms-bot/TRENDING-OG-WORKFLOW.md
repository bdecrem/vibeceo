# 🚀 Trending OG Workflow

Automatically generates custom OG images for trending WTAF apps using a comprehensive 3-step pipeline.

## Overview

This workflow combines three separate scripts into one automated process:

1. **OG Image Generation** (`experiments/chatgpt/generate-og.js`) - ChatGPT analyzes HTML and creates custom OG images
2. **Upload & Storage** (`scripts/replace-og-from-upload.ts`) - Downloads and uploads images to Supabase Storage
3. **Meta Tag Injection** (`scripts/fix-og-meta-tags.ts`) - Ensures proper OG meta tags in HTML

## Usage

### Process All Trending Apps
```bash
npm run trending-og-workflow
```

### Process Specific Items
```bash
# Process only items 1, 3, 5, 11, and 13 from trending page
npm run trending-og-workflow -- --items 1,3,5,11,13
```

### Preview Mode (Dry Run)
```bash
# See what would be processed without making changes
npm run trending-og-workflow -- --dry-run
```

### Skip Existing
```bash
# Only process apps that don't already have OG images
npm run trending-og-workflow -- --skip-existing
```

### Combined Options
```bash
# Preview processing only items 2,4,6 while skipping existing
npm run trending-og-workflow -- --items 2,4,6 --skip-existing --dry-run
```

## What It Does

For each selected app, the workflow:

1. **📡 Fetches Trending Apps** - Gets current trending list from `/api/trending-wtaf`
2. **🎨 Generates Custom OG Image** - ChatGPT analyzes the app's HTML and creates a custom OG image that captures the app's vibe
3. **📥 Downloads & Uploads** - Downloads the generated image and uploads it to Supabase Storage
4. **💾 Updates Database** - Sets `og_image_url` and `og_image_cached_at` in `wtaf_content` table
5. **🏷️ Fixes Meta Tags** - Injects proper OpenGraph meta tags into HTML if missing

## Output

The workflow provides detailed progress for each app:

```
============================================================
🎯 Processing App #1: bart/jade-jaguar-singing
📝 Prompt: "build a links page with all the pages from the origin page..."
============================================================
🎨 Generating OG image for bart/jade-jaguar-singing...
🤖 Running ChatGPT OG generation...
✅ Generated OG image: https://hcti.io/v1/image/abc123...
📥 Downloading and uploading image for bart/jade-jaguar-singing...
📁 Downloaded image (156,789 bytes)
☁️ Uploaded to Supabase Storage: https://xyz.supabase.co/storage/v1/object/public/og-images/bart-jade-jaguar-singing.png
🔄 Updating database and meta tags for bart/jade-jaguar-singing...
✅ Updated database with OG URL
✅ Meta tags processed
✅ Successfully processed bart/jade-jaguar-singing
🌐 Final OG URL: https://xyz.supabase.co/storage/v1/object/public/og-images/bart-jade-jaguar-singing.png
```

## Final Summary

```
============================================================
🎉 WORKFLOW COMPLETE
✅ Successful: 15
❌ Failed: 2
📊 Total: 17
============================================================
```

## Requirements

- `OPENAI_API_KEY` in `.env.local` (for ChatGPT image generation)
- `HTMLCSS_USER_ID` and `HTMLCSS_API_KEY` in `.env.local` (for HTML-to-image conversion)
- `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in `.env.local` (for storage and database)
- Working internet connection (fetches trending apps from live API)

## Architecture

```
Trending Page → API → App List → For Each App:
                                    ↓
                               Fetch HTML from DB
                                    ↓
                          ChatGPT Generates OG Image
                                    ↓
                        Download & Upload to Supabase
                                    ↓
                          Update DB + Fix Meta Tags
                                    ↓
                              Report Success/Fail
```

## Error Handling

- Continues processing other apps if one fails
- Provides detailed error messages for debugging
- Reports final success/failure counts
- Safe to re-run (can skip existing OG images)

## Performance

- Processes apps sequentially with 2-second delays (API friendly)
- Typical processing time: ~15-30 seconds per app
- Use `--skip-existing` for faster subsequent runs
- Use `--dry-run` for instant previews

## Troubleshooting

**"Failed to fetch trending apps"**
- Check internet connection
- Verify ngrok tunnel is running for `theaf-web.ngrok.io`

**"App not found in database"**
- App may have been deleted or slug changed
- Re-run with `--skip-existing` to avoid problematic apps

**"OPENAI_API_KEY not found"**
- Verify `.env.local` file exists and contains all required keys
- Check environment variable spelling

**"Failed to generate OG image"**
- Check OpenAI API credit balance
- Verify HTML content is valid and not too large 