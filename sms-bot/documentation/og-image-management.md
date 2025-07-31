# OG Image Management

This document covers all aspects of OpenGraph (OG) image management for WEBTOYS apps, including manual uploads and automated generation.

## Overview

WEBTOYS apps can have custom OG images for better social media sharing. There are two main approaches:

1. **Manual Upload** - Upload custom images for specific apps
2. **Automated Generation** - AI-generated images for trending apps

## Manual OG Image Upload

### How It Works
1. Drop image files in `web/UPLOADS/` with specific naming
2. Run script to process and upload to Supabase
3. Database is updated with new OG image URL

### Filename Format
Files must follow this pattern:
- `user-app-anything.extension` (with dashes)
- `user_app_anything.extension` (with underscores)

Examples:
- `bart-crimson-rabbit-custom.png` → Updates `bart/crimson-rabbit`
- `jane_azure_tiger_v2.jpg` → Updates `jane/azure-tiger`

### Commands

```bash
# Process all files in UPLOADS/
npm run replace-og-from-upload

# Process specific file
npm run build && node dist/scripts/replace-og-from-upload.js filename.png

# Test the system
npm run test:og-upload
```

### Process Flow
1. **Parse filename** to extract user_slug and app_slug
2. **Verify app exists** in wtaf_content table
3. **Upload image** to Supabase Storage og-images bucket
4. **Update database** with new og_image_url
5. **Delete original** file from UPLOADS/

### Requirements
- Image formats: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`
- App must exist in database
- Proper environment variables configured

## Automated OG Generation for Trending Apps

### Overview
A 3-step pipeline that automatically generates custom OG images for trending apps:
1. ChatGPT analyzes app HTML and creates custom image
2. Image is downloaded and uploaded to Supabase
3. Meta tags are fixed in the HTML

### Commands

```bash
# Process all trending apps
npm run trending-og-workflow

# Process specific items (by position on trending page)
npm run trending-og-workflow -- --items 1,3,5,11,13

# Preview mode (dry run)
npm run trending-og-workflow -- --dry-run

# Skip apps that already have OG images
npm run trending-og-workflow -- --skip-existing

# Combined options
npm run trending-og-workflow -- --items 2,4,6 --skip-existing --dry-run
```

### Process Flow

```
Trending API → App List → For Each App:
                             ↓
                        Fetch HTML from DB
                             ↓
                   ChatGPT Analyzes & Generates OG
                             ↓
                 Download & Upload to Supabase
                             ↓
                   Update DB + Fix Meta Tags
```

### Output Example
```
============================================================
🎯 Processing App #1: bart/jade-jaguar-singing
📝 Prompt: "build a links page with all the pages..."
============================================================
🎨 Generating OG image...
✅ Generated: https://hcti.io/v1/image/abc123...
📥 Downloading and uploading...
☁️ Uploaded to Supabase Storage
✅ Database updated
✅ Meta tags processed
🌐 Final URL: https://xyz.supabase.co/storage/v1/object/public/og-images/bart-jade-jaguar-singing.png
```

### Performance
- Sequential processing with 2-second delays
- ~15-30 seconds per app
- Use `--skip-existing` for faster runs

## Environment Requirements

Required in `.env.local`:

```bash
# Database and Storage
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# For automated generation only
OPENAI_API_KEY=sk-...              # ChatGPT image generation
HTMLCSS_USER_ID=...                # HTML-to-image service
HTMLCSS_API_KEY=...                # HTML-to-image service
```

## Database Schema

The `wtaf_content` table stores OG image information:
- `og_image_url` - Full URL to the OG image
- `og_image_cached_at` - Timestamp of last update

## Storage Structure

Images are stored in Supabase Storage:
- Bucket: `og-images`
- Path: `user-app-slug.extension`
- Public URL: `https://[project].supabase.co/storage/v1/object/public/og-images/[filename]`

## Meta Tag Management

The system ensures proper OG meta tags in HTML:
```html
<meta property="og:image" content="[og-image-url]">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
```

## Troubleshooting

### Manual Upload Issues

**"App not found in database"**
- Verify app exists with correct user_slug/app_slug
- Check filename parsing (user-app format)

**"Failed to upload to Supabase Storage"**
- Check Supabase credentials
- Verify og-images bucket exists

### Automated Generation Issues

**"Failed to fetch trending apps"**
- Check internet connection
- Verify API endpoint is accessible

**"Failed to generate OG image"**
- Check OpenAI API credit balance
- Verify HTML content is valid

**"OPENAI_API_KEY not found"**
- Ensure all required environment variables are set
- Check for typos in variable names

## Best Practices

1. **Image Dimensions**: Use 1200x630px for optimal display
2. **File Size**: Keep under 1MB for fast loading
3. **Content**: Make images relevant to the app's purpose
4. **Testing**: Always verify OG images display correctly on social platforms
5. **Backup**: Consider keeping original images before replacement

## Scripts Location

- Manual upload: `scripts/replace-og-from-upload.ts`
- Automated generation: `scripts/trending-og-workflow.ts`
- OG generator: `experiments/chatgpt/generate-og.js`
- Meta tag fixer: `scripts/fix-og-meta-tags.ts`

---
*Last Updated: January 2025*