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
    
    const elevatedRoles = ['coder', 'degen', 'admin'];
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

export async function queuePublishDataRequest(
  userSlug: string,
  indexNumber: number,
  senderPhone: string
): Promise<boolean> {
  try {
    logWithTimestamp(`📢 Queueing publish data request: user=${userSlug}, index=${indexNumber}`);
    
    // Get the target page from user's WTAF content
    const { data: userContent, error } = await supabase
      .from('wtaf_content')
      .select('app_slug, data_is_public')
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
    
    // Check if already public
    if (targetPage.data_is_public === true) {
      logWithTimestamp(`ℹ️ Data for page ${indexNumber} (${appSlug}) is already public`);
      return true; // Not an error, just already done
    }
    
    // Move data from private to public table
    const moveSuccess = await moveSubmissionsToPublic(appSlug);
    
    if (moveSuccess) {
      // Update the wtaf_content record to mark data as public
      const { error: updateError } = await supabase
        .from('wtaf_content')
        .update({ data_is_public: true })
        .eq('user_slug', userSlug)
        .eq('app_slug', appSlug);
        
      if (updateError) {
        logWithTimestamp(`❌ Error updating data_is_public flag: ${updateError}`);
        return false;
      }
      
      logWithTimestamp(`✅ Published data for page ${indexNumber} (${appSlug})`);
      return true;
    }
    
    return false;
    
  } catch (error) {
    logWithTimestamp(`💥 Error queueing publish data request: ${error}`);
    return false;
  }
}

export async function queuePrivateDataRequest(
  userSlug: string,
  indexNumber: number,
  senderPhone: string
): Promise<boolean> {
  try {
    logWithTimestamp(`🔒 Queueing private data request: user=${userSlug}, index=${indexNumber}`);
    
    // Get the target page from user's WTAF content
    const { data: userContent, error } = await supabase
      .from('wtaf_content')
      .select('app_slug, data_is_public')
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
    
    // Check if already private (NULL or false = private)
    if (targetPage.data_is_public !== true) {
      logWithTimestamp(`ℹ️ Data for page ${indexNumber} (${appSlug}) is already private`);
      return true; // Not an error, just already done
    }
    
    // Move data from public to private table
    const moveSuccess = await moveSubmissionsToPrivate(appSlug);
    
    if (moveSuccess) {
      // Update the wtaf_content record to mark data as private
      const { error: updateError } = await supabase
        .from('wtaf_content')
        .update({ data_is_public: false })
        .eq('user_slug', userSlug)
        .eq('app_slug', appSlug);
        
      if (updateError) {
        logWithTimestamp(`❌ Error updating data_is_public flag: ${updateError}`);
        return false;
      }
      
      logWithTimestamp(`✅ Made data private for page ${indexNumber} (${appSlug})`);
      return true;
    }
    
    return false;
    
  } catch (error) {
    logWithTimestamp(`💥 Error queueing private data request: ${error}`);
    return false;
  }
}

/**
 * Move submissions from private table to public table
 */
async function moveSubmissionsToPublic(appSlug: string): Promise<boolean> {
  try {
    // Get app UUID from slug
    const { data: appData, error: appError } = await supabase
      .from('wtaf_content')
      .select('id')
      .eq('app_slug', appSlug)
      .single();
      
    if (appError || !appData) {
      logWithTimestamp(`❌ App not found: ${appSlug}`);
      return false;
    }
    
    const appId = appData.id;
    
    // Get all submissions for this app from private table
    const { data: privateSubmissions, error: fetchError } = await supabase
      .from('wtaf_submissions')
      .select('*')
      .eq('app_id', appId);
      
    if (fetchError) {
      logWithTimestamp(`❌ Error fetching private submissions: ${fetchError}`);
      return false;
    }
    
    if (!privateSubmissions || privateSubmissions.length === 0) {
      logWithTimestamp(`ℹ️ No submissions to move for app ${appSlug}`);
      return true; // Success - nothing to move
    }
    
    // Insert into public table
    const { error: insertError } = await supabase
      .from('wtaf_submissions_public')
      .insert(privateSubmissions);
      
    if (insertError) {
      logWithTimestamp(`❌ Error inserting into public table: ${insertError}`);
      return false;
    }
    
    // Delete from private table
    const { error: deleteError } = await supabase
      .from('wtaf_submissions')
      .delete()
      .eq('app_id', appId);
      
    if (deleteError) {
      logWithTimestamp(`❌ Error deleting from private table: ${deleteError}`);
      // TODO: Should we rollback the public insert here?
      return false;
    }
    
    logWithTimestamp(`✅ Moved ${privateSubmissions.length} submissions to public for app ${appSlug}`);
    return true;
    
  } catch (error) {
    logWithTimestamp(`💥 Error moving submissions to public: ${error}`);
    return false;
  }
}

/**
 * Move submissions from public table to private table
 */
async function moveSubmissionsToPrivate(appSlug: string): Promise<boolean> {
  try {
    // Get app UUID from slug
    const { data: appData, error: appError } = await supabase
      .from('wtaf_content')
      .select('id')
      .eq('app_slug', appSlug)
      .single();
      
    if (appError || !appData) {
      logWithTimestamp(`❌ App not found: ${appSlug}`);
      return false;
    }
    
    const appId = appData.id;
    
    // Get all submissions for this app from public table
    const { data: publicSubmissions, error: fetchError } = await supabase
      .from('wtaf_submissions_public')
      .select('*')
      .eq('app_id', appId);
      
    if (fetchError) {
      logWithTimestamp(`❌ Error fetching public submissions: ${fetchError}`);
      return false;
    }
    
    if (!publicSubmissions || publicSubmissions.length === 0) {
      logWithTimestamp(`ℹ️ No submissions to move for app ${appSlug}`);
      return true; // Success - nothing to move
    }
    
    // Insert into private table
    const { error: insertError } = await supabase
      .from('wtaf_submissions')
      .insert(publicSubmissions);
      
    if (insertError) {
      logWithTimestamp(`❌ Error inserting into private table: ${insertError}`);
      return false;
    }
    
    // Delete from public table
    const { error: deleteError } = await supabase
      .from('wtaf_submissions_public')
      .delete()
      .eq('app_id', appId);
      
    if (deleteError) {
      logWithTimestamp(`❌ Error deleting from public table: ${deleteError}`);
      // TODO: Should we rollback the private insert here?
      return false;
    }
    
    logWithTimestamp(`✅ Moved ${publicSubmissions.length} submissions to private for app ${appSlug}`);
    return true;
    
  } catch (error) {
    logWithTimestamp(`💥 Error moving submissions to private: ${error}`);
    return false;
  }
}

// Note: Direct processing functions removed - we now use file-based queueing
// to integrate with monitor.py's existing workflow. Edit processing happens
// in monitor.py using the prompts/edits.json template. 