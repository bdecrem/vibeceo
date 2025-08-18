# Mobile Viewport Sizing Fix Instructions

## Critical Mobile Viewport Rules

When editing HTML for mobile compatibility, ALWAYS ensure:

### 1. Canvas Sizing MUST be Responsive
```javascript
// ❌ WRONG - Fixed dimensions cause overflow
canvas.width = 800;
canvas.height = 600;

// ✅ CORRECT - Responsive to viewport
const maxWidth = window.innerWidth - 20; // Account for padding
const maxHeight = window.innerHeight - 200; // Account for UI elements
canvas.width = Math.min(maxWidth, 800);
canvas.height = Math.min(maxHeight, 600);
```

### 2. CSS Width MUST Use vw Units Correctly
```css
/* ❌ WRONG - Can cause horizontal scroll */
#canvas {
    width: calc(100vw - 20px);
    max-width: calc(100vw - 20px);
}

/* ✅ CORRECT - Respects container */
#canvas {
    width: 100%;
    max-width: 100%;
    display: block;
}
```

### 3. HTML Canvas Attributes Should NOT Set Fixed Size
```html
<!-- ❌ WRONG - Forces size -->
<canvas id="canvas" width="800" height="600"></canvas>

<!-- ✅ CORRECT - Size via JavaScript -->
<canvas id="canvas"></canvas>
```

### 4. Container Elements MUST Prevent Overflow
```css
/* ✅ CORRECT - Prevent horizontal scroll */
body {
    overflow-x: hidden;
    max-width: 100vw;
}

.container {
    width: 100%;
    max-width: 100%;
    overflow: hidden;
}
```

### 5. Touch/Click Coordinates MUST Account for Scaling
```javascript
// ✅ CORRECT - Proper coordinate mapping
function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;
    
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}
```

## Common Mobile Issues to Fix:

1. **Oversized content**: Elements wider than viewport
2. **Fixed dimensions**: Hard-coded pixel values
3. **Improper scaling**: Canvas internal size vs CSS size mismatch
4. **Touch offset**: Drawing appears offset from finger position
5. **Horizontal scroll**: Content forcing viewport expansion

## Testing Checklist:
- [ ] No horizontal scroll on iPhone (375px wide)
- [ ] Canvas fits within viewport
- [ ] Touch/click positions accurate
- [ ] UI elements accessible
- [ ] Text readable without zooming