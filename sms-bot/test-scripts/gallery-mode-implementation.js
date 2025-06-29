/**
 * WTAF Gallery Mode Implementation
 * Add this code to any WTAF page to enable gallery mode with demo data
 * Usage: Add ?gallery=true to URL to show demo data instead of real user data
 */

// Gallery Mode Detection and Demo Data System
const WTAFGalleryMode = {
    // Check if we're in gallery mode
    isGalleryMode() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('gallery') === 'true';
    },

    // Generate demo data based on app type
    generateDemoData(appType = 'collaborative') {
        const demoData = {
            collaborative: {
                users: [
                    { userLabel: 'DemoUser1🎵', participantId: 'demo1_1234' },
                    { userLabel: 'SampleFan⭐', participantId: 'demo2_5678' },
                    { userLabel: 'TestUser💜', participantId: 'demo3_9012' }
                ],
                messages: [
                    {
                        participant_data: { userLabel: 'DemoUser1🎵' },
                        content_data: { 
                            message: 'This is a sample message for gallery viewing! 🎉',
                            timestamp: Date.now() - 120000
                        }
                    },
                    {
                        participant_data: { userLabel: 'SampleFan⭐' },
                        content_data: { 
                            message: 'Gallery mode shows demo conversations to protect privacy ✨',
                            timestamp: Date.now() - 300000
                        }
                    },
                    {
                        participant_data: { userLabel: 'TestUser💜' },
                        content_data: { 
                            message: 'You can see how the app works without real user data!',
                            timestamp: Date.now() - 480000
                        }
                    }
                ],
                ideas: [
                    {
                        participant_data: { userLabel: 'DemoUser1🎵' },
                        content_data: {
                            idea: 'Sample idea: Build a music sharing feature',
                            category: 'high',
                            timestamp: Date.now() - 600000,
                            reactions: { '🔥': 3 }
                        }
                    },
                    {
                        participant_data: { userLabel: 'SampleFan⭐' },
                        content_data: {
                            idea: 'Demo suggestion: Add dark mode theme',
                            category: 'medium',
                            timestamp: Date.now() - 900000,
                            reactions: { '🔥': 1 }
                        }
                    }
                ]
            },
            
            game: {
                scores: [
                    { player: 'DemoPlayer1', score: 1250, level: 8 },
                    { player: 'SampleGamer', score: 980, level: 6 },
                    { player: 'TestUser', score: 750, level: 5 }
                ],
                gameState: {
                    currentLevel: 3,
                    lives: 3,
                    score: 420,
                    timeLeft: 180
                }
            },
            
            business: {
                bookings: [
                    {
                        customerName: 'Demo Customer',
                        service: 'Sample Service',
                        date: '2025-07-15',
                        time: '10:00 AM',
                        status: 'confirmed'
                    },
                    {
                        customerName: 'Test Booking',
                        service: 'Example Session', 
                        date: '2025-07-16',
                        time: '2:00 PM',
                        status: 'pending'
                    }
                ],
                reviews: [
                    {
                        reviewer: 'Happy Customer',
                        rating: 5,
                        comment: 'Amazing service! This is a demo review.'
                    },
                    {
                        reviewer: 'Sample Reviewer',
                        rating: 4,
                        comment: 'Great experience! Gallery mode rocks.'
                    }
                ]
            }
        };

        return demoData[appType] || demoData.collaborative;
    },

    // Replace Supabase queries with demo data
    mockSupabaseQuery(tableName, query) {
        if (!this.isGalleryMode()) {
            return null; // Use real Supabase in live mode
        }

        const appType = this.detectAppType();
        const demoData = this.generateDemoData(appType);

        // Mock different table queries
        switch (tableName) {
            case 'wtaf_zero_admin_collaborative':
                if (query.action_type === 'join') {
                    return { data: demoData.users, error: null };
                } else if (query.action_type === 'message') {
                    return { data: demoData.messages, error: null };
                } else if (query.action_type === 'idea') {
                    return { data: demoData.ideas, error: null };
                }
                break;
            
            case 'game_scores':
                return { data: demoData.scores, error: null };
            
            case 'bookings':
                return { data: demoData.bookings, error: null };
            
            case 'reviews':
                return { data: demoData.reviews, error: null };
        }

        return { data: [], error: null };
    },

    // Detect app type from HTML content
    detectAppType() {
        const html = document.documentElement.innerHTML.toLowerCase();
        
        if (html.includes('canvas') && (html.includes('game') || html.includes('score'))) {
            return 'game';
        } else if (html.includes('booking') || html.includes('appointment') || html.includes('business')) {
            return 'business';
        } else {
            return 'collaborative';
        }
    },

    // Add gallery mode indicator to page
    addGalleryIndicator() {
        if (!this.isGalleryMode()) return;

        const indicator = document.createElement('div');
        indicator.id = 'gallery-mode-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: linear-gradient(45deg, #ff6600, #ff9900);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9rem;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(255,102,0,0.3);
            animation: pulse 2s infinite;
        `;
        indicator.innerHTML = '🎨 Gallery Mode - Demo Data';
        
        // Add pulsing animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(indicator);
    },

    // Disable user interactions in gallery mode
    disableInteractions() {
        if (!this.isGalleryMode()) return;

        // Disable form submissions
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                alert('🎨 Gallery Mode: Interactions are disabled to protect data integrity.');
            });
        });

        // Disable certain buttons (but allow viewing)
        const dangerousActions = ['delete', 'submit', 'save', 'update', 'create'];
        document.querySelectorAll('button').forEach(button => {
            const buttonText = button.textContent.toLowerCase();
            if (dangerousActions.some(action => buttonText.includes(action))) {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    alert('🎨 Gallery Mode: This action is disabled. You\'re viewing demo data.');
                });
            }
        });
    },

    // Skip authentication screens and jump to main app
    skipAuthAndShowMainApp() {
        if (!this.isGalleryMode()) return;

        // Auto-populate demo user to skip login
        const demoUser = {
            userLabel: 'GalleryViewer🎨',
            participantId: 'gallery_demo_user',
            passcode: '0000'
        };

        // Set current user globally if the app uses it
        if (typeof window !== 'undefined') {
            window.currentUser = demoUser;
            localStorage.setItem('gallery_demo_user', JSON.stringify(demoUser));
        }

        // Hide auth screens and show main content
        setTimeout(() => {
            // Common auth screen selectors to hide
            const authScreens = [
                '#welcome-screen',
                '#new-user-screen', 
                '#returning-user-screen',
                '.auth-container',
                '.login-screen',
                '.signup-screen'
            ];

            authScreens.forEach(selector => {
                const element = document.querySelector(selector);
                if (element) {
                    element.style.display = 'none';
                }
            });

            // Show main app screens
            const mainScreens = [
                '#main-screen',
                '#app-content',
                '.main-app',
                '.chat-container',
                '.journal-content'
            ];

            mainScreens.forEach(selector => {
                const element = document.querySelector(selector);
                if (element) {
                    element.style.display = 'block';
                    element.classList.add('active');
                }
            });

            // Trigger main app initialization with demo data
            this.initializeMainAppWithDemoData();
        }, 100);
    },

    // Initialize main app functionality with demo data
    initializeMainAppWithDemoData() {
        const appType = this.detectAppType();
        const demoData = this.generateDemoData(appType);

        // For collaborative apps, populate with demo conversations
        if (appType === 'collaborative') {
            this.populateCollaborativeDemo(demoData);
        } 
        // For games, show demo scores and gameplay
        else if (appType === 'game') {
            this.populateGameDemo(demoData);
        }
        // For business apps, show demo bookings/reviews
        else if (appType === 'business') {
            this.populateBusinessDemo(demoData);
        }

        // Start demo activity simulation
        this.startDemoActivitySimulation();
    },

    // Populate collaborative apps with demo conversations
    populateCollaborativeDemo(demoData) {
        // Populate chat messages
        const messagesContainer = document.querySelector('#ideas-container, #messages-container, .chat-messages');
        if (messagesContainer && demoData.messages) {
            messagesContainer.innerHTML = '';
            demoData.messages.forEach(message => {
                const messageElement = this.createMessageElement(message);
                messagesContainer.appendChild(messageElement);
            });
        }

        // Populate user list
        const usersContainer = document.querySelector('#active-users, .user-list, .participants');
        if (usersContainer && demoData.users) {
            usersContainer.innerHTML = '<h4>Gallery Viewers (Demo)</h4>';
            demoData.users.forEach(user => {
                const userElement = document.createElement('div');
                userElement.innerHTML = `<span style="color: #ff6600;">👥 ${user.userLabel}</span>`;
                usersContainer.appendChild(userElement);
            });
        }

        // Pre-populate form fields with demo text
        const textInputs = document.querySelectorAll('textarea, input[type="text"]');
        textInputs.forEach((input, index) => {
            if (index === 0) { // Main input
                input.placeholder = "Gallery Mode: Try typing to see demo interactions!";
            }
        });
    },

    // Create message element for demo data
    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'idea-card message demo-content';
        messageDiv.style.cssText = `
            background: rgba(255,102,0,0.1);
            border: 1px solid rgba(255,102,0,0.3);
            border-radius: 10px;
            padding: 15px;
            margin: 10px 0;
        `;
        
        const timeAgo = Math.floor((Date.now() - message.content_data.timestamp) / 60000);
        messageDiv.innerHTML = `
            <div style="color: #ff6600; font-weight: 600; margin-bottom: 5px;">
                ${message.participant_data.userLabel} • ${timeAgo}m ago • 🎨 Demo
            </div>
            <div style="margin-bottom: 10px;">${message.content_data.message || message.content_data.idea}</div>
            ${message.content_data.reactions ? `
                <div style="font-size: 0.9rem; opacity: 0.8;">
                    🔥 ${message.content_data.reactions['🔥'] || 0} reactions
                </div>
            ` : ''}
        `;
        return messageDiv;
    },

    // Simulate ongoing activity in the app
    startDemoActivitySimulation() {
        if (!this.isGalleryMode()) return;

        const simulationMessages = [
            "🎨 Gallery mode shows live app functionality!",
            "✨ This is how real conversations would appear",
            "🚀 All interactions are safely simulated",
            "💡 No real user data is displayed here",
            "🎯 Click around to explore the interface!"
        ];

        let messageIndex = 0;
        const addSimulatedMessage = () => {
            const container = document.querySelector('#ideas-container, #messages-container, .chat-messages');
            if (container && messageIndex < simulationMessages.length) {
                const demoMessage = {
                    participant_data: { userLabel: 'GalleryBot🤖' },
                    content_data: { 
                        message: simulationMessages[messageIndex],
                        timestamp: Date.now()
                    }
                };
                
                const messageElement = this.createMessageElement(demoMessage);
                container.insertBefore(messageElement, container.firstChild);
                messageIndex++;
            }
        };

        // Add a new demo message every 15 seconds
        setInterval(addSimulatedMessage, 15000);
        
        // Add first message after 3 seconds
        setTimeout(addSimulatedMessage, 3000);
    },

    // Initialize gallery mode
    init() {
        if (this.isGalleryMode()) {
            console.log('🎨 WTAF Gallery Mode Active - Showing demo data');
            this.addGalleryIndicator();
            this.disableInteractions();
            this.skipAuthAndShowMainApp();
            
            // Override console.log to show gallery mode status
            const originalLog = console.log;
            console.log = (...args) => {
                originalLog('🎨 [Gallery Mode]', ...args);
            };
        }
    }
};

// Example implementation for a collaborative app
function exampleImplementation() {
    // Check if we're in gallery mode
    if (WTAFGalleryMode.isGalleryMode()) {
        console.log('Loading demo data for gallery...');
        
        // Use demo data instead of real Supabase queries
        const demoData = WTAFGalleryMode.generateDemoData('collaborative');
        
        // Populate the app with demo data
        populateApp(demoData.users, demoData.messages, demoData.ideas);
        
        // Don't set up real-time subscriptions
        return;
    }
    
    // Normal live mode - use real Supabase
    loadRealData();
    setupRealTimeSubscriptions();
}

// Mock function to show how to integrate with existing WTAF apps
async function integrateWithExistingApp() {
    // Replace this pattern:
    // const { data, error } = await supabase.from('table').select();
    
    // With this pattern:
    const mockResult = WTAFGalleryMode.mockSupabaseQuery('wtaf_zero_admin_collaborative', { action_type: 'message' });
    if (mockResult) {
        // Use demo data
        populateMessages(mockResult.data);
    } else {
        // Use real Supabase
        const realData = await supabase.from('wtaf_zero_admin_collaborative').select().eq('action_type', 'message');
        populateMessages(realData.data);
    }
}

// Auto-initialize when script loads
document.addEventListener('DOMContentLoaded', () => {
    WTAFGalleryMode.init();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WTAFGalleryMode;
}

/* 
USAGE INSTRUCTIONS:

1. Add this script to any WTAF page
2. Replace Supabase queries with WTAFGalleryMode.mockSupabaseQuery() checks
3. Add ?gallery=true to URL to activate demo mode
4. The page will automatically show demo data and disable interactions

Example integration:
- Before: const { data } = await supabase.from('messages').select();
- After: const mockData = WTAFGalleryMode.mockSupabaseQuery('messages', {});
        const { data } = mockData || await supabase.from('messages').select();
*/ 