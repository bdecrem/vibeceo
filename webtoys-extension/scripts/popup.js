// Popup script for Webtoys Manager

let currentPageData = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Settings elements
    const apiUrlInput = document.getElementById('apiUrl');
    const authTokenInput = document.getElementById('authToken');
    const saveButton = document.getElementById('saveConfig');
    const testButton = document.getElementById('testConnection');
    const statusDiv = document.getElementById('status');
    const toggleKeyLink = document.getElementById('toggleKey');
    
    // App info elements
    const appSection = document.getElementById('appSection');
    const notOnPage = document.getElementById('notOnPage');
    const appNameEl = document.getElementById('appName');
    const appSlugEl = document.getElementById('appSlug');
    const featuredStatusEl = document.getElementById('featuredStatus');
    const trendingStatusEl = document.getElementById('trendingStatus');
    const hotnessValueEl = document.getElementById('hotnessValue');
    
    // Control elements
    const featuredToggle = document.getElementById('featuredToggle');
    const trendingToggle = document.getElementById('trendingToggle');
    const hotnessUpBtn = document.getElementById('hotnessUp');
    const hotnessDownBtn = document.getElementById('hotnessDown');
    
    // Settings toggle
    const settingsToggle = document.getElementById('settingsToggle');
    const settingsContent = document.getElementById('settingsContent');
    const chevron = settingsToggle.querySelector('.chevron');
    
    // Toggle settings visibility
    settingsToggle.addEventListener('click', () => {
        settingsContent.classList.toggle('hidden');
        chevron.classList.toggle('open');
    });
    
    // Toggle password visibility
    toggleKeyLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (authTokenInput.type === 'password') {
            authTokenInput.type = 'text';
            toggleKeyLink.textContent = 'Hide';
        } else {
            authTokenInput.type = 'password';
            toggleKeyLink.textContent = 'Show';
        }
    });
    
    // Load existing config
    const stored = await chrome.storage.local.get(['authToken', 'apiUrl']);
    if (stored.authToken) {
        authTokenInput.value = stored.authToken;
    }
    if (stored.apiUrl) {
        apiUrlInput.value = stored.apiUrl;
    }
    
    // Get current tab info
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Check if we're on a Webtoys page
    if (tab.url && (tab.url.includes('webtoys.ai') || tab.url.includes('localhost') || 
        tab.url.includes('wtaf.me') || tab.url.includes('advisorsfoundry.ai') || 
        tab.url.includes('theaf-web.ngrok.io'))) {
        
        // Send message to content script to get page info
        chrome.tabs.sendMessage(tab.id, { action: 'getPageInfo' }, async (response) => {
            if (response && response.userSlug && response.appSlug) {
                // We're on a Webtoys page
                appSection.classList.remove('hidden');
                notOnPage.classList.add('hidden');
                
                // Set app info
                appNameEl.textContent = response.appSlug.split('-').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ');
                appSlugEl.textContent = `${response.userSlug}/${response.appSlug}`;
                
                // Store current page data
                currentPageData = response;
                
                // Fetch current state from API
                await fetchPageState();
            } else {
                // Not on a Webtoys page
                appSection.classList.add('hidden');
                notOnPage.classList.remove('hidden');
            }
        });
    } else {
        // Not on a valid domain
        appSection.classList.add('hidden');
        notOnPage.classList.remove('hidden');
    }
    
    // Fetch page state from API
    async function fetchPageState() {
        if (!currentPageData || !stored.authToken || !stored.apiUrl) return;
        
        try {
            const response = await fetch(`${stored.apiUrl}/api/wtaf/extension`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${stored.authToken}`
                },
                body: JSON.stringify({
                    action: 'get',
                    userSlug: currentPageData.userSlug,
                    appSlug: currentPageData.appSlug
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    updateUI(result.data);
                }
            }
        } catch (error) {
            console.error('Failed to fetch page state:', error);
        }
    }
    
    // Update UI with current state
    function updateUI(data) {
        // Featured status
        featuredToggle.checked = data.is_featured || false;
        featuredStatusEl.textContent = data.is_featured ? '✓' : '✗';
        featuredStatusEl.className = `stat-value ${data.is_featured ? 'active' : 'inactive'}`;
        
        // Trending status
        trendingToggle.checked = data.is_trending || false;
        trendingStatusEl.textContent = data.is_trending ? '✓' : '✗';
        trendingStatusEl.className = `stat-value ${data.is_trending ? 'active' : 'inactive'}`;
        
        // Hotness value (default to 0 if not set)
        const hotness = data.hotness || 0;
        hotnessValueEl.textContent = hotness;
        
        // Update content script with new state
        chrome.tabs.sendMessage(tab.id, {
            action: 'stateUpdated',
            state: {
                isFeatured: data.is_featured,
                isTrending: data.is_trending
            }
        });
    }
    
    // Update page state via API
    async function updatePageState(updates) {
        if (!currentPageData || !stored.authToken || !stored.apiUrl) return;
        
        try {
            const response = await fetch(`${stored.apiUrl}/api/wtaf/extension`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${stored.authToken}`
                },
                body: JSON.stringify({
                    action: 'update',
                    userSlug: currentPageData.userSlug,
                    appSlug: currentPageData.appSlug,
                    updates: updates
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    updateUI(result.data);
                    showStatus('Updated successfully!', 'success');
                }
            } else {
                showStatus('Update failed', 'error');
            }
        } catch (error) {
            console.error('Failed to update page state:', error);
            showStatus('Update failed: ' + error.message, 'error');
        }
    }
    
    // Featured toggle handler
    featuredToggle.addEventListener('change', async () => {
        await updatePageState({ is_featured: featuredToggle.checked });
    });
    
    // Trending toggle handler
    trendingToggle.addEventListener('change', async () => {
        await updatePageState({ is_trending: trendingToggle.checked });
    });
    
    // Hotness controls
    hotnessUpBtn.addEventListener('click', async () => {
        const currentHotness = parseInt(hotnessValueEl.textContent) || 0;
        await updatePageState({ hotness: currentHotness + 1 });
    });
    
    hotnessDownBtn.addEventListener('click', async () => {
        const currentHotness = parseInt(hotnessValueEl.textContent) || 0;
        if (currentHotness > 0) {
            await updatePageState({ hotness: currentHotness - 1 });
        }
    });
    
    // Save configuration
    saveButton.addEventListener('click', async () => {
        const apiUrl = apiUrlInput.value.trim();
        const authToken = authTokenInput.value.trim();
        
        if (!apiUrl || !authToken) {
            showStatus('Please enter both API URL and auth token', 'error');
            return;
        }
        
        // Remove trailing slash from URL if present
        const cleanUrl = apiUrl.replace(/\/$/, '');
        
        await chrome.storage.local.set({
            apiUrl: cleanUrl,
            authToken: authToken
        });
        
        showStatus('Configuration saved successfully!', 'success');
        
        // Refresh page state if we're on a Webtoys page
        if (currentPageData) {
            await fetchPageState();
        }
    });
    
    // Test connection
    testButton.addEventListener('click', async () => {
        const stored = await chrome.storage.local.get(['authToken', 'apiUrl']);
        
        if (!stored.authToken || !stored.apiUrl) {
            showStatus('Please save your configuration first', 'error');
            return;
        }
        
        showStatus('Testing connection...', 'info');
        
        try {
            // Test the connection by calling the GET endpoint
            const response = await fetch(`${stored.apiUrl}/api/wtaf/extension`, {
                headers: {
                    'Authorization': `Bearer ${stored.authToken}`
                }
            });
            
            if (response.ok) {
                showStatus('Connection successful!', 'success');
            } else {
                const error = await response.text();
                showStatus(`Connection failed: ${response.status}`, 'error');
                console.error('Connection test failed:', error);
            }
        } catch (error) {
            showStatus('Connection failed: ' + error.message, 'error');
            console.error('Connection test error:', error);
        }
    });
    
    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
        statusDiv.classList.remove('hidden');
        
        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                statusDiv.classList.add('hidden');
            }, 3000);
        }
    }
});