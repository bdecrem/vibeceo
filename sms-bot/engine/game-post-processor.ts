/**
 * Post-processes game HTML to fix common viewport and layout issues
 */
export async function postProcessGameHTML(htmlCode: string, gameType?: string): Promise<string> {
  try {
    // Apply general fixes
    htmlCode = fixCanvasViewport(htmlCode);
    htmlCode = fixControlLayout(htmlCode);
    
    // Apply game-specific fixes if needed
    if (gameType) {
      switch (gameType.toLowerCase()) {
        case 'tetris':
          htmlCode = fixTetrisSpecific(htmlCode);
          break;
        case 'snake':
          htmlCode = fixSnakeSpecific(htmlCode);
          break;
        case 'pacman':
        case 'pac-man':
          htmlCode = fixPacmanSpecific(htmlCode);
          break;
      }
    }
    
    return htmlCode;
  } catch (error) {
    console.error('[game-post-processor] Error processing game HTML:', error);
    // Return original if processing fails
    return htmlCode;
  }
}

/**
 * Fixes multi-row control layouts that should be single row
 */
function fixControlLayout(htmlCode: string): string {
  // Check if mobile controls exist at all
  const hasControlsDiv = htmlCode.includes('id="controls"');
  const hasMobileButtons = htmlCode.includes('leftBtn') || htmlCode.includes('rightBtn') || 
                          htmlCode.includes('upBtn') || htmlCode.includes('downBtn') || 
                          htmlCode.includes('rotateBtn') || htmlCode.includes('actionBtn');
  
  // If no controls div or no mobile buttons, we need to add them
  if (!hasControlsDiv || !hasMobileButtons) {
    console.log('[game-post-processor] No mobile controls detected, adding them...');
    return addMobileControls(htmlCode);
  }
  
  // Only fix if we detect problematic patterns
  const hasNestedRows = htmlCode.includes('flex-direction: column') && htmlCode.includes('id="controls"');
  const hasGridLayout = /id="controls"[^>]*display:\s*grid/i.test(htmlCode);
  const hasMultipleControlDivs = (htmlCode.match(/class="control-row"/g) || []).length > 1;
  
  if (!hasNestedRows && !hasGridLayout && !hasMultipleControlDivs) {
    return htmlCode; // Controls look fine, don't touch them
  }
  
  console.log('[game-post-processor] Detected multi-row control layout, fixing...');
  
  // Extract which buttons are actually used in the game
  const hasLeft = htmlCode.includes('leftBtn');
  const hasRight = htmlCode.includes('rightBtn');
  const hasUp = htmlCode.includes('upBtn');
  const hasDown = htmlCode.includes('downBtn');
  const hasRotate = htmlCode.includes('rotateBtn');
  const hasAction = htmlCode.includes('actionBtn');
  
  // Build appropriate control set
  let buttons = '';
  if (hasAction && !hasLeft && !hasRight) {
    // Single action button (like Flappy)
    buttons = '<div class="btn" id="actionBtn" style="width: 80px; height: 80px; margin: 0 10px; background: rgba(255, 255, 255, 0.2); border: 2px solid white; border-radius: 10px; display: flex; justify-content: center; align-items: center; font-size: 32px; color: white;">🚀</div>';
  } else {
    // D-pad style controls
    if (hasLeft) buttons += '<div class="btn" id="leftBtn" style="width: 60px; height: 60px; margin: 0 5px; background: rgba(255, 255, 255, 0.2); border: 2px solid white; border-radius: 10px; display: flex; justify-content: center; align-items: center; font-size: 24px; color: white;">←</div>';
    if (hasUp || hasRotate) buttons += '<div class="btn" id="' + (hasRotate ? 'rotateBtn' : 'upBtn') + '" style="width: 60px; height: 60px; margin: 0 5px; background: rgba(255, 255, 255, 0.2); border: 2px solid white; border-radius: 10px; display: flex; justify-content: center; align-items: center; font-size: 24px; color: white;">' + (hasRotate ? '↻' : '↑') + '</div>';
    if (hasDown) buttons += '<div class="btn" id="downBtn" style="width: 60px; height: 60px; margin: 0 5px; background: rgba(255, 255, 255, 0.2); border: 2px solid white; border-radius: 10px; display: flex; justify-content: center; align-items: center; font-size: 24px; color: white;">↓</div>';
    if (hasRight) buttons += '<div class="btn" id="rightBtn" style="width: 60px; height: 60px; margin: 0 5px; background: rgba(255, 255, 255, 0.2); border: 2px solid white; border-radius: 10px; display: flex; justify-content: center; align-items: center; font-size: 24px; color: white;">→</div>';
  }
  
  // Replace the entire controls section
  const newControls = `<div id="controls" style="position: fixed; bottom: 0; width: 100%; height: 120px; background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;">\n        ${buttons}\n    </div>`;
  
  // Match and replace various control patterns
  htmlCode = htmlCode.replace(
    /<div id="controls"[\s\S]*?<\/div>(?:\s*<\/div>)*(?=\s*(?:<script|<\/body>))/,
    newControls
  );
  
  return htmlCode;
}

/**
 * Adds mobile controls when they're completely missing
 */
function addMobileControls(htmlCode: string): string {
  // Detect game type to determine which controls to add
  const isTetris = htmlCode.includes('tetris') || htmlCode.includes('Tetris') || htmlCode.includes('tetromino');
  const isSnake = htmlCode.includes('snake') || htmlCode.includes('Snake');
  const isPacman = htmlCode.includes('pacman') || htmlCode.includes('Pac-Man') || htmlCode.includes('maze');
  const isFlappy = htmlCode.includes('flappy') || htmlCode.includes('Flappy') || htmlCode.includes('bird');
  
  let controlsHTML = '';
  
  if (isFlappy) {
    // Single action button for Flappy games
    controlsHTML = `
    <div id="controls" style="position: fixed; bottom: 0; width: 100%; height: 120px; background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;">
        <div class="btn" id="actionBtn" style="width: 100px; height: 80px; margin: 0 10px; background: rgba(255, 255, 255, 0.2); border: 2px solid white; border-radius: 10px; display: flex; justify-content: center; align-items: center; font-size: 32px; color: white; cursor: pointer;">🚀</div>
    </div>`;
  } else if (isTetris) {
    // Tetris needs left, right, rotate, down
    controlsHTML = `
    <div id="controls" style="position: fixed; bottom: 0; width: 100%; height: 120px; background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;">
        <div class="btn" id="leftBtn" style="width: 60px; height: 60px; margin: 0 5px; background: rgba(255, 255, 255, 0.2); border: 2px solid white; border-radius: 10px; display: flex; justify-content: center; align-items: center; font-size: 24px; color: white; cursor: pointer;">←</div>
        <div class="btn" id="rotateBtn" style="width: 60px; height: 60px; margin: 0 5px; background: rgba(255, 255, 255, 0.2); border: 2px solid white; border-radius: 10px; display: flex; justify-content: center; align-items: center; font-size: 24px; color: white; cursor: pointer;">↻</div>
        <div class="btn" id="rightBtn" style="width: 60px; height: 60px; margin: 0 5px; background: rgba(255, 255, 255, 0.2); border: 2px solid white; border-radius: 10px; display: flex; justify-content: center; align-items: center; font-size: 24px; color: white; cursor: pointer;">→</div>
        <div class="btn" id="downBtn" style="width: 60px; height: 60px; margin: 0 5px; background: rgba(255, 255, 255, 0.2); border: 2px solid white; border-radius: 10px; display: flex; justify-content: center; align-items: center; font-size: 24px; color: white; cursor: pointer;">↓</div>
    </div>`;
  } else {
    // Default: directional controls for Snake, Pac-Man, etc.
    controlsHTML = `
    <div id="controls" style="position: fixed; bottom: 0; width: 100%; height: 120px; background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;">
        <div class="btn" id="leftBtn" style="width: 60px; height: 60px; margin: 0 5px; background: rgba(255, 255, 255, 0.2); border: 2px solid white; border-radius: 10px; display: flex; justify-content: center; align-items: center; font-size: 24px; color: white; cursor: pointer;">←</div>
        <div class="btn" id="upBtn" style="width: 60px; height: 60px; margin: 0 5px; background: rgba(255, 255, 255, 0.2); border: 2px solid white; border-radius: 10px; display: flex; justify-content: center; align-items: center; font-size: 24px; color: white; cursor: pointer;">↑</div>
        <div class="btn" id="downBtn" style="width: 60px; height: 60px; margin: 0 5px; background: rgba(255, 255, 255, 0.2); border: 2px solid white; border-radius: 10px; display: flex; justify-content: center; align-items: center; font-size: 24px; color: white; cursor: pointer;">↓</div>
        <div class="btn" id="rightBtn" style="width: 60px; height: 60px; margin: 0 5px; background: rgba(255, 255, 255, 0.2); border: 2px solid white; border-radius: 10px; display: flex; justify-content: center; align-items: center; font-size: 24px; color: white; cursor: pointer;">→</div>
    </div>`;
  }
  
  // Add event handlers
  const eventHandlers = `
    <script>
    (function() {
        // Add touch event handlers for mobile controls
        var leftBtn = document.getElementById('leftBtn');
        var rightBtn = document.getElementById('rightBtn');
        var upBtn = document.getElementById('upBtn');
        var downBtn = document.getElementById('downBtn');
        var rotateBtn = document.getElementById('rotateBtn');
        var actionBtn = document.getElementById('actionBtn');
        
        function simulateKeyPress(keyCode) {
            var event = new KeyboardEvent('keydown', {
                keyCode: keyCode,
                which: keyCode,
                bubbles: true
            });
            document.dispatchEvent(event);
        }
        
        if (leftBtn) {
            leftBtn.addEventListener('touchstart', function(e) {
                e.preventDefault();
                simulateKeyPress(37); // Left arrow
            });
            leftBtn.addEventListener('click', function() {
                simulateKeyPress(37);
            });
        }
        
        if (rightBtn) {
            rightBtn.addEventListener('touchstart', function(e) {
                e.preventDefault();
                simulateKeyPress(39); // Right arrow
            });
            rightBtn.addEventListener('click', function() {
                simulateKeyPress(39);
            });
        }
        
        if (upBtn) {
            upBtn.addEventListener('touchstart', function(e) {
                e.preventDefault();
                simulateKeyPress(38); // Up arrow
            });
            upBtn.addEventListener('click', function() {
                simulateKeyPress(38);
            });
        }
        
        if (downBtn) {
            downBtn.addEventListener('touchstart', function(e) {
                e.preventDefault();
                simulateKeyPress(40); // Down arrow
            });
            downBtn.addEventListener('click', function() {
                simulateKeyPress(40);
            });
        }
        
        if (rotateBtn) {
            rotateBtn.addEventListener('touchstart', function(e) {
                e.preventDefault();
                simulateKeyPress(38); // Up arrow for rotate
            });
            rotateBtn.addEventListener('click', function() {
                simulateKeyPress(38);
            });
        }
        
        if (actionBtn) {
            actionBtn.addEventListener('touchstart', function(e) {
                e.preventDefault();
                simulateKeyPress(32); // Space bar
            });
            actionBtn.addEventListener('click', function() {
                simulateKeyPress(32);
            });
        }
    })();
    </script>`;
  
  // Insert controls before closing body tag
  htmlCode = htmlCode.replace('</body>', controlsHTML + eventHandlers + '</body>');
  
  // Also ensure canvas doesn't use full height
  htmlCode = htmlCode.replace(
    /height:\s*100vh/gi,
    'height: calc(100vh - 120px)'
  );
  
  return htmlCode;
}

/**
 * Fixes common canvas viewport issues for grid-based games
 */
function fixCanvasViewport(htmlCode: string): string {
  // Fix block size calculation for grid games to include centering
  htmlCode = htmlCode.replace(
    /var blockSize = Math\.(min|floor)\((.*?)\);/g,
    `var canvasDisplayWidth = window.innerWidth;
    var canvasDisplayHeight = window.innerHeight - controlsHeight;
    var blockSizeX = Math.floor(canvasDisplayWidth / COLS);
    var blockSizeY = Math.floor(canvasDisplayHeight / ROWS);
    var blockSize = Math.min(blockSizeX, blockSizeY);
    var offsetX = (canvasDisplayWidth - (blockSize * COLS)) / 2;
    var offsetY = (canvasDisplayHeight - (blockSize * ROWS)) / 2;`
  );
  
  // Fix fillRect calls to use offsets for centering
  htmlCode = htmlCode.replace(
    /ctx\.fillRect\((\(?[^,)]+\)?) \* blockSize, (\(?[^,)]+\)?) \* blockSize,/g,
    'ctx.fillRect(offsetX + $1 * blockSize, offsetY + $2 * blockSize,'
  );
  
  // Fix strokeRect calls to use offsets for centering
  htmlCode = htmlCode.replace(
    /ctx\.strokeRect\((\(?[^,)]+\)?) \* blockSize, (\(?[^,)]+\)?) \* blockSize,/g,
    'ctx.strokeRect(offsetX + $1 * blockSize, offsetY + $2 * blockSize,'
  );
  
  // Ensure proper canvas sizing without problematic ctx.scale
  htmlCode = htmlCode.replace(
    /canvas\.width = .*?;[\s\S]*?ctx\.scale\(dpr, dpr\);/,
    `canvas.width = canvasDisplayWidth * dpr;
    canvas.height = canvasDisplayHeight * dpr;
    canvas.style.width = canvasDisplayWidth + 'px';
    canvas.style.height = canvasDisplayHeight + 'px';
    ctx.scale(dpr, dpr);`
  );
  
  return htmlCode;
}

/**
 * Tetris-specific fixes
 */
function fixTetrisSpecific(htmlCode: string): string {
  // Ensure COLS and ROWS are defined for Tetris
  if (!htmlCode.includes('var COLS = 10;')) {
    htmlCode = htmlCode.replace(
      /(var controlsHeight = 120;)/,
      '$1\n    var COLS = 10;\n    var ROWS = 20;'
    );
  }
  
  return htmlCode;
}

/**
 * Snake-specific fixes
 */
function fixSnakeSpecific(htmlCode: string): string {
  // Snake games might use gridWidth/gridHeight instead of COLS/ROWS
  htmlCode = htmlCode.replace(/gridWidth/g, 'COLS');
  htmlCode = htmlCode.replace(/gridHeight/g, 'ROWS');
  
  return htmlCode;
}

/**
 * Pac-Man specific fixes
 */
function fixPacmanSpecific(htmlCode: string): string {
  // Pac-Man might need maze centering fixes
  // Add specific fixes as needed
  return htmlCode;
}