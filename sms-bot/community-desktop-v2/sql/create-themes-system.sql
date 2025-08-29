-- =====================================================
-- WEBTOYS THEMES SYSTEM
-- Creates theme support for wtaf_content pages
-- Run this script in Supabase SQL Editor
-- =====================================================

-- Step 1: Create themes table
CREATE TABLE IF NOT EXISTS wtaf_themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  css_content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT DEFAULT 'system',
  
  -- Metadata
  version TEXT DEFAULT '1.0',
  parent_theme TEXT REFERENCES wtaf_themes(id),
  
  -- Ensure only one default theme
  CONSTRAINT only_one_default EXCLUDE (is_default WITH =) WHERE (is_default = true)
);

-- Step 2: Add theme support to wtaf_content
ALTER TABLE wtaf_content 
ADD COLUMN IF NOT EXISTS theme_id TEXT REFERENCES wtaf_themes(id),
ADD COLUMN IF NOT EXISTS css_override TEXT;

-- Add comments for documentation
COMMENT ON COLUMN wtaf_content.theme_id IS 'References wtaf_themes.id for shared styling';
COMMENT ON COLUMN wtaf_content.css_override IS 'App-specific CSS that extends or overrides theme styles';

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wtaf_content_theme_id ON wtaf_content(theme_id);
CREATE INDEX IF NOT EXISTS idx_wtaf_themes_active ON wtaf_themes(is_active) WHERE is_active = true;

-- Step 4: Insert default themes
INSERT INTO wtaf_themes (id, name, description, css_content, is_default) 
VALUES (
  'default',
  'Default Theme',
  'Minimal default styling for basic apps',
  '/* Default Theme - Minimal Styling */
body {
  font-family: system-ui, -apple-system, sans-serif;
  margin: 0;
  padding: 20px;
  line-height: 1.6;
}

button {
  padding: 8px 16px;
  border: 1px solid #ccc;
  background: #f0f0f0;
  cursor: pointer;
  font-size: 14px;
}

button:hover {
  background: #e0e0e0;
}

button:active {
  background: #d0d0d0;
}

input, textarea {
  padding: 8px;
  border: 1px solid #ccc;
  font-size: 14px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}',
  true
) ON CONFLICT (id) DO NOTHING;

-- Step 5: Insert ToyBox OS theme
INSERT INTO wtaf_themes (id, name, description, css_content) 
VALUES (
  'toybox-os',
  'ToyBox OS Theme',
  'Windows 95-inspired desktop theme with window management styles',
  '/* ToyBox OS Theme - Windows 95 Style */
@import url(''https://fonts.googleapis.com/css2?family=VT323&display=swap'');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body { 
  background: #008080;
  background-image: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.03) 2px,
    rgba(0, 0, 0, 0.03) 4px
  );
  font-family: ''MS Sans Serif'', ''VT323'', monospace;
  margin: 0;
  height: 100vh;
  position: relative;
  overflow: hidden;
  user-select: none;
}

/* Desktop */
#desktop {
  width: 100%;
  height: calc(100vh - 40px);
  position: relative;
  padding: 10px;
}

/* Desktop Icons */
.desktop-icon {
  position: absolute;
  width: 75px;
  text-align: center;
  cursor: pointer;
  padding: 4px;
  border: 1px solid transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.desktop-icon:hover {
  background: rgba(0, 0, 139, 0.3);
  border: 1px dotted #fff;
}

.desktop-icon:active {
  background: rgba(0, 0, 139, 0.5);
}

.desktop-icon .icon {
  font-size: 32px;
  line-height: 1;
  filter: drop-shadow(1px 1px 0 rgba(0,0,0,0.5));
}

.desktop-icon .label { 
  color: white; 
  text-shadow: 1px 1px 1px rgba(0,0,0,0.8);
  font-size: 11px;
  line-height: 1.2;
  word-wrap: break-word;
  max-width: 75px;
  font-family: ''Tahoma'', ''Arial'', sans-serif;
}

/* Taskbar */
.taskbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
  background: #c0c0c0;
  border-top: 2px solid #ffffff;
  border-left: 2px solid #ffffff;
  display: flex;
  align-items: center;
  padding: 2px 4px;
  gap: 4px;
  box-shadow: inset -1px -1px #000000, inset 1px 1px #dfdfdf;
}

/* Buttons */
.start-button, .taskbar button {
  height: 32px;
  padding: 0 8px;
  background: #c0c0c0;
  border: 2px solid;
  border-color: #ffffff #808080 #808080 #ffffff;
  font-weight: bold;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: ''Tahoma'', ''Arial'', sans-serif;
}

.start-button:active, .taskbar button:active {
  border-color: #808080 #ffffff #ffffff #808080;
  padding-top: 1px;
  padding-left: 9px;
}

/* Windows */
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

/* Window Titlebar */
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
  font-family: ''Tahoma'', sans-serif;
}

.window-icon {
  font-size: 16px;
}

/* Window Controls */
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
  font-family: ''Tahoma'', sans-serif;
  padding: 0;
}

.window-controls button:active {
  border-color: #404040 #ffffff #ffffff #404040;
}

/* Window Content */
.window-content {
  flex: 1;
  background: white;
  border: 2px solid;
  border-color: #808080 #ffffff #ffffff #808080;
  overflow: hidden;
}

/* Window Resize Handle */
.window-resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 15px;
  height: 15px;
  cursor: nwse-resize;
  background: linear-gradient(135deg, transparent 50%, #808080 50%);
}'
) ON CONFLICT (id) DO UPDATE SET
  css_content = EXCLUDED.css_content,
  updated_at = NOW();

-- Step 6: Insert Notepad theme (for ZAD apps)
INSERT INTO wtaf_themes (id, name, description, css_content) 
VALUES (
  'notepad',
  'Notepad Theme',
  'Classic text editor styling for document-based apps',
  '/* Notepad Theme - Text Editor Style */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: ''Courier New'', monospace;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: white;
}

/* Toolbar */
.notepad-toolbar, .toolbar {
  background: #f0f0f0;
  border-bottom: 1px solid #ccc;
  padding: 5px;
  display: flex;
  gap: 10px;
  align-items: center;
}

.notepad-toolbar button, .toolbar button {
  padding: 5px 10px;
  background: #e0e0e0;
  border: 1px solid #999;
  cursor: pointer;
  font-size: 12px;
}

.notepad-toolbar button:hover, .toolbar button:hover {
  background: #d0d0d0;
}

.notepad-toolbar button:active, .toolbar button:active {
  background: #c0c0c0;
}

/* Content Area */
.notepad-content, .content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

#editor, textarea.editor {
  flex: 1;
  padding: 10px;
  border: none;
  outline: none;
  resize: none;
  font-family: ''Courier New'', monospace;
  font-size: 14px;
  line-height: 1.5;
}

/* Status Bar */
.status-bar {
  background: #f0f0f0;
  border-top: 1px solid #ccc;
  padding: 3px 10px;
  font-size: 11px;
  color: #666;
  display: flex;
  justify-content: space-between;
}

/* File Info */
.file-info {
  margin-left: auto;
  font-size: 12px;
  color: #666;
}

/* Save Indicator */
.save-indicator {
  color: green;
  display: none;
}

.save-indicator.show {
  display: inline;
}'
) ON CONFLICT (id) DO NOTHING;

-- Step 7: Create function to get theme with fallback
CREATE OR REPLACE FUNCTION get_theme_css(theme_id_param TEXT)
RETURNS TEXT AS $$
DECLARE
  theme_css TEXT;
BEGIN
  -- Try to get the requested theme
  SELECT css_content INTO theme_css
  FROM wtaf_themes
  WHERE id = theme_id_param AND is_active = true;
  
  -- If not found, get the default theme
  IF theme_css IS NULL THEN
    SELECT css_content INTO theme_css
    FROM wtaf_themes
    WHERE is_default = true;
  END IF;
  
  RETURN theme_css;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Update existing ToyBox OS and Notepad to use themes
UPDATE wtaf_content 
SET theme_id = 'toybox-os' 
WHERE user_slug = 'public' 
AND app_slug = 'toybox-os';

UPDATE wtaf_content 
SET theme_id = 'notepad' 
WHERE user_slug = 'public' 
AND app_slug = 'community-notepad';

-- Step 9: Grant permissions (adjust roles as needed)
GRANT SELECT ON wtaf_themes TO authenticated;
GRANT SELECT ON wtaf_themes TO anon;
GRANT ALL ON wtaf_themes TO service_role;

-- Step 10: Add RLS policies
ALTER TABLE wtaf_themes ENABLE ROW LEVEL SECURITY;

-- Everyone can read active themes
CREATE POLICY "Anyone can view active themes" ON wtaf_themes
  FOR SELECT
  USING (is_active = true);

-- Only service role can modify themes (for now)
CREATE POLICY "Service role can manage themes" ON wtaf_themes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- VERIFICATION QUERIES (Run these to test)
-- =====================================================
/*
-- Check themes were created:
SELECT id, name, is_default FROM wtaf_themes;

-- Check columns were added:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'wtaf_content' 
AND column_name IN ('theme_id', 'css_override');

-- Test the function:
SELECT get_theme_css('toybox-os');

-- Check theme assignments:
SELECT user_slug, app_slug, theme_id 
FROM wtaf_content 
WHERE theme_id IS NOT NULL;
*/