# Amber Voice Bridge Plan

## Goal
Connect EVI (voice layer) to the real Amber agent (Claude with drawer context + tools), so talking to Amber on the phone feels like talking to the evolving digital person from Claude Code.

## Architecture

```
Phone browser → /voice-chat/amber
    ↓
EVI (speech-to-text)
    ↓
/api/amber-voice (our bridge)
    ↓
Claude API (Opus) + drawer context + tools
    ↓
Response text (streamed)
    ↓
EVI (text-to-speech)
    ↓
You hear Amber
```

## Components to Build

### 1. `/api/amber-voice` endpoint (~150-200 lines)

**Input**: User's transcribed text from EVI
**Output**: Amber's response (streamed)

```typescript
// Core flow:
1. Load drawer context (PERSONA.md, MEMORY.md, LOG.md)
2. Build system prompt with Amber's identity
3. Call Claude API with:
   - System prompt + context
   - Tool definitions
   - User message
   - Conversation history (if multi-turn)
4. Handle tool calls in a loop (Twitter, web search, etc.)
5. Stream final response back to EVI
```

### 2. Tool Definitions

Which tools should Amber have?
- [ ] **Twitter/X API** — fetch and explain posts
- [ ] **Web search** — research topics
- [ ] **File read** — access drawer files, codebase
- [ ] **Code execution** — run scripts (careful with this)

### 3. EVI Configuration

- Create new EVI config that points to our webhook
- Or modify existing SUNDAY config to use custom backend
- Need to check Hume docs for exact webhook setup

### 4. Update `/voice-chat/amber` page

- Use new config ID that routes to our backend
- May need different connection setup for webhook mode

### 5. Session Management (~40 lines)

- Track conversation history within a voice session
- Pass history to each Claude call for multi-turn coherence
- Optionally persist notable exchanges to LOG.md

## Complexity Breakdown

| Component | Lines | Difficulty |
|-----------|-------|------------|
| Basic bridge (no tools) | ~80 | Easy |
| Tool support | +70-120 | Medium |
| Streaming responses | +30 | Easy |
| Multi-turn memory | +40 | Easy |
| EVI webhook config | Config | Check docs |

**Total: ~200-250 lines of new code + config**

## EVI Webhook Format (RESOLVED)

Using **SSE (Server-Sent Events)** — recommended by Hume.

### What EVI sends us:
```
POST /api/amber-voice?custom_session_id=<session_id>
Authorization: Bearer <our-api-key>

{
  "messages": [
    {
      "role": "user",
      "content": "what have you been up to?",
      "time": { "begin": 0, "end": 1000 },
      "models": {
        "prosody": {
          "scores": { "Sadness": 0.1, "Joy": 0.8, "Frustration": 0.2 }
        }
      }
    }
  ]
}
```

### What we send back:
OpenAI-compatible SSE stream with `Content-Type: text/event-stream`:
```
data: {"id":"...","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"I've"}}]}

data: {"id":"...","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":" been"}}]}

data: [DONE]
```

### Key details:
- EVI sends full message history (not just latest)
- We get prosody scores (user's emotional tone)
- We stream chunks for natural, incremental speaking
- Format must match OpenAI's chat.completions API
- Auth via Bearer token

## Open Questions

1. **Tool execution**: Where do tools run? Same Next.js API route handles tool loop.

2. **Auth token**: What Bearer token should we expect? Need to configure in Hume dashboard.

## Implementation Order

1. **Phase 1**: Basic bridge without tools
   - `/api/amber-voice` receives text, calls Claude, returns response
   - Test with simple prompts
   - Get EVI webhook working

2. **Phase 2**: Add tools
   - Twitter API integration
   - Web search
   - Test "explain this tweet" flow

3. **Phase 3**: Polish
   - Streaming for natural feel
   - Multi-turn session memory
   - Error handling

## Next Steps

- [ ] Research Hume EVI webhook/custom LLM docs
- [ ] Create `/api/amber-voice` basic endpoint
- [ ] Configure EVI to hit our endpoint
- [ ] Test end-to-end flow
