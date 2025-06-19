import { supabase } from './supabase.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env.local');
dotenv.config({ path: envPath });

function logWithTimestamp(message: string): void {
  console.log(`[DEGEN ${new Date().toISOString()}] ${message}`);
}

export async function queueEditRequest(
  userSlug: string,
  indexNumber: number,
  editInstructions: string,
  senderPhone: string
): Promise<boolean> {
  try {
    logWithTimestamp(`📝 Queueing edit request: user=${userSlug}, index=${indexNumber}`);
    
    // Get the target page from user's WTAF content
    const { data: userContent, error } = await supabase
      .from('wtaf_content')
      .select('app_slug, html_content, original_prompt')
      .eq('user_slug', userSlug)
      .order('created_at', { ascending: false });
      
    if (error) {
      logWithTimestamp(`❌ Error fetching user content: ${error}`);
      return false;
    }
    
    if (!userContent || userContent.length === 0) {
      logWithTimestamp(`❌ No pages found for user ${userSlug}`);
      return false;
    }
    
    // Validate index number
    if (indexNumber < 1 || indexNumber > userContent.length) {
      logWithTimestamp(`❌ Invalid index ${indexNumber} for user ${userSlug} (has ${userContent.length} pages)`);
      return false;
    }
    
    // Get the target page (convert to 0-based index)
    const targetPage = userContent[indexNumber - 1];
    const appSlug = targetPage.app_slug;
    const originalHtml = targetPage.html_content;
    
    if (!originalHtml) {
      logWithTimestamp(`❌ No HTML content found for page ${indexNumber}`);
      return false;
    }
    
    // Create edit request file following monitor.py's expected format
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `edit-${userSlug}-${appSlug}-${timestamp}.txt`;
    
    // Build the file content with all necessary information for monitor.py
    const fileContent = [
      `SENDER:${senderPhone}`,
      `USER_SLUG:${userSlug}`,
      `EDIT_TARGET:${appSlug}`,
      `EDIT_INSTRUCTIONS:${editInstructions}`,
      ``,
      `ORIGINAL_HTML:`,
      originalHtml
    ].join('\n');
    
    // Write to the wtaf directory that monitor.py watches
    // Need to go up from dist/lib to the root sms-bot directory
    const smsDir = path.resolve(__dirname, '..', '..');
    const wtafDir = path.join(smsDir, 'data', 'wtaf');
    
    // Ensure directory exists
    if (!fs.existsSync(wtafDir)) {
      fs.mkdirSync(wtafDir, { recursive: true });
    }
    
    const filePath = path.join(wtafDir, filename);
    fs.writeFileSync(filePath, fileContent, 'utf8');
    
    logWithTimestamp(`✅ Edit request queued at: ${filePath}`);
    return true;
    
  } catch (error) {
    logWithTimestamp(`💥 Error queueing edit request: ${error}`);
    return false;
  }
}

// Note: Direct processing functions removed - we now use file-based queueing
// to integrate with monitor.py's existing workflow. Edit processing happens
// in monitor.py using the prompts/edits.json template. 