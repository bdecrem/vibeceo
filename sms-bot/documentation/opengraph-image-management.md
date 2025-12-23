# OG Image Management

This document covers all aspects of OpenGraph (OG) image management for WEBTOYS apps.

## Current System (Simplified Type-Based)

**As of August 4, 2025, we're using a simplified type-based OG image system:**

Each app type gets a standard OG image:
- **Games** → `/og-types/og-type-game.png`
- **Web pages** → `/og-types/og-type-web.png`
- **Music apps** → `/og-types/og-type-music.png`
- **ZAD/Apps** → `/og-types/og-type-app.png`
- **Fallback** → `/og-types/og-type-fallback.png` (when no type specified)
- **Memes** → Continue using their generated images (no change)

### How It Works
1. The API checks the app's `type` field in the database
2. Returns the appropriate static OG image URL based on type
3. Memes still use their DALL-E generated images via `og_second_chance` field

### Updating OG Images
1. Replace the images in `/web/public/og-types/`
2. Use the same filenames
3. All new apps will immediately use the updated images
4. Consider adding version numbers or cache-busting for updates

### Image Locations
- **Development**: `/web/public/og-types/`
- **Production**: Served from the web app's public folder

---

## Previous System (Temporarily Disabled)

The following advanced OG generation system is commented out but preserved for potential future use.

### Overview

WEBTOYS apps could have custom OG images through two approaches:

1. **Manual Upload** - Upload custom images for specific apps
2. **Automated Generation** - AI-generated images for trending apps

### Manual OG Image Upload

#### How It Works
1. Drop image files in `web/UPLOADS/` with specific naming
2. Run script to process and upload to Supabase
3. Database is updated with new OG image URL

#### Filename Format
Files must follow this pattern:
- `user-app-anything.extension` (with dashes)
- `user_app_anything.extension` (with underscores)

Examples:
- `bart-crimson-rabbit-custom.png` → Updates `bart/crimson-rabbit`
- `jane_azure_tiger_v2.jpg` → Updates `jane/azure-tiger`

#### Commands

```bash
# Process all files in UPLOADS/
npm run replace-og-from-upload

# Process specific file
npm run build && node dist/scripts/replace-og-from-upload.js filename.png

# Test the system
npm run test:og-upload
```

#### Process Flow
1. **Parse filename** to extract user_slug and app_slug
2. **Verify app exists** in wtaf_content table
3. **Upload image** to Supabase Storage og-images bucket
4. **Update database** with new og_image_url
5. **Delete original** file from UPLOADS/

#### Requirements
- Image formats: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`
- App must exist in database
- Proper environment variables configured

### Automated OG Generation for Trending Apps

#### Overview
A 3-step pipeline that automatically generates custom OG images for trending apps:
1. ChatGPT analyzes app HTML and creates custom image
2. Image is downloaded and uploaded to Supabase
3. Meta tags are fixed in the HTML

#### Commands

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

#### Process Flow

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

#### Output Example
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

#### Performance
- Sequential processing with 2-second delays
- ~15-30 seconds per app
- Use `--skip-existing` for faster runs

## Environment Requirements

Required in `.env.local`:

```bash
# Database and Storage
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# For automated generation only (currently disabled)
OPENAI_API_KEY=sk-...              # ChatGPT image generation
HTMLCSS_USER_ID=...                # HTML-to-image service
HTMLCSS_API_KEY=...                # HTML-to-image service
```

## Database Schema

The `wtaf_content` table stores OG image information:
- `og_image_url` - Full URL to the OG image
- `og_image_cached_at` - Timestamp of last update
- `type` - App type (game, web, music, zad, meme)

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

## Special Fields

### og_second_chance Field
The `og_second_chance` field is a failsafe mechanism for content that generates its own OG images (like memes):
- **Purpose**: Prevents race conditions where web API overwrites SMS-generated OG images
- **Priority**: APIs check this field FIRST before any other OG image field
- **Use case**: Memes write their final image URL here to ensure it's never overwritten

## Troubleshooting

### Type-Based System Issues

**"Wrong OG image showing"**
- Check the app's `type` field in the database
- Verify the type images exist in `/web/public/og-types/`
- Clear browser/social media caches

**"Updated images not showing"**
- Add cache-busting query parameters
- Consider versioned filenames
- Wait for CDN cache to expire

### Manual Upload Issues (When Re-enabled)

**"App not found in database"**
- Verify app exists with correct user_slug/app_slug
- Check filename parsing (user-app format)

**"Failed to upload to Supabase Storage"**
- Check Supabase credentials
- Verify og-images bucket exists

### Automated Generation Issues (When Re-enabled)

**"Failed to fetch trending apps"**
- Check internet connection
- Verify API endpoint is accessible

**"Failed to generate OG image"**
- Check OpenAI API credit balance
- Verify HTML content is valid

**"OPENAI_API_KEY not found"**
- Ensure all required environment variables are set
- Check for typos in variable names

### OG Images Not Showing in Development

**"Wrong OG image showing on local dev"**
- Add `NEXT_PUBLIC_APP_URL=http://localhost:3000` to `web/.env.local`
- Without this, Next.js calls production API instead of local
- Restart Next.js server after adding environment variable

**"Meme OG images being overwritten"**
- Memes should write to `og_second_chance` field
- Web API checks `og_second_chance` first before generating new images
- This prevents race conditions between SMS bot and web API

## Route-Level Social Images (Next.js Static Pages)

For static pages like `/csx`, `/kochi`, `/amber` (not WEBTOYS apps), use Next.js file conventions.

### The Twitter Problem

Twitter's crawler **prefers** `twitter:image` over `og:image`. If you only have an OpenGraph image, Twitter cards often show blank or broken images. You need **both**.

### File Convention

Place these files in your route folder (e.g., `web/app/csx/`):

| File | Generates Route | Meta Tag |
|------|-----------------|----------|
| `opengraph-image.tsx` or `.png` | `/csx/opengraph-image` | `og:image` |
| `twitter-image.tsx` or `.png` | `/csx/twitter-image` | `twitter:image` |

### Option 1: Static PNG Files

Simplest approach — just drop image files in the route folder:

```
web/app/kochi/
├── page.tsx
├── opengraph-image.png    ← 1200x630px
└── twitter-image.png      ← Can be same image, just copy it
```

### Option 2: Dynamic TSX Files

For images stored elsewhere (e.g., `public/` folder):

```tsx
// web/app/csx/opengraph-image.tsx
import { readFileSync } from 'fs'
import { join } from 'path'

export const alt = 'CTRL SHIFT • LONG HORIZON LAB'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  const imagePath = join(process.cwd(), 'public', 'csx-og.png')
  const imageBuffer = readFileSync(imagePath)

  return new Response(imageBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
```

Create an identical `twitter-image.tsx` file in the same folder.

### Metadata Setup

In your `layout.tsx` or `page.tsx`, include twitter card type:

```tsx
export const metadata: Metadata = {
  title: 'Page Title',
  description: 'Page description',
  openGraph: {
    title: 'Page Title',
    description: 'Page description',
    type: 'website',
    // No 'images' needed — opengraph-image.tsx handles it
  },
  twitter: {
    card: 'summary_large_image',  // Required for large image cards
    title: 'Page Title',
    description: 'Page description',
    // No 'images' needed — twitter-image.tsx handles it
  },
}
```

### Testing Twitter Cards

Twitter caches aggressively. After deploying:

1. Go to [Twitter Card Validator](https://cards-dev.twitter.com/validator)
2. Paste your URL
3. Click "Preview card" to force a fresh fetch

If validator is down, tweet the link — first tweet triggers a fresh fetch.

### Viewport for Full-Bleed iPhone Display

To extend page background to iPhone notch/Dynamic Island edges (like The Verge), you need **three things**:

#### 1. Enable viewport-fit=cover

```tsx
// web/app/layout.tsx (or route-specific layout)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',  // Extends viewport behind notch/home indicator
}
```

#### 2. Set background on html AND body (CRITICAL!)

This is the part everyone misses. `viewport-fit=cover` extends the viewport, but **Safari fills the safe area with the `html` element's background** — not your container div's background.

```css
/* In your page's inline styles or CSS */
html {
  background: #0a0a0a;  /* Your dark background */
}

body {
  margin: 0;
  padding: 0;
  background: #0a0a0a;  /* Same color */
}

.your-container {
  background: #0a0a0a;  /* Also here for good measure */
}
```

**Why this matters:** If you only set background on `.container`, the safe area shows whatever `html`'s background is (often white from globals.css or Tailwind defaults).

#### 3. Add safe-area padding to content

Keep your text/content from hiding under the notch:

```css
.container {
  padding: 24px;
  padding-top: calc(24px + env(safe-area-inset-top));
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}
```

The `env()` values are 0 on normal screens but expand on iPhones with notches.

#### Complete Example

```tsx
// page.tsx with full-bleed dark background
<style jsx global>{`
  html {
    background: #0a0a0a;
  }
  body {
    margin: 0;
    padding: 0;
    background: #0a0a0a;
  }
  .page {
    min-height: 100vh;
    background: #0a0a0a;
    padding: 24px;
    padding-top: calc(24px + env(safe-area-inset-top));
    padding-bottom: calc(24px + env(safe-area-inset-bottom));
  }
`}</style>
```

#### Debugging Checklist

If full-bleed isn't working:
1. ✅ `viewportFit: 'cover'` in viewport config?
2. ✅ `background` set on `html` element (not just body or container)?
3. ✅ `background` set on `body` element?
4. ✅ No conflicting styles from globals.css overriding your background?

---

## Best Practices

1. **Image Dimensions**: Use 1200x630px for optimal display
2. **File Size**: Keep under 1MB for fast loading
3. **Content**: Make images relevant to the app's purpose
4. **Testing**: Always verify OG images display correctly on social platforms
5. **Backup**: Consider keeping original images before replacement

## Scripts Location

- Manual upload: `scripts/replace-og-from-upload.ts`
- Automated generation: `scripts/trending-og-workflow.ts` (currently disabled)
- OG generator: `experiments/chatgpt/generate-og.js` (currently disabled)
- Meta tag fixer: `scripts/fix-og-meta-tags.ts`
- API endpoint: `web/app/api/generate-og-cached/route.ts`

---
*Last Updated: December 2025*
*Note: Advanced OG generation features are temporarily disabled in favor of type-based system*