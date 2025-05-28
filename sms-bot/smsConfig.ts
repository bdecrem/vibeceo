// sms-bot/smsConfig.ts
export const smsConfig = {
  apiKey: process.env.SMS_TO_API_KEY || '',
  senderId: 'VibeCEO', // Optional: The sender ID to display
  defaultRecipient: '+16508989508' // Your authorized number
};
