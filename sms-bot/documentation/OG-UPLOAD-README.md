# OG Image Upload & Replace System

This system allows you to replace OpenGraph images for WTAF apps by uploading image files to the `web/UPLOADS/` folder.

## How It Works

1. **Upload**: Drop image files in `web/UPLOADS/` with specific naming pattern
2. **Process**: Run the script to parse filenames and update database
3. **Replace**: Script uploads to Supabase Storage and updates `wtaf_content` table

## Filename Format

Files must follow this naming pattern:
- `user-app-anything.extension` (dashes)
- `user_app_anything.extension` (underscores)

Examples:
- `bart-crimson-rabbit-painting.png` → Updates `bart/crimson-rabbit`
- `user_azure_tiger_singing.jpg` → Updates `user/azure-tiger`

## Usage

### Process All Files in UPLOADS/
```bash
npm run replace-og-from-upload
```

### Process Specific File
```bash
npm run build && node dist/scripts/replace-og-from-upload.js filename.png
```

### Test the System
```bash
npm run test:og-upload

# Test and restore original URL when done
npm run build && node dist/test-scripts/test-og-upload.js --restore
```

## What the Script Does

1. **Environment Check**: Verifies Supabase credentials are loaded
2. **Connection Test**: Tests database access and bucket existence
3. **File Parsing**: Extracts `user_slug` and `app_slug` from filename
4. **Database Check**: Verifies the app exists in `wtaf_content` table
5. **Upload**: Uploads image to Supabase Storage `og-images` bucket
6. **Update**: Updates `og_image_url` and `og_image_cached_at` in database
7. **Verify**: Confirms the update worked correctly
8. **Cleanup**: Deletes the original upload file

## Requirements

- File must be an image: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`
- App must exist in `wtaf_content` table with matching `user_slug` and `app_slug`
- Supabase environment variables must be configured in `.env.local`

## Environment Variables Required

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
```

## Troubleshooting

### "App not found in database"
- Check that the app exists: query `wtaf_content` for your user/app combination
- Verify the filename parsing is correct (user-app format)

### "Failed to upload to Supabase Storage"
- Check Supabase credentials are correct
- Verify `og-images` bucket exists (script will create if missing)

### "Environment variables missing"
- Ensure `.env.local` exists in `sms-bot/` directory
- Check variable names match exactly: `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`

## Example Workflow

1. You have an app at `https://wtaf.me/bart/crimson-rabbit-painting`
2. Create/find a custom OG image for it
3. Save as `bart-crimson-rabbit-custom.png` in `web/UPLOADS/`
4. Run: `npm run replace-og-from-upload`
5. Script processes file and updates database
6. New OG image is now live at the Supabase Storage URL

## Testing

The test script (`npm run test:og-upload`) will:
- Find an existing app in your database
- Create a test image file
- Run the full upload process
- Verify the database was updated correctly
- Test that the new image URL is accessible
- Optionally restore the original URL

This ensures the entire system works end-to-end with your actual data. 