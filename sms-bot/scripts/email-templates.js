/**
 * Email templates for notification system
 */

/**
 * Mask phone number for privacy (show only last 4 digits)
 */
function maskPhone(phone) {
    if (!phone) return 'Unknown';
    // Keep last 4 digits, mask the rest
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length <= 4) return phone;
    return `***-***-${cleaned.slice(-4)}`;
}

/**
 * Format timestamp to readable time
 */
function formatTime(timestamp) {
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

/**
 * Format the time period for the check
 */
function formatPeriod(checkPeriod) {
    const from = new Date(checkPeriod.from);
    const to = new Date(checkPeriod.to);
    
    const formatOptions = {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    };
    
    // If same day, just show times
    if (from.toDateString() === to.toDateString()) {
        return `${from.toLocaleTimeString('en-US', formatOptions)} - ${to.toLocaleTimeString('en-US', formatOptions)}`;
    }
    
    // Different days, show full dates
    return `${formatTime(checkPeriod.from)} - ${formatTime(checkPeriod.to)}`;
}

/**
 * Format email for new users notification
 */
export function formatNewUsersEmail(newUsers, totalCount, checkPeriod) {
    const userCount = newUsers.length;
    const period = formatPeriod(checkPeriod);
    
    // Create subject line
    const subject = userCount === 1 
        ? `🎉 WEBTOYS: 1 new user joined!`
        : `🎉 WEBTOYS: ${userCount} new users joined!`;
    
    // Create text version
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
    
    // Create HTML version
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

/**
 * Format email for weekly digest (future use)
 */
export function formatWeeklyDigest(stats) {
    // Placeholder for future weekly digest
    return {
        subject: `📊 WEBTOYS Weekly: ${stats.newUsers} new users, ${stats.newApps} new apps`,
        text: 'Weekly digest coming soon...',
        html: '<p>Weekly digest coming soon...</p>'
    };
}

/**
 * Format email for milestone notifications (future use)
 */
export function formatMilestoneEmail(milestone) {
    // Placeholder for future milestone notifications
    return {
        subject: `🎯 WEBTOYS Milestone: ${milestone.description}!`,
        text: `Milestone reached: ${milestone.description}`,
        html: `<h2>🎯 Milestone reached: ${milestone.description}!</h2>`
    };
}