import fetch from 'node-fetch';
import { parseWebtoysResponse, formatWebtoysCommand } from './response-parser.js';

// Configuration
const WEBTOYS_API_URL = process.env.WEBTOYS_API_URL || 'http://localhost:3030';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tqniseocczttrfwtpbdr.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_wZCf4S2dQo6sCI2_GMhHQw_tJ_p7Ty0';

// Polling configuration
const MAX_WAIT_TIME = 60000; // 60 seconds max wait
const POLL_INTERVAL = 3000; // Check every 3 seconds
const INITIAL_DELAY = 5000; // Wait 5 seconds before first check

/**
 * Generate a unique phone number for this request
 * Uses a valid US phone number format that passes Twilio validation
 * Format: +1415XXXXXXX (San Francisco area code)
 */
function generatePhoneNumber(userId) {
  // Use a valid US area code (415 = San Francisco)
  // Generate random but valid-looking digits for the rest
  const randomDigits = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  // Create a valid US phone number format
  return `+1415${randomDigits}`;
}

/**
 * Send request to Webtoys SMS bot
 */
async function sendToWebtoys(description, phoneNumber) {
  // Format the command properly for Webtoys
  const formattedCommand = formatWebtoysCommand(description);

  const payload = new URLSearchParams({
    'From': phoneNumber,
    'To': '+19999999999',
    'Body': formattedCommand,
    'MessageSid': `SM${Math.random().toString(36).substr(2, 32)}`,
    'AccountSid': 'AC' + Math.random().toString(36).substr(2, 32),
    'NumMedia': '0',
    'X-Poke-Integration': 'true',
    'X-Request-Source': 'poke-mcp',
    'X-User-Role': 'OPERATOR'  // Bypass credit checks for Poke users
  });

  const response = await fetch(`${WEBTOYS_API_URL}/dev/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Twilio-Signature': 'poke-mcp-signature'
    },
    body: payload.toString()
  });

  if (!response.ok) {
    throw new Error(`SMS bot error: ${response.status}`);
  }

  return await response.json();
}

/**
 * Poll Supabase for the created app
 */
async function pollForApp(phoneNumber, startTime) {
  const endTime = startTime + MAX_WAIT_TIME;

  while (Date.now() < endTime) {
    // Query Supabase for apps created by this phone number after start time
    const queryUrl = new URL(`${SUPABASE_URL}/rest/v1/wtaf_content`);
    queryUrl.searchParams.append('select', 'app_slug,user_slug,html_content,created_at,type');
    queryUrl.searchParams.append('sender_phone', `eq.${phoneNumber}`);
    queryUrl.searchParams.append('created_at', `gte.${new Date(startTime).toISOString()}`);
    queryUrl.searchParams.append('order', 'created_at.desc');
    queryUrl.searchParams.append('limit', '1');

    const response = await fetch(queryUrl, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        const app = data[0];
        return {
          found: true,
          appUrl: `https://webtoys.ai/${app.user_slug}/${app.app_slug}`,
          appType: app.type,
          userSlug: app.user_slug,
          appSlug: app.app_slug
        };
      }
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }

  return { found: false };
}

/**
 * Main function to build a Webtoys app
 */
export async function buildWebtoysApp(description, userId) {
  try {
    const phoneNumber = generatePhoneNumber(userId);
    const startTime = Date.now();

    console.error(`[Webtoys Client] Sending request for phone: ${phoneNumber}`);

    // Send request to SMS bot
    const initialResponse = await sendToWebtoys(description, phoneNumber);

    // Check if it's a simple command that doesn't create an app
    const isAppCreation = description.toLowerCase().includes('wtaf') ||
                         description.toLowerCase().includes('meme') ||
                         description.toLowerCase().includes('game') ||
                         description.toLowerCase().includes('app') ||
                         description.toLowerCase().includes('build') ||
                         description.toLowerCase().includes('create');

    if (!isAppCreation) {
      // Return the direct response for non-app commands
      return {
        success: true,
        message: initialResponse.responses?.[0] || 'Command processed',
        appUrl: null
      };
    }

    // Parse initial response to check for errors
    const parsedInitial = parseWebtoysResponse(initialResponse);
    if (parsedInitial.error) {
      return {
        success: false,
        error: parsedInitial.error
      };
    }

    // Wait initial delay
    await new Promise(resolve => setTimeout(resolve, INITIAL_DELAY));

    // Poll for the created app
    console.error('[Webtoys Client] Polling for app creation...');
    const appResult = await pollForApp(phoneNumber, startTime);

    if (appResult.found) {
      console.error(`[Webtoys Client] App created successfully: ${appResult.appUrl}`);

      // Check if it's an admin app (has data management features)
      const hasAdmin = description.toLowerCase().includes('admin') ||
                      description.toLowerCase().includes('manage') ||
                      description.toLowerCase().includes('crud');

      return {
        success: true,
        appUrl: appResult.appUrl,
        appType: appResult.appType,
        adminUrl: hasAdmin ? `${appResult.appUrl}/admin` : null
      };
    } else {
      // Timeout - app creation took too long
      return {
        success: false,
        error: 'App creation timed out. This might be a complex request - please try again.'
      };
    }

  } catch (error) {
    console.error('[Webtoys Client] Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}