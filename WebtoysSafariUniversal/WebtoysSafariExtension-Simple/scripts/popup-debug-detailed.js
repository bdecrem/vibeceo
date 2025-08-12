// Ultra-detailed debug version for Safari extension troubleshooting
document.addEventListener('DOMContentLoaded', async () => {
    // Get elements
    const testButton = document.getElementById('testConnection');
    const statusDiv = document.getElementById('status');
    const apiUrlInput = document.getElementById('apiUrl');
    const authTokenInput = document.getElementById('authToken');
    const saveButton = document.getElementById('saveConfig');
    const settingsToggle = document.getElementById('settingsToggle');
    const settingsContent = document.getElementById('settingsContent');
    const chevron = settingsToggle.querySelector('.chevron');
    
    // Create debug output area with better styling
    const debugDiv = document.createElement('div');
    debugDiv.style.cssText = 'margin: 10px; padding: 10px; background: #f0f0f0; font-size: 10px; max-height: 300px; overflow-y: auto; font-family: monospace; border: 1px solid #ccc;';
    debugDiv.innerHTML = '<strong>Detailed Debug Log:</strong><br>';
    document.body.appendChild(debugDiv);
    
    function log(msg) {
        const time = new Date().toLocaleTimeString();
        debugDiv.innerHTML += `${time}: ${msg}<br>`;
        debugDiv.scrollTop = debugDiv.scrollHeight;
        console.log(`[${time}] ${msg}`);
    }
    
    log('🚀 Safari Extension Debug Started');
    log(`User Agent: ${navigator.userAgent}`);
    log(`Current URL: ${window.location.href}`);
    
    // Test Chrome APIs availability
    log(`Chrome APIs available: ${typeof chrome !== 'undefined'}`);
    log(`Chrome.storage available: ${typeof chrome?.storage !== 'undefined'}`);
    log(`Chrome.tabs available: ${typeof chrome?.tabs !== 'undefined'}`);
    
    // Test network permissions
    log('Testing network capabilities...');
    
    // Settings toggle handler
    settingsToggle.addEventListener('click', () => {
        log('Settings toggle clicked');
        settingsContent.classList.toggle('hidden');
        chevron.classList.toggle('open');
        log(`Settings now ${settingsContent.classList.contains('hidden') ? 'hidden' : 'visible'}`);
    });
    
    // Load stored config
    let stored;
    try {
        stored = await chrome.storage.local.get(['authToken', 'apiUrl']);
        log(`Config loaded successfully: URL=${stored.apiUrl || 'not set'}, Token=${stored.authToken ? 'SET' : 'not set'}`);
    } catch (error) {
        log(`ERROR loading config: ${error.message}`);
        return;
    }
    
    if (stored.authToken) {
        authTokenInput.value = stored.authToken;
        log('Auth token populated in input');
    }
    if (stored.apiUrl) {
        apiUrlInput.value = stored.apiUrl;
        log('API URL populated in input');
    }
    
    // Save configuration handler
    saveButton.addEventListener('click', async () => {
        log('Save button clicked');
        
        let apiUrl = apiUrlInput.value.trim();
        const authToken = authTokenInput.value.trim();
        
        log(`Values: URL="${apiUrl}", Token="${authToken ? 'SET' : 'EMPTY'}"`);
        
        if (!apiUrl || !authToken) {
            log('ERROR: Missing config values');
            statusDiv.textContent = 'Please enter both API URL and auth token';
            statusDiv.className = 'status error';
            statusDiv.classList.remove('hidden');
            return;
        }
        
        // AUTO-FIX: Add http:// if no protocol specified
        if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
            apiUrl = 'http://' + apiUrl;
            log(`⚠️ Auto-fixed URL: added http:// prefix → "${apiUrl}"`);
            apiUrlInput.value = apiUrl;  // Update input field to show the fixed URL
        }
        
        // Remove trailing slash from URL if present
        const cleanUrl = apiUrl.replace(/\/$/, '');
        log(`Cleaned URL: "${cleanUrl}"`);
        
        try {
            await chrome.storage.local.set({
                apiUrl: cleanUrl,
                authToken: authToken
            });
            
            log('✅ Config saved successfully');
            statusDiv.textContent = 'Configuration saved successfully!';
            statusDiv.className = 'status success';
            statusDiv.classList.remove('hidden');
        } catch (error) {
            log(`ERROR saving config: ${error.message}`);
            statusDiv.textContent = 'Failed to save configuration';
            statusDiv.className = 'status error';
            statusDiv.classList.remove('hidden');
        }
    });
    
    // Test connection handler with extensive debugging
    testButton.addEventListener('click', async () => {
        log('🔍 Test Connection Button Clicked');
        
        const currentStored = await chrome.storage.local.get(['authToken', 'apiUrl']);
        log(`Using config: URL="${currentStored.apiUrl}", Token="${currentStored.authToken ? 'SET' : 'UNSET'}"`);
        
        if (!currentStored.authToken || !currentStored.apiUrl) {
            log('❌ ERROR: Missing configuration');
            statusDiv.textContent = 'Please save your configuration first';
            statusDiv.className = 'status error';
            statusDiv.classList.remove('hidden');
            return;
        }
        
        statusDiv.textContent = 'Testing connection...';
        statusDiv.className = 'status info';
        statusDiv.classList.remove('hidden');
        
        // Test multiple URLs in order of preference
        const urlsToTry = [];
        
        if (currentStored.apiUrl.startsWith('http://localhost')) {
            const httpsUrl = currentStored.apiUrl.replace('http://', 'https://');
            urlsToTry.push(
                { url: httpsUrl, label: 'HTTPS localhost' },
                { url: currentStored.apiUrl, label: 'HTTP localhost' }
            );
        } else {
            urlsToTry.push({ url: currentStored.apiUrl, label: 'Original URL' });
        }
        
        log(`Will test ${urlsToTry.length} URL(s):`);
        urlsToTry.forEach((item, i) => log(`  ${i+1}. ${item.label}: ${item.url}`));
        
        let successUrl = null;
        
        for (let i = 0; i < urlsToTry.length; i++) {
            const { url, label } = urlsToTry[i];
            const fullUrl = `${url}/api/wtaf/extension`;
            
            log(`🌐 Attempting ${label}: ${fullUrl}`);
            
            try {
                log('  → Creating request...');
                const response = await fetch(fullUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${currentStored.authToken}`
                    }
                });
                
                log(`  → Response received: ${response.status} ${response.statusText}`);
                log(`  → Response OK: ${response.ok}`);
                log(`  → Response headers: ${JSON.stringify([...response.headers.entries()])}`);
                
                if (response.ok) {
                    try {
                        const data = await response.json();
                        log(`  → JSON parsed successfully: ${JSON.stringify(data).substring(0, 200)}...`);
                        
                        successUrl = url;
                        log(`✅ SUCCESS with ${label}!`);
                        
                        statusDiv.textContent = `Connection successful via ${label}!`;
                        statusDiv.className = 'status success';
                        
                        // If this was HTTPS and different from original, update stored config
                        if (url !== currentStored.apiUrl && url.startsWith('https://')) {
                            log(`🔄 Updating stored URL to HTTPS version: ${url}`);
                            await chrome.storage.local.set({ apiUrl: url });
                            apiUrlInput.value = url;
                            statusDiv.textContent = `Connection successful! Updated to ${label}.`;
                        }
                        
                        return; // Success, exit the loop
                        
                    } catch (jsonError) {
                        log(`  → JSON parsing failed: ${jsonError.message}`);
                        const textContent = await response.text();
                        log(`  → Raw response: ${textContent.substring(0, 200)}`);
                    }
                } else {
                    try {
                        const errorText = await response.text();
                        log(`  → Error response: ${errorText.substring(0, 200)}`);
                    } catch (readError) {
                        log(`  → Could not read error response: ${readError.message}`);
                    }
                }
                
                if (i === urlsToTry.length - 1) {
                    // This was the last attempt
                    log(`❌ All attempts failed. Last status: ${response.status}`);
                    statusDiv.textContent = `Connection failed: ${response.status}`;
                    statusDiv.className = 'status error';
                }
                
            } catch (fetchError) {
                log(`  → FETCH ERROR: ${fetchError.name}`);
                log(`  → Error message: ${fetchError.message}`);
                log(`  → Error stack: ${fetchError.stack ? fetchError.stack.substring(0, 200) : 'No stack'}`);
                
                if (i === urlsToTry.length - 1) {
                    // This was the last attempt
                    log(`❌ All attempts failed with fetch error`);
                    statusDiv.textContent = `Connection failed: ${fetchError.message}`;
                    statusDiv.className = 'status error';
                }
            }
        }
        
        if (!successUrl) {
            log('💀 All connection attempts failed');
        }
    });
    
    log('✅ Debug popup initialization complete');
});