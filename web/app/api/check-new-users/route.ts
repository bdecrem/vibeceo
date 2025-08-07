/**
 * Hourly check for new WEBTOYS users - API endpoint version
 * This runs the same logic as the local script but as a web API
 * Can be triggered by external cron services (no macOS permission issues)
 */

import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

// Configuration
const ADMIN_EMAIL = 'bdecrem@gmail.com';
const CHECK_INTERVAL_HOURS = 1;

// Email template functions (copied from email-templates.js)
function maskPhone(phone: string): string {
    if (!phone) return 'Unknown';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length <= 4) return phone;
    return `***-***-${cleaned.slice(-4)}`;
}

function formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function formatPeriod(checkPeriod: { from: string; to: string }): string {
    const from = new Date(checkPeriod.from);
    const to = new Date(checkPeriod.to);
    
    const formatOptions: Intl.DateTimeFormatOptions = {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    };
    
    if (from.toDateString() === to.toDateString()) {
        return `${from.toLocaleTimeString('en-US', formatOptions)} - ${to.toLocaleTimeString('en-US', formatOptions)}`;
    }
    
    return `${formatTime(checkPeriod.from)} - ${formatTime(checkPeriod.to)}`;
}

function formatNewUsersEmail(newUsers: any[], totalCount: number | null, checkPeriod: { from: string; to: string }) {
    const userCount = newUsers.length;
    const period = formatPeriod(checkPeriod);
    
    const subject = userCount === 1 
        ? `🎉 WEBTOYS: 1 new user joined!`
        : `🎉 WEBTOYS: ${userCount} new users joined!`;
    
    let textContent = `New users (${period}):\n\n`;
    
    newUsers.forEach((user, index) => {
        const userNumber = index + 1;
        const phone = maskPhone(user.phone_number);
        const time = formatTime(user.created_at);
        const role = user.role === 'DEGEN' ? ' [DEGEN]' : '';
        
        textContent += `${userNumber}. ${user.slug}${role}\n`;
        textContent += `   Phone: ${phone}\n`;
        textContent += `   Joined: ${time}\n`;
        textContent += `   View: https://webtoys.ai/${user.slug}\n\n`;
    });
    
    if (totalCount) {
        textContent += `\nTotal users: ${totalCount.toLocaleString()}`;
    }
    
    let htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #FF5722;">🎉 New WEBTOYS Users!</h2>
        <p style="color: #666; margin-bottom: 24px;">Period: ${period}</p>
        
        <div style="background: #f5f5f5; border-radius: 8px; padding: 16px;">
    `;
    
    newUsers.forEach((user, index) => {
        const userNumber = index + 1;
        const phone = maskPhone(user.phone_number);
        const time = formatTime(user.created_at);
        const role = user.role === 'DEGEN' ? '<span style="color: #FF5722; font-weight: bold;"> [DEGEN]</span>' : '';
        
        htmlContent += `
            <div style="background: white; border-radius: 6px; padding: 12px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <h3 style="margin: 0 0 8px 0; color: #333;">
                            ${userNumber}. ${user.slug}${role}
                        </h3>
                        <p style="margin: 4px 0; color: #666; font-size: 14px;">
                            📱 ${phone}
                        </p>
                        <p style="margin: 4px 0; color: #666; font-size: 14px;">
                            🕐 ${time}
                        </p>
                    </div>
                    <a href="https://webtoys.ai/${user.slug}" 
                       style="background: #FF5722; color: white; padding: 8px 16px; border-radius: 4px; text-decoration: none; font-size: 14px;">
                        View →
                    </a>
                </div>
            </div>
        `;
    });
    
    htmlContent += `
        </div>
        
        <div style="margin-top: 24px; padding: 16px; background: #fff3e0; border-radius: 8px;">
            <p style="margin: 0; color: #666;">
                <strong>Total Users:</strong> ${totalCount ? totalCount.toLocaleString() : 'Unknown'}
            </p>
        </div>
        
        <p style="margin-top: 24px; color: #999; font-size: 12px; text-align: center;">
            This is an automated notification from WEBTOYS user monitoring.
        </p>
    </div>
    `;
    
    return {
        subject,
        text: textContent,
        html: htmlContent
    };
}

async function getLastCheckTime(): Promise<string> {
    try {
        // Use Supabase to store last check time instead of local file
        const { data } = await supabase
            .from('wtaf_system_state')
            .select('value')
            .eq('key', 'last_user_check')
            .single();
        
        if (data?.value) {
            console.log('Last check found in database:', data.value);
            return data.value;
        }
        
        console.log('No previous check found, checking last hour');
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - CHECK_INTERVAL_HOURS);
        return oneHourAgo.toISOString();
    } catch (error) {
        console.log('Error reading last check time, using fallback:', error);
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - CHECK_INTERVAL_HOURS);
        return oneHourAgo.toISOString();
    }
}

async function updateLastCheckTime(timestamp: string): Promise<void> {
    try {
        // Upsert the timestamp in Supabase
        await supabase
            .from('wtaf_system_state')
            .upsert(
                { key: 'last_user_check', value: timestamp, updated_at: new Date().toISOString() },
                { onConflict: 'key' }
            );
        
        console.log('✅ Updated last check time to:', timestamp);
    } catch (error) {
        console.error('Error updating last check time:', error);
    }
}

async function getNewUsers(sinceTimestamp: string) {
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

async function getTotalUserCount(): Promise<number | null> {
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

async function sendNotificationEmail(newUsers: any[], totalCount: number | null, checkPeriod: { from: string; to: string }): Promise<boolean> {
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

export async function GET(request: NextRequest) {
    console.log('🔍 API: Checking for new WEBTOYS users...');
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
            return NextResponse.json({ 
                success: true, 
                message: 'No new users found',
                newUsers: 0,
                lastCheck: lastCheckTime
            });
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
        
        // Log and return summary
        const summary = {
            newUsers: newUsers.length,
            totalUsers: totalCount || 'unknown',
            emailSent: emailSent,
            checkPeriod: checkPeriod
        };
        
        console.log('📊 Summary:', summary);
        
        return NextResponse.json({ 
            success: true, 
            message: `Found ${newUsers.length} new users, email ${emailSent ? 'sent' : 'failed'}`,
            ...summary
        });
        
    } catch (error) {
        console.error('Fatal error in user check:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Also allow POST requests (some cron services prefer POST)
export const POST = GET;