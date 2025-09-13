/**
 * Parse responses from Webtoys SMS bot
 */

/**
 * Extract app details from SMS bot success messages
 * @param {string} message - The message from SMS bot
 * @returns {Object} Parsed app details
 */
export function extractAppDetails(message) {
  // Look for app URLs in the response
  const publicUrlMatch = message.match(/Your app: (https?:\/\/[^\s]+)/);
  const adminUrlMatch = message.match(/View data: (https?:\/\/[^\s]+)/);
  const memeUrlMatch = message.match(/Your meme: (https?:\/\/[^\s]+)/);
  const gameUrlMatch = message.match(/Your game: (https?:\/\/[^\s]+)/);

  // Determine the main app URL
  let appUrl = null;
  let appType = 'web';

  if (publicUrlMatch) {
    appUrl = publicUrlMatch[1];
  } else if (memeUrlMatch) {
    appUrl = memeUrlMatch[1];
    appType = 'meme';
  } else if (gameUrlMatch) {
    appUrl = gameUrlMatch[1];
    appType = 'game';
  }

  return {
    publicUrl: appUrl,
    adminUrl: adminUrlMatch ? adminUrlMatch[1] : null,
    appType: appType
  };
}

/**
 * Parse the response from Webtoys dev webhook
 * @param {Object} response - Response from the dev webhook
 * @returns {Object} Parsed response with success status and details
 */
export function parseWebtoysResponse(response) {
  if (!response) {
    return { error: 'No response received' };
  }

  // Check for explicit errors
  if (!response.success && response.error) {
    return { error: response.error };
  }

  // Extract responses array
  const responses = response.responses || [];
  if (responses.length === 0) {
    return { error: 'No response content' };
  }

  // Join all responses
  const fullResponse = responses.join('\n');

  // Check for rate limiting
  if (fullResponse.includes('Rate limit')) {
    return { error: 'Rate limited. Please try again later.' };
  }

  // Check for error messages
  if (fullResponse.includes('Error:') || fullResponse.includes('Failed')) {
    const errorMatch = fullResponse.match(/Error: ([^\n]+)/);
    return { error: errorMatch ? errorMatch[1] : 'An error occurred' };
  }

  // Extract app details from success response
  const appDetails = extractAppDetails(fullResponse);

  return {
    success: true,
    message: fullResponse,
    ...appDetails
  };
}

/**
 * Detect the type of content being created
 * @param {string} description - User's description
 * @returns {string} Content type
 */
export function detectContentType(description) {
  const lower = description.toLowerCase();

  if (lower.includes('meme')) {
    return 'meme';
  }

  if (lower.includes('game') ||
      lower.includes('play') ||
      lower.includes('snake') ||
      lower.includes('tetris') ||
      lower.includes('pong')) {
    return 'game';
  }

  if (lower.includes('music') ||
      lower.includes('song') ||
      lower.includes('beat') ||
      lower.includes('playlist')) {
    return 'music';
  }

  if (lower.includes('vote') ||
      lower.includes('poll') ||
      lower.includes('survey') ||
      lower.includes('collaborative') ||
      lower.includes('shared')) {
    return 'zad';
  }

  if (lower.includes('admin') ||
      lower.includes('dashboard') ||
      lower.includes('manage')) {
    return 'admin';
  }

  return 'app';
}

/**
 * Format the command for Webtoys based on content type
 * @param {string} description - User's description
 * @returns {string} Formatted command
 */
export function formatWebtoysCommand(description) {
  const contentType = detectContentType(description);

  // For memes, ensure it starts with "meme"
  if (contentType === 'meme' && !description.toLowerCase().startsWith('meme')) {
    return `meme ${description}`;
  }

  // For regular apps, ensure it starts with "wtaf"
  if (!description.toLowerCase().startsWith('wtaf') &&
      !description.toLowerCase().startsWith('meme') &&
      contentType === 'app') {
    return `wtaf ${description}`;
  }

  // Otherwise, pass through as-is
  return description;
}