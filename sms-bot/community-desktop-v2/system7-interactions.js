/**
 * System 7 Interaction Enhancements for WEBTOYS-OS
 * 
 * Adds authentic System 7 interaction behaviors:
 * - Marquee desktop selection
 * - Improved window focus management 
 * - Enhanced icon selection and dragging
 * - Proper active/inactive window states
 */

// System 7 Interaction State
let system7State = {
    desktopSelection: {
        isSelecting: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0
    },
    selectedIcons: new Set(),
    activeWindow: null,
    marqueeElement: null
};

// Initialize System 7 interactions
function initSystem7Interactions() {
    console.log('🎯 Initializing System 7 interactions...');
    
    // Add marquee selection to desktop
    setupDesktopMarqueeSelection();
    
    // Enhance window focus management
    enhanceWindowFocusSystem();
    
    // Improve icon selection behavior
    enhanceIconSelectionSystem();
    
    // Add authentic keyboard shortcuts
    setupSystem7KeyboardShortcuts();
    
    console.log('✅ System 7 interactions ready');
}

// === MARQUEE DESKTOP SELECTION === 
function setupDesktopMarqueeSelection() {
    const desktop = document.getElementById('desktop');
    if (!desktop) return;
    
    desktop.addEventListener('mousedown', handleDesktopMouseDown);
    document.addEventListener('mousemove', handleDesktopMouseMove);
    document.addEventListener('mouseup', handleDesktopMouseUp);
}

function handleDesktopMouseDown(e) {
    // Only start selection if clicking directly on desktop
    if (e.target !== e.currentTarget) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    
    system7State.desktopSelection = {
        isSelecting: true,
        startX: e.clientX - rect.left,
        startY: e.clientY - rect.top,
        currentX: e.clientX - rect.left,
        currentY: e.clientY - rect.top
    };
    
    // Clear previous selections
    clearIconSelections();
    
    // Prevent default to avoid text selection
    e.preventDefault();
}

function handleDesktopMouseMove(e) {
    const selection = system7State.desktopSelection;
    if (!selection.isSelecting) return;
    
    const desktop = document.getElementById('desktop');
    const rect = desktop.getBoundingClientRect();
    
    // Update current position
    selection.currentX = e.clientX - rect.left;
    selection.currentY = e.clientY - rect.top;
    
    // Update marquee visual
    updateMarqueeVisual();
    
    // Update icon selection
    updateIconSelectionFromMarquee();
}

function handleDesktopMouseUp(e) {
    if (system7State.desktopSelection.isSelecting) {
        system7State.desktopSelection.isSelecting = false;
        removeMarqueeVisual();
    }
}

function updateMarqueeVisual() {
    const selection = system7State.desktopSelection;
    
    // Remove existing marquee
    removeMarqueeVisual();
    
    // Calculate marquee bounds
    const left = Math.min(selection.startX, selection.currentX);
    const top = Math.min(selection.startY, selection.currentY);
    const width = Math.abs(selection.currentX - selection.startX);
    const height = Math.abs(selection.currentY - selection.startY);
    
    // Create marquee element
    const marquee = document.createElement('div');
    marquee.className = 'desktop-selection-marquee';
    marquee.style.cssText = `
        position: absolute;
        left: ${left}px;
        top: ${top}px;
        width: ${width}px;
        height: ${height}px;
        border: 1px dashed #000000;
        background: rgba(0, 0, 0, 0.1);
        pointer-events: none;
        z-index: 10;
    `;
    
    document.getElementById('desktop').appendChild(marquee);
    system7State.marqueeElement = marquee;
}

function removeMarqueeVisual() {
    if (system7State.marqueeElement) {
        system7State.marqueeElement.remove();
        system7State.marqueeElement = null;
    }
}

function updateIconSelectionFromMarquee() {
    const selection = system7State.desktopSelection;
    
    const selectionRect = {
        left: Math.min(selection.startX, selection.currentX),
        top: Math.min(selection.startY, selection.currentY),
        right: Math.max(selection.startX, selection.currentX),
        bottom: Math.max(selection.startY, selection.currentY)
    };
    
    // Check each desktop icon
    const icons = document.querySelectorAll('.desktop-icon:not(.trash-can)');
    const newSelection = new Set();
    
    icons.forEach(icon => {
        const iconRect = icon.getBoundingClientRect();
        const desktopRect = document.getElementById('desktop').getBoundingClientRect();
        
        // Convert to desktop coordinates
        const iconX = iconRect.left - desktopRect.left;
        const iconY = iconRect.top - desktopRect.top;
        const iconRight = iconX + iconRect.width;
        const iconBottom = iconY + iconRect.height;
        
        // Check if icon intersects with selection
        if (iconX < selectionRect.right &&
            iconRight > selectionRect.left &&
            iconY < selectionRect.bottom &&
            iconBottom > selectionRect.top) {
            
            const iconId = getIconId(icon);
            if (iconId) {
                newSelection.add(iconId);
                icon.classList.add('selected');
            }
        } else {
            icon.classList.remove('selected');
        }
    });
    
    system7State.selectedIcons = newSelection;
}

// === ENHANCED WINDOW FOCUS SYSTEM ===
function enhanceWindowFocusSystem() {
    // Override the existing window focus to add System 7 active states
    const originalFocusWindow = window.windowManager.focusWindow.bind(window.windowManager);
    
    window.windowManager.focusWindow = function(windowId) {
        // Call original focus logic
        originalFocusWindow(windowId);
        
        // Add System 7 active/inactive styling
        updateWindowActiveStates(windowId);
        
        system7State.activeWindow = windowId;
    };
    
    // Enhanced window click handling
    document.addEventListener('click', function(e) {
        const windowEl = e.target.closest('.desktop-window');
        if (windowEl && windowEl.id) {
            const windowId = windowEl.id;
            if (window.windowManager.windows.has(windowId)) {
                window.windowManager.focusWindow(windowId);
            }
        }
    });
}

function updateWindowActiveStates(activeWindowId) {
    // Remove active class from all windows
    document.querySelectorAll('.desktop-window').forEach(win => {
        win.classList.remove('active');
    });
    
    // Add active class to the focused window
    const activeWindow = document.getElementById(activeWindowId);
    if (activeWindow) {
        activeWindow.classList.add('active');
    }
}

// === ENHANCED ICON SELECTION SYSTEM ===
function enhanceIconSelectionSystem() {
    // Improve icon click behavior
    document.addEventListener('click', function(e) {
        const icon = e.target.closest('.desktop-icon');
        
        if (icon && !icon.classList.contains('trash-can')) {
            e.stopPropagation();
            
            const iconId = getIconId(icon);
            if (iconId) {
                // Handle multi-select with Cmd/Ctrl key
                if (e.metaKey || e.ctrlKey) {
                    toggleIconSelection(iconId, icon);
                } else {
                    // Single select
                    clearIconSelections();
                    selectIcon(iconId, icon);
                }
            }
        } else if (e.target.id === 'desktop' || e.target.closest('#desktop') === document.getElementById('desktop')) {
            // Clicked on empty desktop - clear selections
            clearIconSelections();
        }
    });
    
    // Improve icon double-click behavior
    document.addEventListener('dblclick', function(e) {
        const icon = e.target.closest('.desktop-icon');
        if (icon && !icon.classList.contains('trash-can')) {
            // Double-click should trigger the icon's onclick
            if (icon.onclick) {
                icon.onclick(e);
            }
        }
    });
}

function getIconId(iconElement) {
    // Try to extract an ID from the icon
    const label = iconElement.querySelector('.label');
    if (label) {
        return label.textContent.toLowerCase().replace(/[^a-z0-9]/g, '');
    }
    return null;
}

function selectIcon(iconId, iconElement) {
    system7State.selectedIcons.add(iconId);
    iconElement.classList.add('selected');
}

function toggleIconSelection(iconId, iconElement) {
    if (system7State.selectedIcons.has(iconId)) {
        system7State.selectedIcons.delete(iconId);
        iconElement.classList.remove('selected');
    } else {
        system7State.selectedIcons.add(iconId);
        iconElement.classList.add('selected');
    }
}

function clearIconSelections() {
    system7State.selectedIcons.clear();
    document.querySelectorAll('.desktop-icon.selected').forEach(icon => {
        icon.classList.remove('selected');
    });
}

// === SYSTEM 7 KEYBOARD SHORTCUTS ===
function setupSystem7KeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Cmd+A / Ctrl+A - Select All Icons
        if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
            e.preventDefault();
            selectAllIcons();
        }
        
        // Escape - Clear selections
        if (e.key === 'Escape') {
            clearIconSelections();
            if (system7State.desktopSelection.isSelecting) {
                system7State.desktopSelection.isSelecting = false;
                removeMarqueeVisual();
            }
        }
        
        // Delete/Backspace - Move selected icons to trash (if implemented)
        if ((e.key === 'Delete' || e.key === 'Backspace') && system7State.selectedIcons.size > 0) {
            e.preventDefault();
            // Could implement move to trash here
            console.log('Would move selected icons to trash:', Array.from(system7State.selectedIcons));
        }
    });
}

function selectAllIcons() {
    const icons = document.querySelectorAll('.desktop-icon:not(.trash-can)');
    system7State.selectedIcons.clear();
    
    icons.forEach(icon => {
        const iconId = getIconId(icon);
        if (iconId) {
            system7State.selectedIcons.add(iconId);
            icon.classList.add('selected');
        }
    });
}

// === ENHANCED DRAG BEHAVIOR ===
function enhanceIconDragBehavior() {
    // This could enhance the existing drag behavior to work better with selections
    // For now, we'll keep the existing drag system but improve visual feedback
    
    const originalSetupDragForIcons = window.setupDragForIcons;
    if (originalSetupDragForIcons) {
        window.setupDragForIcons = function() {
            originalSetupDragForIcons();
            
            // Add System 7 drag visual feedback
            document.querySelectorAll('.desktop-icon:not(.trash-can)').forEach(icon => {
                icon.addEventListener('dragstart', function(e) {
                    icon.classList.add('dragging');
                });
                
                icon.addEventListener('dragend', function(e) {
                    icon.classList.remove('dragging');
                });
            });
        };
    }
}

// === MENU BAR ENHANCEMENTS ===
function enhanceMenuBarBehavior() {
    // Add proper System 7 menu hover and click behavior
    const menuItems = document.querySelectorAll('.menu-title');
    let menuMode = false;
    
    menuItems.forEach(menuItem => {
        menuItem.addEventListener('click', function(e) {
            e.stopPropagation();
            menuMode = !menuMode;
            
            if (menuMode) {
                menuItem.classList.add('active');
            } else {
                menuItems.forEach(m => m.classList.remove('active'));
            }
        });
        
        menuItem.addEventListener('mouseenter', function() {
            if (menuMode) {
                menuItems.forEach(m => m.classList.remove('active'));
                menuItem.classList.add('active');
            }
        });
    });
    
    // Click outside closes menu mode
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.menu-bar')) {
            menuMode = false;
            menuItems.forEach(m => m.classList.remove('active'));
        }
    });
}

// === WINDOW RESIZE ENHANCEMENTS ===
function addWindowResizeHandles() {
    // Add System 7 style resize handles to windows
    document.addEventListener('DOMNodeInserted', function(e) {
        if (e.target.classList && e.target.classList.contains('desktop-window')) {
            addResizeHandle(e.target);
        }
    });
    
    // Add to existing windows
    document.querySelectorAll('.desktop-window').forEach(addResizeHandle);
}

function addResizeHandle(windowEl) {
    if (windowEl.querySelector('.window-resize-handle')) return; // Already has handle
    
    const handle = document.createElement('div');
    handle.className = 'window-resize-handle';
    handle.innerHTML = '';
    windowEl.appendChild(handle);
    
    let isResizing = false;
    let startX, startY, startWidth, startHeight;
    
    handle.addEventListener('mousedown', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = parseInt(getComputedStyle(windowEl).width, 10);
        startHeight = parseInt(getComputedStyle(windowEl).height, 10);
        
        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);
    });
    
    function handleResize(e) {
        if (!isResizing) return;
        
        const width = startWidth + (e.clientX - startX);
        const height = startHeight + (e.clientY - startY);
        
        if (width > 200) windowEl.style.width = width + 'px';
        if (height > 150) windowEl.style.height = height + 'px';
    }
    
    function stopResize() {
        isResizing = false;
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
    }
}

// === INITIALIZATION ===
// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSystem7Interactions);
} else {
    initSystem7Interactions();
}

// Export for manual initialization if needed
window.initSystem7Interactions = initSystem7Interactions;
window.system7State = system7State;

console.log('📁 System 7 interactions module loaded');