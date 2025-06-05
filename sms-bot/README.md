# VibeCEO SMS Bot

This service provides SMS chatbot functionality for VibeCEO using Twilio.

## Setup

1. Create a `.env.local` file in the root of the `sms-bot` directory using the provided `sample.env` as a template.

2. Install dependencies:
   ```
   cd sms-bot
   npm install
   ```

3. Build the project:
   ```
   npm run build
   ```

4. Start the service locally:
   ```
   npm run dev
   ```
   
   For development with auto-reload:
   ```
   npm run start:dev
   ```

## Environment Variables

The following environment variables need to be set in `.env.local` for local development or in Railway for production:

- `TWILIO_ACCOUNT_SID`: Your Twilio account SID
- `TWILIO_AUTH_TOKEN`: Your Twilio auth token
- `TWILIO_PHONE_NUMBER`: Your Twilio phone number in E.164 format (e.g., +12345678900)
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`: At least one of these must be provided
- `REDIS_URL` (optional): Redis connection URL for conversation state management
- `PORT` (optional): The port on which the service will run (defaults to 3030)

## Twilio Configuration

To receive SMS messages:

1. Set up a Twilio phone number
2. Configure the Twilio webhook URL:
   - For local development with ngrok: `https://your-ngrok-url/sms/webhook`
   - For production: `https://your-railway-app-url/sms/webhook`

## Railway Deployment

To deploy to Railway:

1. Connect your GitHub repository to Railway
2. Add all the required environment variables in the Railway dashboard
3. Deploy the service with the following settings:
   - Root directory: `sms-bot`
   - Start command: `npm run start:prod`

## Testing

To test the SMS flow locally:
```
npm run test:sms
```

## Architecture

- `src/index.ts`: Entry point for the application
- `lib/sms/bot.ts`: Main SMS bot implementation
- `lib/sms/handlers.ts`: Message handling logic
- `lib/sms/webhooks.ts`: Twilio webhook integration
- `lib/sms/ai.ts`: AI integration (OpenAI/Anthropic)
- `lib/sms/config.ts`: Configuration settings

Last updated: 2025-06-04 19:30 (restored working version)