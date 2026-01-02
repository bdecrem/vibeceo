# Screenshot Workflow for Blog Posts

How to capture screenshots using Puppeteer and add them to the Amber blog.

## Quick Reference

```bash
# 1. In Claude Code, navigate and capture:
mcp__puppeteer__puppeteer_navigate(url="https://example.com")
mcp__puppeteer__puppeteer_screenshot(name="my-shot", width=800, height=600, encoded=true)

# 2. Note the temp file path from "Output has been saved to..." message

# 3. Extract and save:
node drawer/scripts/capture-screenshot.js /path/to/mcp-result.txt my-screenshot

# 4. Commit and push:
git add web/public/amber/my-screenshot.png
git commit -m "Add screenshot: my-screenshot"
git push origin main

# 5. Reference in blog:
# /amber/my-screenshot.png
```

## The Problem

Puppeteer MCP can take screenshots, but they're returned inline or as base64. We need to:
1. Get the raw image data
2. Save it to `web/public/amber/`
3. Push to GitHub
4. Reference in blog posts

## The Solution

### Step 1: Take Screenshot with `encoded=true`

When taking a screenshot, use the `encoded` parameter:

```
mcp__puppeteer__puppeteer_screenshot(
  name="my-screenshot",
  width=800,
  height=600,
  encoded=true
)
```

This returns a base64 data URI instead of an inline image. Because it's large, Claude Code saves it to a temp file like:
```
/Users/bartdecrem/.claude/projects/.../tool-results/mcp-puppeteer-...-1234567890.txt
```

### Step 2: Extract and Save

Use the extraction script:
```bash
node drawer/scripts/capture-screenshot.js <temp-file-path> <output-name>
```

This:
- Reads the JSON file
- Extracts the base64 data
- Decodes to PNG
- Saves to `web/public/amber/<output-name>.png`

### Step 3: Git Push

```bash
git add web/public/amber/<output-name>.png
git commit -m "Add screenshot: <output-name>"
git push origin main
```

### Step 4: Reference in Blog

In `web/app/amber/data.json`, use the path `/amber/<output-name>.png`:

```json
{
  "images": [
    {
      "url": "/amber/my-screenshot.png",
      "alt": "Description of the screenshot",
      "caption": "Optional caption"
    }
  ]
}
```

Or inline in markdown content:
```markdown
![Alt text](/amber/my-screenshot.png)
```

## Tips

### Interactive Content

For interactive pages (animations, games), you may need to:
- Click or interact before screenshotting
- Wait for animations: `Bash: sleep 3`
- Take multiple shots to catch the right moment

### Sizing

Common sizes:
- Blog hero: 1200x630 (OG image ratio)
- Content image: 800x600 or 1000x700
- Thumbnail: 400x300

### Naming Convention

Use kebab-case descriptive names:
- `chromatic-flow-level-3.png`
- `constellation-with-stars.png`
- `mood-today-particles.png`

## File Locations

- Extraction script: `drawer/scripts/capture-screenshot.js`
- Screenshots saved to: `web/public/amber/`
- Blog data: `web/app/amber/data.json`
- Live URL: `kochi.to/amber/<filename>.png`

## Deployment Note

After pushing, Railway auto-deploys. This can take 2-5 minutes. The screenshot URL will 404 until deployment completes.
