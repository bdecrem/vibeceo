#!/usr/bin/env node

/**
 * Enhanced Mac OS 8 Platinum Theme Updater
 * 
 * Updates the existing macos8-platinum theme with detailed design improvements
 * including typography refinement, spacing improvements, color harmony, 
 * micro-interactions, visual effects, and pixel-perfect details.
 * 
 * Following project architecture rules:
 * - Uses environment variables for credentials (no hardcoded secrets)
 * - Uses proper database access patterns
 * - Located in scripts/ directory (covered by .gitignore)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env.local') });

// Get credentials from environment
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const enhancedMacOS8CSS = `/* Mac OS 8 Platinum Theme - Enhanced Authentic Classic Mac Interface */
@import url('https://fonts.googleapis.com/css2?family=Charcoal:wght@400;700&display=swap');

:root {
  --platinum-gray: #EEEEEE;
  --platinum-light: #F5F5F5;
  --platinum-medium: #DDDDDD;
  --platinum-dark: #AAAAAA;
  --platinum-darker: #888888;
  --platinum-accent: #0066CC;
  --platinum-accent-light: #4A90E2;
  --platinum-accent-dark: #004499;
  --platinum-shadow: rgba(0, 0, 0, 0.4);
  --platinum-shadow-light: rgba(0, 0, 0, 0.2);
  --platinum-highlight: rgba(255, 255, 255, 0.8);
  --platinum-text: #000000;
  --platinum-white: #FFFFFF;
  
  /* Typography */
  --font-system: 'Charcoal', 'Geneva', 'Chicago', 'Helvetica Neue', system-ui, sans-serif;
  --font-size-base: 12px;
  --font-size-small: 10px;
  --font-size-large: 13px;
  --line-height-tight: 1.1;
  --line-height-normal: 1.2;
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 20px;
  
  /* Border radius */
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 6px;
  --radius-xl: 8px;
  
  /* Shadows */
  --shadow-soft: 0 2px 8px var(--platinum-shadow);
  --shadow-hard: 2px 2px 0 rgba(0, 0, 0, 0.3);
  --shadow-inset-raised: inset 1px 1px 0 var(--platinum-highlight), inset -1px -1px 0 rgba(0, 0, 0, 0.1);
  --shadow-inset-pressed: inset 0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 1px var(--platinum-highlight);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background: var(--platinum-gray);
  background-image: 
    radial-gradient(circle at 25% 25%, rgba(255,255,255,0.15) 1px, transparent 1px),
    radial-gradient(circle at 75% 75%, rgba(0,0,0,0.05) 1px, transparent 1px),
    linear-gradient(45deg, transparent 46%, rgba(0,0,0,0.02) 49%, rgba(0,0,0,0.02) 51%, transparent 54%);
  background-size: 12px 12px, 12px 12px, 8px 8px;
  font-family: var(--font-system);
  font-size: var(--font-size-base);
  margin: 0;
  height: 100vh;
  position: relative;
  overflow: hidden;
  color: var(--platinum-text);
  line-height: var(--line-height-normal);
  -webkit-font-smoothing: none;
  -moz-osx-font-smoothing: unset;
  font-smooth: never;
  text-rendering: optimizeSpeed;
}

/* Desktop Background */
.desktop, #desktop {
  width: 100%;
  height: calc(100vh - 28px);
  position: relative;
  background: var(--platinum-gray);
  background-image: inherit;
  background-size: inherit;
  padding: var(--spacing-xl);
}

/* Menu Bar */
.menu-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 28px;
  background: linear-gradient(to bottom, var(--platinum-light) 0%, #E8E8E8 50%, var(--platinum-medium) 100%);
  border-bottom: 1px solid var(--platinum-dark);
  display: flex;
  align-items: center;
  padding: 0 var(--spacing-sm);
  z-index: 1000;
  box-shadow: 0 1px 3px var(--platinum-shadow-light), 0 2px 6px rgba(0,0,0,0.1);
}

.menu-bar .menu-title {
  font-weight: bold;
  font-size: var(--font-size-large);
  padding: 0 var(--spacing-md);
  height: 100%;
  display: flex;
  align-items: center;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  transition: all 0.1s ease;
}

.menu-bar .menu-title:hover {
  background: var(--platinum-accent);
  color: var(--platinum-white);
  border: 1px solid var(--platinum-accent-dark);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.3);
}

.menu-bar .menu-title:active {
  background: var(--platinum-accent-dark);
  transform: translateY(1px);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
}

.menu-bar .apple-menu {
  background: var(--platinum-text);
  color: var(--platinum-white);
  font-family: system-ui;
  border-radius: var(--radius-sm);
  margin-right: var(--spacing-sm);
  width: 24px;
  text-align: center;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.1s ease;
}

.menu-bar .apple-menu:hover {
  background: #333333;
  transform: scale(1.05);
}

/* Desktop Icons */
.desktop-icon {
  position: absolute;
  width: 72px;
  text-align: center;
  cursor: pointer;
  padding: var(--spacing-sm) var(--spacing-xs);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  background: transparent;
  transition: all 0.15s ease;
}

.desktop-icon:hover {
  background: rgba(102, 153, 204, 0.25);
  border: 1px solid rgba(102, 153, 204, 0.5);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.desktop-icon.selected {
  background: var(--platinum-accent);
  border: 1px solid var(--platinum-accent-dark);
  box-shadow: var(--shadow-inset-raised);
}

.desktop-icon .icon {
  font-size: 36px;
  line-height: 1;
  filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.4));
  margin-bottom: var(--spacing-xs);
  transition: transform 0.1s ease;
}

.desktop-icon:hover .icon {
  transform: scale(1.05);
}

.desktop-icon .label {
  color: var(--platinum-text);
  font-size: var(--font-size-small);
  line-height: var(--line-height-tight);
  word-wrap: break-word;
  max-width: 72px;
  font-weight: normal;
  text-shadow: 1px 1px 1px var(--platinum-highlight);
  -webkit-font-smoothing: none;
}

.desktop-icon.selected .label {
  color: var(--platinum-white);
  text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
}

/* Windows */
#window-container {
  position: absolute;
  top: 28px;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.desktop-window {
  position: absolute;
  background: var(--platinum-gray);
  border: 2px solid var(--platinum-dark);
  border-radius: var(--radius-xl);
  box-shadow: 
    var(--shadow-soft),
    var(--shadow-inset-raised);
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  min-width: 320px;
  min-height: 240px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.desktop-window.active {
  border-color: var(--platinum-accent);
  box-shadow: 
    0 4px 16px var(--platinum-shadow),
    var(--shadow-inset-raised),
    0 0 0 1px rgba(102, 153, 204, 0.3);
  transform: translateY(-2px);
}

/* Window Titlebar */
.window-titlebar {
  height: 20px;
  background: linear-gradient(to bottom, var(--platinum-white) 0%, #E8E8E8 50%, var(--platinum-medium) 100%);
  border-bottom: 1px solid var(--platinum-dark);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 var(--spacing-sm);
  cursor: grab;
  user-select: none;
  position: relative;
  box-shadow: inset 0 1px 0 var(--platinum-highlight);
}

.window-titlebar:active {
  cursor: grabbing;
}

.desktop-window.active .window-titlebar {
  background: linear-gradient(to bottom, #F0F8FF 0%, #E6F2FF 50%, #D9EEFF 100%);
  box-shadow: 
    inset 0 1px 0 var(--platinum-highlight),
    0 1px 3px rgba(0,0,0,0.2);
}

.window-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 11px;
  font-weight: bold;
  color: var(--platinum-text);
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  -webkit-font-smoothing: none;
}

.window-icon {
  font-size: 14px;
}

/* Window Controls */
.window-controls {
  display: flex;
  gap: var(--spacing-sm);
  position: absolute;
  left: var(--spacing-sm);
}

.window-controls button {
  width: 13px;
  height: 13px;
  border: 1px solid var(--platinum-darker);
  border-radius: 50%;
  font-size: 8px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.1s ease;
  box-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

.close-button {
  background: linear-gradient(to bottom, #FF6B6B, #FF5252);
  color: #8B0000;
  border-color: #CC4444;
}

.minimize-button {
  background: linear-gradient(to bottom, #FFD93D, #FFCD02);
  color: #B8860B;
  border-color: #CCAA00;
}

.zoom-button {
  background: linear-gradient(to bottom, #6BCF7F, #4CAF50);
  color: #2E7D32;
  border-color: #44AA44;
}

.window-controls button:hover {
  border-color: #666666;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  transform: translateY(-1px);
}

.window-controls button:active {
  transform: translateY(1px);
  box-shadow: var(--shadow-inset-pressed);
}

/* Window Content */
.window-content {
  flex: 1;
  background: var(--platinum-white);
  border: 1px solid #CCCCCC;
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  overflow: auto;
  margin: 0;
  position: relative;
  padding: var(--spacing-lg) var(--spacing-xl);
  line-height: 1.4;
}

/* Enhanced Scrollbars */
.window-content::-webkit-scrollbar {
  width: 16px;
  background: #F0F0F0;
}

.window-content::-webkit-scrollbar-track {
  background: linear-gradient(to right, #E8E8E8, #F0F0F0, #E8E8E8);
  border: 1px solid #CCCCCC;
  border-left: none;
  box-shadow: inset 1px 0 2px rgba(0,0,0,0.1);
}

.window-content::-webkit-scrollbar-thumb {
  background: linear-gradient(to right, var(--platinum-medium), #C0C0C0, var(--platinum-medium));
  border: 1px solid #999999;
  border-radius: 0;
  box-shadow: inset 0 1px 0 var(--platinum-highlight);
}

.window-content::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(to right, #D0D0D0, #B0B0B0, #D0D0D0);
  box-shadow: inset 0 1px 0 var(--platinum-highlight), 0 0 3px rgba(0,0,0,0.2);
}

.window-content::-webkit-scrollbar-button {
  height: 16px;
  background: linear-gradient(to bottom, var(--platinum-gray), #CCCCCC);
  border: 1px solid #999999;
  box-shadow: inset 0 1px 0 var(--platinum-highlight);
}

.window-content::-webkit-scrollbar-button:hover {
  background: linear-gradient(to bottom, var(--platinum-medium), #BBBBBB);
}

.window-content::-webkit-scrollbar-button:active {
  background: linear-gradient(to bottom, #BBBBBB, #AAAAAA);
  box-shadow: var(--shadow-inset-pressed);
}

/* Enhanced Buttons with Micro-Interactions */
button, .button {
  padding: var(--spacing-xs) var(--spacing-md);
  background: linear-gradient(to bottom, var(--platinum-white) 0%, #E8E8E8 50%, var(--platinum-medium) 100%);
  border: 1px solid var(--platinum-dark);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 11px;
  font-family: inherit;
  color: var(--platinum-text);
  min-height: 22px;
  box-shadow: 
    0 1px 3px var(--platinum-shadow-light),
    var(--shadow-inset-raised);
  transition: all 0.1s ease;
  -webkit-font-smoothing: none;
  font-weight: normal;
}

button:hover, .button:hover {
  background: linear-gradient(to bottom, #F8F8F8 0%, #E0E0E0 50%, #D5D5D5 100%);
  border-color: #999999;
  box-shadow: 
    0 2px 4px var(--platinum-shadow-light),
    var(--shadow-inset-raised);
  transform: translateY(-1px);
}

button:active, .button:active {
  background: linear-gradient(to bottom, #D8D8D8 0%, #C8C8C8 50%, #BBBBBB 100%);
  box-shadow: var(--shadow-inset-pressed);
  transform: translateY(1px);
  border-color: var(--platinum-darker);
}

button:focus, .button:focus {
  outline: 2px solid var(--platinum-accent);
  outline-offset: 1px;
  border-color: var(--platinum-accent);
}

/* Form Elements */
input, textarea, select {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--platinum-dark);
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-family: inherit;
  background: var(--platinum-white);
  box-shadow: inset 1px 1px 2px rgba(0,0,0,0.1);
  transition: all 0.15s ease;
  -webkit-font-smoothing: none;
}

input:focus, textarea:focus, select:focus {
  outline: 2px solid var(--platinum-accent);
  outline-offset: 0;
  border-color: var(--platinum-accent);
  box-shadow: 
    inset 1px 1px 2px rgba(0,0,0,0.1),
    0 0 0 3px rgba(102, 153, 204, 0.2);
}

/* Container */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-xl);
  background: var(--platinum-white);
  border-radius: var(--radius-lg);
  box-shadow: 
    var(--shadow-soft),
    var(--shadow-inset-raised);
  border: 1px solid #CCCCCC;
}

/* Text Selection */
::selection {
  background: var(--platinum-accent);
  color: var(--platinum-white);
}

::-moz-selection {
  background: var(--platinum-accent);
  color: var(--platinum-white);
}

/* Status Bar */
.status-bar {
  background: linear-gradient(to bottom, var(--platinum-light), #E8E8E8);
  border-top: 1px solid #CCCCCC;
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-small);
  color: #666666;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 20px;
  box-shadow: inset 0 1px 0 var(--platinum-highlight);
  -webkit-font-smoothing: none;
}

/* Dialog Boxes */
.dialog {
  background: var(--platinum-gray);
  border: 2px solid var(--platinum-dark);
  border-radius: var(--radius-xl);
  box-shadow: 
    4px 4px 16px var(--platinum-shadow),
    var(--shadow-inset-raised);
  padding: var(--spacing-lg);
  max-width: 420px;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2000;
  animation: dialogAppear 0.2s ease-out;
}

@keyframes dialogAppear {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

.dialog-title {
  font-weight: bold;
  margin-bottom: var(--spacing-md);
  font-size: var(--font-size-base);
  -webkit-font-smoothing: none;
}

.dialog-buttons {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
  margin-top: var(--spacing-lg);
}

/* Default Button (Primary) */
.default-button, button.default {
  background: linear-gradient(to bottom, #5B9BD5 0%, var(--platinum-accent-light) 50%, #357ABD 100%);
  color: var(--platinum-white);
  border: 2px solid var(--platinum-accent-dark);
  font-weight: bold;
  box-shadow: 
    0 2px 6px rgba(0,0,0,0.3),
    inset 0 1px 0 rgba(255,255,255,0.3);
  text-shadow: 0 1px 1px rgba(0,0,0,0.3);
}

.default-button:hover, button.default:hover {
  background: linear-gradient(to bottom, #6BA6E0 0%, #5BA0ED 50%, #4080C8 100%);
  box-shadow: 
    0 3px 8px rgba(0,0,0,0.4),
    inset 0 1px 0 rgba(255,255,255,0.4);
}

.default-button:active, button.default:active {
  background: linear-gradient(to bottom, #357ABD 0%, var(--platinum-accent-dark) 50%, #1A5A96 100%);
  box-shadow: var(--shadow-inset-pressed);
}

/* Tooltips */
[title]:hover::after {
  content: attr(title);
  position: absolute;
  bottom: -25px;
  left: 50%;
  transform: translateX(-50%);
  background: #FFFFCC;
  border: 1px solid #999999;
  border-radius: var(--radius-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-small);
  white-space: nowrap;
  z-index: 1000;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  pointer-events: none;
}

/* Window Resize Handle */
.window-resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 16px;
  height: 16px;
  cursor: nw-resize;
  background: 
    linear-gradient(135deg, transparent 40%, var(--platinum-darker) 42%, var(--platinum-darker) 48%, transparent 50%),
    linear-gradient(45deg, transparent 40%, var(--platinum-darker) 42%, var(--platinum-darker) 48%, transparent 50%);
  background-size: 8px 8px;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.window-resize-handle:hover {
  opacity: 1;
}

/* Enhanced Focus Indicators */
*:focus-visible {
  outline: 2px solid var(--platinum-accent);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* Smooth Micro-Animations */
* {
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

/* Improved Typography for Small Text */
.small-text, small {
  font-size: var(--font-size-small);
  line-height: var(--line-height-tight);
  -webkit-font-smoothing: none;
}

/* Enhanced Menu Shadows */
.menu-bar {
  box-shadow: 
    0 1px 0 var(--platinum-highlight),
    0 2px 4px var(--platinum-shadow-light),
    0 4px 8px rgba(0,0,0,0.05);
}

/* Pixel-Perfect Icon Scaling */
.desktop-icon .icon,
.window-icon {
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}`;

async function updateTheme() {
    console.log('🎨 Updating Mac OS 8 Platinum theme with enhanced design...\n');
    
    try {
        const { data, error } = await supabase
            .from('wtaf_themes')
            .update({
                css_content: enhancedMacOS8CSS,
                version: '1.1.0',
                description: 'Enhanced Mac OS 8 Platinum theme with authentic gray interface styling, refined typography, improved spacing, micro-interactions, and pixel-perfect details',
                updated_at: new Date().toISOString()
            })
            .eq('id', 'macos8-platinum')
            .select();
        
        if (error) {
            console.error('❌ Error updating theme:', error);
            return;
        }
        
        if (data && data.length > 0) {
            console.log('✅ Successfully updated Mac OS 8 Platinum theme!');
            console.log(`📊 New CSS length: ${enhancedMacOS8CSS.length} characters`);
            console.log(`📈 Version updated to: ${data[0].version}`);
            console.log(`🎯 Enhancement features added:`);
            console.log('   • CSS Variables for consistent theming');
            console.log('   • Enhanced font smoothing for pixelated authenticity');
            console.log('   • Improved Charcoal font family stack');
            console.log('   • Generous window content padding (16-20px)');
            console.log('   • Authentic titlebar height (20px)');
            console.log('   • Enhanced desktop icon spacing (72px width)');
            console.log('   • Period-accurate blue accent (#0066CC)');
            console.log('   • Enhanced gradient definitions with CSS variables');
            console.log('   • Button press animations and micro-interactions');
            console.log('   • Improved window dragging cursor states');
            console.log('   • Enhanced menu bar gradients with layered shadows');
            console.log('   • Sophisticated shadow system (soft + hard shadows)');
            console.log('   • Improved desktop background texture');
            console.log('   • Authentic Mac-style scrollbar styling');
            console.log('   • Smooth micro-animations for interactions');
            console.log('   • Pixel-perfect measurements and spacing');
            console.log('   • Enhanced focus indicators and accessibility');
            console.log('   • Dialog animation effects');
            console.log('   • Tooltips and enhanced UI feedback');
        } else {
            console.log('⚠️ Theme not found or no changes made');
        }
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Run the update
updateTheme().then(() => {
    console.log('\n✅ Theme update complete!');
    process.exit(0);
}).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});