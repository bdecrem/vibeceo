// Debug commands to run in browser console for Issue Tracker Superpower Mode

// 1. Check current authentication state
console.log('=== Current Auth State ===');
console.log('isSuperpowerMode:', isSuperpowerMode);
console.log('isAuthenticated:', isAuthenticated);
console.log('authToken:', authToken);
console.log('apiUrl:', apiUrl);

// 2. Check if Chrome storage API is available (Safari Extension)
console.log('\n=== Extension API Check ===');
console.log('chrome object exists:', typeof chrome !== 'undefined');
console.log('chrome.storage exists:', typeof chrome !== 'undefined' && chrome.storage);
console.log('chrome.storage.sync exists:', typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync);

// 3. Try to read from Chrome storage
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(['authToken', 'apiUrl'], (data) => {
        console.log('\n=== Chrome Storage Data ===');
        console.log('Storage data:', data);
        console.log('Has authToken:', !!data.authToken);
        console.log('Has apiUrl:', !!data.apiUrl);
    });
}

// 4. Check localStorage fallback
console.log('\n=== LocalStorage Check ===');
console.log('webtoysAuthToken:', localStorage.getItem('webtoysAuthToken'));
console.log('webtoysApiUrl:', localStorage.getItem('webtoysApiUrl'));

// 5. Test setting localStorage (for development)
console.log('\n=== To Enable Auth (Development) ===');
console.log("Run these commands to enable auth:");
console.log("localStorage.setItem('webtoysAuthToken', 'Bearer YOUR_TOKEN_HERE');");
console.log("localStorage.setItem('webtoysApiUrl', 'https://webtoys.ai');");
console.log("Then refresh the page");

// 6. Check URL parameters
console.log('\n=== URL Parameters ===');
const urlParams = new URLSearchParams(window.location.search);
console.log('Has superpower param:', urlParams.get('superpower'));
console.log('Full URL:', window.location.href);

// 7. Try re-running authentication check
console.log('\n=== Re-checking Authentication ===');
checkExtensionAuth().then(result => {
    console.log('Auth check result:', result);
    console.log('isAuthenticated after check:', isAuthenticated);
});