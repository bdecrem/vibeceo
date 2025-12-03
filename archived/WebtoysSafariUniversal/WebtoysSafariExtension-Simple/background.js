// Background script for Webtoys Manager
console.log('Webtoys Manager extension loaded!');

// Store current page info per tab
const tabStates = {};

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('Webtoys Manager installed');
});

// Function to update the toolbar icon
function updateToolbarIcon(tabId, state) {
    // Map state to your icon names
    const iconName = state === 'default' ? 'icon-quick' : `icon-quick-${state}`;
    
    // Use the same image for all sizes since we only have one version of each
    const iconPath = `images/${iconName}.png`;
    
    console.log(`Setting icon for tab ${tabId} to: ${iconPath}`);
    
    chrome.action.setIcon({
        path: {
            '16': iconPath,
            '19': iconPath,
            '32': iconPath,
            '38': iconPath
        },
        tabId: tabId
    }, () => {
        if (chrome.runtime.lastError) {
            console.error('Error setting icon:', chrome.runtime.lastError);
        }
    });
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const tabId = sender.tab?.id;
    
    if (request.action === 'updateIcon') {
        // Update the icon based on state (both, feat, trend, un, default)
        console.log('Background received updateIcon request:', request.state, 'for tab', tabId);
        if (tabId) {
            updateToolbarIcon(tabId, request.state);
        }
    } else if (request.action === 'pageDetected') {
        // Store the current page info
        if (tabId) {
            tabStates[tabId] = {
                userSlug: request.userSlug,
                appSlug: request.appSlug
            };
        }
    }
});

// Clear state when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
    delete tabStates[tabId];
});

// Reset icon when tab changes
chrome.tabs.onActivated.addListener((activeInfo) => {
    // The content script will detect the page and update accordingly
});