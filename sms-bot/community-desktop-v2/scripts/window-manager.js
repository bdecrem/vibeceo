/**
 * Community Desktop Window Manager
 * Handles windowed apps with iframe content
 * Designed to be added to desktop.html without breaking existing functionality
 */

class WindowManager {
    constructor() {
        this.windows = new Map();
        this.zIndex = 1000;
        this.activeWindow = null;
        this.nextWindowId = 1;
    }

    /**
     * Initialize the window manager
     */
    init() {
        // Add window container to desktop if it doesn't exist
        if (!document.getElementById('window-container')) {
            const container = document.createElement('div');
            container.id = 'window-container';
            document.getElementById('desktop').appendChild(container);
        }

        // Add window styles if not already present
        if (!document.getElementById('window-manager-styles')) {
            this.injectStyles();
        }
    }

    /**
     * Open a new windowed app
     */
    openApp(appName, appUrl, options = {}) {
        const defaults = {
            width: 600,
            height: 400,
            x: 100 + (this.windows.size * 30),
            y: 50 + (this.windows.size * 30),
            icon: '📄',
            resizable: true,
            minimizable: true,
            maximizable: true
        };

        const config = { ...defaults, ...options };
        const windowId = `window-${this.nextWindowId++}`;

        // Create window element
        const windowEl = this.createWindow(windowId, appName, appUrl, config);
        
        // Add to container
        document.getElementById('window-container').appendChild(windowEl);
        
        // Store window reference
        this.windows.set(windowId, {
            element: windowEl,
            appName,
            appUrl,
            config,
            state: 'normal',
            zIndex: ++this.zIndex
        });

        // Make it active
        this.focusWindow(windowId);
        
        // Make draggable
        this.makeDraggable(windowEl);
        
        // Make resizable if enabled
        if (config.resizable) {
            this.makeResizable(windowEl);
        }

        return windowId;
    }

    /**
     * Create window HTML structure
     */
    createWindow(windowId, appName, appUrl, config) {
        const window = document.createElement('div');
        window.className = 'desktop-window';
        window.id = windowId;
        window.style.width = config.width + 'px';
        window.style.height = config.height + 'px';
        window.style.left = config.x + 'px';
        window.style.top = config.y + 'px';
        window.style.zIndex = this.zIndex;

        window.innerHTML = `
            <div class="window-titlebar">
                <div class="window-title">
                    <span class="window-icon">${config.icon}</span>
                    <span class="window-name">${appName}</span>
                </div>
                <div class="window-controls">
                    ${config.minimizable ? '<button class="window-minimize" onclick="windowManager.minimizeWindow(\'' + windowId + '\')">_</button>' : ''}
                    ${config.maximizable ? '<button class="window-maximize" onclick="windowManager.maximizeWindow(\'' + windowId + '\')">□</button>' : ''}
                    <button class="window-close" onclick="windowManager.closeWindow('${windowId}')">×</button>
                </div>
            </div>
            <div class="window-content">
                <iframe src="${appUrl}" frameborder="0" style="width:100%;height:100%;"></iframe>
            </div>
        `;

        // Click to focus
        window.addEventListener('mousedown', () => this.focusWindow(windowId));

        return window;
    }

    /**
     * Make window draggable
     */
    makeDraggable(windowEl) {
        const titlebar = windowEl.querySelector('.window-titlebar');
        let isDragging = false;
        let startX, startY, initialX, initialY;

        titlebar.addEventListener('mousedown', (e) => {
            // Don't drag if clicking controls
            if (e.target.closest('.window-controls')) return;
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = windowEl.offsetLeft;
            initialY = windowEl.offsetTop;
            
            titlebar.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            e.preventDefault();
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            windowEl.style.left = (initialX + dx) + 'px';
            windowEl.style.top = (initialY + dy) + 'px';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            titlebar.style.cursor = 'grab';
        });
    }

    /**
     * Make window resizable
     */
    makeResizable(windowEl) {
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'window-resize-handle';
        windowEl.appendChild(resizeHandle);

        let isResizing = false;
        let startX, startY, startWidth, startHeight;

        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = parseInt(windowEl.style.width, 10);
            startHeight = parseInt(windowEl.style.height, 10);
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const width = startWidth + (e.clientX - startX);
            const height = startHeight + (e.clientY - startY);
            
            if (width > 200) windowEl.style.width = width + 'px';
            if (height > 150) windowEl.style.height = height + 'px';
        });

        document.addEventListener('mouseup', () => {
            isResizing = false;
        });
    }

    /**
     * Focus a window (bring to front)
     */
    focusWindow(windowId) {
        const windowData = this.windows.get(windowId);
        if (!windowData) return;

        // Remove active class from all windows
        document.querySelectorAll('.desktop-window').forEach(w => {
            w.classList.remove('active');
        });

        // Add active class and update z-index
        windowData.element.classList.add('active');
        windowData.element.style.zIndex = ++this.zIndex;
        windowData.zIndex = this.zIndex;
        
        this.activeWindow = windowId;
    }

    /**
     * Close a window
     */
    closeWindow(windowId) {
        const windowData = this.windows.get(windowId);
        if (!windowData) return;

        // Remove from DOM
        windowData.element.remove();
        
        // Remove from map
        this.windows.delete(windowId);
        
        // Update active window
        if (this.activeWindow === windowId) {
            this.activeWindow = null;
        }
    }

    /**
     * Minimize window (hide it)
     */
    minimizeWindow(windowId) {
        const windowData = this.windows.get(windowId);
        if (!windowData) return;

        windowData.element.style.display = 'none';
        windowData.state = 'minimized';
        
        // TODO: Add to taskbar
    }

    /**
     * Maximize/restore window
     */
    maximizeWindow(windowId) {
        const windowData = this.windows.get(windowId);
        if (!windowData) return;

        if (windowData.state === 'maximized') {
            // Restore
            windowData.element.style.width = windowData.config.width + 'px';
            windowData.element.style.height = windowData.config.height + 'px';
            windowData.element.style.left = windowData.config.x + 'px';
            windowData.element.style.top = windowData.config.y + 'px';
            windowData.state = 'normal';
        } else {
            // Save current position
            windowData.config.width = parseInt(windowData.element.style.width);
            windowData.config.height = parseInt(windowData.element.style.height);
            windowData.config.x = parseInt(windowData.element.style.left);
            windowData.config.y = parseInt(windowData.element.style.top);
            
            // Maximize
            windowData.element.style.width = 'calc(100% - 20px)';
            windowData.element.style.height = 'calc(100% - 60px)';
            windowData.element.style.left = '10px';
            windowData.element.style.top = '10px';
            windowData.state = 'maximized';
        }
    }

    /**
     * Inject CSS styles for windows
     */
    injectStyles() {
        const styles = document.createElement('style');
        styles.id = 'window-manager-styles';
        styles.innerHTML = `
            #window-container {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 40px;
                pointer-events: none;
            }
            
            .desktop-window {
                position: absolute;
                background: #c0c0c0;
                border: 2px solid;
                border-color: #ffffff #808080 #808080 #ffffff;
                box-shadow: 2px 2px 10px rgba(0,0,0,0.3);
                display: flex;
                flex-direction: column;
                pointer-events: auto;
                min-width: 200px;
                min-height: 150px;
            }
            
            .desktop-window.active {
                border-color: #ffffff #404040 #404040 #ffffff;
                box-shadow: 3px 3px 15px rgba(0,0,0,0.4);
            }
            
            .window-titlebar {
                height: 28px;
                background: linear-gradient(to right, #000080, #1084d0);
                color: white;
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0 3px;
                cursor: grab;
                user-select: none;
            }
            
            .desktop-window.active .window-titlebar {
                background: linear-gradient(to right, #000080, #1084d0);
            }
            
            .desktop-window:not(.active) .window-titlebar {
                background: linear-gradient(to right, #808080, #b5b5b5);
            }
            
            .window-title {
                display: flex;
                align-items: center;
                gap: 5px;
                font-size: 12px;
                font-weight: bold;
                font-family: 'Tahoma', sans-serif;
            }
            
            .window-icon {
                font-size: 16px;
            }
            
            .window-controls {
                display: flex;
                gap: 2px;
            }
            
            .window-controls button {
                width: 20px;
                height: 20px;
                border: 2px solid;
                border-color: #ffffff #404040 #404040 #ffffff;
                background: #c0c0c0;
                font-size: 12px;
                line-height: 1;
                cursor: pointer;
                font-family: 'Tahoma', sans-serif;
                padding: 0;
            }
            
            .window-controls button:active {
                border-color: #404040 #ffffff #ffffff #404040;
            }
            
            .window-content {
                flex: 1;
                background: white;
                border: 2px solid;
                border-color: #808080 #ffffff #ffffff #808080;
                overflow: hidden;
            }
            
            .window-resize-handle {
                position: absolute;
                bottom: 0;
                right: 0;
                width: 15px;
                height: 15px;
                cursor: nwse-resize;
                background: linear-gradient(135deg, transparent 50%, #808080 50%);
            }
        `;
        document.head.appendChild(styles);
    }
}

// Create global instance
window.windowManager = new WindowManager();