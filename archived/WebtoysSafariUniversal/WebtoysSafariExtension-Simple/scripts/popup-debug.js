// Debug version - adds console logging to find the issue
console.log('Popup script starting...');

// Original popup.js with added debugging
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing popup...');
    
    // Get elements
    const testButton = document.getElementById('testConnection');
    const statusDiv = document.getElementById('status');
    const apiUrlInput = document.getElementById('apiUrl');
    const authTokenInput = document.getElementById('authToken');
    
    // Load stored config
    const stored = await chrome.storage.local.get(['authToken', 'apiUrl']);
    console.log('Loaded config:', { 
        hasToken: !!stored.authToken, 
        apiUrl: stored.apiUrl 
    });
    
    if (stored.authToken) {
        authTokenInput.value = stored.authToken;
    }
    if (stored.apiUrl) {
        apiUrlInput.value = stored.apiUrl;
    }
    
    // Test connection handler
    testButton.addEventListener('click', async () => {
        console.log('Test button clicked');
        
        const stored = await chrome.storage.local.get(['authToken', 'apiUrl']);
        
        if (!stored.authToken || !stored.apiUrl) {
            console.error('Missing config:', { authToken: !!stored.authToken, apiUrl: stored.apiUrl });
            statusDiv.textContent = 'Please save your configuration first';
            statusDiv.className = 'status error';
            statusDiv.classList.remove('hidden');
            return;
        }
        
        statusDiv.textContent = 'Testing connection...';
        statusDiv.className = 'status info';
        statusDiv.classList.remove('hidden');
        
        const url = `${stored.apiUrl}/api/wtaf/extension`;
        console.log('Testing URL:', url);
        console.log('Using token:', stored.authToken.substring(0, 10) + '...');
        
        try {
            console.log('Making fetch request...');
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${stored.authToken}`
                }
            });
            
            console.log('Response received:', {
                status: response.status,
                ok: response.ok,
                headers: Object.fromEntries(response.headers.entries())
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Success! Data:', data);
                statusDiv.textContent = 'Connection successful!';
                statusDiv.className = 'status success';
            } else {
                const error = await response.text();
                console.error('Request failed:', response.status, error);
                statusDiv.textContent = `Connection failed: ${response.status}`;
                statusDiv.className = 'status error';
            }
        } catch (error) {
            console.error('Fetch error:', error);
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            statusDiv.textContent = 'Connection failed: ' + error.message;
            statusDiv.className = 'status error';
        }
    });
    
    console.log('Popup initialization complete');
});