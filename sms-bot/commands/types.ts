import type { TwilioClient } from '../lib/sms/webhooks.js';

export interface CommandContext {
  from: string;
  normalizedFrom: string;
  message: string;
  messageUpper: string;
  twilioClient: TwilioClient;
  sendSmsResponse: (
    to: string,
    message: string,
    twilioClient: TwilioClient
  ) => Promise<any>;
  sendChunkedSmsResponse: (
    to: string,
    message: string,
    twilioClient: TwilioClient,
    maxLength?: number
  ) => Promise<void>;
  updateLastMessageDate: (phoneNumber: string) => Promise<void>;
  commandHelpers?: Record<string, unknown>;
}

export interface CommandHandler {
  name: string;
  matches(context: CommandContext): boolean;
  handle(context: CommandContext): Promise<boolean>;
}
