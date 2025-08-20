/**
 * Desktop Integration Script
 * Add this to desktop.html to enable windowed apps
 * Preserves all existing simple app functionality
 */

// Only initialize if not already loaded
if (typeof window.desktopV2Initialized === 'undefined') {
    window.desktopV2Initialized = true;

    // Load window manager script
    const script = document.createElement('script');
    script.src = '/community-desktop-v2/window-manager.js';
    script.onload = function() {
        // Initialize window manager after load
        if (window.windowManager) {
            window.windowManager.init();
            console.log('Community Desktop V2: Window Manager initialized');
        }
    };
    document.head.appendChild(script);

    // Define windowed apps registry
    window.windowedApps = {
        'community-notepad': {
            name: 'Community Notepad',
            url: '/bart/community-notepad',
            icon: '📝',
            width: 600,
            height: 400
        },
        'community-paint': {
            name: 'Community Paint',
            url: '/bart/community-paint',
            icon: '🎨',
            width: 800,
            height: 600
        },
        'community-chat': {
            name: 'Community Chat',
            url: '/bart/community-chat',
            icon: '💬',
            width: 400,
            height: 500
        }
    };

    /**
     * Open a windowed app
     * This function can be called from onclick handlers
     */
    window.openWindowedApp = function(appId) {
        const app = window.windowedApps[appId];
        if (!app) {
            console.error('Unknown app:', appId);
            return;
        }

        if (!window.windowManager) {
            console.error('Window Manager not loaded');
            return;
        }

        // Open the app in a window
        window.windowManager.openApp(
            app.name,
            app.url,
            {
                icon: app.icon,
                width: app.width,
                height: app.height
            }
        );
    };

    /**
     * Enhanced app launcher for desktop icons
     * Determines if app should open in window or use simple onclick
     */
    window.launchApp = function(element) {
        // Check if this is a windowed app
        const appId = element.getAttribute('data-app-id');
        if (appId && window.windowedApps[appId]) {
            // Open in window
            openWindowedApp(appId);
        } else {
            // Fall back to existing onclick behavior
            const onclickAttr = element.getAttribute('data-onclick');
            if (onclickAttr) {
                try {
                    eval(onclickAttr);
                } catch (e) {
                    console.error('Error executing app:', e);
                }
            }
        }
    };

    /**
     * Convert existing app to use launcher
     * This preserves backward compatibility
     */
    window.upgradeDesktopIcon = function(element, appId) {
        if (appId && window.windowedApps[appId]) {
            // Store original onclick
            const originalOnclick = element.getAttribute('onclick');
            if (originalOnclick) {
                element.setAttribute('data-onclick', originalOnclick);
            }
            
            // Set app ID
            element.setAttribute('data-app-id', appId);
            
            // Update onclick to use launcher
            element.setAttribute('onclick', 'launchApp(this)');
        }
    };

    /**
     * Add a windowed app to the desktop
     * Can be called by the app processor
     */
    window.addWindowedAppToDesktop = function(config) {
        const desktop = document.getElementById('desktop');
        if (!desktop) return;

        // Register the app
        window.windowedApps[config.id] = {
            name: config.name,
            url: config.url,
            icon: config.icon || '📄',
            width: config.width || 600,
            height: config.height || 400
        };

        // Create desktop icon
        const icon = document.createElement('div');
        icon.className = 'desktop-icon';
        icon.style.left = config.x + 'px';
        icon.style.top = config.y + 'px';
        icon.setAttribute('data-app-id', config.id);
        icon.setAttribute('onclick', 'openWindowedApp("' + config.id + '")');
        
        icon.innerHTML = `
            <div class="icon">${config.icon || '📄'}</div>
            <div class="label">${config.name}</div>
        `;

        desktop.appendChild(icon);
    };

    // Example: Add Community Notepad to desktop programmatically
    // This could be called when processing new app submissions
    /*
    window.addEventListener('load', function() {
        // Check if notepad already exists
        if (!document.querySelector('[data-app-id="community-notepad"]')) {
            addWindowedAppToDesktop({
                id: 'community-notepad',
                name: 'Notepad',
                url: '/bart/community-notepad',
                icon: '📝',
                x: 820,
                y: 20,
                width: 600,
                height: 400
            });
        }
    });
    */

    console.log('Community Desktop V2: Integration loaded');
}