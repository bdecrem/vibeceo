# SMS Message Formatting Guide

How to format SMS messages so they fit in a single announcement and make complete sentences.

## Key Limits

- **670 UCS-2 code units** max (10 SMS segments)
- Emojis and special characters count as 2+ code units
- NOT the same as character count

## Helper Functions

Location: `sms-bot/lib/utils/sms-length.ts`

```typescript
import {
  countUCS2CodeUnits,
  exceedsSmsLimit,
  truncateToSmsLimit,
  MAX_SMS_CODE_UNITS
} from '../../lib/utils/sms-length.js';
```

| Function | Purpose |
|----------|---------|
| `countUCS2CodeUnits(text)` | Get actual SMS length in code units |
| `exceedsSmsLimit(text)` | Check if text exceeds 670 limit |
| `truncateToSmsLimit(text, reserve?)` | Truncate with "..." if needed |
| `MAX_SMS_CODE_UNITS` | Constant: 670 |

## Message Structure Pattern

From `sms-bot/agents/crypto-research/index.ts`:

```typescript
export async function buildCryptoReportMessage(
  summary: string | null | undefined,
  isoDate: string,
  reportPathOrUrl: string | null | undefined,
  recipient: string,
  options: { podcastLink?: string | null } = {}
): Promise<string> {
  const headline = formatHeadline(isoDate);
  const summaryLine = formatSummary(summary);
  const link = await resolveLink(reportPathOrUrl, recipient);

  const lines = [`${headline} — ${summaryLine}`];

  if (podcastLink) {
    lines.push(`🎧 Listen: ${podcastLink}`);
  }

  if (link) {
    lines.push(`📄 Full report: ${link}`);
  }

  return lines.join('\n');
}
```

## Extracting Complete Sentences

The key to readable SMS: extract one complete sentence from longer text.

```typescript
function formatSummary(summary?: string | null): string {
  if (!summary) {
    return 'Full report available.';
  }

  // Clean up whitespace
  const cleaned = summary.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return 'Full report available.';
  }

  // Extract first complete sentence
  const match = cleaned.match(/[^.!?]+[.!?]/);
  const sentence = match ? match[0] : cleaned;

  return sentence.trim();
}
```

**Regex breakdown**: `/[^.!?]+[.!?]/`
- `[^.!?]+` - Match any characters except sentence-ending punctuation
- `[.!?]` - Match the sentence-ending punctuation

This ensures the SMS contains a complete thought, not a fragment.

## Example Output

```
🪙 Crypto report Dec 12, 2025 — Bitcoin hits new highs as institutions pile in.
🎧 Listen: https://kochi.to/l/xxxx
📄 Full report: https://kochi.to/l/yyyy
```

## Best Practices

1. **Lead with a headline** - Date/topic identifier with emoji
2. **One complete sentence** - Extract first sentence from longer summary
3. **Use em dash (—)** to separate headline from summary
4. **Links on separate lines** - With descriptive emoji prefixes
5. **Use shortlinks** - `kochi.to/l/xxxx` instead of full URLs
6. **Check length before sending** - Use `exceedsSmsLimit()` and `truncateToSmsLimit()`

## Checking Message Length

```typescript
import { exceedsSmsLimit, truncateToSmsLimit } from '../../lib/utils/sms-length.js';

const message = buildYourMessage();

if (exceedsSmsLimit(message)) {
  console.warn(`SMS too long, truncating`);
  message = truncateToSmsLimit(message);
}
```

## Reference Implementations

| Agent | File | Function |
|-------|------|----------|
| Crypto Research | `agents/crypto-research/index.ts` | `buildCryptoReportMessage()` |
| Medical Daily | `agents/medical-daily/index.ts` | Similar pattern |
| AI Daily | `lib/sms/ai-daily.ts` | Similar pattern |
