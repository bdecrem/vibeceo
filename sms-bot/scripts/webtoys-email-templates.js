/**
 * Email templates for WEBTOYS app notification system
 */

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
 * Truncate long prompts for email display
 */
function truncatePrompt(prompt, maxLength = 100) {
    if (!prompt) return 'No prompt available';
    if (prompt.length <= maxLength) return prompt;
    return prompt.substring(0, maxLength) + '...';
}

/**
 * Get app type emoji
 */
function getAppTypeEmoji(type) {
    switch (type) {
        case 'games': return '🎮';
        case 'ZAD': return '🤝';
        case 'needsAdmin': return '📊';
        case 'oneThing': return '📧';
        case 'web': return '🌐';
        default: return '📱';
    }
}

/**
 * Format email for new WEBTOYS apps notification
 */
export function formatNewWebtoysEmail(newApps, totalCount, checkPeriod) {
    const appCount = newApps.length;
    const period = formatPeriod(checkPeriod);
    
    // Create subject line
    const subject = appCount === 1 
        ? `🎉 WEBTOYS: 1 new app created!`
        : `🎉 WEBTOYS: ${appCount} new apps created!`;
    
    // Determine how many apps to show in detail
    const appsToShow = Math.min(appCount, 10);
    const appsToDisplay = newApps.slice(0, appsToShow);
    
    // Create text version
    let textContent = `New WEBTOYS apps (${period}):\n\n`;
    
    if (appCount >= 10) {
        textContent += `${appCount} apps in total, including these ${appsToShow}:\n\n`;
    }
    
    appsToDisplay.forEach((app, index) => {
        const appNumber = index + 1;
        const time = formatTime(app.created_at);
        const prompt = truncatePrompt(app.original_prompt);
        
        textContent += `${appNumber}. ${app.user_slug}/${app.app_slug}\n`;
        textContent += `   Type: ${app.type || 'unknown'}\n`;
        textContent += `   Created: ${time}\n`;
        textContent += `   Prompt: "${prompt}"\n`;
        textContent += `   View: https://webtoys.ai/${app.user_slug}/${app.app_slug}\n\n`;
    });
    
    if (appCount > 10) {
        textContent += `... and ${appCount - 10} more apps.\n\n`;
    }
    
    if (totalCount) {
        textContent += `\nTotal apps in system: ${totalCount.toLocaleString()}`;
    }
    
    // Create HTML version
    let htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #FF5722;">🎉 New WEBTOYS Apps!</h2>
        <p style="color: #666; margin-bottom: 24px;">Period: ${period}</p>
        
        ${appCount >= 10 ? `<p style="background: #e3f2fd; padding: 12px; border-radius: 6px; margin-bottom: 16px;"><strong>${appCount} apps in total</strong>, including these ${appsToShow}:</p>` : ''}
        
        <div style="background: #f5f5f5; border-radius: 8px; padding: 16px;">
    `;
    
    appsToDisplay.forEach((app, index) => {
        const appNumber = index + 1;
        const time = formatTime(app.created_at);
        const prompt = truncatePrompt(app.original_prompt);
        const typeEmoji = getAppTypeEmoji(app.type);
        
        htmlContent += `
            <div style="background: white; border-radius: 6px; padding: 12px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <h3 style="margin: 0 0 8px 0; color: #333;">
                            ${appNumber}. ${app.user_slug}/<strong>${app.app_slug}</strong>
                        </h3>
                        <p style="margin: 4px 0; color: #666; font-size: 14px;">
                            ${typeEmoji} Type: <strong>${app.type || 'unknown'}</strong>
                        </p>
                        <p style="margin: 4px 0; color: #666; font-size: 14px;">
                            🕐 ${time}
                        </p>
                        <p style="margin: 4px 0; color: #666; font-size: 14px; font-style: italic;">
                            "${prompt}"
                        </p>
                    </div>
                    <a href="https://webtoys.ai/${app.user_slug}/${app.app_slug}" 
                       style="background: #FF5722; color: white; padding: 8px 16px; border-radius: 4px; text-decoration: none; font-size: 14px; margin-left: 12px; white-space: nowrap;">
                        View →
                    </a>
                </div>
            </div>
        `;
    });
    
    if (appCount > 10) {
        htmlContent += `
            <div style="background: #fff3e0; border-radius: 6px; padding: 12px; margin-top: 12px; text-align: center;">
                <p style="margin: 0; color: #666; font-style: italic;">
                    ... and ${appCount - 10} more apps
                </p>
            </div>
        `;
    }
    
    htmlContent += `
        </div>
        
        <div style="margin-top: 24px; padding: 16px; background: #fff3e0; border-radius: 8px;">
            <p style="margin: 0; color: #666;">
                <strong>Total Apps in System:</strong> ${totalCount ? totalCount.toLocaleString() : 'Unknown'}
            </p>
        </div>
        
        <p style="margin-top: 24px; color: #999; font-size: 12px; text-align: center;">
            This is an automated notification from WEBTOYS app monitoring.<br>
            Apps created by 'bart' are excluded from these notifications.
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
 * Format email for daily digest (future use)
 */
export function formatDailyDigest(stats) {
    // Placeholder for future daily digest
    return {
        subject: `📊 WEBTOYS Daily: ${stats.newApps} new apps, ${stats.newUsers} new users`,
        text: 'Daily digest coming soon...',
        html: '<p>Daily digest coming soon...</p>'
    };
}

/**
 * Format email for milestone notifications (future use)
 */
export function formatAppMilestoneEmail(milestone) {
    // Placeholder for future milestone notifications
    return {
        subject: `🎯 WEBTOYS App Milestone: ${milestone.description}!`,
        text: `App milestone reached: ${milestone.description}`,
        html: `<h2>🎯 App milestone reached: ${milestone.description}!</h2>`
    };
}