/**
 * Desktop Config Client Library
 * Handles all interactions with wtaf_desktop_config table
 */

class DesktopConfigClient {
    constructor(supabaseUrl, supabaseKey) {
        // Initialize Supabase client if not already available
        if (typeof window !== 'undefined' && window.supabase) {
            this.supabase = window.supabase;
        } else if (typeof window !== 'undefined' && window.supabaseClient) {
            this.supabase = window.supabaseClient.createClient(supabaseUrl, supabaseKey);
        } else {
            console.warn('Supabase client not available');
            this.supabase = null;
        }
        
        this.config = null;
        this.userId = null;
        this.saveTimeout = null;
    }
    
    /**
     * Load desktop configuration for current user
     */
    async loadConfig(userId = null) {
        if (!this.supabase) {
            console.error('Supabase client not initialized');
            return this.getDefaultConfig();
        }
        
        this.userId = userId;
        
        try {
            // Try to load user-specific config first
            if (userId) {
                const { data: userConfig, error: userError } = await this.supabase
                    .from('wtaf_desktop_config')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('desktop_version', 'webtoys-os-v3')
                    .single();
                
                if (userConfig && !userError) {
                    this.config = userConfig;
                    console.log('Loaded user config for:', userId);
                    return userConfig;
                }
            }
            
            // Fall back to default/public config
            const { data: defaultConfig, error: defaultError } = await this.supabase
                .from('wtaf_desktop_config')
                .select('*')
                .is('user_id', null)
                .eq('desktop_version', 'webtoys-os-v3')
                .single();
            
            if (defaultConfig && !defaultError) {
                this.config = defaultConfig;
                console.log('Loaded default desktop config');
                return defaultConfig;
            }
            
            // If no config found, return hardcoded default
            console.warn('No config found in database, using defaults');
            return this.getDefaultConfig();
            
        } catch (error) {
            console.error('Error loading desktop config:', error);
            return this.getDefaultConfig();
        }
    }
    
    /**
     * Get default configuration
     */
    getDefaultConfig() {
        return {
            app_registry: [
                { id: 'notepad', name: 'Notepad', icon: '📝', url: '/public/community-notepad', width: 800, height: 600 },
                { id: 'issue-tracker', name: 'Issue Tracker', icon: '📋', url: '/public/toybox-issue-tracker', width: 900, height: 700 },
                { id: 'chat', name: 'Chat', icon: '💬', url: '/public/toybox-chat', width: 700, height: 500 },
                { id: 'about', name: 'About', icon: 'ℹ️', action: 'alert', message: 'WebtoysOS v3.0\\nModern Desktop Environment' }
            ],
            icon_positions: {},
            widget_positions: {},
            user_folders: {},
            settings: {
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                theme: 'modern',
                gridSize: 'medium',
                iconSize: 'normal',
                animations: true
            },
            window_states: {}
        };
    }
    
    /**
     * Save or create user config
     */
    async ensureUserConfig(userId) {
        if (!this.supabase || !userId) return false;
        
        try {
            // Check if user config exists
            const { data: existing, error: checkError } = await this.supabase
                .from('wtaf_desktop_config')
                .select('id')
                .eq('user_id', userId)
                .eq('desktop_version', 'webtoys-os-v3')
                .single();
            
            if (!existing) {
                // Create user config by copying default
                const defaultConfig = this.config || await this.loadConfig(null);
                
                const { data: newConfig, error: insertError } = await this.supabase
                    .from('wtaf_desktop_config')
                    .insert({
                        user_id: userId,
                        desktop_version: 'webtoys-os-v3',
                        app_registry: defaultConfig.app_registry,
                        settings: defaultConfig.settings,
                        icon_positions: {},
                        widget_positions: {},
                        user_folders: {},
                        window_states: {}
                    })
                    .select()
                    .single();
                
                if (newConfig && !insertError) {
                    this.config = newConfig;
                    console.log('Created user config for:', userId);
                    return true;
                }
            }
            
            return true;
        } catch (error) {
            console.error('Error ensuring user config:', error);
            return false;
        }
    }
    
    /**
     * Save icon position (debounced)
     */
    saveIconPosition(iconId, position) {
        if (!this.config) return;
        
        // Update local config immediately
        if (!this.config.icon_positions) {
            this.config.icon_positions = {};
        }
        this.config.icon_positions[iconId] = position;
        
        // Debounce database save
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            this.persistIconPositions();
        }, 1000); // Save after 1 second of inactivity
    }
    
    /**
     * Persist icon positions to database
     */
    async persistIconPositions() {
        if (!this.supabase || !this.config) return;
        
        try {
            // Ensure user config exists
            if (this.userId) {
                await this.ensureUserConfig(this.userId);
            }
            
            const targetUserId = this.userId || null;
            
            const { error } = await this.supabase
                .from('wtaf_desktop_config')
                .update({
                    icon_positions: this.config.icon_positions,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', targetUserId)
                .eq('desktop_version', 'webtoys-os-v3');
            
            if (!error) {
                console.log('Saved icon positions');
            } else {
                console.error('Error saving icon positions:', error);
            }
        } catch (error) {
            console.error('Error persisting icon positions:', error);
        }
    }
    
    /**
     * Save widget position
     */
    async saveWidgetPosition(widgetId, position) {
        if (!this.config) return;
        
        // Update local config
        if (!this.config.widget_positions) {
            this.config.widget_positions = {};
        }
        this.config.widget_positions[widgetId] = position;
        
        // Save to database
        if (this.supabase) {
            try {
                if (this.userId) {
                    await this.ensureUserConfig(this.userId);
                }
                
                const targetUserId = this.userId || null;
                
                const { error } = await this.supabase
                    .from('wtaf_desktop_config')
                    .update({
                        widget_positions: this.config.widget_positions,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', targetUserId)
                    .eq('desktop_version', 'webtoys-os-v3');
                
                if (!error) {
                    console.log('Saved widget position for:', widgetId);
                }
            } catch (error) {
                console.error('Error saving widget position:', error);
            }
        }
    }
    
    /**
     * Save window state
     */
    async saveWindowState(windowId, state) {
        if (!this.config) return;
        
        // Update local config
        if (!this.config.window_states) {
            this.config.window_states = {};
        }
        this.config.window_states[windowId] = state;
        
        // Save to database
        if (this.supabase) {
            try {
                if (this.userId) {
                    await this.ensureUserConfig(this.userId);
                }
                
                const targetUserId = this.userId || null;
                
                const { error } = await this.supabase
                    .from('wtaf_desktop_config')
                    .update({
                        window_states: this.config.window_states,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', targetUserId)
                    .eq('desktop_version', 'webtoys-os-v3');
                
                if (!error) {
                    console.log('Saved window state for:', windowId);
                }
            } catch (error) {
                console.error('Error saving window state:', error);
            }
        }
    }
    
    /**
     * Update settings
     */
    async updateSettings(newSettings) {
        if (!this.config) return;
        
        // Merge settings
        this.config.settings = {
            ...this.config.settings,
            ...newSettings
        };
        
        // Save to database
        if (this.supabase) {
            try {
                if (this.userId) {
                    await this.ensureUserConfig(this.userId);
                }
                
                const targetUserId = this.userId || null;
                
                const { error } = await this.supabase
                    .from('wtaf_desktop_config')
                    .update({
                        settings: this.config.settings,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', targetUserId)
                    .eq('desktop_version', 'webtoys-os-v3');
                
                if (!error) {
                    console.log('Updated settings');
                    
                    // Apply background if changed
                    if (newSettings.background) {
                        document.body.style.background = newSettings.background;
                    }
                }
            } catch (error) {
                console.error('Error updating settings:', error);
            }
        }
    }
    
    /**
     * Add app to registry
     */
    async addApp(appData) {
        if (!this.config) return;
        
        // Check if app already exists
        const existing = this.config.app_registry.find(app => app.id === appData.id);
        if (existing) {
            console.log('App already registered:', appData.id);
            return false;
        }
        
        // Add to registry
        appData.installed = new Date().toISOString();
        this.config.app_registry.push(appData);
        
        // Save to database
        if (this.supabase) {
            try {
                if (this.userId) {
                    await this.ensureUserConfig(this.userId);
                }
                
                const targetUserId = this.userId || null;
                
                const { error } = await this.supabase
                    .from('wtaf_desktop_config')
                    .update({
                        app_registry: this.config.app_registry,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', targetUserId)
                    .eq('desktop_version', 'webtoys-os-v3');
                
                if (!error) {
                    console.log('Added app to registry:', appData.id);
                    return true;
                }
            } catch (error) {
                console.error('Error adding app:', error);
            }
        }
        
        return false;
    }
    
    /**
     * Remove app from registry
     */
    async removeApp(appId) {
        if (!this.config) return;
        
        // Remove from registry
        this.config.app_registry = this.config.app_registry.filter(app => app.id !== appId);
        
        // Remove icon position
        if (this.config.icon_positions && this.config.icon_positions[appId]) {
            delete this.config.icon_positions[appId];
        }
        
        // Save to database
        if (this.supabase) {
            try {
                if (this.userId) {
                    await this.ensureUserConfig(this.userId);
                }
                
                const targetUserId = this.userId || null;
                
                const { error } = await this.supabase
                    .from('wtaf_desktop_config')
                    .update({
                        app_registry: this.config.app_registry,
                        icon_positions: this.config.icon_positions,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', targetUserId)
                    .eq('desktop_version', 'webtoys-os-v3');
                
                if (!error) {
                    console.log('Removed app from registry:', appId);
                    return true;
                }
            } catch (error) {
                console.error('Error removing app:', error);
            }
        }
        
        return false;
    }
}

// Export for use in desktop
if (typeof window !== 'undefined') {
    window.DesktopConfigClient = DesktopConfigClient;
}