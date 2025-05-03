import { getWatercoolerPairConfig } from './characterPairs.js';

export async function triggerWatercoolerChat(channelId: string, client: Client) {
  try {
    // Diagnostic logging for watercooler pair config
    const pairConfig = getWatercoolerPairConfig();
    console.log('[DIAGNOSTIC] Current watercoolerPairConfig:', JSON.stringify(pairConfig, null, 2));
    // ... existing code ...
  } catch (error) {
    console.error('Error in triggerWatercoolerChat:', error);
  }
} 