#!/usr/bin/env node

/**
 * Hourly check for new WEBTOYS users
 * Sends email notification when new users sign up
 */

import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';
import { formatNewUsersEmail } from './email-templates.js';

// Load environment variables - use the same path as working sendgrid.ts
const isProduction = process.env.NODE_ENV === 'production';
if (!isProduction) {
  dotenv.config({ path: '../.env.local' });
}

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Initialize SendGrid
const apiKey = process.env.SENDGRID_API_KEY;
if (!apiKey) {
    console.error('❌ SENDGRID_API_KEY not found in environment!');
    console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('SEND')));
    process.exit(1);
}
console.log('📧 Using SendGrid API key:', apiKey.substring(0, 15) + '...');
sgMail.setApiKey(apiKey);

// Configuration
const ADMIN_EMAIL = 'bdecrem@gmail.com';
const CHECK_INTERVAL_HOURS = 1; // How far back to look

import fs from 'fs';
import path from 'path';

// Local file to track last check time
const STATE_FILE = path.join(process.cwd(), '.last-user-check');

async function getLastCheckTime() {
    try {
        // Try to read the last check time from local file
        if (fs.existsSync(STATE_FILE)) {
            const lastCheck = fs.readFileSync(STATE_FILE, 'utf8').trim();
            console.log('Last check found in local file:', lastCheck);
            return lastCheck;
        }
        
        // If no file exists, check the last hour
        console.log('No previous check found, checking last hour');
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - CHECK_INTERVAL_HOURS);
        return oneHourAgo.toISOString();
    } catch (error) {
        console.error('Error reading last check time:', error);
        // Fallback to last hour
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - CHECK_INTERVAL_HOURS);
        return oneHourAgo.toISOString();
    }
}

async function updateLastCheckTime(timestamp) {
    try {
        // Write the timestamp to local file
        fs.writeFileSync(STATE_FILE, timestamp, 'utf8');
        console.log('✅ Updated last check time to:', timestamp);
    } catch (error) {
        console.error('Error updating last check time:', error);
    }
}

async function getNewUsers(sinceTimestamp) {
    try {
        const { data: newUsers, error } = await supabase
            .from('sms_subscribers')
            .select('id, phone_number, slug, created_at, role')
            .gt('created_at', sinceTimestamp)
            .order('created_at', { ascending: true });
        
        if (error) {
            console.error('Error fetching new users:', error);
            return [];
        }
        
        return newUsers || [];
    } catch (error) {
        console.error('Error fetching new users:', error);
        return [];
    }
}

async function getTotalUserCount() {
    try {
        const { count, error } = await supabase
            .from('sms_subscribers')
            .select('*', { count: 'exact', head: true });
        
        if (error) {
            console.error('Error getting total user count:', error);
            return null;
        }
        
        return count;
    } catch (error) {
        console.error('Error getting total user count:', error);
        return null;
    }
}

async function sendNotificationEmail(newUsers, totalCount, checkPeriod) {
    try {
        const emailContent = formatNewUsersEmail(newUsers, totalCount, checkPeriod);
        
        const msg = {
            to: ADMIN_EMAIL,
            from: 'WEBTOYS Bot <bot@advisorsfoundry.ai>',
            subject: emailContent.subject,
            text: emailContent.text,
            html: emailContent.html
        };
        
        await sgMail.send(msg);
        console.log(`📧 Email sent to ${ADMIN_EMAIL}`);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
}

async function main() {
    console.log('🔍 Checking for new WEBTOYS users...');
    console.log('Current time:', new Date().toISOString());
    
    try {
        // Get the last time we checked
        const lastCheckTime = await getLastCheckTime();
        console.log('Last check was at:', lastCheckTime);
        
        // Get new users since last check
        const newUsers = await getNewUsers(lastCheckTime);
        
        if (newUsers.length === 0) {
            console.log('No new users since last check');
            // Still update the check time
            await updateLastCheckTime(new Date().toISOString());
            return;
        }
        
        console.log(`Found ${newUsers.length} new user(s)!`);
        
        // Get total user count for context
        const totalCount = await getTotalUserCount();
        
        // Calculate the check period for the email
        const checkPeriod = {
            from: lastCheckTime,
            to: new Date().toISOString()
        };
        
        // Send notification email
        const emailSent = await sendNotificationEmail(newUsers, totalCount, checkPeriod);
        
        if (emailSent) {
            console.log('✅ Notification email sent successfully');
        }
        
        // Update last check time to now
        await updateLastCheckTime(new Date().toISOString());
        
        // Log summary
        console.log('\n📊 Summary:');
        console.log(`  - New users: ${newUsers.length}`);
        console.log(`  - Total users: ${totalCount || 'unknown'}`);
        console.log(`  - Email sent: ${emailSent ? 'Yes' : 'No'}`);
        
    } catch (error) {
        console.error('Fatal error in main:', error);
        process.exit(1);
    }
}

// Run the check
main().then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
}).catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});