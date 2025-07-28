/**
 * Post-processes game HTML to fix common viewport and layout issues
 */
export async function postProcessGameHTML(htmlCode: string, gameType?: string): Promise<string> {
  try {
    // Apply general fixes
    htmlCode = fixCanvasViewport(htmlCode);
    
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