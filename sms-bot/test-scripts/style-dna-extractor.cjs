const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Style DNA extractor - analyzes HTML content to extract visual elements
class StyleDNAExtractor {
    constructor(htmlContent) {
        this.html = htmlContent;
        this.analysis = {
            colors: [],
            gradients: [],
            fonts: [],
            appType: 'CREATIVE',
            interactionPoints: [],
            complexity: 'SIMPLE',
            emoji: [],
            animations: false
        };
    }

    // Extract background colors and gradients
    extractColors() {
        const colorPatterns = [
            /background:\s*linear-gradient\([^)]+\)/gi,
            /background:\s*#([0-9a-f]{3,6})/gi,
            /background:\s*rgb\([^)]+\)/gi,
            /background:\s*rgba\([^)]+\)/gi,
            /color:\s*#([0-9a-f]{3,6})/gi,
            /color:\s*rgb\([^)]+\)/gi
        ];

        colorPatterns.forEach(pattern => {
            const matches = this.html.match(pattern) || [];
            matches.forEach(match => {
                if (match.includes('linear-gradient')) {
                    this.analysis.gradients.push(match);
                } else {
                    this.analysis.colors.push(match);
                }
            });
        });

        // Remove duplicates
        this.analysis.colors = [...new Set(this.analysis.colors)];
        this.analysis.gradients = [...new Set(this.analysis.gradients)];
    }

    // Extract font families
    extractFonts() {
        const fontPatterns = [
            /font-family:\s*['"']([^'"]+)['"']/gi,
            /font-family:\s*([^;,}]+)/gi
        ];

        fontPatterns.forEach(pattern => {
            const matches = this.html.match(pattern) || [];
            matches.forEach(match => {
                const fontName = match.replace(/font-family:\s*['"]?/gi, '').replace(/['"];.*/g, '').trim();
                if (fontName && !fontName.includes('var(') && fontName.length > 2) {
                    this.analysis.fonts.push(fontName);
                }
            });
        });

        this.analysis.fonts = [...new Set(this.analysis.fonts)];
    }

    // Determine app type based on HTML content
    detectAppType() {
        const content = this.html.toLowerCase();
        
        if (content.includes('canvas') && (content.includes('game') || content.includes('tetris') || content.includes('puzzle'))) {
            this.analysis.appType = 'GAME';
        } else if (content.includes('wtaf_zero_admin_collaborative') || content.includes('collaborative')) {
            this.analysis.appType = 'COLLABORATIVE';
        } else if (content.includes('form') && content.includes('input') && (content.includes('booking') || content.includes('business') || content.includes('schedule'))) {
            this.analysis.appType = 'PRODUCTIVITY';
        } else if (content.includes('hello world') || content.includes('welcome') || content.includes('portfolio')) {
            this.analysis.appType = 'CREATIVE';
        }
    }

    // Find interactive elements
    findInteractionPoints() {
        const interactionPatterns = [
            { type: 'Button Click', pattern: /<button[^>]*>/gi },
            { type: 'Form Input', pattern: /<input[^>]*type="text"[^>]*>/gi },
            { type: 'Dropdown', pattern: /<select[^>]*>/gi },
            { type: 'Text Area', pattern: /<textarea[^>]*>/gi },
            { type: 'Game Canvas', pattern: /<canvas[^>]*>/gi },
            { type: 'Collaborative Action', pattern: /supabase\.from\([^)]+\)\.insert/gi }
        ];

        interactionPatterns.forEach(({ type, pattern }) => {
            const matches = this.html.match(pattern) || [];
            if (matches.length > 0) {
                this.analysis.interactionPoints.push({
                    type,
                    count: matches.length
                });
            }
        });
    }

    // Extract emojis used in the app
    extractEmojis() {
        const emojiPattern = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
        const emojis = this.html.match(emojiPattern) || [];
        this.analysis.emoji = [...new Set(emojis)].slice(0, 5); // Top 5 unique emojis
    }

    // Check for animations
    detectAnimations() {
        const animationPatterns = [
            /@keyframes/gi,
            /animation:/gi,
            /transition:/gi,
            /transform:/gi
        ];

        this.analysis.animations = animationPatterns.some(pattern => this.html.match(pattern));
    }

    // Determine complexity based on HTML size and features
    assessComplexity() {
        const htmlSize = this.html.length;
        const jsComplexity = (this.html.match(/<script/gi) || []).length;
        const cssComplexity = (this.html.match(/style>/gi) || []).length;
        
        if (htmlSize > 50000 || jsComplexity > 3 || this.analysis.interactionPoints.length > 5) {
            this.analysis.complexity = 'COMPLEX';
        } else if (htmlSize > 20000 || jsComplexity > 1 || this.analysis.interactionPoints.length > 2) {
            this.analysis.complexity = 'MEDIUM';
        } else {
            this.analysis.complexity = 'SIMPLE';
        }
    }

    // Main analysis function
    analyze() {
        console.log('🔍 Analyzing HTML content...');
        
        this.extractColors();
        this.extractFonts();
        this.detectAppType();
        this.findInteractionPoints();
        this.extractEmojis();
        this.detectAnimations();
        this.assessComplexity();

        return this.analysis;
    }

    // Generate gallery-ready preview data
    generateGalleryData(appInfo) {
        return {
            title: appInfo.app_slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            description: this.generateDescription(appInfo.original_prompt),
            appType: this.analysis.appType,
            styleDNA: {
                primaryColors: this.analysis.colors.slice(0, 3),
                gradients: this.analysis.gradients.slice(0, 1),
                fonts: this.analysis.fonts.slice(0, 2),
                emoji: this.analysis.emoji.slice(0, 3)
            },
            interactions: this.analysis.interactionPoints,
            complexity: this.analysis.complexity,
            hasAnimations: this.analysis.animations,
            remixDifficulty: this.calculateRemixDifficulty()
        };
    }

    generateDescription(originalPrompt) {
        if (!originalPrompt) return 'A custom WTAF creation';
        
        // Clean up the prompt to make it gallery-friendly
        let description = originalPrompt.slice(0, 80);
        if (originalPrompt.length > 80) description += '...';
        
        // Add app type context
        const typeDescriptions = {
            'GAME': ' - Interactive gaming experience',
            'COLLABORATIVE': ' - Multi-user collaborative tool',
            'PRODUCTIVITY': ' - Business productivity solution',
            'CREATIVE': ' - Creative showcase project'
        };
        
        return description + (typeDescriptions[this.analysis.appType] || '');
    }

    calculateRemixDifficulty() {
        let difficulty = 'EASY';
        
        if (this.analysis.complexity === 'COMPLEX' || this.analysis.interactionPoints.length > 5) {
            difficulty = 'ADVANCED';
        } else if (this.analysis.complexity === 'MEDIUM' || this.analysis.interactionPoints.length > 2) {
            difficulty = 'MEDIUM';
        }
        
        return difficulty;
    }
}

// Test the extractor with real WTAF pages
async function testStyleExtraction() {
    console.log('🎨 WTAF Style DNA Extractor Test\n');

    try {
        // Fetch diverse app examples
        const { data: apps, error } = await supabase
            .from('wtaf_content')
            .select('user_slug, app_slug, original_prompt, html_content, created_at')
            .eq('status', 'published')
            .order('created_at', { ascending: false })
            .limit(4);

        if (error) {
            console.error('❌ Error fetching apps:', error);
            return;
        }

        console.log(`📊 Analyzing ${apps.length} WTAF pages...\n`);

        apps.forEach((app, index) => {
            console.log(`\n=== ${index + 1}. /${app.user_slug}/${app.app_slug} ===`);
            console.log(`Original Prompt: ${(app.original_prompt || 'No prompt').slice(0, 60)}...`);
            
            const extractor = new StyleDNAExtractor(app.html_content);
            const analysis = extractor.analyze();
            const galleryData = extractor.generateGalleryData(app);
            
            console.log('\n🎨 Style DNA Analysis:');
            console.log(`   App Type: ${analysis.appType}`);
            console.log(`   Complexity: ${analysis.complexity}`);
            console.log(`   Colors Found: ${analysis.colors.length}`);
            console.log(`   Gradients: ${analysis.gradients.length}`);
            console.log(`   Fonts: ${analysis.fonts.join(', ') || 'Default fonts'}`);
            console.log(`   Emoji: ${analysis.emoji.join(' ') || 'None'}`);
            console.log(`   Animations: ${analysis.animations ? 'Yes' : 'No'}`);
            console.log(`   Interactions: ${analysis.interactionPoints.length} types`);
            
            if (analysis.interactionPoints.length > 0) {
                console.log('   └─ Interaction Types:');
                analysis.interactionPoints.forEach(point => {
                    console.log(`      • ${point.type} (${point.count}x)`);
                });
            }
            
            console.log('\n📱 Gallery Data:');
            console.log(`   Title: ${galleryData.title}`);
            console.log(`   Description: ${galleryData.description}`);
            console.log(`   Remix Difficulty: ${galleryData.remixDifficulty}`);
            
            if (galleryData.styleDNA.primaryColors.length > 0) {
                console.log(`   Primary Colors: ${galleryData.styleDNA.primaryColors.slice(0, 2).join(', ')}`);
            }
            
            console.log('─'.repeat(50));
        });

        console.log('\n✅ Style DNA extraction complete!');
        console.log('\n💡 This data would be used to populate the gallery with:');
        console.log('   • Visual previews with actual colors/fonts');
        console.log('   • Smart categorization and filtering');
        console.log('   • Remix difficulty indicators');
        console.log('   • Interactive element previews');
        console.log('   • Style-based recommendations');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Gallery data generator - creates JSON for the gallery frontend
async function generateGalleryJSON() {
    console.log('\n🏗️ Generating Gallery JSON Data...\n');

    try {
        const { data: apps, error } = await supabase
            .from('wtaf_content')
            .select('user_slug, app_slug, original_prompt, html_content, created_at, coach')
            .eq('status', 'published')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        const galleryData = {
            users: {},
            totalApps: apps.length,
            categories: { GAME: 0, COLLABORATIVE: 0, PRODUCTIVITY: 0, CREATIVE: 0 },
            generatedAt: new Date().toISOString()
        };

        apps.forEach(app => {
            const extractor = new StyleDNAExtractor(app.html_content);
            const analysis = extractor.analyze();
            const processedApp = extractor.generateGalleryData(app);
            
            // Organize by user
            if (!galleryData.users[app.user_slug]) {
                galleryData.users[app.user_slug] = {
                    apps: [],
                    totalApps: 0,
                    totalRemixes: Math.floor(Math.random() * 50), // Mock data
                    memberSince: app.created_at.slice(0, 7)
                };
            }
            
            galleryData.users[app.user_slug].apps.push({
                slug: app.app_slug,
                title: processedApp.title,
                description: processedApp.description,
                type: processedApp.appType,
                styleDNA: processedApp.styleDNA,
                remixCount: Math.floor(Math.random() * 25),
                remixDifficulty: processedApp.remixDifficulty,
                createdAt: app.created_at,
                coach: app.coach || 'default',
                previewUrl: `/api/generate-og-cached?user=${app.user_slug}&app=${app.app_slug}`,
                liveUrl: `/wtaf/${app.user_slug}/${app.app_slug}`
            });
            
            galleryData.users[app.user_slug].totalApps++;
            galleryData.categories[processedApp.appType]++;
        });

        // Save to file for the gallery frontend to use
        const fs = require('fs');
        const path = require('path');
        const outputPath = path.join(__dirname, '../logs/gallery-data.json');
        
        fs.writeFileSync(outputPath, JSON.stringify(galleryData, null, 2));
        
        console.log(`✅ Gallery JSON saved to: ${outputPath}`);
        console.log(`📊 Generated data for ${Object.keys(galleryData.users).length} users`);
        console.log(`📱 Total apps processed: ${galleryData.totalApps}`);
        console.log('🏷️ Category breakdown:');
        Object.entries(galleryData.categories).forEach(([type, count]) => {
            console.log(`   • ${type}: ${count} apps`);
        });

        return galleryData;

    } catch (error) {
        console.error('❌ Gallery JSON generation failed:', error.message);
    }
}

// Run the tests
if (require.main === module) {
    console.log('🎨 WTAF Gallery System - Style DNA Extractor\n');
    console.log('This script demonstrates how we can automatically analyze');
    console.log('any WTAF page to extract styling and categorization data\n');
    
    testStyleExtraction()
        .then(() => generateGalleryJSON())
        .then(() => {
            console.log('\n🎯 Next Steps:');
            console.log('1. Use this data to populate the gallery mockup');
            console.log('2. Generate preview images using existing OG system');
            console.log('3. Build remix flow that preserves style DNA');
            console.log('4. Add user interaction tracking for trending');
        });
}

module.exports = { StyleDNAExtractor }; 