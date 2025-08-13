# SMS Bot Waitlist System

## Overview

The waitlist system manages user registration overflow when the SMS bot reaches its configured capacity limit. When capacity is full, new users are automatically placed on a waitlist and notified of their position.

## Features

### User Features
- **Automatic Waitlist**: New users are automatically added to waitlist when capacity is reached
- **Position Tracking**: Users can check their current position with `WAITLIST` command
- **Approval Notifications**: Users receive SMS when approved from waitlist
- **Seamless Registration**: Approved users can immediately register with `START` command

### Admin Features
- **Waitlist Management**: View, approve, and manage waiting users
- **Capacity Monitoring**: Track active users vs. capacity limits
- **Bulk Approval**: Approve multiple users at once with notifications
- **Status Dashboard**: Get system capacity and waitlist statistics

## Configuration

### Environment Variables

Add these to your `.env.local` file:

```env
# Waitlist system settings
USER_CAPACITY_LIMIT=1000        # Maximum active users (default: 1000)
WAITLIST_ENABLED=true           # Enable/disable waitlist system (default: true)
```

### Database Migration

Run the SQL migration to create the waitlist table:

```bash
# Apply the migration to your Supabase database
psql -h your-supabase-host -U your-user -d your-db < migrations/add-waitlist-table.sql
```

## Database Schema

### `sms_waitlist` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `phone_number` | TEXT | Normalized phone number (E.164 format) |
| `status` | TEXT | Current status: 'waiting' or 'approved' |
| `created_at` | TIMESTAMP | When user was added to waitlist |
| `approved_at` | TIMESTAMP | When user was approved (nullable) |
| `notified_at` | TIMESTAMP | When approval notification was sent (nullable) |

**Indexes:**
- `idx_sms_waitlist_status` - For efficient status queries
- `idx_sms_waitlist_created_at` - For position calculations
- `idx_sms_waitlist_phone` - For phone number lookups

## User Commands

### `START` or `UNSTOP`
- If capacity available: Normal registration flow
- If capacity full: Add to waitlist with position notification
- If already on waitlist: Return current position
- If approved from waitlist: Complete registration

### `WAITLIST`
Check current waitlist status:
- **Waiting**: Shows current position and encouraging message
- **Approved**: Prompts to complete registration with `START`
- **Not on waitlist**: Suggests using `START` to join

## Admin Commands

Admins (users with `is_admin = true`) can use these commands:

### `--waitlist`
Show help for waitlist commands

### `--waitlist list`
Display up to 20 waiting users with:
- Position in queue
- Last 4 digits of phone number (for privacy)
- Date joined waitlist

### `--waitlist approve N`
Approve the first N users from waitlist (1-50):
- Updates their status to 'approved'
- Sends approval notifications via SMS
- Reports success/error counts

### `--waitlist status`
Show system capacity dashboard:
- Active users vs. capacity limit
- Number of users waiting
- Current capacity status

### `--waitlist capacity N`
Instructions for updating capacity limit (requires environment variable change and restart)

## Implementation Details

### Capacity Checking

The system checks capacity before creating new users:

1. **Disabled Waitlist**: If `WAITLIST_ENABLED=false`, always allow new users
2. **Active User Count**: Counts confirmed, non-unsubscribed users in `sms_subscribers`
3. **Capacity Check**: Compares active users against `USER_CAPACITY_LIMIT`
4. **Approved Users**: Users approved from waitlist bypass capacity check

### Phone Number Normalization

All phone numbers are normalized to E.164 format:
- US numbers: `+1` prefix added if missing
- International: Preserved as provided
- Consistent format ensures accurate waitlist tracking

### Position Calculation

Waitlist positions are calculated dynamically:
- Users ordered by `created_at` timestamp
- Position = count of users created before them + 1
- Real-time calculation ensures accuracy after approvals

### Error Handling

The system implements robust error handling:
- **Fail Open**: If capacity check fails, allow registration
- **Database Errors**: Graceful fallback with user-friendly messages  
- **Notification Failures**: Continue operation, log errors for admin review

## Monitoring and Maintenance

### Key Metrics to Monitor

1. **Waitlist Growth**: Number of users added daily
2. **Approval Rate**: Users approved vs. added
3. **Notification Success**: SMS delivery rates for approvals
4. **System Capacity**: Active users approaching limit

### Regular Maintenance

1. **Review Waitlist**: Check for users waiting too long
2. **Capacity Planning**: Monitor growth patterns
3. **Clean Old Entries**: Archive approved users after registration
4. **Error Log Review**: Check for notification or system failures

### Troubleshooting

**Common Issues:**

1. **Waitlist Not Working**: Check `WAITLIST_ENABLED` setting
2. **Wrong Capacity**: Verify `USER_CAPACITY_LIMIT` environment variable
3. **Position Errors**: Check database indexes and query performance
4. **Notification Failures**: Verify SMS service configuration

## Security Considerations

### Privacy Protection
- Admin interface shows only last 4 digits of phone numbers
- Full phone numbers logged for debugging but not exposed
- Waitlist position is the only public information

### Access Control
- Only `is_admin = true` users can access admin commands
- Admin commands fail silently for unauthorized users
- No capacity information exposed to regular users

### Rate Limiting
- Bulk approval limited to 50 users at once
- Admin commands respect existing rate limiting system
- Waitlist checks don't bypass user rate limits

## Future Enhancements

### Possible Improvements

1. **Web Dashboard**: Admin web interface for waitlist management  
2. **Position Notifications**: Automatic updates when position changes significantly
3. **Waitlist Expiration**: Remove inactive waitlist entries after time limit
4. **Priority Queue**: Different priority levels for waitlist users
5. **Capacity Scheduling**: Automatic capacity adjustments based on time/usage

### Integration Opportunities

1. **Email Notifications**: Supplement SMS with email notifications
2. **Analytics**: Track waitlist conversion and user satisfaction
3. **A/B Testing**: Test different waitlist messaging strategies
4. **Support Integration**: Route waitlist questions to support team

## Testing

See the test plan in `/sms-bot/test-scripts/test-waitlist-system.md` for comprehensive testing procedures.