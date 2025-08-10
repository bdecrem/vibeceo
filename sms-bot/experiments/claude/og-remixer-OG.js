#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
};

// Genre definitions
const genres = {
    games: {
        name: 'Games',
        emojiSets: [
            ['🎮', '🚀', '🎨', '🏆'],
            ['👾', '⚡', '🎯', '🔥'],
            ['🕹️', '💥', '⭐', '🎪'],
            ['🎲', '🌟', '🎭', '🏅'],
            ['🎯', '🔮', '✨', '👑'],
            ['🎪', '🎨', '🎸', '🎊'],
            ['🚀', '🌈', '💫', '🎯'],
            ['🎮', '🦄', '🔥', '💎']
        ],
        texts: [
            'EAT SLEEP PWN REPEAT',
            'GAME OVER INSERT COIN',
            'READY PLAYER FUN',
            'BOSS MODE ACTIVATED',
            'PIXEL PERFECT CHAOS',
            'CTRL ALT DELETE BORING',
            'HIGH SCORE PARADISE',
            'RESPAWN AND CONQUER',
            'TURBO MODE ENGAGED',
            'ACHIEVEMENT UNLOCKED'
        ],
        colorSchemes: [
            { bg: ['#FFD63D', '#6ECBFF', '#FFB6E1'], text: ['#FF4B4B', '#B6FFB3', '#C9C2F9'] },
            { bg: ['#FFE66D', '#FF6B6B', '#C06FFF'], text: ['#4ECDC4', '#95E1D3', '#F38181'] },
            { bg: ['#FFF3B0', '#FFB4B4', '#B4E4FF'], text: ['#FF6B9D', '#C44569', '#2A0845'] },
            { bg: ['#FFEAA7', '#DFE6E9', '#74B9FF'], text: ['#6C5CE7', '#A29BFE', '#FD79A8'] },
            { bg: ['#FFD93D', '#6BCF7F', '#FF85A2'], text: ['#4A90E2', '#7B68EE', '#FF6347'] }
        ],
        badges: ['WIN', '1UP', 'GO!', 'BOOM', 'YAY', 'WOW', 'GG', 'EPIC', 'NICE', 'COOL']
    },
    webpages: {
        name: 'Web Pages',
        emojiSets: [
            ['📱', '🎨', '🌐', '🚀'],
            ['💻', '✨', '🌈', '🎯'],
            ['🖥️', '💡', '🔧', '⚡'],
            ['📲', '🎪', '🌟', '🏗️'],
            ['⌨️', '🖱️', '🖼️', '🎨'],
            ['🔌', '📡', '🌍', '✨'],
            ['💾', '📊', '🎭', '🚀'],
            ['🖥️', '🌐', '💫', '🎯']
        ],
        texts: [
            'SHIP FROM YOUR FLIP PHONE',
            'BUILD BREAK REBUILD',
            'CODE COFFEE REPEAT',
            'DEPLOY ON FRIDAY',
            'RESPONSIVE AND RESPONSIBLE',
            'LOCALHOST HERO',
            'PIXELS TO PERFECTION',
            'VIEW SOURCE MAGIC',
            'INSPECT ELEMENT LIFE',
            'CACHE ME OUTSIDE'
        ],
        colorSchemes: [
            { bg: ['#FFF9E6', '#E6F3FF', '#FFE6F1'], text: ['#5B8DEE', '#EE5B8D', '#8DEE5B'] },
            { bg: ['#F0F9FF', '#FEF3C7', '#FCE7F3'], text: ['#3B82F6', '#F59E0B', '#EC4899'] },
            { bg: ['#EFF6FF', '#FEF2F2', '#F0FDF4'], text: ['#2563EB', '#DC2626', '#16A34A'] },
            { bg: ['#FEFCE8', '#F3E8FF', '#FFE4E6'], text: ['#A16207', '#7C3AED', '#E11D48'] },
            { bg: ['#ECFDF5', '#FFF7ED', '#FAF5FF'], text: ['#059669', '#EA580C', '#9333EA'] }
        ],
        badges: ['SHIP', 'LIVE', 'BETA', 'NEW', 'HOT', 'FAST', 'PRO', 'COOL', 'NEXT', 'WEB3']
    },
    apps: {
        name: 'Apps',
        emojiSets: [
            ['📱', '⚡', '🚀', '✨'],
            ['📲', '💡', '🎯', '🌟'],
            ['📱', '🔥', '💎', '🏆'],
            ['💾', '⚙️', '🎨', '🎪'],
            ['📱', '🌈', '🦄', '💫'],
            ['🔌', '🎮', '🎯', '🎊'],
            ['📲', '💥', '🌟', '👑'],
            ['📱', '🔮', '✨', '🎯']
        ],
        texts: [
            'SWIPE RIGHT FOR SUCCESS',
            'TAP TAP BOOM',
            'PUSH NOTIFICATIONS TO THE MOON',
            'DOWNLOAD YOUR DREAMS',
            'FIVE STAR LIFESTYLE',
            'THUMB WORKOUT CHAMPION',
            'AIRPLANE MODE IS FOR QUITTERS',
            'SCROLL TO INFINITY',
            'UPDATE AVAILABLE FOR YOUR SOUL',
            'IN APP PURCHASE PARADISE'
        ],
        colorSchemes: [
            { bg: ['#E0F2FE', '#FECACA', '#FEF3C7'], text: ['#0284C7', '#DC2626', '#F59E0B'] },
            { bg: ['#F3E8FF', '#FFE4E6', '#ECFDF5'], text: ['#9333EA', '#E11D48', '#10B981'] },
            { bg: ['#FFF1F2', '#F0F9FF', '#FEF9C3'], text: ['#E11D48', '#2563EB', '#A16207'] },
            { bg: ['#DCFCE7', '#FED7AA', '#E9D5FF'], text: ['#16A34A', '#EA580C', '#9333EA'] },
            { bg: ['#CFFAFE', '#FBCFE8', '#FEF3C7'], text: ['#0891B2', '#DB2777', '#D97706'] }
        ],
        badges: ['NEW', 'HOT', 'TRENDING', 'VIRAL', 'UPDATE', 'FRESH', 'LIVE', 'BETA', 'PRO', 'PREMIUM']
    },
    music: {
        name: 'Music',
        emojiSets: [
            ['🎵', '🔊', '🎸', '🔥'],
            ['🎧', '💿', '🎹', '✨'],
            ['🎤', '🎶', '🥁', '🌟'],
            ['🎼', '🎺', '🎷', '💫'],
            ['🎵', '🌈', '🎪', '🎊'],
            ['🔊', '⚡', '🎸', '👑'],
            ['🎧', '💥', '🎹', '🚀'],
            ['🎤', '🔥', '🥁', '💎']
        ],
        texts: [
            'DROP THE BASS',
            'BEATS PER MINUTE INFINITY',
            'AUTOTUNE YOUR REALITY',
            'REMIX THE UNIVERSE',
            'VOLUME UP VIBES ON',
            'BASS IN YOUR FACE',
            'ECHO CHAMBER CHAMPION',
            'REVERB AND CHILL',
            'SOUNDWAVE SURFER',
            'PLAYLIST PARADISE'
        ],
        colorSchemes: [
            { bg: ['#FDE047', '#C084FC', '#FB7185'], text: ['#7C3AED', '#E11D48', '#0891B2'] },
            { bg: ['#FF6B6B', '#4ECDC4', '#FFE66D'], text: ['#8B5CF6', '#FF006E', '#3A86FF'] },
            { bg: ['#818CF8', '#F472B6', '#FDE68A'], text: ['#1E3A8A', '#831843', '#78350F'] },
            { bg: ['#F9A8D4', '#A78BFA', '#FDE047'], text: ['#BE185D', '#6D28D9', '#A16207'] },
            { bg: ['#FCA5A5', '#93C5FD', '#BEF264'], text: ['#991B1B', '#1E40AF', '#365314'] }
        ],
        badges: ['LIVE', 'LOUD', 'BASS', 'BEAT', 'VIBE', 'DROP', 'REMIX', 'LOOP', 'EPIC', 'FIRE']
    }
};

function getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function generateOGImage(genreName, variant = null) {
    const genre = genres[genreName];
    if (!genre) {
        console.error(`${colors.red}Genre "${genreName}" not found${colors.reset}`);
        return null;
    }

    // Pick random elements or use variant
    const emojiSet = variant?.emojis || getRandomItem(genre.emojiSets);
    const text = variant?.text || getRandomItem(genre.texts);
    const colorScheme = variant?.colors || getRandomItem(genre.colorSchemes);
    const badges = variant?.badges || [];
    
    if (badges.length === 0) {
        for (let i = 0; i < 3; i++) {
            badges.push(getRandomItem(genre.badges));
        }
    }

    const config = {
        genre: genreName,
        emojis: emojiSet,
        text: text,
        colors: colorScheme,
        badges: badges,
        timestamp: new Date().toISOString()
    };

    const html = generateHTML(config);
    return { html, config };
}

function generateHTML(config) {
    const genre = genres[config.genre];
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta property="og:title" content="${config.text}">
    <meta property="og:type" content="website">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <title>${config.text} - WEBTOYS</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            width: 1200px;
            height: 630px;
            overflow: hidden;
            position: relative;
            background: linear-gradient(135deg, ${config.colors.bg.join(', ')});
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        .grid-bg {
            position: absolute;
            width: 100%;
            height: 100%;
            background-image: 
                linear-gradient(rgba(147, 197, 253, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(147, 197, 253, 0.1) 1px, transparent 1px);
            background-size: 50px 50px;
        }

        .content {
            position: relative;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10;
        }

        .emoji-sequence {
            display: flex;
            gap: 40px;
            margin-bottom: 50px;
            position: relative;
        }

        .emoji-item {
            font-size: 90px;
            position: relative;
            animation: gentleFloat 3s ease-in-out infinite;
            filter: drop-shadow(0 8px 20px rgba(0, 0, 0, 0.1));
        }

        .emoji-item:nth-child(1) { animation-delay: 0s; transform: rotate(-5deg); }
        .emoji-item:nth-child(2) { animation-delay: 0.5s; transform: rotate(3deg); }
        .emoji-item:nth-child(3) { animation-delay: 1s; transform: rotate(-3deg); }
        .emoji-item:nth-child(4) { animation-delay: 1.5s; transform: rotate(5deg); }

        @keyframes gentleFloat {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-15px) scale(1.05); }
        }

        .arrow {
            position: absolute;
            font-size: 40px;
            color: ${config.colors.text[1]};
            opacity: 0.6;
            top: 50%;
            transform: translateY(-50%);
        }

        .arrow:nth-child(2) { left: 130px; }
        .arrow:nth-child(4) { left: 300px; }
        .arrow:nth-child(6) { left: 470px; }

        .main-text {
            font-size: 56px;
            font-weight: 800;
            letter-spacing: -1px;
            text-align: center;
            background: linear-gradient(135deg, ${config.colors.text.join(', ')});
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            position: relative;
            padding: 0 20px;
            filter: drop-shadow(0 4px 12px rgba(59, 130, 246, 0.2));
        }

        .decoration {
            position: absolute;
            border-radius: 50%;
            opacity: 0.2;
        }

        .badge {
            position: absolute;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: white;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .sparkle {
            position: absolute;
            font-size: 24px;
            color: ${config.colors.text[1]};
            animation: sparkleFloat 4s ease-in-out infinite;
        }

        @keyframes sparkleFloat {
            0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.6; }
            50% { transform: scale(1.3) rotate(180deg); opacity: 1; }
        }
    </style>
</head>
<body>
    <div class="grid-bg"></div>
    
    <!-- Decorative circles -->
    <div class="decoration" style="width: 120px; height: 120px; top: 80px; left: 100px; background: linear-gradient(135deg, ${config.colors.text[0]}, ${config.colors.text[1]})"></div>
    <div class="decoration" style="width: 80px; height: 80px; bottom: 100px; right: 150px; background: linear-gradient(135deg, ${config.colors.text[1]}, ${config.colors.text[2 % config.colors.text.length]})"></div>
    <div class="decoration" style="width: 60px; height: 60px; top: 120px; right: 120px; background: linear-gradient(135deg, ${config.colors.text[2 % config.colors.text.length]}, ${config.colors.text[0]})"></div>
    
    <!-- Badges -->
    <div class="badge" style="top: 300px; left: 80px; transform: rotate(-10deg); background: linear-gradient(135deg, ${config.colors.text[0]}, ${config.colors.text[1]})">${config.badges[0]}</div>
    <div class="badge" style="top: 280px; right: 100px; transform: rotate(7deg); background: linear-gradient(135deg, ${config.colors.text[1]}, ${config.colors.text[2 % config.colors.text.length]})">${config.badges[1]}</div>
    <div class="badge" style="bottom: 250px; left: 380px; transform: rotate(-5deg); background: linear-gradient(135deg, ${config.colors.text[2 % config.colors.text.length]}, ${config.colors.text[0]})">${config.badges[2]}</div>
    
    <!-- Sparkles -->
    <div class="sparkle" style="top: 200px; left: 300px; animation-delay: 0s">✨</div>
    <div class="sparkle" style="bottom: 180px; left: 250px; animation-delay: 1s">⭐</div>
    <div class="sparkle" style="top: 250px; right: 280px; animation-delay: 2s">✨</div>
    <div class="sparkle" style="bottom: 200px; right: 350px; animation-delay: 3s">⭐</div>
    
    <!-- Main content -->
    <div class="content">
        <div class="emoji-sequence">
            ${config.emojis.map((emoji, i) => 
                `<span class="emoji-item">${emoji}</span>
                ${i < config.emojis.length - 1 ? '<span class="arrow">→</span>' : ''}`
            ).join('')}
        </div>
        
        <div class="main-text">
            ${config.text}
        </div>
    </div>
</body>
</html>`;
}

function saveFile(filename, content, type = 'html') {
    const dir = path.join(process.cwd(), 'og-images');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, content);
    return filepath;
}

function printConfig(config) {
    console.log(`${colors.cyan}Configuration:${colors.reset}`);
    console.log(`  Genre: ${colors.yellow}${config.genre}${colors.reset}`);
    console.log(`  Emojis: ${config.emojis.join(' → ')}`);
    console.log(`  Text: ${colors.green}${config.text}${colors.reset}`);
    console.log(`  Badges: ${config.badges.join(', ')}`);
}

// CLI commands
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
    case 'generate':
    case 'gen': {
        const genreName = args[1] || 'games';
        const count = parseInt(args[2]) || 1;
        
        console.log(`${colors.bright}🎨 Generating ${count} ${genreName} OG image(s)...${colors.reset}\n`);
        
        for (let i = 0; i < count; i++) {
            const result = generateOGImage(genreName);
            if (result) {
                const filename = `og-${genreName}-${Date.now()}-${i}.html`;
                const filepath = saveFile(filename, result.html);
                
                console.log(`${colors.green}✓${colors.reset} Generated: ${colors.dim}${filepath}${colors.reset}`);
                printConfig(result.config);
                console.log('');
            }
        }
        break;
    }
    
    case 'batch': {
        const count = parseInt(args[1]) || 10;
        console.log(`${colors.bright}📦 Generating batch of ${count} random OG images...${colors.reset}\n`);
        
        const genreKeys = Object.keys(genres);
        const configs = [];
        
        for (let i = 0; i < count; i++) {
            const randomGenre = getRandomItem(genreKeys);
            const result = generateOGImage(randomGenre);
            if (result) {
                const filename = `og-batch-${Date.now()}-${i}.html`;
                const filepath = saveFile(filename, result.html);
                configs.push(result.config);
                
                console.log(`${colors.green}✓${colors.reset} [${i + 1}/${count}] ${genres[randomGenre].name}: ${colors.dim}${filepath}${colors.reset}`);
            }
        }
        
        // Save batch config
        const configPath = saveFile(`batch-config-${Date.now()}.json`, JSON.stringify(configs, null, 2), 'json');
        console.log(`\n${colors.cyan}📄 Batch config saved: ${colors.dim}${configPath}${colors.reset}`);
        break;
    }
    
    case 'all': {
        console.log(`${colors.bright}🌈 Generating all genres...${colors.reset}\n`);
        
        Object.keys(genres).forEach(genreName => {
            const result = generateOGImage(genreName);
            if (result) {
                const filename = `og-${genreName}-showcase.html`;
                const filepath = saveFile(filename, result.html);
                
                console.log(`${colors.green}✓${colors.reset} ${genres[genreName].name}: ${colors.dim}${filepath}${colors.reset}`);
                printConfig(result.config);
                console.log('');
            }
        });
        break;
    }
    
    case 'list': {
        console.log(`${colors.bright}📋 Available Genres:${colors.reset}\n`);
        Object.entries(genres).forEach(([key, genre]) => {
            console.log(`  ${colors.yellow}${key}${colors.reset} - ${genre.name}`);
            console.log(`    Emoji sets: ${genre.emojiSets.length}`);
            console.log(`    Text options: ${genre.texts.length}`);
            console.log(`    Color schemes: ${genre.colorSchemes.length}`);
            console.log('');
        });
        break;
    }
    
    default: {
        console.log(`${colors.bright}🎨 WEBTOYS OG Image Generator${colors.reset}`);
        console.log('\nUsage:');
        console.log(`  ${colors.green}node og-remixer.js generate [genre] [count]${colors.reset}`);
        console.log('    Generate OG images for a specific genre');
        console.log('    Genres: games, webpages, apps, music');
        console.log('');
        console.log(`  ${colors.green}node og-remixer.js batch [count]${colors.reset}`);
        console.log('    Generate a batch of random OG images');
        console.log('');
        console.log(`  ${colors.green}node og-remixer.js all${colors.reset}`);
        console.log('    Generate one image for each genre');
        console.log('');
        console.log(`  ${colors.green}node og-remixer.js list${colors.reset}`);
        console.log('    List all available genres and their options');
        console.log('');
        console.log('Examples:');
        console.log(`  ${colors.dim}node og-remixer.js generate games 5${colors.reset}`);
        console.log(`  ${colors.dim}node og-remixer.js batch 20${colors.reset}`);
        console.log(`  ${colors.dim}node og-remixer.js all${colors.reset}`);
        
        if (command) {
            console.log(`\n${colors.red}Unknown command: ${command}${colors.reset}`);
        }
    }
}