// Debug version that shows errors IN the popup itself
document.addEventListener('DOMContentLoaded', async () => {
    // Get elements
    const testButton = document.getElementById('testConnection');
    const statusDiv = document.getElementById('status');
    const apiUrlInput = document.getElementById('apiUrl');
    const authTokenInput = document.getElementById('authToken');
    
    // Create debug output area
    const debugDiv = document.createElement('div');
    debugDiv.style.cssText = 'margin: 10px; padding: 10px; background: #f0f0f0; font-size: 10px; max-height: 200px; overflow-y: auto; font-family: monospace;';
    debugDiv.innerHTML = '<strong>Debug Log:</strong><br>';
    document.body.appendChild(debugDiv);
    
    function log(msg) {
        const time = new Date().toLocaleTimeString();
        debugDiv.innerHTML += `${time}: ${msg}<br>`;
        debugDiv.scrollTop = debugDiv.scrollHeight;
        console.log(msg);
    }
    
    log('Popup starting...');
    
    // Load stored config
    const stored = await chrome.storage.local.get(['authToken', 'apiUrl']);
    log(`Config loaded: URL=${stored.apiUrl || 'not set'}`);
    
    if (stored.authToken) {
        authTokenInput.value = stored.authToken;
    }
    if (stored.apiUrl) {
        apiUrlInput.value = stored.apiUrl;
    }
    
    // Test connection handler
    testButton.addEventListener('click', async () => {
        log('Test button clicked');
        
        const stored = await chrome.storage.local.get(['authToken', 'apiUrl']);
        
        if (!stored.authToken || !stored.apiUrl) {
            log('ERROR: Missing config');
            statusDiv.textContent = 'Please save your configuration first';
            statusDiv.className = 'status error';
            statusDiv.classList.remove('hidden');
            return;
        }
        
        statusDiv.textContent = 'Testing connection...';
        statusDiv.className = 'status info';
        statusDiv.classList.remove('hidden');
        
        const url = `${stored.apiUrl}/api/wtaf/extension`;
        log(`Testing URL: ${url}`);
        
        try {
            log('Making fetch request...');
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${stored.authToken}`
                }
            });
            
            log(`Response: ${response.status} ${response.ok ? 'OK' : 'FAIL'}`);
            
            if (response.ok) {
                const data = await response.json();
                log('SUCCESS! Connection works');
                statusDiv.textContent = 'Connection successful!';
                statusDiv.className = 'status success';
            } else {
                const error = await response.text();
                log(`FAILED: Status ${response.status}`);
                log(`Error: ${error.substring(0, 100)}`);
                statusDiv.textContent = `Connection failed: ${response.status}`;
                statusDiv.className = 'status error';
            }
        } catch (error) {
            log(`FETCH ERROR: ${error.name}`);
            log(`Message: ${error.message}`);
            statusDiv.textContent = 'Connection failed: ' + error.message;
            statusDiv.className = 'status error';
        }
    });
    
    // Also add save button handler with debug
    const saveButton = document.getElementById('saveConfig');
    saveButton.addEventListener('click', async () => {
        const apiUrl = apiUrlInput.value.trim();
        const authToken = authTokenInput.value.trim();
        
        if (!apiUrl || !authToken) {
            log('Save failed: missing values');
            statusDiv.textContent = 'Please enter both API URL and auth token';
            statusDiv.className = 'status error';
            statusDiv.classList.remove('hidden');
            return;
        }
        
        // Remove trailing slash from URL if present
        const cleanUrl = apiUrl.replace(/\/$/, '');
        log(`Saving: ${cleanUrl}`);
        
        await chrome.storage.local.set({
            apiUrl: cleanUrl,
            authToken: authToken
        });
        
        log('Config saved successfully');
        statusDiv.textContent = 'Configuration saved successfully!';
        statusDiv.className = 'status success';
        statusDiv.classList.remove('hidden');
    });
    
    log('Popup ready');
});