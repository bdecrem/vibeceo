# Disabled SMS Bot Features

This document explains the automated features that have been disabled in the SMS bot system while preserving all code for future re-enabling.

## 🚫 Disabled Features

### 1. Daily Inspiration SMS System

**What was disabled:**
- Automatic daily inspiration messages sent to all subscribers
- Admin preview messages (sent 2 hours early)
- Email broadcasts via SendGrid
- Weekend vs weekday timing differences

**Schedule that was disabled:**
- **Weekdays**: 7am PT (admin preview) → 9am PT (regular broadcast)
- **Weekends**: 10am PT (admin preview) → 12pm PT (regular broadcast)
- **Email**: Sent 1 hour after SMS broadcasts

**Files modified:**
- `lib/sms/bot.ts` - Line 36: Commented out `startDailyScheduler(twilioClient)`
- `lib/sms/scheduler.ts` - Lines 95-205: Commented out admin preview system
- `lib/sms/scheduler.ts` - Lines 208-320: Commented out regular broadcast system

### 2. AI Coach Responses to Unrecognized Commands

**What was disabled:**
- Random coach selection for unrecognized messages (40% Leo, 60% other coaches)
- Automatic continuation of coach conversations
- Fallback responses when no specific command is recognized

**Files modified:**
- `lib/sms/handlers.ts` - Lines 1237-1275: Commented out `handleDefaultConversation` function
- `lib/sms/handlers.ts` - Lines 3166-3190: Commented out existing conversation continuation
- `lib/sms/handlers.ts` - Lines 3192-3207: Commented out random coach selection call

## ✅ Still Working

### SMS Commands that still work:
- `START` / `STOP` - Subscription management
- `YES` - Confirm subscription
- `MORE` - Get extra inspiration message
- `TODAY` - Get today's scheduled inspiration
- `TEST` - Simple test response
- `SKIP` - Admin-only feature to change daily message
- `WTAF [request]` - Create web apps (coder/degen users only)
- `CODE [content]` - Save code snippets

### Coach Interactions that still work:
- `Hey Alex` / `Hi Donte` / `Hello Rohan` etc. - Explicit coach conversations
- `Hey Leo` - Leo easter egg conversation
- Continuation of explicitly started coach conversations

## 🔄 How to Re-enable

### Daily Inspiration System:
1. **Uncomment scheduler startup** in `lib/sms/bot.ts`:
   ```typescript
   // Change this:
   // await startDailyScheduler(twilioClient);
   
   // Back to this:
   await startDailyScheduler(twilioClient);
   ```

2. **Uncomment broadcast logic** in `lib/sms/scheduler.ts`:
   - Remove `/*` and `*/` around admin preview system (lines ~95-205)
   - Remove `/*` and `*/` around regular broadcast system (lines ~208-320)

### Random Coach Responses:
1. **Uncomment coach selection** in `lib/sms/handlers.ts`:
   - Remove `/*` and `*/` around `handleDefaultConversation` function (lines ~1237-1275)
   - Remove `/*` and `*/` around existing conversation continuation (lines ~3166-3190)
   - Remove `/*` and `*/` around random coach selection call (lines ~3192-3207)

## 📝 Implementation Details

### Daily Inspiration Flow (when enabled):
1. **7am/10am PT**: Admin users get preview with SKIP option
2. **1 hour later**: Admin email preview sent to bdecrem@gmail.com
3. **9am/12pm PT**: Regular users get daily inspiration
4. **1 hour later**: Full email broadcast via SendGrid

### Random Coach Response Flow (when enabled):
1. Check for explicit commands first
2. Check for active coach conversations
3. If no match, randomly select coach (40% Leo, 60% others)
4. Generate AI response using selected coach's personality
5. Set as active conversation for follow-up messages

## 🛠️ Environment Variables

The following environment variables are still configured but not actively used:
- `SENDGRID_API_KEY` - For email broadcasts
- `SENDGRID_LIST_ID` - Email subscriber list
- `WEEKEND_MODE_SMS_OVERRIDE` - Force weekend/weekday mode
- `OPENAI_API_KEY` - For AI coach responses

## 📊 Impact

**Before disabling:**
- Daily SMS broadcasts to all subscribers
- Random AI responses to any unrecognized text
- Scheduled email campaigns

**After disabling:**
- Silent bot that only responds to explicit commands
- Users must use "Hey [Coach]" format for conversations
- Manual broadcast scripts still available for special occasions

---

*Last updated: January 2025*
*Status: All features successfully disabled and preserved for future re-enabling* 