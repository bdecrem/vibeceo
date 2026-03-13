# Claudio Image Display Issue — Summary for Developer

## What works
- **Inbound images (user → agent):** Claudio uploads image to `POST {serverURL}/media/upload`, gets back a URL/path, includes it in the chat message text. Agent reads the file from disk. ✅
- **Server `/media/*` route:** Serves files from `~/.openclaw/media/`. Requires `Authorization: Bearer {token}` header. Tested with curl, returns 200. ✅
- **SSE streaming:** Text streams correctly including MEDIA: lines. Verified with curl — full text arrives before `[DONE]`. ✅
- **Discord:** Images display inline because Discord uses a different delivery path (`message_sending` hook rewrites MEDIA: paths and Discord's native media rendering handles display).

## What's broken
- **Claudio does NOT display images inline over HTTP.** The MEDIA: line (or bare URL) arrives as text in the SSE stream but Claudio shows it as plain text instead of rendering an image.

## The MEDIA: protocol
When the agent wants to send an image, it outputs:
```
MEDIA: /Users/admin/.openclaw/media/puppy-beach.png
```

The path always contains `/.openclaw/media/`. The part after that is the relative path to use with the server's `/media/` endpoint.

## What Claudio needs to do

### Parsing (in the HTTP response handler, after accumulating the full response text):
1. Scan response text for `MEDIA: ` followed by a file path
2. Extract the relative part: everything after `/.openclaw/media/` in the path
3. Build the image URL: `{serverBaseURL}/media/{relativePart}`
   - Example: `MEDIA: /Users/admin/.openclaw/media/puppy-beach.png` → `https://theaf-web.ngrok.io/media/puppy-beach.png`
4. Strip the `MEDIA: /path/...` line from the displayed message text
5. Add the constructed URL to `message.imageURLs`

### Fetching the image:
- `GET {imageURL}` with `Authorization: Bearer {token}` header (same token used for chat completions)
- Response is the raw image bytes with correct Content-Type

### Alternative: bare URLs
The agent may also output bare image URLs like `https://theaf-web.ngrok.io/media/puppy-beach.png`. These should also be detected (URLs ending in .png/.jpg/.jpeg/.gif/.webp), added to `imageURLs`, and rendered inline.

## Files on server
- Plugin: `~/.openclaw/extensions/claudio-media/index.ts`
- Media dir: `~/.openclaw/media/`
- Upload endpoint: `POST {serverURL}/media/upload` (accepts JSON `{"image": "data:image/jpeg;base64,..."}`, returns `{"url", "path", "filename"}`)
- Serve endpoint: `GET {serverURL}/media/{relativePath}` (requires gateway auth)

## Key detail
The `extractImageURLs` function in Claudio reportedly already handles `MEDIA:` patterns, but images still don't display. Either the pattern matching is wrong, the URL construction is wrong, the auth header is missing on the image fetch, or the image fetch result isn't being wired into the UI. Debug logging in `extractImageURLs` and the image fetch code will pinpoint it.
