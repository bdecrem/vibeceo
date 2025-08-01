import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
  return createClient(supabaseUrl, supabaseKey);
}

interface DirectProcessParams {
  command: string;
  subscriber: any;
  userRole: string;
}

// Extract app details from SMS bot success messages
function extractAppDetails(message: string) {
  const publicUrlMatch = message.match(/Your app: (https?:\/\/[^\s]+)/);
  const adminUrlMatch = message.match(/View data: (https?:\/\/[^\s]+)/);
  
  return {
    publicUrl: publicUrlMatch ? publicUrlMatch[1] : null,
    adminUrl: adminUrlMatch ? adminUrlMatch[1] : null
  };
}

export async function processWtafDirectly({ command, subscriber, userRole }: DirectProcessParams) {
  const startTime = Date.now();
  const maxWaitTime = 60000; // 60 seconds max wait - memes can take time!
  const checkInterval = 3000; // Check every 3 seconds
  const initialDelay = 5000; // Wait 5 seconds before first check
  
  try {
    // First, call the SMS bot to initiate processing
    const SMS_BOT_URL = process.env.SMS_BOT_URL || 'http://localhost:3030';
    const DEV_WEBHOOK_ENDPOINT = '/dev/webhook';
    
    // Create request payload
    const payload = new URLSearchParams({
      'From': subscriber.phone_number,
      'To': '+19999999999',
      'Body': command,
      'MessageSid': `SM${Math.random().toString(36).substr(2, 32)}`,
      'AccountSid': 'AC' + Math.random().toString(36).substr(2, 32),
      'NumMedia': '0',
      'X-Web-Console': 'true',
      'X-User-Email': subscriber.email,
      'X-User-Slug': subscriber.slug,
      'X-User-Role': userRole,
      'X-User-Id': subscriber.supabase_id
    });

    // Send initial request
    const response = await fetch(`${SMS_BOT_URL}${DEV_WEBHOOK_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Twilio-Signature': 'web-console-signature'
      },
      body: payload.toString()
    });

    if (!response.ok) {
      throw new Error(`SMS bot error: ${response.status}`);
    }

    const initialResponse = await response.json();
    
    // Send initial responses back to console
    const responses = [{
      type: 'info',
      message: initialResponse.responses?.[0] || 'Processing your request...'
    }];

    // For simple commands that don't create apps, return immediately
    if (!command.toLowerCase().includes('wtaf') && !command.toLowerCase().includes('meme')) {
      return {
        success: true,
        responses,
        complete: true
      };
    }

    // For WTAF/meme commands, we need to poll for the result
    const isMeme = command.toLowerCase().includes('meme');
    responses.push({
      type: 'info',
      message: isMeme 
        ? '🎨 Creating your meme... (this typically takes 20-40 seconds)'
        : '⏳ Building your app... (this typically takes 15-30 seconds)'
    });

    // Wait initial delay before starting to poll
    await new Promise(resolve => setTimeout(resolve, initialDelay));

    // Poll Supabase for the created app
    const supabase = getSupabaseClient();
    let appFound = false;
    let appData = null;
    let checkCount = 0;
    
    while (!appFound && (Date.now() - startTime) < maxWaitTime) {
      checkCount++;
      
      // Provide periodic status updates
      if (checkCount === 5) {
        responses.push({
          type: 'info',
          message: '⚡ Still processing... Your creation is almost ready!'
        });
      } else if (checkCount === 10) {
        responses.push({
          type: 'info',
          message: '🔨 Putting the finishing touches on your ' + (isMeme ? 'meme' : 'app') + '...'
        });
      }
      
      // Query for recently created apps by this user
      const { data: recentApps, error } = await supabase
        .from('wtaf_content')
        .select('*')
        .eq('user_slug', subscriber.slug)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (!error && recentApps && recentApps.length > 0) {
        const latestApp = recentApps[0];
        
        // Check if this app was created after we started processing
        const appCreatedAt = new Date(latestApp.created_at).getTime();
        if (appCreatedAt > startTime) {
          appFound = true;
          appData = latestApp;
        }
      }
      
      // Wait before next check
      if (!appFound) {
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
    }
    
    if (appFound && appData) {
      // App was created successfully!
      const publicUrl = `https://wtaf.me/${appData.user_slug}/${appData.app_slug}`;
      
      responses.push({
        type: 'success',
        message: '🎉 App created successfully!'
      });
      
      responses.push({
        type: 'url',
        message: `📱 Your app: ${publicUrl}`
      });
      
      // Check if there's an admin page
      if (appData.has_admin_page) {
        // Query for the admin page
        const { data: adminPages } = await supabase
          .from('wtaf_content')
          .select('app_slug')
          .eq('admin_table_id', appData.id)
          .limit(1);
          
        if (adminPages && adminPages.length > 0) {
          const adminUrl = `https://wtaf.me/${appData.user_slug}/${adminPages[0].app_slug}`;
          responses.push({
            type: 'admin_url',
            message: `📊 Admin panel: ${adminUrl}`
          });
        }
      }
      
      return {
        success: true,
        responses,
        publicUrl,
        complete: true
      };
    } else {
      // Timeout - app creation might still be in progress
      responses.push({
        type: 'warning',
        message: `⏱️ Your ${isMeme ? 'meme' : 'app'} is taking a bit longer than usual (over 60 seconds).`
      });
      
      responses.push({
        type: 'info',
        message: '🚀 It\'s still being created! The URL will arrive via SMS shortly.'
      });
      
      responses.push({
        type: 'info',
        message: `💡 You can also check your creations at: https://wtaf.me/${subscriber.slug}`
      });
      
      return {
        success: true,
        responses,
        complete: false
      };
    }
    
  } catch (error: any) {
    console.error('[DirectProcess] Error:', error);
    throw error;
  }
}