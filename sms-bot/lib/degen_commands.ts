import { supabase } from './supabase.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Get directory name for file operations
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function logWithTimestamp(message: string): void {
  console.log(`[DEGEN ${new Date().toISOString()}] ${message}`);
}

/**
 * Check if user has elevated role (coder, degen, or admin)
 * These roles can remix ANY app in the system, not just their own
 */
async function checkElevatedRole(userSlug: string): Promise<boolean> {
  try {
    logWithTimestamp(`🔒 Checking elevated role for user: ${userSlug}`);
    
    const { data: userData, error: userError } = await supabase
      .from('sms_subscribers')
      .select('role')
      .eq('slug', userSlug)
      .single();
        
    if (userError || !userData) {
      logWithTimestamp(`❌ User not found: ${userSlug}`);
      return false;
    }
    
    const elevatedRoles = ['coder', 'degen', 'admin', 'operator'];
    const hasElevatedRole = elevatedRoles.includes(userData.role);
    logWithTimestamp(`🔒 User ${userSlug} role: ${userData.role} | Elevated access: ${hasElevatedRole}`);
    
    return hasElevatedRole;
    
  } catch (error) {
    logWithTimestamp(`❌ Error checking elevated role: ${error}`);
    return false;
  }
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
    
    // Create edit request file with microsecond precision timestamp for chronological processing
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').replace('T', '_') + '_' + String(now.getTime()).slice(-6);
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

export async function queueEditRequestBySlug(
  userSlug: string,
  appSlug: string,
  editInstructions: string,
  senderPhone: string
): Promise<boolean> {
  try {
    logWithTimestamp(`📝 Queueing edit request: user=${userSlug}, slug=${appSlug}`);
    
    // Get the HTML content for the specific page (slug already resolved by handlers.ts)
    const { data: htmlContent, error: htmlError } = await supabase
      .from('wtaf_content')
      .select('html_content')
      .eq('user_slug', userSlug)
      .eq('app_slug', appSlug)
      .single();
      
    if (htmlError || !htmlContent) {
      logWithTimestamp(`❌ Error fetching HTML content for ${appSlug}: ${htmlError}`);
      return false;
    }
    
    const originalHtml = htmlContent.html_content;
    
    if (!originalHtml) {
      logWithTimestamp(`❌ No HTML content found for page ${appSlug}`);
      return false;
    }
    
    // Create edit request file with microsecond precision timestamp for chronological processing  
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').replace('T', '_') + '_' + String(now.getTime()).slice(-6);
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

export async function queueRemixRequest(
  userSlug: string,
  targetSlug: string,
  remixInstructions: string,
  senderPhone: string
): Promise<boolean> {
  try {
    logWithTimestamp(`🎨 Queueing remix request: user=${userSlug}, slug=${targetSlug}`);
    
    // Check if user has elevated role (coder/degen/admin)
    const hasElevatedRole = await checkElevatedRole(userSlug);
    
    if (hasElevatedRole) {
      // Elevated roles can remix ANY app - just verify the app exists
      logWithTimestamp(`🔓 User ${userSlug} has elevated role - allowing remix of any app`);
      
      const { data: appData, error: appError } = await supabase
        .from('wtaf_content')
        .select('html_content')
        .eq('app_slug', targetSlug)
        .single();
        
      if (appError || !appData) {
        logWithTimestamp(`❌ App '${targetSlug}' not found in system`);
        return false;
      }
      
      logWithTimestamp(`✅ App '${targetSlug}' exists - allowing elevated remix`);
      
    } else {
      // Regular users can only remix their own apps - verify ownership
      logWithTimestamp(`🔒 User ${userSlug} does not have elevated role - checking ownership`);
      
      const { data: appData, error: appError } = await supabase
        .from('wtaf_content')
        .select('html_content')
        .eq('user_slug', userSlug)
        .eq('app_slug', targetSlug)
        .single();
        
      if (appError || !appData) {
        logWithTimestamp(`❌ App '${targetSlug}' not found or not owned by user ${userSlug}`);
        return false;
      }
      
      logWithTimestamp(`✅ App '${targetSlug}' owned by user - allowing remix`);
    }
    
    // Create remix request file with microsecond precision timestamp for chronological processing
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').replace('T', '_') + '_' + String(now.getTime()).slice(-6);
    const filename = `remix-${userSlug}-${targetSlug}-${timestamp}.txt`;
    
    // Build the file content for WTAF engine processing using --remix format
    const fileContent = [
      `SENDER:${senderPhone}`,
      `USER_SLUG:${userSlug}`,
      `REMIX_COMMAND:--remix ${targetSlug} ${remixInstructions}`,
      ``,
      `ORIGINAL_REQUEST:REMIX ${targetSlug} ${remixInstructions}`
    ].join('\n');
    
    // Write to the wtaf directory that the WTAF engine watches
    const smsDir = path.resolve(__dirname, '..', '..');
    const wtafDir = path.join(smsDir, 'data', 'wtaf');
    
    // Ensure directory exists
    if (!fs.existsSync(wtafDir)) {
      fs.mkdirSync(wtafDir, { recursive: true });
    }
    
    const filePath = path.join(wtafDir, filename);
    fs.writeFileSync(filePath, fileContent, 'utf8');
    
    logWithTimestamp(`✅ Remix request queued at: ${filePath}`);
    return true;
    
  } catch (error) {
    logWithTimestamp(`💥 Error queueing remix request: ${error}`);
    return false;
  }
}

// Note: Direct processing functions removed - we now use file-based queueing
// to integrate with monitor.py's existing workflow. Edit processing happens
// in monitor.py using the prompts/edits.json template. 