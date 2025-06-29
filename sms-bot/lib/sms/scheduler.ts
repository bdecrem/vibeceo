import { getTodaysInspiration, formatDailyMessage, pickRandomMessageForToday, setNextDailyMessage, getNextDailyMessage } from './handlers.js';
import { getActiveSubscribers, getSubscriber, updateLastInspirationDate } from '../subscribers.js';
import type { TwilioClient } from './webhooks.js';
import twilio from 'twilio';
import { sendTestEmail, sendToSendGridList } from '../email/sendgrid.js';

// Function to check if it's time to send (weekend: 12pm/10am PT, weekday: 9am/7am PT)
function isTimeToSend(isEarly: boolean = false): boolean {
  const now = new Date();
  const pt = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  
  // Check weekend mode
  const weekendOverride = process.env.WEEKEND_MODE_SMS_OVERRIDE;
  let isWeekendMode = false;
  
  if (weekendOverride === 'ON') {
    isWeekendMode = true;
  } else if (weekendOverride === 'OFF') {
    isWeekendMode = false;
  } else {
    const pacificTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      weekday: 'short'
    }).format(new Date());
    isWeekendMode = ['Sat', 'Sun'].includes(pacificTime);
  }
  
  // Set target hours based on weekend mode
  let targetHour;
  if (isWeekendMode) {
    targetHour = isEarly ? 10 : 12; // Weekend: 10am PT (early), 12pm PT (regular)
  } else {
    targetHour = isEarly ? 7 : 9;   // Weekday: 7am PT (early), 9am PT (regular)
  }
  
  return pt.getHours() === targetHour && pt.getMinutes() === 0;
}

// Function to get next send time (weekend: 12pm/10am PT, weekday: 9am/7am PT)
function getNextSendTime(isEarly: boolean = false): Date {
  const now = new Date();
  const pt = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  
  // Check weekend mode for next send calculation
  const weekendOverride = process.env.WEEKEND_MODE_SMS_OVERRIDE;
  let isWeekendMode = false;
  
  if (weekendOverride === 'ON') {
    isWeekendMode = true;
  } else if (weekendOverride === 'OFF') {
    isWeekendMode = false;
  } else {
    const pacificTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      weekday: 'short'
    }).format(new Date());
    isWeekendMode = ['Sat', 'Sun'].includes(pacificTime);
  }
  
  // Set target hours based on weekend mode
  let targetHour;
  if (isWeekendMode) {
    targetHour = isEarly ? 10 : 12; // Weekend: 10am PT (early), 12pm PT (regular)
  } else {
    targetHour = isEarly ? 7 : 9;   // Weekday: 7am PT (early), 9am PT (regular)
  }
  
  // If it's already past target hour PT today, schedule for tomorrow
  if (pt.getHours() >= targetHour) {
    pt.setDate(pt.getDate() + 1);
  }
  
  pt.setHours(targetHour, 0, 0, 0);
  return pt;
}

// Keep track of the last send dates to avoid duplicate sends
let lastEarlySendDate: string = '';
let lastRegularSendDate: string = '';

// Minimum time between messages in milliseconds (3 hours)
const MIN_TIME_BETWEEN_MESSAGES: number = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

export async function startDailyScheduler(twilioClient: TwilioClient) {
  console.log('Starting daily message scheduler...');
  
  // Check every minute
  setInterval(async () => {
    try {
      const now = new Date();
      const todayPT = now.toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' });
      
      // COMMENTED OUT: Process admin users first (weekday: 7am PT, weekend: 10am PT)
      /*
      if (isTimeToSend(true) && lastEarlySendDate !== todayPT) {
        // Check weekend mode to display correct time
        const weekendOverride = process.env.WEEKEND_MODE_SMS_OVERRIDE;
        let isWeekendMode = false;
        
        if (weekendOverride === 'ON') {
          isWeekendMode = true;
        } else if (weekendOverride === 'OFF') {
          isWeekendMode = false;
        } else {
          const pacificTime = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Los_Angeles',
            weekday: 'short'
          }).format(new Date());
          isWeekendMode = ['Sat', 'Sun'].includes(pacificTime);
        }
        
        const earlyTime = isWeekendMode ? '10am PT' : '7am PT';
        console.log(`Starting early admin broadcast (${earlyTime})...`);
        
        // Pick today's message and set it as the next daily message
        let todaysMessage;
        try {
          console.log('Picking today\'s random message for admin preview...');
          todaysMessage = await pickRandomMessageForToday();
          setNextDailyMessage(todaysMessage);
          console.log(`Successfully picked and set next daily message: item ${todaysMessage.item}`);
        } catch (error) {
          console.error('Failed to pick today\'s message:', error);
          return; // Exit early if we can't pick the message
        }

        const messageText = formatDailyMessage(todaysMessage);
        const adminPreviewText = `📋 ADMIN PREVIEW: Today's message will be:\n\n${messageText}\n\n💡 Text SKIP to change it or SKIP [id] to queue a specific message.`;
        
        // Get active subscribers
        const allSubscribers = await getActiveSubscribers();
        
        // Filter for admin users
        const adminSubscribers = allSubscribers.filter(sub => sub.is_admin === true);
        console.log(`Found ${adminSubscribers.length} admin subscribers`);
        
        // Send to each admin subscriber
        let earlySuccessCount = 0;
        let earlyFailureCount = 0;
        let earlySkippedCount = 0;
        
        for (const subscriber of adminSubscribers) {
          try {
            // Check when this subscriber last received a daily inspiration
            const fullSubscriber = await getSubscriber(subscriber.phone_number);
            const lastInspirationDate = fullSubscriber?.last_inspiration_date ? new Date(fullSubscriber.last_inspiration_date) : null;
            const now = new Date();
            
            // Skip if they received a daily inspiration less than 30 minutes ago (reduced from 3 hours)
            const MIN_TIME_FOR_PREVIEW = 30 * 60 * 1000; // 30 minutes
            if (lastInspirationDate && (now.getTime() - lastInspirationDate.getTime() < MIN_TIME_FOR_PREVIEW)) {
              console.log(`Skipping early message to ${subscriber.phone_number} - received previous inspiration too recently`);
              earlySkippedCount++;
              continue;
            }
            
            await twilioClient.messages.create({
              body: adminPreviewText,
              to: subscriber.phone_number,
              from: process.env.TWILIO_PHONE_NUMBER
            });
            
            // Update the last inspiration date
            await updateLastInspirationDate(subscriber.phone_number);
            
            earlySuccessCount++;
            console.log(`Successfully sent early preview to ${subscriber.phone_number}`);
            
            // Add delay between messages to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            earlyFailureCount++;
            console.error(`Failed to send early message to ${subscriber.phone_number}:`, error);
          }
        }
        
        console.log(`Early broadcast complete. Success: ${earlySuccessCount}, Failures: ${earlyFailureCount}, Skipped: ${earlySkippedCount}`);
        
        // After early SMS broadcast completes, schedule admin email preview for 1 hour later
        if (earlySuccessCount > 0) {
          console.log(`\n📧 === ADMIN EMAIL PREVIEW SCHEDULED (${earlyTime} + 1 hour) ===`);
          console.log('📧 Scheduling admin preview email for 1 hour after SMS...');
          
          // Schedule email for 1 hour later
          setTimeout(async () => {
            try {
              console.log('📧 Sending delayed admin preview email to bdecrem@gmail.com...');
              
              const adminEmailResult = await sendTestEmail(messageText, 'bdecrem@gmail.com');
              if (adminEmailResult.success) {
                console.log(`📧 Admin email preview sent successfully! Message ID: ${adminEmailResult.messageId}`);
              } else {
                console.log('📧 Admin email preview failed');
              }
            } catch (emailError) {
              console.error('📧 Admin email preview error:', emailError);
            }
          }, 60 * 60 * 1000); // 1 hour = 3,600,000 milliseconds
        } else {
          console.log('📧 Skipping admin email preview - no early SMS messages were sent successfully');
        }
        
        // Mark as sent for today
        lastEarlySendDate = todayPT;
        
        // Log next early send time
        const nextEarlySend = getNextSendTime(true);
        console.log(`Next early broadcast scheduled for: ${nextEarlySend.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`);
      }
      */
      
      // COMMENTED OUT: Process regular subscribers (weekday: 9am PT, weekend: 12pm PT)
      // Only send to those who haven't received an early message
      /*
      if (isTimeToSend() && lastRegularSendDate !== todayPT) {
        const weekendOverride = process.env.WEEKEND_MODE_SMS_OVERRIDE;
        let isWeekendMode = false;
        
        if (weekendOverride === 'ON') {
          isWeekendMode = true;
        } else if (weekendOverride === 'OFF') {
          isWeekendMode = false;
        } else {
          const pacificTime = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Los_Angeles',
            weekday: 'short'
          }).format(new Date());
          isWeekendMode = ['Sat', 'Sun'].includes(pacificTime);
        }
        
        const regularTime = isWeekendMode ? '12pm PT' : '9am PT';
        console.log(`Starting regular daily broadcast (${regularTime})...`);
        
        // Get the pre-selected next daily message (set at 7am, possibly modified by admin)
        const nextMessage = getNextDailyMessage();
        if (!nextMessage) {
          console.error('No next daily message available! This should have been set at 7am.');
          return;
        }
        
        console.log(`Using pre-selected daily message: item ${nextMessage.item}`);
        const messageText = formatDailyMessage(nextMessage);
        
        // Get active subscribers
        const allSubscribers = await getActiveSubscribers();
        
        // Filter out admin users who should have already received the early message
        // This prevents double-sending to admin subscribers
        const regularSubscribers = allSubscribers.filter(sub => !sub.is_admin);
        console.log(`Found ${regularSubscribers.length} regular subscribers`);
        
        // Send to each regular subscriber
        let successCount = 0;
        let failureCount = 0;
        let skippedCount = 0;
        
        for (const subscriber of regularSubscribers) {
          try {
            // Check when this subscriber last received a daily inspiration
            const fullSubscriber = await getSubscriber(subscriber.phone_number);
            const lastInspirationDate = fullSubscriber?.last_inspiration_date ? new Date(fullSubscriber.last_inspiration_date) : null;
            const now = new Date();
            
            // Skip if they received a daily inspiration less than 30 minutes ago (reduced from 3 hours)
            const MIN_TIME_FOR_REGULAR = 30 * 60 * 1000; // 30 minutes
            if (lastInspirationDate && (now.getTime() - lastInspirationDate.getTime() < MIN_TIME_FOR_REGULAR)) {
              console.log(`Skipping message to ${subscriber.phone_number} - received previous inspiration too recently`);
              skippedCount++;
              continue;
            }
            
            await twilioClient.messages.create({
              body: messageText,
              to: subscriber.phone_number,
              from: process.env.TWILIO_PHONE_NUMBER
            });
            
            // Update the last inspiration date
            await updateLastInspirationDate(subscriber.phone_number);
            
            successCount++;
            console.log(`Successfully sent to ${subscriber.phone_number}`);
            
            // Add delay between messages to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            failureCount++;
            console.error(`Failed to send to ${subscriber.phone_number}:`, error);
          }
        }
        
        console.log(`Regular broadcast complete. Success: ${successCount}, Failures: ${failureCount}, Skipped: ${skippedCount}`);
        
        // After regular SMS broadcast completes, schedule email broadcast for 1 hour later
        if (successCount > 0) {
          console.log(`\n📧 === FULL EMAIL BROADCAST SCHEDULED (${regularTime} + 1 hour) ===`);
          console.log('📧 Scheduling email broadcast for 1 hour after SMS...');
          
          // Schedule email for 1 hour later
          setTimeout(async () => {
            try {
              console.log('📧 Sending delayed email broadcast to all subscribers...');
              
              const emailResult = await sendToSendGridList(messageText);
              if (emailResult.success) {
                console.log(`📧 Email broadcast successful! Message ID: ${emailResult.messageId}`);
              } else {
                console.log('📧 Email broadcast failed');
              }
            } catch (emailError) {
              console.error('📧 Email broadcast error:', emailError);
            }
          }, 60 * 60 * 1000); // 1 hour = 3,600,000 milliseconds
        } else {
          console.log('📧 Skipping email broadcast - no SMS messages were sent successfully');
        }
        
        // Mark as sent for today
        lastRegularSendDate = todayPT;
        
        // Log next send time
        const nextSend = getNextSendTime();
        console.log(`Next regular broadcast scheduled for: ${nextSend.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`);
      }
      */
    } catch (error) {
      console.error('Error in scheduler:', error);
    }
  }, 60000); // Check every minute
  
  // Log initial next send times
  const weekendOverride = process.env.WEEKEND_MODE_SMS_OVERRIDE;
  let isWeekendMode = false;
  
  if (weekendOverride === 'ON') {
    isWeekendMode = true;
  } else if (weekendOverride === 'OFF') {
    isWeekendMode = false;
  } else {
    const pacificTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      weekday: 'short'
    }).format(new Date());
    isWeekendMode = ['Sat', 'Sun'].includes(pacificTime);
  }
  
  const earlyTime = isWeekendMode ? '10am PT' : '7am PT';
  const regularTime = isWeekendMode ? '12pm PT' : '9am PT';
  
  const nextEarlySend = getNextSendTime(true);
  console.log(`First early broadcast (${earlyTime}) scheduled for: ${nextEarlySend.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`);
  
  const nextRegularSend = getNextSendTime();
  console.log(`First regular broadcast (${regularTime}) scheduled for: ${nextRegularSend.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`);
} 