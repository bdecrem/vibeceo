# Check Email

Check Bart's Gmail for recent emails.

## Instructions

Run the email check script:

```bash
cd /Users/bart/Documents/code/vibeceo/sms-bot && npx tsx --env-file=.env.local scripts/check-email-quick.ts
```

Then summarize what you find:
- Flag anything urgent or important
- Note any VIP senders (Railway, Vercel, Apple, Google, Brex, etc.)
- Keep the summary brief unless asked for details

## Notes

- Script checks last 12 hours by default
- Handles OAuth token refresh automatically
- Created by Amber on Dec 23, 2025
