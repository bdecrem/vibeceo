# How to Add Apps to WebtoysOS v2 Desktop

**CRITICAL**: WebtoysOS v2 has **THREE SYSTEMS** that must ALL be updated for an app icon to show:

1. **HTML Desktop Icons** (in the database)
2. **windowedApps Registry** (JavaScript object)  
3. **Layout Data System** (ZAD database)

If ANY of these is missing or broken, the icon won't show up.

## The Problem We Just Solved

TEXTY failed to show because:
- ✅ HTML icon existed
- ✅ windowedApps registry had entry
- ❌ Layout data was missing initially
- ❌ **CRITICAL**: Icon was trapped in a parent div with `display: none`

## Step-by-Step Process

### Step 1: Verify the App Exists
```bash
# Check if the app exists in the database
node -e "
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import('./scripts/safe-update-wrapper.js');

setTimeout(async () => {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data, error } = await supabase
        .from('wtaf_content')
        .select('app_slug, user_slug, original_prompt')
        .eq('user_slug', 'public')
        .eq('app_slug', 'YOUR-APP-NAME')
        .single();
    
    if (error) {
        console.log('❌ App not found:', error.message);
    } else {
        console.log('✅ Found app:', data);
    }
}, 100);
"
```

### Step 2: Add to windowedApps Registry

Find the `window.windowedApps` object in the HTML and add:

```javascript
'your-app-id': {
    name: 'Your App Name',
    url: '/public/your-app-slug',
    icon: '📄',
    width: 700,
    height: 500
},
```

**CRITICAL**: Make sure there's a comma after the previous entry!

### Step 3: Add HTML Desktop Icon

Add the icon **INSIDE the main `#desktop` div** alongside other working icons:

```html
<!-- Your App Name -->
<div class="desktop-icon" 
     style="left: [UNIQUE_X]px; top: [UNIQUE_Y]px;"
     onclick="openWindowedApp('your-app-id')"
     title="Your App Name">
    <div class="icon">📄</div>
    <div class="label">Your App</div>
</div>
```

**CRITICAL POSITIONING RULES**:
- **Find free space** - don't overlap with existing icons
- **Use positions that don't conflict** - check existing icons first
- **Place INSIDE `#desktop` div** - not at the end of HTML or in some random div

### Step 4: Add to Layout Data System

```javascript
// Add to toybox-desktop-layout ZAD data
const layoutIcons = {
    'yourapp': {  // lowercase, no special chars
        x: [SAME_X_AS_HTML],
        y: [SAME_Y_AS_HTML], 
        visible: true,
        label: 'Your App'
    }
};
```

### Step 5: Use Our Automated Script Template

**Create a script like this:**

```javascript
#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import('./safe-update-wrapper.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

setTimeout(async () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    async function addYourAppToDesktop() {
        console.log('🔧 Adding YOUR-APP to webtoys-os-v2...');

        try {
            // 1. Check app exists
            const { data: app, error: appError } = await supabase
                .from('wtaf_content')
                .select('app_slug, user_slug')
                .eq('user_slug', 'public')
                .eq('app_slug', 'YOUR-APP-SLUG')
                .single();

            if (appError) {
                console.log('❌ App not found:', appError.message);
                return;
            }

            // 2. Get current HTML
            const { data: current, error } = await supabase
                .from('wtaf_content')
                .select('html_content, updated_at')
                .eq('user_slug', 'public')
                .eq('app_slug', 'webtoys-os-v2')
                .single();

            if (error) {
                console.error('❌ Failed to fetch webtoys-os-v2:', error);
                return;
            }

            let html = current.html_content;

            // 3. Create backup
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(__dirname, '../backups', `webtoys-os-v2_add-yourapp_${timestamp}.html`);
            fs.writeFileSync(backupPath, html);
            console.log('💾 Created backup:', path.basename(backupPath));

            // 4. Add to windowedApps registry
            if (!html.includes("'your-app-id':")) {
                const registryPattern = /(window\.windowedApps\s*=\s*\{[\s\S]*?)(\s*\};)/;
                const registryMatch = html.match(registryPattern);
                
                if (registryMatch) {
                    const appEntry = `
            'your-app-id': {
                name: 'Your App Name',
                url: '/public/YOUR-APP-SLUG',
                icon: '📄',
                width: 700,
                height: 500
            },`;
                    
                    const newRegistry = registryMatch[1] + appEntry + registryMatch[2];
                    html = html.replace(registryMatch[0], newRegistry);
                    console.log('✅ Added to windowedApps registry');
                }
            }

            // 5. Add HTML desktop icon INSIDE #desktop div
            if (!html.includes('onclick="openWindowedApp(\'your-app-id\')"')) {
                const desktopDivPattern = /<div id="desktop">\s*/;
                const desktopMatch = html.match(desktopDivPattern);
                
                if (desktopMatch) {
                    const insertPoint = desktopMatch.index + desktopMatch[0].length;
                    
                    const iconHTML = `
    <!-- Your App Name -->
    <div class="desktop-icon" 
         style="left: 620px; top: 80px;"
         onclick="openWindowedApp('your-app-id')"
         title="Your App Name">
        <div class="icon">📄</div>
        <div class="label">Your App</div>
    </div>
`;
                    
                    html = html.slice(0, insertPoint) + iconHTML + html.slice(insertPoint);
                    console.log('✅ Added desktop icon inside #desktop div');
                }
            }

            // 6. Update database
            const { error: updateError } = await supabase
                .from('wtaf_content')
                .update({ 
                    html_content: html,
                    updated_at: new Date().toISOString()
                })
                .eq('user_slug', 'public')
                .eq('app_slug', 'webtoys-os-v2');

            if (updateError) {
                console.error('❌ HTML update failed:', updateError);
                return;
            }

            // 7. Add to layout data
            const { data: layoutData } = await supabase
                .from('wtaf_zero_admin_collaborative')
                .select('*')
                .eq('app_id', 'toybox-desktop-layout')
                .eq('action_type', 'desktop_state')
                .eq('participant_id', 'global')
                .order('created_at', { ascending: false })
                .limit(1);

            if (layoutData && layoutData[0]) {
                const icons = { ...layoutData[0].content_data.icons };
                icons.yourapp = {
                    x: 620,
                    y: 80,
                    visible: true,
                    label: 'Your App'
                };

                await supabase
                    .from('wtaf_zero_admin_collaborative')
                    .insert({
                        app_id: 'toybox-desktop-layout',
                        participant_id: 'global',
                        action_type: 'desktop_state',
                        content_data: {
                            ...layoutData[0].content_data,
                            icons: icons,
                            lastModified: new Date().toISOString(),
                            modifiedBy: 'add-app-script'
                        }
                    });
                    
                console.log('✅ Added to layout data');
            }

            console.log('✅ Successfully added YOUR-APP to webtoys-os-v2!');
            console.log('🔗 Live at: https://webtoys.ai/public/webtoys-os-v2');

        } catch (error) {
            console.error('❌ Error:', error);
        }
    }

    await addYourAppToDesktop();
}, 100);
```

## CRITICAL Debugging Steps

If an icon doesn't show up, run this debug script:

```javascript
// In browser console on webtoys-os-v2:
setTimeout(function() {
    const yourIcon = document.querySelector('[onclick*="your-app-id"]');
    if (yourIcon) {
        console.log('🔍 Icon found:', {
            display: yourIcon.style.display,
            visible: yourIcon.offsetParent !== null,
            position: [yourIcon.style.left, yourIcon.style.top],
            parentDisplay: window.getComputedStyle(yourIcon.parentElement).display
        });
        
        // Force visible
        yourIcon.style.backgroundColor = 'red';
        yourIcon.style.border = '3px solid yellow';
        yourIcon.style.zIndex = '99999';
        yourIcon.style.display = 'block';
        yourIcon.style.position = 'absolute';
        
    } else {
        console.log('❌ Icon not found in DOM');
    }
}, 2000);
```

## Common Issues and Solutions

### Issue 1: Icon exists but not visible
**Cause**: Parent div has `display: none` or wrong positioning
**Solution**: Move icon to be directly inside `#desktop` div

### Issue 2: Icon appears but doesn't work when clicked
**Cause**: Missing from windowedApps registry or wrong app ID
**Solution**: Check windowedApps has correct entry with matching ID

### Issue 3: Icon appears briefly then disappears  
**Cause**: Layout data system hiding it or marking `visible: false`
**Solution**: Add to layout data with `visible: true`

### Issue 4: Icon overlaps with existing icons
**Cause**: Position conflicts
**Solution**: Use unique x,y coordinates that don't overlap

## Position Guidelines

**Safe positions for new icons:**
- `(620, 80)` - Right side, top row
- `(520, 320)` - Right side, middle  
- `(40, 420)` - Left side, bottom
- `(140, 420)` - Second column, bottom

**Always check existing icons first** before choosing a position!

## Final Checklist

Before adding any app icon:

- [ ] App exists in database (`/public/your-app-slug`)
- [ ] Chosen unique position that doesn't overlap
- [ ] Added to windowedApps registry with comma
- [ ] Added HTML icon INSIDE `#desktop` div
- [ ] Added to layout data with `visible: true`
- [ ] Tested that icon appears and works when clicked
- [ ] Verified it opens in windowed iframe (not popup)

**Remember**: WebtoysOS v2 is a complex system with multiple moving parts. Missing ANY of these steps will cause the icon to not show up or not work properly.