// Content script for Webtoys Manager
console.log('Webtoys Manager: Content script loaded on', window.location.href);

// Get the current page's app slug from the URL
function getAppSlug() {
    const pathname = window.location.pathname;
    
    // Check for homepage
    if (pathname === '/' || pathname === '') {
        return { special: 'homepage', description: 'WTAF IDEA VORTEX' };
    }
    
    // Check for gallery pages
    if (pathname === '/trending') {
        return { special: 'trending', description: 'Trending Gallery' };
    } else if (pathname === '/featured') {
        return { special: 'featured', description: 'Featured Gallery' };
    } else if (pathname === '/recents') {
        return { special: 'recents', description: 'Recent Creations' };
    }
    
    // Check for user homepage pattern (single slug)
    const userMatch = pathname.match(/^\/([^\/]+)$/);
    if (userMatch && !['login', 'signup', 'api', 'admin'].includes(userMatch[1])) {
        return {
            userSlug: userMatch[1],
            special: 'user-homepage',
            description: `${userMatch[1]}'s creations`
        };
    }
    
    // Check for regular user/app pattern
    const match = pathname.match(/^\/([^\/]+)\/([^\/]+)$/);
    if (match) {
        return {
            userSlug: match[1],
            appSlug: match[2]
        };
    }
    return null;
}

// This will be populated with the actual state from Supabase
let currentState = {
    isFeatured: false,
    isTrending: false,
    hasLoadedFromSupabase: false
};

// Update icon based on state
function updateIcon() {
    let iconState = 'un'; // default: neither featured nor trending
    
    if (currentState.isFeatured && currentState.isTrending) {
        iconState = 'both';
    } else if (currentState.isFeatured) {
        iconState = 'feat';
    } else if (currentState.isTrending) {
        iconState = 'trend';
    }
    
    // Send state to background script to update icon
    chrome.runtime.sendMessage({
        action: 'updateIcon',
        state: iconState
    });
}

// Check if we're on a Webtoys page and fetch its status
async function detectPageState() {
    const slugInfo = getAppSlug();
    
    if (slugInfo) {
        // Handle special pages
        if (slugInfo.special) {
            if (slugInfo.special === 'trending') {
                currentState.isTrending = true;
                currentState.isFeatured = false;
            } else if (slugInfo.special === 'featured') {
                currentState.isFeatured = true;
                currentState.isTrending = false;
            }
            updateIcon();
            console.log('Webtoys Manager: Special page -', slugInfo.special);
            return;
        }
        // Send slug info to background
        chrome.runtime.sendMessage({
            action: 'pageDetected',
            userSlug: slugInfo.userSlug,
            appSlug: slugInfo.appSlug
        });
        
        // Get stored API credentials
        const stored = await chrome.storage.local.get(['authToken', 'apiUrl']);
        
        if (stored.authToken && stored.apiUrl) {
            try {
                // Call our extension API
                const response = await fetch(`${stored.apiUrl}/api/wtaf/extension`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${stored.authToken}`
                    },
                    body: JSON.stringify({
                        action: 'get',
                        userSlug: slugInfo.userSlug,
                        appSlug: slugInfo.appSlug
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data) {
                        currentState.isFeatured = result.data.is_featured || false;
                        currentState.isTrending = result.data.is_trending || false;
                        currentState.hasLoadedFromSupabase = true;
                        
                        console.log('Webtoys Manager: Page status -', {
                            featured: currentState.isFeatured,
                            trending: currentState.isTrending,
                            iconState: currentState.isFeatured && currentState.isTrending ? 'both' : 
                                      currentState.isFeatured ? 'feat' : 
                                      currentState.isTrending ? 'trend' : 'un'
                        });
                        
                        updateIcon();
                    } else {
                        // Page not found in database - use default
                        currentState.isFeatured = false;
                        currentState.isTrending = false;
                        updateIcon();
                    }
                } else {
                    console.error('Webtoys Manager: Failed to fetch page status', response.status, response.statusText);
                    if (response.status === 401) {
                        console.error('API key appears to be invalid. Please check your Supabase service key in the extension settings.');
                    }
                    // Don't update icon on error - keep whatever was there
                }
            } catch (error) {
                console.error('Webtoys Manager: Error fetching page status:', error);
                updateIcon(); // Use default state
            }
        } else {
            // No API key configured - use default state
            console.log('Webtoys Manager: No API key configured');
            // Don't update icon here - wait for API response
        }
    } else {
        // Not on a Webtoys page - use default icon
        chrome.runtime.sendMessage({
            action: 'updateIcon',
            state: 'default'
        });
    }
}

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'stateUpdated') {
        currentState = request.state;
        updateIcon();
    } else if (request.action === 'getPageInfo') {
        const slugInfo = getAppSlug();
        sendResponse(slugInfo || {});
    }
    return true; // Keep message channel open for async response
});

// Run detection when page loads
detectPageState();

// Also run when navigating within the site
const observer = new MutationObserver(() => {
    const newPath = window.location.pathname;
    if (newPath !== observer.lastPath) {
        observer.lastPath = newPath;
        // Reset state when navigating to a new page
        currentState.hasLoadedFromSupabase = false;
        currentState.isFeatured = false;
        currentState.isTrending = false;
        detectPageState();
    }
});

observer.lastPath = window.location.pathname;
observer.observe(document.body, {
    childList: true,
    subtree: true
});