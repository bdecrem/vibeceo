import sgMail from '@sendgrid/mail';
import axios from 'axios';
import * as dotenv from 'dotenv';

const isProduction = process.env.NODE_ENV === 'production';

// Load environment variables in development
if (!isProduction) {
  dotenv.config({ path: '.env.local' });
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
    const today = new Date().toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric',
      timeZone: 'America/Los_Angeles' 
    });

    // Create the email content
    const emailContent = {
      from: 'Advisors Foundry <bot@advisorsfoundry.ai>',
      replyTo: 'daily@reply.advisorsfoundry.ai',
      subject: `AF Daily — ${today}: ✨ Delusion Incoming`,
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
    const today = new Date().toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric',
      timeZone: 'America/Los_Angeles' 
    });

    const msg = {
      to: recipientEmail,
      from: 'Advisors Foundry <bot@advisorsfoundry.ai>',
      replyTo: 'daily@reply.advisorsfoundry.ai',
      subject: `AF Daily — ${today}: ✨ Delusion Incoming`,
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
          const today = new Date().toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric',
            timeZone: 'America/Los_Angeles' 
          });

          const msg = {
            to: email,
            from: 'Advisors Foundry <bot@advisorsfoundry.ai>',
            replyTo: 'daily@reply.advisorsfoundry.ai',
            subject: `AF Daily — ${today}: ✨ Delusion Incoming`,
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

// Send custom message to specific email list (for stackemail)
export async function sendToCustomEmailList(
  emails: string[], 
  message: string, 
  appName: string
): Promise<{success: boolean, sentCount: number, failedCount: number}> {
  console.log(`📧 Sending stackemail to ${emails.length} recipients for app: ${appName}`);
  
  try {
    const today = new Date().toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric',
      timeZone: 'America/Los_Angeles' 
    });
    
    let sentCount = 0;
    let failedCount = 0;
    
    // Send emails in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      const promises = batch.map(async (email) => {
        try {
          const msg = {
            to: email,
            from: 'WTAF App Creator <bot@advisorsfoundry.ai>',
            replyTo: 'noreply@advisorsfoundry.ai',
            subject: `Message from ${appName} creator`,
            text: formatStackEmailAsText(message, appName),
            html: formatStackEmailAsHtml(message, appName),
            tracking_settings: {
              click_tracking: { enable: false },
              open_tracking: { enable: false }
            }
          };
          
          await sgMail.send(msg);
          sentCount++;
          console.log(`📧 Sent stackemail to ${email}`);
        } catch (error: any) {
          failedCount++;
          console.error(`📧 Failed to send stackemail to ${email}:`, error.response?.body || error.message);
        }
      });
      
      await Promise.all(promises);
      
      // Add delay between batches to be nice to SendGrid
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }
    
    console.log(`📧 Stackemail broadcast complete! Sent: ${sentCount}, Failed: ${failedCount}`);
    
    return {
      success: sentCount > 0,
      sentCount,
      failedCount
    };
    
  } catch (error) {
    console.error('📧 Error sending stackemail:', error);
    return { success: false, sentCount: 0, failedCount: 0 };
  }
}

function formatStackEmailAsText(message: string, appName: string): string {
  return `Hi there!

The creator of "${appName}" sent this message to everyone who participated:

"${message}"

You're receiving this because you submitted to this WTAF app.

---
WTAF - Where Apps Find Their Voice
advisorsfoundry.ai`;
}

function formatStackEmailAsHtml(message: string, appName: string): string {
  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 24px; background-color: #fffaf5; color: #1a1a1a; max-width: 600px; margin: auto;">
    <p style="margin-bottom: 16px; font-size: 16px;">Hi there!</p>

    <p style="margin-bottom: 16px; font-size: 16px;">
      The creator of "<strong>${appName}</strong>" sent this message to everyone who participated:
    </p>

    <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 16px; font-style: italic;">"${message}"</p>
    </div>

    <p style="margin-bottom: 16px; font-size: 14px; color: #666;">
      You're receiving this because you submitted to this WTAF app.
    </p>

    <hr style="margin: 24px 0; border: none; border-top: 1px solid #ddd;" />

    <p style="font-size: 12px; color: #888;">
      WTAF - Where Apps Find Their Voice<br>
      <a href="https://advisorsfoundry.ai" style="color: #888;">advisorsfoundry.ai</a>
    </p>
  </div>
  `;
}

function formatMessageAsText(message: string): string {
  const today = new Date().toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric',
    timeZone: 'America/Los_Angeles' 
  });
  
  // Extract just the core content without AF Daily header and marketing footer
  let coreContent = message;
  
  // Remove "AF Daily — [date]" header if present
  coreContent = coreContent.replace(/^AF Daily — [^\n]*\n\n?/i, '');
  
  // Remove marketing footer if present (🌀 Text MORE...)
  coreContent = coreContent.replace(/\n\n🌀 .*$/s, '');
  
  // Parse for attribution (— Author)
  let messageContent = coreContent;
  let attribution = '';
  
  const attributionMatch = coreContent.match(/^(.*?)\n— (.+)$/s);
  if (attributionMatch) {
    messageContent = attributionMatch[1].trim();
    attribution = attributionMatch[2].trim();
  }
  
  // Add line break after "Happy Hour:" if present
  messageContent = messageContent.replace(/Happy Hour:([^\n])/g, 'Happy Hour:\n$1');
  
  // Check if it looks like a quote (has quotation marks)
  const hasQuotes = /^["'"].*["'"]$/s.test(messageContent.trim());
  
  return `${today}
A toast to your temporary delusion

AF Daily — ${today}
🌞 Welcome to your regularly scheduled reality break.

${hasQuotes ? '💭 ' : ''}${messageContent}
${attribution ? `— ${attribution}` : ''}

Silence is golden. Or at least Series A adjacent.

---

Still hungry for founder chaos?
Subscribe to our Substack before we pivot to selling protein powder.

advisorsfoundry.ai — Unsubscribe`;
}

function formatMessageAsHtml(message: string): string {
  const today = new Date().toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric',
    timeZone: 'America/Los_Angeles' 
  });
  
  // Extract just the core content without AF Daily header and marketing footer
  let coreContent = message;
  
  // Remove "AF Daily — [date]" header if present
  coreContent = coreContent.replace(/^AF Daily — [^\n]*\n\n?/i, '');
  
  // Remove marketing footer if present (🌀 Text MORE...)
  coreContent = coreContent.replace(/\n\n🌀 .*$/s, '');
  
  // Parse for attribution (— Author)
  let messageContent = coreContent;
  let attribution = '';
  
  const attributionMatch = coreContent.match(/^(.*?)\n— (.+)$/s);
  if (attributionMatch) {
    messageContent = attributionMatch[1].trim();
    attribution = attributionMatch[2].trim();
  }
  
  // Convert line breaks and format content, specifically handle "Happy Hour:" line break
  let formattedContent = messageContent.replace(/\n/g, '<br>');
  
  // Add line break after "Happy Hour:" if present
  formattedContent = formattedContent.replace(/Happy Hour:([^<])/g, 'Happy Hour:<br>$1');
  
  // Check if it looks like a quote (has quotation marks)
  const hasQuotes = /^["'"].*["'"]$/s.test(messageContent.trim());
  
  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 24px; background-color: #fffaf5; color: #1a1a1a; max-width: 600px; margin: auto;">
    <p style="margin-bottom: 8px; font-size: 18px; font-weight: 600;">${today}</p>
    <p style="margin-top: 0; margin-bottom: 24px; color: #666; font-style: italic;">A toast to your temporary delusion</p>

    <p style="margin-bottom: 8px; font-size: 18px; font-weight: 600;">AF Daily — ${today}</p>
    <p style="margin-bottom: 16px; font-size: 16px;">🌞 Welcome to your regularly scheduled reality break.</p>

    <p style="margin-bottom: 4px; font-size: 16px;">${hasQuotes ? '💭 ' : ''}${formattedContent}</p>
    ${attribution ? `<p style="margin-bottom: 16px; font-size: 16px;">— ${attribution}</p>` : ''}
    
    <p style="margin-bottom: 24px; font-size: 16px; font-style: italic;">Silence is golden. Or at least Series A adjacent.</p>

    <hr style="margin: 24px 0; border: none; border-top: 1px solid #ddd;" />

    <p style="margin-bottom: 16px; font-size: 14px;">
      Still hungry for founder chaos?<br>
      Subscribe to our <a href="https://advisorsfoundry.substack.com" style="color: #ff6600; text-decoration: none;">Substack</a> before we pivot to selling protein powder.
    </p>

    <p style="font-size: 12px; color: #888;">advisorsfoundry.ai — <a href="mailto:bot@advisorsfoundry.ai?subject=Unsubscribe" style="color: #888;">Unsubscribe</a></p>
  </div>
  `;
}
