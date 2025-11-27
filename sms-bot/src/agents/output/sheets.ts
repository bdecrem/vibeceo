/**
 * Google Sheets Output Handler
 * Append items to Google Sheets spreadsheet
 */

import type { NormalizedItem, AgentMetadata, OutputConfig, EnrichedItem } from '@vibeceo/shared-types';

/**
 * Append items to Google Sheets
 */
export async function appendToSheets(
  items: NormalizedItem[],
  config: OutputConfig['sheets'],
  agentMetadata: AgentMetadata
): Promise<boolean> {
  if (!config || !config.enabled) {
    console.log('   Google Sheets output is disabled');
    return false;
  }

  console.log(`📊 Appending ${items.length} row(s) to Google Sheets: ${config.spreadsheetId}...`);

  // Check for required credentials
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!apiKey && !credentials) {
    console.log('   ⚠️  Missing Google Sheets credentials (GOOGLE_SHEETS_API_KEY or GOOGLE_SERVICE_ACCOUNT_JSON)');
    return false;
  }

  try {
    // Import Google Sheets API
    const { google } = await import('googleapis');

    // Initialize auth
    let auth;
    if (credentials) {
      const serviceAccount = JSON.parse(credentials);
      auth = new google.auth.GoogleAuth({
        credentials: serviceAccount,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    } else {
      auth = new google.auth.GoogleAuth({
        apiKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    }

    const sheets = google.sheets({ version: 'v4', auth });

    // Prepare rows
    const rows = items.map(item => [
      item.title || '',
      item.summary || '',
      item.url || '',
      item.author || '',
      item.publishedAt || '',
      (item as EnrichedItem).score || '',
      (item as EnrichedItem).relevanceReason || '',
      new Date().toISOString(), // timestamp
      agentMetadata.name, // agent name
    ]);

    // Append to sheet
    const range = config.sheetName ? `${config.sheetName}!A:I` : 'A:I';

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: config.spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: config.appendMode ? 'INSERT_ROWS' : 'OVERWRITE',
      requestBody: {
        values: rows,
      },
    });

    console.log(`   ✅ Appended ${response.data.updates?.updatedRows || 0} row(s) to Google Sheets`);
    return true;

  } catch (error: any) {
    console.error(`   ❌ Google Sheets append failed: ${error.message}`);
    return false;
  }
}
