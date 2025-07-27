// Universal mobile controls injector for HTML5 games
export function injectMobileControls(html) {
    // Check if mobile controls already exist
    const hasExistingControls = 
        html.includes('control-btn') || 
        html.includes('controls') ||
        html.includes('touchstart') ||
        html.includes('touch-control') ||
        html.includes('mobile-control') ||
        html.includes('d-pad') ||
        html.includes('joystick');
    
    if (hasExistingControls) {
        console.log('✅ Mobile controls already present - skipping injection');
        return html;
    }
    
    console.log('➕ No mobile controls detected - injecting controls');
    
    // Mobile controls HTML/CSS/JS to inject
    const mobileControlsCode = `
<!-- Mobile Controls Injected -->
<div id="mobileControls" style="display: none;">
    <style>
        #mobileControls {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10000;
            display: none;
            gap: 10px;
            padding: 10px;
            background: rgba(0, 0, 0, 0.5);
            border-radius: 15px;
            touch-action: none;
            user-select: none;
            -webkit-user-select: none;
        }
        
        #mobileControls.show {
            display: flex !important;
        }
        
        .control-group {
            display: flex;
            flex-direction: column;
            gap: 5px;
            align-items: center;
        }
        
        .control-row {
            display: flex;
            gap: 5px;
        }
        
        .control-btn {
            width: 60px;
            height: 60px;
            background: rgba(255, 255, 255, 0.3);
            border: 2px solid rgba(255, 255, 255, 0.5);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: white;
            cursor: pointer;
            transition: all 0.1s;
            touch-action: none;
            -webkit-tap-highlight-color: transparent;
        }
        
        .control-btn:active,
        .control-btn.pressed {
            background: rgba(255, 255, 255, 0.5);
            transform: scale(0.95);
        }
        
        .control-btn.action {
            background: rgba(78, 205, 196, 0.4);
            border-color: rgba(78, 205, 196, 0.8);
        }
        
        .control-btn.action:active,
        .control-btn.action.pressed {
            background: rgba(78, 205, 196, 0.6);
        }
        
        @media (max-width: 400px) {
            .control-btn {
                width: 50px;
                height: 50px;
                font-size: 20px;
            }
        }
    </style>
    
    <div class="control-group">
        <div class="control-row">
            <button class="control-btn" data-key="38" data-keycode="ArrowUp">↑</button>
        </div>
        <div class="control-row">
            <button class="control-btn" data-key="37" data-keycode="ArrowLeft">←</button>
            <button class="control-btn" data-key="40" data-keycode="ArrowDown">↓</button>
            <button class="control-btn" data-key="39" data-keycode="ArrowRight">→</button>
        </div>
    </div>
    
    <div class="control-group">
        <button class="control-btn action" data-key="32" data-keycode=" ">⚡</button>
        <button class="control-btn action" data-key="80" data-keycode="p">⏸</button>
    </div>
</div>

<script>
(function() {
    // Mobile detection
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
                     || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
    
    if (isMobile) {
        const controls = document.getElementById('mobileControls');
        controls.classList.add('show');
        
        // Prevent zoom on double tap
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function(e) {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
        
        // Prevent scrolling when touching controls
        controls.addEventListener('touchstart', function(e) {
            e.preventDefault();
        }, { passive: false });
        
        // Handle button presses
        const buttons = controls.querySelectorAll('.control-btn');
        
        buttons.forEach(button => {
            let isPressed = false;
            let pressInterval = null;
            
            function simulateKey(action) {
                const keyCode = parseInt(button.dataset.key);
                const key = button.dataset.keycode;
                
                const event = new KeyboardEvent(action, {
                    keyCode: keyCode,
                    which: keyCode,
                    key: key,
                    code: key,
                    bubbles: true,
                    cancelable: true
                });
                
                document.dispatchEvent(event);
                
                // Also try dispatching to canvas or game container
                const canvas = document.querySelector('canvas');
                if (canvas) canvas.dispatchEvent(event);
                
                const gameContainer = document.querySelector('.game-container, #game, #gameCanvas');
                if (gameContainer && gameContainer !== canvas) gameContainer.dispatchEvent(event);
            }
            
            function startPress() {
                if (isPressed) return;
                isPressed = true;
                button.classList.add('pressed');
                simulateKey('keydown');
                
                // For arrow keys, repeat while held
                if (['37', '38', '39', '40'].includes(button.dataset.key)) {
                    pressInterval = setInterval(() => {
                        simulateKey('keydown');
                    }, 100);
                }
            }
            
            function endPress() {
                if (!isPressed) return;
                isPressed = false;
                button.classList.remove('pressed');
                simulateKey('keyup');
                
                if (pressInterval) {
                    clearInterval(pressInterval);
                    pressInterval = null;
                }
            }
            
            // Touch events
            button.addEventListener('touchstart', function(e) {
                e.preventDefault();
                startPress();
            }, { passive: false });
            
            button.addEventListener('touchend', function(e) {
                e.preventDefault();
                endPress();
            }, { passive: false });
            
            button.addEventListener('touchcancel', function(e) {
                e.preventDefault();
                endPress();
            }, { passive: false });
            
            // Mouse events for testing
            button.addEventListener('mousedown', startPress);
            button.addEventListener('mouseup', endPress);
            button.addEventListener('mouseleave', endPress);
        });
    }
})();
</script>
<!-- End Mobile Controls -->
`;

    // Inject before closing body tag
    return html.replace('</body>', mobileControlsCode + '\n</body>');
}

// Also export a function to add to the LLM generator
export function addMobileControlsToGenerator(originalFunction) {
    return async function(...args) {
        const html = await originalFunction(...args);
        return injectMobileControls(html);
    };
}