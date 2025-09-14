import fetch from 'node-fetch';
import { parseWebtoysResponse, formatWebtoysCommand } from './response-parser.js';

// Configuration
const WEBTOYS_API_URL = process.env.WEBTOYS_API_URL || 'https://sms-bot-production-fc64.up.railway.app';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tqniseocczttrfwtpbdr.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_wZCf4S2dQo6sCI2_GMhHQw_tJ_p7Ty0';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'sb_secret_HYDVNP5H4cdad-7bzliryA_62Khx0ug';

console.error(`[Webtoys Client] Using webhook URL: ${WEBTOYS_API_URL}`);
console.error(`[Webtoys Client] Service key loaded: ${SUPABASE_SERVICE_KEY ? 'YES (starts with ' + SUPABASE_SERVICE_KEY.substring(0, 10) + '...)' : 'NO'}`);

// Polling configuration
const MAX_WAIT_TIME = 45000; // 45 seconds max wait (pushing the limit)
const POLL_INTERVAL = 2000; // Check every 2 seconds
const INITIAL_DELAY = 3000; // Wait 3 seconds before first check (start polling sooner)

/**
 * Generate a consistent phone number for a Poke user
 * Use a special format that identifies this as a Poke request
 * Same user_id always gets the same phone number
 */
function generatePhoneNumber(userId) {
  // Use a single Poke service account if no userId provided
  if (!userId) {
    return '+19990000001'; // Poke service account
  }

  // Create a consistent phone number based on userId hash
  // This ensures the same Poke user always gets the same phone/account
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Make it positive and 7 digits
  const phoneDigits = Math.abs(hash).toString().padEnd(7, '0').slice(0, 7);

  // Format: +1999####### where # is based on userId hash
  // 999 is not a valid US area code, so it won't conflict with real numbers
  return `+1999${phoneDigits}`;
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

  console.error(`[Webtoys Client] Sending SMS from phone: ${phoneNumber}`);
  console.error(`[Webtoys Client] Using webhook URL: ${WEBTOYS_API_URL}/dev/webhook`);

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

  const result = await response.json();

  // Extract the actual phone number used from the response if available
  const actualPhone = result.senderPhone || phoneNumber;
  console.error(`[Webtoys Client] SMS bot used phone: ${actualPhone}`);

  return { ...result, actualPhone };
}

/**
 * Get user slug for a phone number
 * FIXED: Use service key instead of anon key due to RLS policy
 */
async function getUserSlugForPhone(phoneNumber) {
  console.error(`[Webtoys Client] Getting user slug for phone: ${phoneNumber}`);

  // Handle Poke phone numbers (+1999XXXXXXX) with deterministic slug generation
  if (phoneNumber && phoneNumber.startsWith('+1999')) {
    console.error(`[Webtoys Client] Poke phone detected, generating deterministic slug`);

    // Extract the 7-digit number part after +1999
    const phoneDigits = phoneNumber.substring(5); // Remove "+1999"
    const slug = `poke-user-${phoneDigits}`;

    console.error(`[Webtoys Client] Generated Poke slug: ${slug} for phone: ${phoneNumber}`);
    return slug;
  }

  if (!SUPABASE_SERVICE_KEY) {
    console.error('[Webtoys Client] SUPABASE_SERVICE_KEY not configured!');
    return null;
  }

  try {
    const queryUrl = new URL(`${SUPABASE_URL}/rest/v1/sms_subscribers`);
    queryUrl.searchParams.append('select', 'slug,phone_number,created_at');
    queryUrl.searchParams.append('phone_number', `eq.${phoneNumber}`);
    queryUrl.searchParams.append('limit', '1');

    console.error(`[Webtoys Client] Query URL: ${queryUrl.toString()}`);

    // Use service key if available
    const apiKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;

    // For sb_secret_ format, only use apikey header
    const headers = {
      'apikey': apiKey,
      'Content-Type': 'application/json'
    };

    // Only add Authorization header for old JWT format
    if (apiKey && apiKey.startsWith('eyJ')) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(queryUrl, { headers });

    console.error(`[Webtoys Client] Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Webtoys Client] Response error: ${errorText}`);
      return null;
    }

    const data = await response.json();
    console.error(`[Webtoys Client] Response data: ${JSON.stringify(data)}`);

    if (data && data.length > 0) {
      const slug = data[0].slug;
      console.error(`[Webtoys Client] Found slug: ${slug} for phone: ${phoneNumber}`);
      return slug;
    } else {
      console.error(`[Webtoys Client] No subscriber found for phone: ${phoneNumber}`);

      // Fallback for Poke users with +1999 numbers
      if (phoneNumber.startsWith('+1999')) {
        const fallbackSlug = 'poke-' + phoneNumber.slice(5, 12);
        console.error(`[Webtoys Client] Using fallback slug for Poke user: ${fallbackSlug}`);
        return fallbackSlug;
      }

      return null;
    }
  } catch (error) {
    console.error('[Webtoys Client] Error getting user slug:', error);
    return null;
  }
}

/**
 * Poll Supabase for the created app
 */
async function pollForApp(phoneNumber, startTime) {
  const endTime = startTime + MAX_WAIT_TIME;
  let pollCount = 0;

  // Subtract 5 seconds from start time to account for any clock drift or processing delays
  const adjustedStartTime = startTime - 5000;

  console.error(`[Webtoys Client] Starting poll for phone: ${phoneNumber}, startTime: ${new Date(adjustedStartTime).toISOString()}`);

  while (Date.now() < endTime) {
    pollCount++;

    // Query Supabase for apps created by this phone number after start time
    const queryUrl = new URL(`${SUPABASE_URL}/rest/v1/wtaf_content`);
    queryUrl.searchParams.append('select', 'app_slug,user_slug,created_at,type,sender_phone,status');
    queryUrl.searchParams.append('sender_phone', `eq.${phoneNumber}`);
    queryUrl.searchParams.append('created_at', `gte.${new Date(adjustedStartTime).toISOString()}`);
    queryUrl.searchParams.append('status', `eq.published`);
    queryUrl.searchParams.append('order', 'created_at.desc');
    queryUrl.searchParams.append('limit', '1');

    // Use service key if available, otherwise use anon key
    const apiKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;

    console.error(`[Webtoys Client] Poll attempt ${pollCount}, querying: ${queryUrl.toString()}`);

    // For sb_secret_ format, only use apikey header (no Authorization header needed)
    const headers = {
      'apikey': apiKey,
      'Content-Type': 'application/json'
    };

    // Only add Authorization header for old JWT format (eyJ...)
    if (apiKey && apiKey.startsWith('eyJ')) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(queryUrl, { headers });

    if (response.ok) {
      const data = await response.json();
      console.error(`[Webtoys Client] Poll response: ${JSON.stringify(data)}`);

      if (data && data.length > 0) {
        const app = data[0];
        console.error(`[Webtoys Client] App found! user_slug: ${app.user_slug}, app_slug: ${app.app_slug}`);
        return {
          found: true,
          appUrl: `https://webtoys.ai/${app.user_slug}/${app.app_slug}`,
          appType: app.type,
          userSlug: app.user_slug,
          appSlug: app.app_slug
        };
      }
    } else {
      const errorText = await response.text();
      console.error(`[Webtoys Client] Poll failed with status: ${response.status}`);
      console.error(`[Webtoys Client] Error response: ${errorText}`);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }

  console.error(`[Webtoys Client] Polling timed out after ${pollCount} attempts`);
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

    // Use the actual phone number from the response for polling
    const actualPhoneNumber = initialResponse.actualPhone || phoneNumber;

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

    // Poll for the created app using the actual phone number
    console.error(`[Webtoys Client] Polling for app creation with phone: ${actualPhoneNumber}`);
    const appResult = await pollForApp(actualPhoneNumber, startTime);

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
      // Timeout - but app is likely still being created
      // Since the same user always gets the same phone, they can check their apps
      const userSlug = await getUserSlugForPhone(actualPhoneNumber);

      return {
        success: true,
        message: 'App is being created (this can take 2-3 minutes). Check your apps at the URL below.',
        userUrl: userSlug ? `https://webtoys.ai/${userSlug}` : 'https://webtoys.ai',
        appUrl: null,
        note: 'Large or complex apps may take longer to generate. The app will appear at your user page when ready.'
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