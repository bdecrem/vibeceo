import { processWtafDirectly } from './direct-process';

interface ProcessCommandParams {
  command: string;
  subscriber: any;
  userRole: string;
}

export async function processWebConsoleCommand({ command, subscriber, userRole }: ProcessCommandParams) {
  try {
    // Check if this is a WTAF or meme command that needs direct processing
    const lowerCommand = command.toLowerCase().trim();
    if (lowerCommand.startsWith('wtaf ') || lowerCommand.startsWith('meme ')) {
      // Use direct processing with polling for WTAF commands
      return await processWtafDirectly({ command, subscriber, userRole });
    }
    
    // For other commands, use the standard webhook approach
    const SMS_BOT_URL = process.env.SMS_BOT_URL || 'http://localhost:3030';
    const DEV_WEBHOOK_ENDPOINT = '/dev/webhook';
    
    // Create Twilio-style webhook payload
    const payload = new URLSearchParams({
      'From': subscriber.phone_number,
      'To': '+19999999999', // Bot's phone number
      'Body': command,
      'MessageSid': `SM${Math.random().toString(36).substr(2, 32)}`,
      'AccountSid': 'AC' + Math.random().toString(36).substr(2, 32),
      'NumMedia': '0',
      // Add web console metadata
      'X-Web-Console': 'true',
      'X-User-Email': subscriber.email,
      'X-User-Slug': subscriber.slug,
      'X-User-Role': userRole,
      'X-User-Id': subscriber.supabase_id
    });

    const response = await fetch(`${SMS_BOT_URL}${DEV_WEBHOOK_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Twilio-Signature': 'web-console-signature'
      },
      body: payload.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SMS bot error (${response.status}): ${errorText}`);
    }

    // Parse the response
    const responseData = await response.json();
    
    if (responseData.success) {
      const responses = responseData.responses || [];
      
      // Process each response and extract meaningful information
      const processedResponses = [];
      let publicUrl = null;
      let adminUrl = null;
      
      for (const response of responses) {
        // Check for app creation success messages
        if (response.includes('Your app:')) {
          // Extract public URL
          const publicUrlMatch = response.match(/Your app: (https?:\/\/[^\s]+)/);
          if (publicUrlMatch) {
            publicUrl = publicUrlMatch[1];
          }
          
          // Extract admin URL if present
          const adminUrlMatch = response.match(/View data: (https?:\/\/[^\s]+)/);
          if (adminUrlMatch) {
            adminUrl = adminUrlMatch[1];
          }
          
          processedResponses.push({
            type: 'success',
            message: '🎉 App created successfully!'
          });
          
          if (publicUrl) {
            processedResponses.push({
              type: 'url',
              message: `📱 Your app: ${publicUrl}`,
              url: publicUrl
            });
          }
          
          if (adminUrl) {
            processedResponses.push({
              type: 'admin_url',
              message: `📊 Admin panel: ${adminUrl}`,
              url: adminUrl
            });
          }
        } else if (response.includes('For 👨‍🍳💋')) {
          // Email completion message
          processedResponses.push({
            type: 'info',
            message: '✨ For 👨‍🍳💋 text back with your email.'
          });
        } else {
          // Other messages
          processedResponses.push({
            type: 'info',
            message: response
          });
        }
      }
      
      // If no specific success pattern found, return raw responses
      if (processedResponses.length === 0 && responses.length > 0) {
        for (const response of responses) {
          processedResponses.push({
            type: 'info',
            message: response
          });
        }
      }
      
      return {
        success: true,
        responses: processedResponses,
        publicUrl,
        adminUrl
      };
    } else {
      return {
        success: false,
        message: responseData.error || 'Command failed',
        type: 'error',
        error: true
      };
    }
    
  } catch (error: any) {
    console.error('[ProcessCommand] Error:', error);
    
    // Check if SMS bot is not running
    if (error.message.includes('ECONNREFUSED')) {
      throw new Error('SMS bot is not running. Please ensure the SMS bot service is active.');
    }
    
    throw error;
  }
}