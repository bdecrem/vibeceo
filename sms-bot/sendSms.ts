import fetch from 'node-fetch';
import { smsConfig } from './smsConfig.js';

interface SmsResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export async function sendSms(message: string, to: string = smsConfig.defaultRecipient): Promise<SmsResponse> {
  try {
    const response = await fetch('https://api.sms.to/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${smsConfig.apiKey}`,
      },
      body: JSON.stringify({
        to,
        message,
        sender_id: smsConfig.senderId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: 'Failed to send SMS',
        error: data.message || 'Unknown error',
      };
    }

    return {
      success: true,
      message: 'SMS sent successfully',
      data,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error sending SMS',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Example usage:
// (async () => {
//   const result = await sendSms('Hello from VibeCEO!');
//   console.log(result);
// })();
