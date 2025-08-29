#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
const result = dotenv.config({ path: '../.env.local' });
if (result.error) {
    console.error('Error loading .env.local:', result.error.message);
    process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixMenuBarCSS() {
    try {
        console.log('🔧 Fixing menu bar CSS in System 7 theme...');
        
        // Read both CSS files and combine them properly
        const baseCSS = fs.readFileSync(path.join(process.cwd(), 'themes/base.css'), 'utf8');
        const system7CSS = fs.readFileSync(path.join(process.cwd(), 'themes/system7/system7.css'), 'utf8');
        
        // Combine with base CSS included (since structural CSS is needed)
        const fixedCSS = `/* System 7 Theme for ToyBox OS */

/* Base structural styles that themes need */
.menu-left {
  display: flex;
  align-items: center;
  gap: 0;
}

.menu-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.menu-title {
  font-size: 12px;
  line-height: 22px;
  padding: 0 8px;
  cursor: pointer;
  user-select: none;
}

#menu-clock {
  font-size: 12px;
  line-height: 22px;
  padding: 0 8px;
  user-select: none;
}

.desktop-icon .icon {
  font-size: 32px;
  line-height: 1;
}

.desktop-icon .label {
  font-size: 11px;
  line-height: 1.2;
  word-wrap: break-word;
  max-width: 75px;
}

.window-titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
  height: 18px;
  cursor: move;
  user-select: none;
}

.window-title {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: bold;
}

.window-controls {
  display: flex;
  gap: 4px;
}

.window-controls button {
  width: 14px;
  height: 14px;
  padding: 0;
  cursor: pointer;
  border: none;
  background: transparent;
  appearance: none;
}

.window-resize-handle {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 12px;
  height: 12px;
  cursor: nwse-resize;
}

${system7CSS}`;
        
        // Update the theme in the database
        const { data, error } = await supabase
            .from('wtaf_themes')
            .update({ 
                css_content: fixedCSS,
                updated_at: new Date().toISOString()
            })
            .eq('id', '2ec89c02-d424-4cf6-81f1-371ca6b9afcf')
            .select()
            .single();
        
        if (error) {
            console.error('❌ Error updating theme:', error.message);
            process.exit(1);
        }
        
        console.log('✅ Menu bar CSS fixed successfully!');
        console.log('   - Menu items now display horizontally');
        console.log('   - All structural CSS included');
        console.log('   - Theme should look correct now');
        
    } catch (error) {
        console.error('❌ Failed to fix menu bar CSS:', error.message);
        process.exit(1);
    }
}

// Run the fix
fixMenuBarCSS();