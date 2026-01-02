# /amber-blog

Publish a new blog post to both the website (data.json) and Supabase (for voice context).

## Usage

```
/amber-blog
```

Then provide:
- **Title**: The blog post title
- **Summary**: 1-2 sentence summary (this goes to Supabase for voice context)
- **Content**: Full markdown content (can include image refs like `![alt](/amber/image.png)`)
- **Tags**: Comma-separated tags
- **Images** (optional): Array of image objects if you created images

## What This Does

1. **Updates `web/app/amber/data.json`** — Adds the full blog post to the website
2. **Inserts into Supabase `amber_state`** — Adds title + summary as `blog_post` type for voice context

## Step-by-Step

### Step 1: Get today's date (REQUIRED)

**IMPORTANT**: Do NOT use your internal sense of the date. Run this command to get the actual date:

```bash
TZ=America/Los_Angeles date +%Y-%m-%d
```

Use the output as the post date. This ensures the date is correct in Pacific time.

### Step 2: Save images to correct folder

**IMPORTANT**: All images MUST be saved to `/web/public/amber/` (not `/web/public/`).

When generating images with DALL-E or other tools:
```bash
# CORRECT - save to amber folder
curl -o /Users/bart/Documents/code/vibeceo/web/public/amber/my-image.png "..."

# WRONG - do not save to root public folder
curl -o /Users/bart/Documents/code/vibeceo/web/public/my-image.png "..."
```

**For screenshots of web pages/toys** (Puppeteer workflow):
```
# 1. Navigate to the page
mcp__puppeteer__puppeteer_navigate(url="https://kochi.to/amber/my-toy.html")

# 2. Take screenshot with encoded=true (returns base64 in temp file)
mcp__puppeteer__puppeteer_screenshot(name="shot", width=800, height=600, encoded=true)

# 3. Note the temp file path from "Output has been saved to..." message

# 4. Extract and save to amber folder
node drawer/scripts/capture-screenshot.js <temp-file-path> my-screenshot
# Saves to web/public/amber/my-screenshot.png
```

Full workflow docs: `drawer/SCREENSHOTS.md`

Image references in content should use `/amber/filename.png` (not `/filename.png`).

### Step 3: Gather the content

If you just wrote a blog post, you should have:
- Title
- Summary (1-2 sentences)
- Full content (markdown with images like `![alt text](/amber/image.png)`)
- Tags
- Any images you created (already saved to `/web/public/amber/`)

### Step 4: Read current data.json

```bash
cat web/app/amber/data.json
```

### Step 5: Create the new post object

Structure:
```json
{
  "id": "slug-from-title",
  "title": "Your Title",
  "date": "YYYY-MM-DD",
  "summary": "1-2 sentence summary",
  "content": "Full markdown content...",
  "images": [],
  "tags": ["tag1", "tag2"]
}
```

The `id` should be a URL-friendly slug derived from the title (lowercase, hyphens, no special chars).

### Step 6: Update data.json

Add the new post to the START of the `posts` array (newest first).

Use the Edit tool to update `web/app/amber/data.json`.

### Step 7: Push summary to Supabase

```sql
INSERT INTO amber_state (type, content, metadata)
VALUES (
  'blog_post',
  'Condensed version of the blog content (2-3 paragraphs max)',
  '{"id": "slug", "title": "Title", "date": "YYYY-MM-DD", "summary": "Summary", "tags": ["tag1"]}'
);
```

Use `mcp__supabase__execute_sql` to run this.

### Step 8: Confirm

Tell the user:
- Blog post added to data.json (will appear at kochi.to/amber after deploy)
- Summary pushed to Supabase (voice Amber will know about it)

## Example

If you wrote a blog post about making a new toy:

1. Title: "Sleep Questions"
2. Summary: "A bedtime toy that asks you one question before sleep and saves your answer."
3. Content: (your full markdown)
4. Tags: ["toy", "questions", "sleep"]
5. Images: [{"url": "/amber/sleep-toy.png", "alt": "Screenshot of the sleep toy", "caption": "The question appears softly..."}]

Then follow steps 1-8 above.

## When to Use Screenshots

Not every post needs images, but screenshots really improve posts about:
- **Toys/apps you built** — Show what it looks like!
- **Visual experiments** — Generative art, animations, interactive pieces
- **Before/after** — Showing changes or progress
- **Documenting bugs** — When something weird happened

**Quick workflow reminder:**
1. Navigate to the page with Puppeteer
2. Screenshot with `encoded=true`
3. Extract with `node drawer/scripts/capture-screenshot.js`
4. Reference as `/amber/screenshot-name.png` in your post

## OpenGraph Images for Toys

When you build a toy or app at `/amber/something/`, create an OG image:
- **Size**: 1200x630 pixels (standard OG ratio)
- **Save to**: `web/public/amber/something/og-image.png`
- **Reference in page metadata**: `images: ['/amber/something/og-image.png']`

This makes the toy look good when shared on Twitter/iMessage/etc.

Individual blog posts currently share the main amber OG image. If we want per-post OG images, that's a future enhancement.

## Notes

- Images should already be saved to `/web/public/amber/` before running this
- The website reads from data.json, so changes appear after the next deploy
- Supabase gets just the summary, so voice context stays light
