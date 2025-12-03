# Automating SMS Confirmation Messages

This guide explains how to automatically send confirmation SMS messages to new subscribers when running the SMS bot on a hosted service like Railway.

## Option 1: Using Supabase Database Webhooks (Recommended)

Supabase can automatically trigger a webhook whenever a new subscriber is added to your database.

### Setup Instructions:

1. **Deploy the SMS Bot to Railway**:
   - Push your code to GitHub
   - Connect Railway to your GitHub repository
   - Deploy the application with your environment variables

2. **Create a Webhook in Supabase**:
   - Go to your Supabase dashboard
   - Navigate to Database → Webhooks
   - Click "Create new webhook"
   - Configure as follows:
     - **Name**: NewSubscriberConfirmation
     - **Table**: sms_subscribers
     - **Events**: INSERT (only)
     - **URL**: https://your-railway-app.up.railway.app/api/webhooks/new-subscriber
     - **Secret**: Create a strong secret and add it to your Railway environment variables as `SUPABASE_WEBHOOK_SECRET`
   - Uncomment the webhook secret verification code in the handler

3. **Update Express Configuration**:
   - Make sure your Express app is configured to handle the webhook endpoint

## Option 2: Using a Cron Job (Alternative)

If webhooks aren't suitable, you can run the confirmation script on a schedule.

### Setup Instructions:

1. **Add a Cron Job in Railway**:
   - In your Railway dashboard, add a cron job:
   - Command: `node dist/scripts/send-confirmation-sms.js`
   - Schedule: `*/10 * * * *` (runs every 10 minutes)

2. **Configure Environment Variables**:
   - Ensure all required environment variables are set in Railway

## Option 3: Direct Integration with Next.js API (For Web Application)

You can modify your Next.js API to send the confirmation SMS directly after adding a subscriber to the database.

### Setup Instructions:

1. **Update the `/api/sms-subscribe/route.ts` file**:
   - After successfully adding a subscriber to Supabase, make a request to your SMS bot API endpoint to send the confirmation

## Testing the Implementation

To test that your automated confirmation system is working:

1. Sign up using the web form
2. Check the logs in your Railway dashboard
3. Verify that you receive a confirmation SMS
4. Reply YES to confirm
5. Check Supabase to confirm the subscription status changed

## Troubleshooting

- **Messages not sending**: Check Twilio logs and ensure the `TWILIO_*` environment variables are correctly set
- **Webhook not triggering**: Verify the Supabase webhook configuration and check your Railway logs
- **Database updates failing**: Check Supabase permissions and your service key
