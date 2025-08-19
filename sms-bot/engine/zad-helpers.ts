/**
 * ZAD Helper Functions - GPT-Friendly API
 * 
 * These functions provide a simple interface for ZAD apps:
 * - await save(type, data) - Save any data type
 * - await load(type) - Load data by type
 * - getCurrentUser() - Get current authenticated user
 * - initAuth() - Initialize authentication system
 * 
 * Auto-infers app_id and participant_id from context
 */

// TypeScript interfaces for better type safety
interface ZadData {
    app_id: string;
    participant_id: string;
    participant_data: {
        userLabel: string;
        username: string;
    };
    action_type: string;
    content_data: Record<string, any>;
}

interface LoadedData {
    id: number;
    type?: string;
    author: string;
    created_at: string;
    [key: string]: any;
}

// Standard user interface that Builder GPT expects
interface StandardUser {
    username: string;  // Standard property name
    id: string;        // Standard property name
    userLabel: string; // Original property for backwards compatibility
    participantId: string;
    passcode: string;
}

// Auth configuration interface
interface AuthConfig {
    appTitle: string;
    userLabels: string[];
    onLogin: ((user: StandardUser) => void) | null;
}

// Internal auth state
let currentUser: StandardUser | null = null;
let authInitialized = false;
let liveUpdateIntervals: Map<string, any> = new Map();

// Auth configuration with standard user labels
const authConfig: AuthConfig = {
    appTitle: 'WTAF Collaborative App',
    userLabels: ['CHAOS_AGENT', 'VIBE_MASTER', 'GLITCH_RIDER', 'PRIMAL_FORCE', 'NEON_PHANTOM'],
    onLogin: null
};

// Auto-detect app_id from current URL or window.APP_ID
function getAppId(): string {
    // First try to get from window.APP_ID (set by system after deployment)
    if ((window as any).APP_ID) {
        return (window as any).APP_ID;
    }
    
    // Fallback: Extract from URL pattern: /user/app-slug
    const pathParts = window.location.pathname.split('/');
    if (pathParts.length >= 3) {
        return pathParts[2]; // app-slug becomes app_id
    }
    return 'unknown-app';
}

// Get or create participant ID
function getParticipantId(): string {
    // Check if participant ID already exists in localStorage
    let participantId = localStorage.getItem('zad_participant_id');
    
    if (!participantId) {
        // Generate a simple participant ID based on username or random
        const username = (window as any).currentUser?.username || (window as any).username || prompt('Enter your name:') || 'Anonymous';
        participantId = username.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.random().toString(36).substr(2, 6);
        localStorage.setItem('zad_participant_id', participantId);
        localStorage.setItem('zad_username', username);
    }
    
    return participantId;
}

// Get username for display
function getUsername(): string {
    return localStorage.getItem('zad_username') || 'Anonymous';
}

/**
 * Get current authenticated user with standard interface
 * Returns the interface that Builder GPT naturally expects
 */
function getCurrentUser(): StandardUser | null {
    if (!currentUser) return null;
    
    // Map our internal structure to what Builder GPT expects
    return {
        username: currentUser.userLabel,  // Standard property
        id: currentUser.participantId,    // Standard property
        userLabel: currentUser.userLabel, // Original for compatibility
        participantId: currentUser.participantId,
        passcode: currentUser.passcode
    };
}

/**
 * Initialize authentication system
 * Creates the 4-screen auth flow that Builder GPT expects
 */
function initAuth(): void {
    console.log('🔐 Initializing authentication...');
    
    if (authInitialized) return;
    authInitialized = true;
    
    // Create the authentication screens
    createAuthScreens();
    
    // Show welcome screen after DOM updates
    setTimeout(() => {
        showScreen('welcome-screen');
        console.log('✅ Authentication ready');
    }, 100);
}

/**
 * Enable live updates for data type
 * Sets up polling to automatically refresh data when changes occur
 */
function enableLiveUpdates(dataType: string, callback: () => Promise<void>): void {
    console.log('🔄 Enabling live updates for:', dataType);
    
    // Clear any existing interval for this data type
    const existingInterval = liveUpdateIntervals.get(dataType);
    if (existingInterval) {
        clearInterval(existingInterval);
    }
    
    // Set up polling every 2 seconds
    const interval = setInterval(async () => {
        if (currentUser) {
            await callback();
        }
    }, 2000);
    
    liveUpdateIntervals.set(dataType, interval);
    console.log('✅ Live updates enabled for:', dataType);
}

/**
 * Set callback for when user successfully logs in
 */
function onUserLogin(callback: (user: StandardUser) => void): void {
    authConfig.onLogin = callback;
}

/**
 * Check if user is authenticated
 */
function isAuthenticated(): boolean {
    return !!getCurrentUser();
}

/**
 * Require authentication (redirects to login if not authenticated)
 */
function requireAuth(): boolean {
    if (!isAuthenticated()) {
        showScreen('welcome-screen');
        return false;
    }
    return true;
}

/**
 * Start real-time updates
 */
function startRealtime(updateFunction: () => Promise<void>, intervalMs: number = 2000): void {
    if ((window as any).realtimeInterval) {
        clearInterval((window as any).realtimeInterval);
    }
    
    (window as any).realtimeInterval = setInterval(async () => {
        if (isAuthenticated() && document.querySelector('.screen.active')?.id === 'main-screen') {
            await updateFunction();
        }
    }, intervalMs);
    
    console.log('🔄 Real-time updates started');
}

/**
 * Stop real-time updates
 */
function stopRealtime(): void {
    if ((window as any).realtimeInterval) {
        clearInterval((window as any).realtimeInterval);
        (window as any).realtimeInterval = null;
        console.log('⏹️ Real-time updates stopped');
    }
}

/**
 * Save data to ZAD system
 * @param type - Data type (e.g., 'journal_entry', 'message', 'vote')
 * @param data - Data to save
 * @returns Promise that resolves when data is saved
 */
async function save(type: string, data: Record<string, any>): Promise<any> {
    try {
        const app_id = getAppId();
        const participant_id = getParticipantId();
        const username = getUsername();
        
        // Prepare the data in ZAD format
        const zadData: ZadData = {
            app_id: app_id,
            participant_id: participant_id,
            participant_data: {
                userLabel: username,
                username: username
            },
            action_type: type,
            content_data: {
                ...data,
                timestamp: data.timestamp || Date.now(),
                author: data.author || username
            }
        };
        
        console.log('🔄 Saving to ZAD API:', { type, data: zadData });
        
        const response = await fetch('/api/zad/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(zadData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Save failed: ${errorData.error || response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Saved successfully:', result);
        return result;
        
    } catch (error) {
        console.error('❌ Save error:', error);
        alert(`Failed to save: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
    }
}

/**
 * Load data from ZAD system
 * @param type - Data type to load (e.g., 'journal_entry', 'message')
 * @returns Promise that resolves to array of data
 */
async function load(type: string): Promise<LoadedData[]> {
    try {
        const app_id = getAppId();
        
        console.log('🔄 Loading from ZAD API:', { app_id, type });
        
        const url = `/api/zad/load?app_id=${encodeURIComponent(app_id)}&action_type=${encodeURIComponent(type)}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Load failed: ${errorData.error || response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ Loaded successfully:', data);
        
        // Transform ZAD data back to simple format for GPT-generated apps
        return data.map((item: any): LoadedData => ({
            id: item.id,
            ...item.content_data,
            author: item.content_data.author || item.participant_data?.username || item.participant_data?.userLabel || 'Unknown',
            created_at: item.created_at
        }));
        
    } catch (error) {
        console.error('❌ Load error:', error);
        alert(`Failed to load: ${error instanceof Error ? error.message : String(error)}`);
        return []; // Return empty array on error so apps don't break
    }
}

/**
 * Load all data for the current app (regardless of type)
 * @returns Promise that resolves to array of all data
 */
async function loadAll(): Promise<LoadedData[]> {
    try {
        const app_id = getAppId();
        
        console.log('🔄 Loading all data from ZAD API:', { app_id });
        
        const url = `/api/zad/load?app_id=${encodeURIComponent(app_id)}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Load failed: ${errorData.error || response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ Loaded all data successfully:', data);
        
        return data.map((item: any): LoadedData => ({
            id: item.id,
            type: item.action_type,
            ...item.content_data,
            author: item.content_data.author || item.participant_data?.username || item.participant_data?.userLabel || 'Unknown',
            created_at: item.created_at
        }));
        
    } catch (error) {
        console.error('❌ Load all error:', error);
        return [];
    }
}

// Authentication system implementation
async function getUsers(): Promise<Array<{ userLabel: string; participantId: string; joinTime: number }>> {
    try {
        const app_id = getAppId();
        const url = `/api/zad/load?app_id=${encodeURIComponent(app_id)}&action_type=join`;
        const response = await fetch(url);
        
        if (!response.ok) return [];
        
        const data = await response.json();
        return data.map((item: any) => ({
            userLabel: item.participant_data?.userLabel,
            participantId: item.participant_id,
            joinTime: item.participant_data?.join_time
        }));
        
    } catch (error) {
        console.error('❌ Error loading users:', error);
        return [];
    }
}

function createAuthScreens(): void {
    // Create auth overlay instead of replacing entire body
    createAuthOverlay();
}

function createAuthOverlay(): void {
    try {
        // Create a container for auth screens
        const authContainer = document.createElement('div');
        authContainer.id = 'auth-container';
        authContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: inherit;
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        authContainer.innerHTML = `
            <style>
                .auth-screen { 
                    display: none; 
                    background: rgba(0,0,0,0.8);
                    padding: 40px;
                    border-radius: 20px;
                    text-align: center;
                    max-width: 500px;
                    border: 2px solid rgba(255,255,255,0.2);
                    backdrop-filter: blur(20px);
                }
                .auth-screen.active { display: block; }
                .auth-btn {
                    background: linear-gradient(135deg, #00FFC6, #57E2E5);
                    color: #000;
                    border: none;
                    padding: 15px 30px;
                    margin: 10px;
                    border-radius: 50px;
                    font-weight: 600;
                    cursor: pointer;
                    text-transform: uppercase;
                    transition: all 0.3s ease;
                }
                .auth-btn:hover {
                    transform: scale(1.05);
                    box-shadow: 0 0 30px rgba(0, 255, 198, 0.5);
                }
                .auth-input {
                    background: rgba(255,255,255,0.1);
                    border: 2px solid rgba(255,255,255,0.2);
                    color: white;
                    padding: 12px 20px;
                    margin: 10px;
                    border-radius: 30px;
                    width: 250px;
                    text-align: center;
                }
                .auth-input:focus {
                    outline: none;
                    border-color: #00FFC6;
                    box-shadow: 0 0 20px rgba(0, 255, 198, 0.3);
                }
                #new-user-info {
                    margin: 20px; 
                    padding: 20px; 
                    background: rgba(255,255,255,0.1); 
                    border-radius: 10px;
                    border: 2px solid rgba(0, 255, 198, 0.3);
                }
            </style>
            
            <div class="auth-screen active" id="welcome-screen">
                <h2>Welcome to ${authConfig.appTitle}</h2>
                <p>Join the collaborative chaos!</p>
                <button class="auth-btn" onclick="showAuthVersionScreen()">New User</button>
                <button class="auth-btn" onclick="showReturningUserScreen()">Returning User</button>
            </div>
            
            <div class="auth-screen" id="auth-version-screen">
                <h2>Choose Your Path</h2>
                <p>Pick your authentication style:</p>
                <button class="auth-btn" onclick="showCustomUserScreen()">Custom Handle & PIN</button>
                <button class="auth-btn" onclick="showNewUserScreen()">Classic Presets</button>
                <button class="auth-btn" onclick="showScreen('welcome-screen')">Back</button>
            </div>
            
            <div class="auth-screen" id="custom-user-screen">
                <h2>Create Your Identity</h2>
                <input type="text" class="auth-input" id="custom-handle" placeholder="Your Handle (3-15 chars)" maxlength="15">
                <br>
                <input type="text" class="auth-input" id="custom-pin" placeholder="Your 4-digit PIN" maxlength="4" pattern="\d{4}">
                <br>
                <div id="custom-user-feedback" style="margin: 10px; font-size: 14px;"></div>
                <button class="auth-btn" onclick="checkAndRegisterCustomUser()">Claim Identity</button>
                <button class="auth-btn" onclick="showScreen('auth-version-screen')">Back</button>
            </div>
            
            <div class="auth-screen" id="new-user-screen">
                <h2>New User</h2>
                <div id="new-user-info"></div>
                <button class="auth-btn" onclick="registerNewUser()">Register & Enter</button>
                <button class="auth-btn" onclick="showScreen('welcome-screen')">Back</button>
            </div>
            
            <div class="auth-screen" id="returning-user-screen">
                <h2>Returning User</h2>
                <div id="returning-user-options">
                    <button class="auth-btn" onclick="showCustomLoginScreen()">Custom Handle Login</button>
                    <button class="auth-btn" onclick="showPresetLoginScreen()">Preset Label Login</button>
                </div>
                <button class="auth-btn" onclick="showScreen('welcome-screen')">Back</button>
            </div>
            
            <div class="auth-screen" id="custom-login-screen">
                <h2>Custom Login</h2>
                <input type="text" class="auth-input" id="custom-login-handle" placeholder="Your Handle">
                <br>
                <input type="text" class="auth-input" id="custom-login-pin" placeholder="Your 4-digit PIN" maxlength="4">
                <br>
                <button class="auth-btn" onclick="loginCustomUser()">Login</button>
                <button class="auth-btn" onclick="showScreen('returning-user-screen')">Back</button>
            </div>
            
            <div class="auth-screen" id="preset-login-screen">
                <h2>Preset Login</h2>
                <select class="auth-input" id="user-label-select">
                    <option>Select User</option>
                </select>
                <br>
                <input type="text" class="auth-input" id="returning-passcode" placeholder="4-digit code" maxlength="4">
                <br>
                <button class="auth-btn" onclick="loginReturningUser()">Login</button>
                <button class="auth-btn" onclick="showScreen('returning-user-screen')">Back</button>
            </div>
        `;
        
        document.body.appendChild(authContainer);
        console.log('✅ Auth overlay created successfully');
        
    } catch (error) {
        console.error('❌ Error creating auth overlay:', error);
        alert('Authentication system failed to initialize. Please refresh the page.');
    }
}

// Auth screen management functions
function showScreen(screenId: string): void {
    try {
        // Hide all auth screens
        document.querySelectorAll('.auth-screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show requested screen
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.add('active');
            console.log('🖥️ Switched to screen:', screenId);
        }
        
        // If showing main screen, hide auth overlay
        if (screenId === 'main-screen') {
            const authContainer = document.getElementById('auth-container');
            if (authContainer) {
                authContainer.style.display = 'none';
            }
            
            // Show main app content
            const appContent = document.getElementById('app-content');
            if (appContent) {
                appContent.style.display = 'block';
            }
        } else {
            // Clear live update intervals when not in main screen
            liveUpdateIntervals.forEach(interval => clearInterval(interval));
            liveUpdateIntervals.clear();
        }
        
    } catch (error) {
        console.error('❌ Error switching screens:', error);
    }
}

async function generateNewUser(): Promise<boolean> {
    try {
        const existingUsers = await getUsers();
        const usedLabels = existingUsers.map(u => u.userLabel).filter(Boolean);
        
        if (usedLabels.length >= 5) {
            alert('SQUAD\'S FULL, TRY ANOTHER DIMENSION 🚫');
            return false;
        }
        
        const availableLabel = authConfig.userLabels.find(label => !usedLabels.includes(label));
        if (!availableLabel) {
            alert('NO MORE ROOM IN THIS CHAOS REALM 🌀');
            return false;
        }
        
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        currentUser = {
            username: availableLabel,
            id: availableLabel + '_' + code,
            userLabel: availableLabel,
            passcode: code,
            participantId: availableLabel + '_' + code
        };
        
        const infoElement = document.getElementById('new-user-info');
        if (infoElement) {
            infoElement.innerHTML = 
                `<strong>YOUR LABEL:</strong> ${currentUser.userLabel}<br><strong>SECRET DIGITS:</strong> ${currentUser.passcode}<br><em>SCREENSHOT THIS OR CRY LATER 📸</em>`;
        }
        
        return true;
    } catch (error) {
        console.error('User generation failed:', error);
        return false;
    }
}

async function registerNewUser(): Promise<void> {
    if (!currentUser) {
        alert('GENERATE YOUR IDENTITY FIRST, CHAOS AGENT 🎭');
        return;
    }
    
    try {
        await save('join', {
            message: 'Joined the app',
            timestamp: Date.now(),
            join_time: Date.now(),
            userLabel: currentUser.userLabel,
            passcode: currentUser.passcode
        });
        
        enterMainScreen();
    } catch (error) {
        console.error('Registration error:', error);
        alert('REGISTRATION EXPLODED, TRY AGAIN 💥');
    }
}

async function showNewUserScreen(): Promise<void> {
    showScreen('new-user-screen');
    const success = await generateNewUser();
    if (!success) {
        showScreen('welcome-screen');
    }
}

function showReturningUserScreen(): void {
    try {
        showScreen('returning-user-screen');
        
        // Show auth overlay if it's hidden
        const authContainer = document.getElementById('auth-container');
        if (authContainer) {
            authContainer.style.display = 'flex';
        }
        
        // Hide main app content
        const appContent = document.getElementById('app-content');
        if (appContent) {
            appContent.style.display = 'none';
        }
        
        // Hide user status
        const userStatus = document.getElementById('user-status');
        if (userStatus) {
            userStatus.style.display = 'none';
        }
        
        // Populate user select dropdown
        const userSelect = document.getElementById('user-label-select') as HTMLSelectElement;
        if (userSelect) {
            userSelect.innerHTML = '<option>Select User</option>';
            authConfig.userLabels.forEach(label => {
                const option = document.createElement('option');
                option.value = label;
                option.textContent = label;
                userSelect.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('❌ Error showing returning user screen:', error);
    }
}

function leaveApp(): void {
    try {
        // Clear current user
        currentUser = null;
        
        // Show auth overlay
        const authContainer = document.getElementById('auth-container');
        if (authContainer) {
            authContainer.style.display = 'flex';
        }
        
        // Hide main app content
        const appContent = document.getElementById('app-content');
        if (appContent) {
            appContent.style.display = 'none';
        }
        
        // Hide user status
        const userStatus = document.getElementById('user-status');
        if (userStatus) {
            userStatus.style.display = 'none';
        }
        
        // Clear live update intervals
        liveUpdateIntervals.forEach(interval => clearInterval(interval));
        liveUpdateIntervals.clear();
        
        // Show welcome screen
        showScreen('welcome-screen');
        
        console.log('👋 User logged out');
        
    } catch (error) {
        console.error('❌ Error leaving app:', error);
    }
}

async function loginReturningUser(): Promise<void> {
    const selectedLabel = (document.getElementById('user-label-select') as HTMLSelectElement)?.value;
    const enteredPasscode = (document.getElementById('returning-passcode') as HTMLInputElement)?.value.trim();
    
    if (!selectedLabel || selectedLabel === 'Select User') {
        alert('PICK YOUR IDENTITY, PHANTOM 👻');
        return;
    }
    
    if (!enteredPasscode || enteredPasscode.length !== 4) {
        alert('4 DIGITS OF CHAOS REQUIRED 🔢');
        return;
    }
    
    try {
        const app_id = getAppId();
        const url = `/api/zad/load?app_id=${encodeURIComponent(app_id)}&action_type=join`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Failed to load user data: ' + response.statusText);
        }
        
        const joinData = await response.json();
        
        const authRecord = joinData.find((record: any) => {
            const userLabel = record.participant_data?.userLabel || record.content_data?.userLabel;
            const passcode = record.participant_data?.passcode || record.content_data?.passcode;
            return userLabel === selectedLabel && passcode === enteredPasscode;
        });
        
        if (authRecord) {
            currentUser = {
                username: selectedLabel,
                id: authRecord.participant_id,
                userLabel: selectedLabel,
                passcode: enteredPasscode,
                participantId: authRecord.participant_id
            };
            
            console.log('✅ Login successful for:', selectedLabel);
            enterMainScreen();
        } else {
            alert('NICE TRY, WRONG VIBES ❌\n\nMake sure you\'re using the correct passcode from when you registered.');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('LOGIN MALFUNCTION, REALITY GLITCHING 🌀\n\nError: ' + (error instanceof Error ? error.message : String(error)));
    }
}

function enterMainScreen(): void {
    try {
        // Hide auth overlay
        const authContainer = document.getElementById('auth-container');
        if (authContainer) {
            authContainer.style.display = 'none';
        }
        
        // Show main app content
        const appContent = document.getElementById('app-content');
        if (appContent) {
            appContent.style.display = 'block';
        }
        
        // Add user status indicator if it doesn't exist
        if (!document.getElementById('user-status') && currentUser) {
            const userStatus = document.createElement('div');
            userStatus.id = 'user-status';
            userStatus.style.cssText = `
                position: fixed; 
                top: 10px; 
                right: 10px; 
                background: rgba(0,0,0,0.8); 
                padding: 10px; 
                border-radius: 10px; 
                font-size: 12px;
                color: white;
                z-index: 999;
            `;
            userStatus.innerHTML = `
                Welcome, <span id="current-user-label">${currentUser.userLabel}</span>! 
                <button style="margin-left: 10px; padding: 5px 10px; font-size: 10px;" onclick="showScreen('welcome-screen')">Leave</button>
            `;
            document.body.appendChild(userStatus);
        }
        
        // Update user label if element exists
        const userLabelElement = document.getElementById('current-user-label');
        if (userLabelElement && currentUser) {
            userLabelElement.textContent = currentUser.userLabel;
        }
        
        // Call login callback
        if (authConfig.onLogin && currentUser) {
            authConfig.onLogin(getCurrentUser()!);
        }
        
        console.log('🎉 User logged in:', currentUser?.userLabel);
        
    } catch (error) {
        console.error('❌ Error entering main screen:', error);
    }
}

// =====================================================
// AUTHV2: CUSTOM HANDLE & PIN FUNCTIONS
// =====================================================

// Show auth version selection screen
function showAuthVersionScreen(): void {
    showScreen('auth-version-screen');
}

// Show custom user registration screen
function showCustomUserScreen(): void {
    showScreen('custom-user-screen');
    // Clear previous inputs
    const handleInput = document.getElementById('custom-handle') as HTMLInputElement;
    const pinInput = document.getElementById('custom-pin') as HTMLInputElement;
    if (handleInput) handleInput.value = '';
    if (pinInput) pinInput.value = '';
    
    // Clear feedback
    const feedback = document.getElementById('custom-user-feedback');
    if (feedback) feedback.innerHTML = '';
}

// Show custom login screen
function showCustomLoginScreen(): void {
    showScreen('custom-login-screen');
    // Clear previous inputs
    const handleInput = document.getElementById('custom-login-handle') as HTMLInputElement;
    const pinInput = document.getElementById('custom-login-pin') as HTMLInputElement;
    if (handleInput) handleInput.value = '';
    if (pinInput) pinInput.value = '';
}

// Show preset login screen
function showPresetLoginScreen(): void {
    showScreen('preset-login-screen');
    
    // Populate user select dropdown
    const userSelect = document.getElementById('user-label-select') as HTMLSelectElement;
    if (userSelect) {
        userSelect.innerHTML = '<option>Select User</option>';
        authConfig.userLabels.forEach(label => {
            const option = document.createElement('option');
            option.value = label;
            option.textContent = label;
            userSelect.appendChild(option);
        });
    }
}

// Check handle availability and register custom user
async function checkAndRegisterCustomUser(): Promise<void> {
    const handleInput = document.getElementById('custom-handle') as HTMLInputElement;
    const pinInput = document.getElementById('custom-pin') as HTMLInputElement;
    const feedback = document.getElementById('custom-user-feedback');
    
    if (!handleInput || !pinInput || !feedback) {
        alert('Form elements not found!');
        return;
    }
    
    const handle = handleInput.value.trim();
    const pin = pinInput.value.trim();
    
    // Clear previous feedback
    feedback.innerHTML = '';
    
    // Basic validation
    if (!handle) {
        feedback.innerHTML = '<span style="color: #ff4444;">⚠️ Handle is required</span>';
        return;
    }
    
    if (!pin) {
        feedback.innerHTML = '<span style="color: #ff4444;">⚠️ PIN is required</span>';
        return;
    }
    
    if (handle.length < 3 || handle.length > 15) {
        feedback.innerHTML = '<span style="color: #ff4444;">⚠️ Handle must be 3-15 characters</span>';
        return;
    }
    
    if (!/^[A-Za-z0-9_-]+$/.test(handle)) {
        feedback.innerHTML = '<span style="color: #ff4444;">⚠️ Handle can only contain letters, numbers, underscores, and hyphens</span>';
        return;
    }
    
    if (!/^\d{4}$/.test(pin)) {
        feedback.innerHTML = '<span style="color: #ff4444;">⚠️ PIN must be exactly 4 digits</span>';
        return;
    }
    
    feedback.innerHTML = '<span style="color: #ffaa00;">🔄 Checking availability...</span>';
    
    try {
        // Check handle availability
        const checkResponse = await fetch('/api/zad/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_id: getAppId(),
                action_type: 'check_custom_handle',
                content_data: { handle: handle }
            })
        });
        
        const checkResult = await checkResponse.json();
        
        if (!checkResult.available) {
            feedback.innerHTML = `<span style="color: #ff4444;">❌ ${checkResult.error}</span>`;
            return;
        }
        
        feedback.innerHTML = '<span style="color: #00ff00;">✅ Handle available! Registering...</span>';
        
        // Register the user
        const registerResponse = await fetch('/api/zad/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_id: getAppId(),
                action_type: 'register_custom_user',
                content_data: { handle: handle, pin: pin }
            })
        });
        
        const registerResult = await registerResponse.json();
        
        if (registerResult.success) {
            currentUser = {
                username: registerResult.userLabel,
                id: registerResult.participantId,
                userLabel: registerResult.userLabel,
                passcode: registerResult.pin,
                participantId: registerResult.participantId
            };
            
            feedback.innerHTML = `<span style="color: #00ff00;">🎉 Welcome, ${registerResult.userLabel}!</span>`;
            
            // Brief delay to show success message, then enter main screen
            setTimeout(() => {
                enterMainScreen();
            }, 1500);
        } else {
            feedback.innerHTML = `<span style="color: #ff4444;">❌ Registration failed: ${registerResult.error}</span>`;
        }
        
    } catch (error) {
        console.error('Custom registration error:', error);
        feedback.innerHTML = '<span style="color: #ff4444;">❌ Registration failed - please try again</span>';
    }
}

// Login with custom handle and PIN
async function loginCustomUser(): Promise<void> {
    const handleInput = document.getElementById('custom-login-handle') as HTMLInputElement;
    const pinInput = document.getElementById('custom-login-pin') as HTMLInputElement;
    
    if (!handleInput || !pinInput) {
        alert('Login form not found!');
        return;
    }
    
    const handle = handleInput.value.trim();
    const pin = pinInput.value.trim();
    
    if (!handle) {
        alert('ENTER YOUR HANDLE, PHANTOM 👻');
        return;
    }
    
    if (!pin || pin.length !== 4) {
        alert('4 DIGITS REQUIRED 🔢');
        return;
    }
    
    try {
        const response = await fetch('/api/zad/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_id: getAppId(),
                action_type: 'authenticate_custom_user',
                content_data: { handle: handle, pin: pin }
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentUser = {
                username: result.user.userLabel,
                id: result.user.participantId,
                userLabel: result.user.userLabel,
                passcode: pin,
                participantId: result.user.participantId
            };
            
            console.log('✅ Custom login successful for:', result.user.userLabel);
            enterMainScreen();
        } else {
            alert(result.error || 'Login failed');
        }
        
    } catch (error) {
        console.error('Custom login error:', error);
        alert('LOGIN MALFUNCTION 🌀\n\nError: ' + (error instanceof Error ? error.message : String(error)));
    }
}

// =====================================================
// CONSOLIDATED FUNCTIONS FROM STORAGE-MANAGER.TS
// =====================================================

/**
 * Query data from ZAD API with flexible filtering
 */
async function query(type: string, options: any = {}): Promise<any[]> {
    try {
        const app_id = getAppId();
        
        console.log('🔍 Querying ZAD API:', { app_id, type, options });
        
        const queryData = {
            app_id: app_id,
            action_type: 'query',
            content_data: {
                type: type,
                ...options
            }
        };
        
        const response = await fetch('/api/zad/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(queryData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Query failed: ${errorData.error || response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Query completed successfully:', result);
        
        // Transform ZAD data back to simple format
        return result.data.map((item: any) => ({
            id: item.id,
            ...item.content_data,
            author: item.content_data.author || item.participant_data?.username || 'Unknown',
            created_at: item.created_at
        }));
        
    } catch (error) {
        console.error('❌ Query error:', error);
        alert(`Failed to query: ${(error as Error).message}`);
        return [];
    }
}

/**
 * Update ZAD helper functions with app's authentication state
 */
function updateZadAuth(userLabel: string, participantId: string): void {
    localStorage.setItem('zad_participant_id', participantId);
    localStorage.setItem('zad_username', userLabel);
    currentUser = {
        username: userLabel,
        id: participantId,
        userLabel: userLabel,
        participantId: participantId,
        passcode: currentUser?.passcode || ''
    };
    console.log('🔄 Updated ZAD auth state:', currentUser);
}

/**
 * Backend Helper 1: Check Available Slots
 */
async function checkAvailableSlots(): Promise<any> {
    try {
        const app_id = getAppId();
        
        console.log('🔍 Calling backend checkAvailableSlots for app:', app_id);
        
        const response = await fetch('/api/zad/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_id: app_id,
                action_type: 'check_slots',
                content_data: {}
            })
        });
        
        if (!response.ok) {
            throw new Error(`Check slots failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Backend checkAvailableSlots result:', result.slots);
        
        return result.slots;
        
    } catch (error) {
        console.error('❌ Check slots error:', error);
        alert(`Failed to check available slots: ${(error as Error).message}`);
        return { totalSlots: 5, usedSlots: 0, availableSlots: 5, availableLabels: [], usedLabels: [], isFull: false };
    }
}

/**
 * Backend Helper 2: Generate User Credentials
 */
async function generateUser(): Promise<any> {
    try {
        const app_id = getAppId();
        
        console.log('🎲 Calling backend generateUser for app:', app_id);
        
        const response = await fetch('/api/zad/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_id: app_id,
                action_type: 'generate_user',
                content_data: {}
            })
        });
        
        if (!response.ok) {
            throw new Error(`Generate user failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Backend generateUser result:', result);
        
        if (!result.success) {
            alert(result.error || 'Failed to generate user');
            return null;
        }
        
        return result.user;
        
    } catch (error) {
        console.error('❌ Generate user error:', error);
        alert(`Failed to generate user: ${(error as Error).message}`);
        return null;
    }
}

/**
 * Backend Helper 3: Register User
 */
async function registerUser(userLabel: string, passcode: string, participantId: string): Promise<any> {
    try {
        const app_id = getAppId();
        
        console.log('📝 Calling backend registerUser for app:', app_id, 'user:', userLabel);
        
        const response = await fetch('/api/zad/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_id: app_id,
                action_type: 'register_user',
                content_data: {
                    userLabel: userLabel,
                    passcode: passcode,
                    participantId: participantId
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`Register user failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Backend registerUser result:', result);
        
        if (!result.success) {
            alert(result.result?.error || 'Registration failed');
            return { success: false, error: result.result?.error };
        }
        
        return result.result;
        
    } catch (error) {
        console.error('❌ Register user error:', error);
        alert(`Registration failed: ${(error as Error).message}`);
        return { success: false, error: (error as Error).message };
    }
}

/**
 * Backend Helper 4: Authenticate User
 */
async function authenticateUser(userLabel: string, passcode: string): Promise<any> {
    try {
        const app_id = getAppId();
        
        console.log('🔐 Calling backend authenticateUser for app:', app_id, 'user:', userLabel);
        
        const response = await fetch('/api/zad/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_id: app_id,
                action_type: 'authenticate_user',
                content_data: {
                    userLabel: userLabel,
                    passcode: passcode
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`Authentication failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Backend authenticateUser result:', result);
        
        if (!result.success) {
            alert(result.result?.error || 'Authentication failed');
            return { success: false, error: result.result?.error };
        }
        
        return result.result;
        
    } catch (error) {
        console.error('❌ Authentication error:', error);
        alert(`Authentication failed: ${(error as Error).message}`);
        return { success: false, error: (error as Error).message };
    }
}

/**
 * Backend Helper Function: greet(name)
 */
async function greet(name: string): Promise<string> {
    try {
        const app_id = getAppId();
        const participant_id = getParticipantId();
        const username = getUsername();
        
        console.log('🤖 Calling backend greet function for:', name);
        
        const response = await fetch('/api/zad/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_id: app_id,
                participant_id: participant_id,
                participant_data: { userLabel: username, username: username },
                action_type: 'greet',
                content_data: { name: name }
            })
        });
        
        if (!response.ok) {
            throw new Error(`Greet failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Backend greet function result:', result);
        
        return result.greeting;
        
    } catch (error) {
        console.error('❌ Greet error:', error);
        alert(`Greet failed: ${(error as Error).message}`);
        return 'Error generating greeting';
    }
}

/**
 * Generate Image Helper Function
 * Generates an image from a text description using AI
 */
async function generateImage(prompt: string, style?: string): Promise<string> {
    try {
        const app_id = getAppId();
        const participant_id = getParticipantId();
        const username = getUsername();
        
        console.log('🎨 Calling backend generateImage function for:', prompt);
        
        // Simple client call - all logic happens on backend
        const response = await fetch('/api/zad/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_id: app_id,
                participant_id: participant_id,
                participant_data: { userLabel: username, username: username },
                action_type: 'generate_image',
                content_data: { 
                    prompt: prompt,
                    style: style || 'realistic'
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`Image generation failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Backend generateImage function result:', result);
        
        // Return the generated image URL
        return result.imageUrl;
        
    } catch (error) {
        console.error('❌ GenerateImage error:', error);
        alert(`Image generation failed: ${(error as Error).message}`);
        return '';
    }
}

/**
 * Generate Text Helper Function
 * Generates text from a prompt using AI language model
 * Perfect for: chat responses, content generation, creative writing, Q&A
 */
async function generateText(prompt: string, options?: { 
    maxTokens?: number, 
    temperature?: number,
    systemPrompt?: string 
}): Promise<string> {
    try {
        const app_id = getAppId();
        const participant_id = getParticipantId();
        const username = getUsername();
        
        console.log('🤖 Calling backend generateText function for:', prompt);
        
        // Simple client call - all logic happens on backend
        const response = await fetch('/api/zad/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_id: app_id,
                participant_id: participant_id,
                participant_data: { userLabel: username, username: username },
                action_type: 'generate_text',
                content_data: { 
                    prompt: prompt,
                    maxTokens: options?.maxTokens || 500,
                    temperature: options?.temperature || 0.7,
                    systemPrompt: options?.systemPrompt || 'You are a helpful assistant.'
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`Text generation failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Backend generateText function result:', result);
        
        // Return the generated text
        return result.text;
        
    } catch (error) {
        console.error('❌ GenerateText error:', error);
        alert(`Text generation failed: ${(error as Error).message}`);
        return '';
    }
}

// Make functions globally available with proper typing
(window as any).save = save;
(window as any).load = load;
(window as any).loadAll = loadAll;
(window as any).getAppId = getAppId;
(window as any).getParticipantId = getParticipantId;
(window as any).getUsername = getUsername;
(window as any).getCurrentUser = getCurrentUser;
(window as any).initAuth = initAuth;
(window as any).query = query;
(window as any).updateZadAuth = updateZadAuth;
(window as any).checkAvailableSlots = checkAvailableSlots;
(window as any).generateUser = generateUser;
(window as any).registerUser = registerUser;
(window as any).authenticateUser = authenticateUser;
(window as any).greet = greet;
(window as any).generateImage = generateImage;
(window as any).generateText = generateText;
(window as any).enableLiveUpdates = enableLiveUpdates;
(window as any).onUserLogin = onUserLogin;
(window as any).isAuthenticated = isAuthenticated;
(window as any).requireAuth = requireAuth;
(window as any).startRealtime = startRealtime;
(window as any).stopRealtime = stopRealtime;

// Add common aliases that Builder GPT might generate
(window as any).saveEntry = save;
(window as any).loadEntries = load;
(window as any).saveData = save;
(window as any).loadData = load;
(window as any).saveItem = save;
(window as any).loadItems = load;
(window as any).saveNote = save;
(window as any).loadNotes = load;
(window as any).saveMessage = save;
(window as any).loadMessages = load;

// Auth system functions (V1 - Legacy)
(window as any).generateNewUser = generateNewUser;
(window as any).registerNewUser = registerNewUser;
(window as any).showNewUserScreen = showNewUserScreen;
(window as any).loginReturningUser = loginReturningUser;
(window as any).showScreen = showScreen;
(window as any).showReturningUserScreen = showReturningUserScreen;
(window as any).enterMainScreen = enterMainScreen;
(window as any).leaveApp = leaveApp;

// AuthV2 functions (Custom Handle & PIN)
(window as any).showAuthVersionScreen = showAuthVersionScreen;
(window as any).showCustomUserScreen = showCustomUserScreen;
(window as any).showCustomLoginScreen = showCustomLoginScreen;
(window as any).showPresetLoginScreen = showPresetLoginScreen;
(window as any).checkAndRegisterCustomUser = checkAndRegisterCustomUser;
(window as any).loginCustomUser = loginCustomUser;

console.log('🚀 ZAD Helper Functions loaded successfully - ALL 42 FUNCTIONS AVAILABLE');
console.log('📊 Data functions: save(), load(), loadAll(), query()');
console.log('🔐 Auth functions: initAuth(), getCurrentUser(), updateZadAuth()');
console.log('🌐 Backend helpers: checkAvailableSlots(), generateUser(), registerUser(), authenticateUser(), greet()');
console.log('🎨 AI functions: generateImage(), generateText()');
console.log('⚡ Real-time: enableLiveUpdates(), startRealtime(), stopRealtime()');
console.log('🔧 Helper aliases: saveEntry, loadEntries, saveData, loadData, etc.');
console.log('📱 V1 auth: generateNewUser(), registerNewUser(), showNewUserScreen(), etc.');
console.log('🆕 V2 auth: showAuthVersionScreen(), checkAndRegisterCustomUser(), loginCustomUser(), etc.');
console.log('App ID:', getAppId());
console.log('Participant ID:', getParticipantId()); 