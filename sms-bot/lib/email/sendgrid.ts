import sgMail from '@sendgrid/mail';
import axios from 'axios';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Environment setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';

// Load environment variables from .env.local in development
if (!isProduction) {
  const envPath = path.resolve(__dirname, '../.env.local');
  
  // Check if file exists before trying to load it
  if (fs.existsSync(envPath)) {
    console.log(`Loading environment from ${envPath}`);
    dotenv.config({ path: envPath });
  } else {
    console.warn(`Environment file not found at ${envPath}`);
    // Try loading from current working directory as fallback
    const cwdEnvPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(cwdEnvPath)) {
      console.log(`Loading environment from ${cwdEnvPath}`);
      dotenv.config({ path: cwdEnvPath });
    }
  }
}

// Initialize SendGrid
const apiKey = process.env.SENDGRID_API_KEY;
if (!apiKey) {
  throw new Error(`SENDGRID_API_KEY not found in ${isProduction ? 'Railway environment' : '.env.local'}`);
}

sgMail.setApiKey(apiKey);

// Helper function to check if an error is a SendGrid API error
interface ApiError {
  response?: {
    body?: unknown;
    headers?: unknown;
    statusCode?: number;
  };
}

function isApiError(error: unknown): error is ApiError {
  return typeof error === 'object' && error !== null && 'response' in error;
}

export async function sendBroadcastEmailToList(message: string, listId?: string) {
  console.log(`📧 Broadcasting email to SendGrid list${listId ? ` (ID: ${listId})` : ''}`);
  
  try {
    // Create the email content
    const emailContent = {
      from: 'Advisors Foundry <bot@advisorsfoundry.ai>',
      subject: 'AF Daily — One Line to Unravel You',
      content: [
        {
          type: 'text/plain',
          value: formatMessageAsText(message)
        },
        {
          type: 'text/html',
          value: formatMessageAsHtml(message)
        }
      ]
    };

    // If no listId provided, use a default list or send to all contacts
    const sendTo = listId ? { list_ids: [listId] } : { all: true };

    const msg = {
      ...emailContent,
      send_to: sendTo,
      // Add custom args to track this as a broadcast
      custom_args: {
        type: 'af_daily_broadcast',
        timestamp: new Date().toISOString()
      }
    };

    // Note: SendGrid's Marketing Campaigns API would be used here for list-based sending
    // For now, let's create a simpler version that sends to a test list
    console.log('📧 Email broadcast prepared. In production, this would use SendGrid Marketing Campaigns API.');
    console.log('📧 Message content prepared:', { subject: emailContent.subject, contentLength: message.length });
    
    return { success: true, message: 'Email broadcast prepared for SendGrid list' };
    
  } catch (error: any) {
    console.error('❌ Error preparing email broadcast:', error.message);
    throw error;
  }
}

// For testing - send to a single email (like your test)
export async function sendTestEmail(message: string, recipientEmail: string) {
  try {
    const msg = {
      to: recipientEmail,
      from: 'Advisors Foundry <bot@advisorsfoundry.ai>',
      subject: 'AF Daily — One Line to Unravel You',
      text: formatMessageAsText(message),
      html: formatMessageAsHtml(message),
    };

    const response = await sgMail.send(msg);
    console.log(`📧 Test email sent to ${recipientEmail}, Message ID: ${response[0].headers['x-message-id']}`);
    return { success: true, messageId: response[0].headers['x-message-id'] };
  } catch (error: any) {
    console.error(`❌ Failed to send test email:`, error.response?.body || error.message);
    throw error;
  }
}

// Fetch all contacts from a SendGrid list
async function getListContacts(listId: string): Promise<string[]> {
  console.log(`📧 Fetching contacts from SendGrid list: ${listId}`);
  
  try {
    // First, let's verify the list exists by getting list info
    console.log('📧 Verifying list exists...');
    const listResponse = await axios.get(
      `https://api.sendgrid.com/v3/marketing/lists/${listId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`📧 List verified: ${listResponse.data.name} (${listResponse.data.contact_count} contacts)`);
    
    // Now fetch contacts using the search API (more reliable)
    console.log('📧 Fetching list contacts...');
    const contactsResponse = await axios.post(
      'https://api.sendgrid.com/v3/marketing/contacts/search',
      {
        query: `CONTAINS(list_ids, '${listId}')`
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const contacts = contactsResponse.data.result || [];
    
    // Debug: Let's see all contact details
    console.log('📧 DEBUG: Raw contact data:');
    contacts.forEach((contact: any, index: number) => {
      console.log(`📧   Contact ${index + 1}: ${contact.email} - Status: ${contact.status || 'unknown'}`);
    });
    
    const emailAddresses = contacts.map((contact: any) => contact.email).filter(Boolean);
    
    console.log(`📧 Found ${emailAddresses.length} active contacts in list ${listId}`);
    console.log(`📧 List count says ${listResponse.data.contact_count} but search returned ${contacts.length}`);
    return emailAddresses;
    
  } catch (error: any) {
    console.error('📧 Error fetching list contacts:', error.response?.data || error.message);
    console.error('📧 Full error:', error.response || error);
    throw new Error(`Failed to fetch contacts from list ${listId}: ${error.response?.data?.errors?.[0]?.message || error.message}`);
  }
}

// Send to all contacts in a SendGrid list by fetching contacts and sending individually
async function sendToListContacts(message: string, listId: string): Promise<{success: boolean, sentCount: number, failedCount: number}> {
  console.log(`📧 Sending to all contacts in SendGrid list: ${listId}`);
  
  try {
    // Fetch all contacts from the list
    const emailAddresses = await getListContacts(listId);
    
    if (emailAddresses.length === 0) {
      console.log('📧 No contacts found in the list');
      return { success: true, sentCount: 0, failedCount: 0 };
    }
    
    console.log(`📧 Sending emails to ${emailAddresses.length} contacts...`);
    
    const htmlContent = formatMessageAsHtml(message);
    const textContent = formatMessageAsText(message);
    
    let sentCount = 0;
    let failedCount = 0;
    
    // Send emails in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < emailAddresses.length; i += batchSize) {
      const batch = emailAddresses.slice(i, i + batchSize);
      
      const promises = batch.map(async (email) => {
        try {
          const msg = {
            to: email,
            from: 'Advisors Foundry <bot@advisorsfoundry.ai>',
            subject: 'AF Daily — One Line to Unravel You',
            text: textContent,
            html: htmlContent,
            tracking_settings: {
              click_tracking: { enable: true },
              open_tracking: { enable: true }
            }
          };
          
          await sgMail.send(msg);
          sentCount++;
          console.log(`📧 Sent to ${email}`);
        } catch (error: any) {
          failedCount++;
          console.error(`📧 Failed to send to ${email}:`, error.response?.body || error.message);
        }
      });
      
      await Promise.all(promises);
      
      // Add delay between batches to be nice to SendGrid
      if (i + batchSize < emailAddresses.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }
    
    console.log(`📧 Email broadcast complete! Sent: ${sentCount}, Failed: ${failedCount}`);
    
    return {
      success: sentCount > 0,
      sentCount,
      failedCount
    };
    
  } catch (error) {
    console.error('📧 Error sending to list contacts:', error);
    return { success: false, sentCount: 0, failedCount: 0 };
  }
}

// Send to a SendGrid contact list directly
export async function sendToSendGridList(message: string): Promise<{success: boolean, messageId?: string}> {
  // Get the SendGrid list ID from environment variables
  const listId = process.env.SENDGRID_LIST_ID;
  
  if (!listId) {
    console.error('📧 ERROR: SENDGRID_LIST_ID not found in environment variables');
    return { success: false };
  }
  
  console.log(`📧 Preparing to send PRODUCTION email broadcast to SendGrid list: ${listId}`);
  console.log('📧 Using proper list contact fetching and individual sending');
  
  // Use the proper list sending method - fetch contacts and send individually
  const result = await sendToListContacts(message, listId);
  
  return {
    success: result.success,
    messageId: result.success ? `sent-to-${result.sentCount}-contacts` : undefined
  };
}

function formatMessageAsText(message: string): string {
  const today = new Date().toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric',
    timeZone: 'America/Los_Angeles' 
  });
  
  return `AF Daily — ${today}

${message}

Cracked open by Advisors Foundry, your startup's favorite reality distortion field.

Still hungry for founder chaos?
Subscribe to the Substack before we pivot to selling protein powder:
→ advisorsfoundry.substack.com

---
advisorsfoundry.ai
Want out? Reply with "UNSUBSCRIBE"`;
}

function formatMessageAsHtml(message: string): string {
  const today = new Date().toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric',
    timeZone: 'America/Los_Angeles' 
  });
  
  // Parse the message to extract quote and attribution
  let messageContent = message;
  let attribution = '';
  
  // Look for attribution pattern like "— Alex" at the end
  const attributionMatch = message.match(/^(.*?)\s*—\s*(.+)$/s);
  if (attributionMatch) {
    messageContent = attributionMatch[1].trim();
    attribution = attributionMatch[2].trim();
  }
  
  // Clean up quotes if present
  messageContent = messageContent.replace(/^["'""]|["'""]$/g, '');
  
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9f9fc; color: #111; max-width: 600px; margin: auto; padding: 32px; border-radius: 12px; border: 1px solid #e2e8f0;">
  <div style="text-align: center; font-size: 12px; letter-spacing: 1px; color: #777; text-transform: uppercase; margin-bottom: 16px;">
    AF Daily — ${today}
  </div>

  <div style="font-size: 20px; line-height: 1.6; font-weight: 600; color: #111; text-align: center; padding: 0 10px;">
    💬 "${messageContent}"
  </div>

  ${attribution ? `<div style="text-align: center; font-size: 14px; color: #555; margin-top: 12px;">
    — ${attribution}
  </div>` : ''}

  <hr style="margin: 28px 0; border: none; border-top: 1px solid #eee;" />

  <div style="font-size: 14px; line-height: 1.6; color: #444; text-align: center;">
    Cracked open by <strong>Advisors Foundry</strong>, your startup's favorite reality distortion field.<br><br>
    Still hungry for founder chaos?<br>
    Subscribe to the Substack before we pivot to selling protein powder:<br>
    <strong>→ <a href="https://advisorsfoundry.substack.com" style="color: #00b3a4; text-decoration: none;">advisorsfoundry.substack.com</a></strong>
  </div>

  <div style="margin-top: 32px; font-size: 12px; color: #aaa; text-align: center;">
    <a href="https://advisorsfoundry.ai" style="color: #00b3a4; text-decoration: none;">advisorsfoundry.ai</a><br>
    Want out? <a href="mailto:bot@advisorsfoundry.ai?subject=Unsubscribe" style="color: #999; text-decoration: none;">Click here to unsubscribe</a>.
  </div>
</div>
  `;
}
