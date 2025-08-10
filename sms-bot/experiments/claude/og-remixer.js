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
            { bg: ['#FFD200', '#00D4FF', '#FF00D4'], text: ['#FF0000', '#00FF00', '#8000FF'] },
            { bg: ['#FFCC00', '#FF3333', '#9900FF'], text: ['#00CCCC', '#66FF66', '#FF6666'] },
            { bg: ['#FFEE00', '#FF6666', '#3366FF'], text: ['#FF0099', '#990066', '#000066'] },
            { bg: ['#FFCC00', '#CCCCCC', '#0099FF'], text: ['#6600CC', '#7700FF', '#FF0066'] },
            { bg: ['#FFCC00', '#33CC33', '#FF3399'], text: ['#0066CC', '#6600EE', '#FF3300'] }
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
            { bg: ['#FFF3CC', '#CCF3FF', '#FFCCF3'], text: ['#0066FF', '#FF0066', '#66FF00'] },
            { bg: ['#E6F3FF', '#FFEECC', '#FFCCF0'], text: ['#0055CC', '#CC6600', '#CC0066'] },
            { bg: ['#E0F0FF', '#FFE0E0', '#E0FFE0'], text: ['#003399', '#990000', '#006600'] },
            { bg: ['#FFEECC', '#E6CCFF', '#FFE0E6'], text: ['#996600', '#6600CC', '#CC0033'] },
            { bg: ['#E0FFE6', '#FFE6CC', '#F0E6FF'], text: ['#006633', '#CC3300', '#6600AA'] }
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
            { bg: ['#CCF0FF', '#FFCCCC', '#FFEECC'], text: ['#006699', '#990000', '#CC6600'] },
            { bg: ['#EECCFF', '#FFCCF0', '#CCFFCC'], text: ['#6600CC', '#CC0033', '#006633'] },
            { bg: ['#FFE6F0', '#E6F0FF', '#FFFFCC'], text: ['#CC0033', '#003399', '#996600'] },
            { bg: ['#CCFFCC', '#FFDDCC', '#E0CCFF'], text: ['#006600', '#CC3300', '#6600CC'] },
            { bg: ['#CCFFFF', '#FFCCEE', '#FFEECC'], text: ['#006666', '#CC0066', '#AA6600'] }
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
            { bg: ['#FFCC00', '#AA00FF', '#FF0066'], text: ['#6600CC', '#CC0033', '#0066AA'] },
            { bg: ['#FF3333', '#00AACC', '#FFCC00'], text: ['#6600FF', '#FF0088', '#0066FF'] },
            { bg: ['#6666FF', '#FF0099', '#FFCC66'], text: ['#000066', '#660033', '#663300'] },
            { bg: ['#FF66CC', '#7766FF', '#FFCC00'], text: ['#990066', '#330099', '#996600'] },
            { bg: ['#FF6666', '#6699FF', '#99FF33'], text: ['#660000', '#003366', '#336600'] }
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

function readLogoAsBase64() {
    try {
        const logoPath = path.join(__dirname, 'webtoys-logo.png');
        if (!fs.existsSync(logoPath)) {
            console.warn(`${colors.yellow}Warning: Logo file not found at ${logoPath}, using fallback text${colors.reset}`);
            return null;
        }
        const logoBuffer = fs.readFileSync(logoPath);
        return `data:image/png;base64,${logoBuffer.toString('base64')}`;
    } catch (error) {
        console.warn(`${colors.yellow}Warning: Failed to read logo file, using fallback text: ${error.message}${colors.reset}`);
        return null;
    }
}

function generateHTML(config) {
    const genre = genres[config.genre];
    const logoBase64 = readLogoAsBase64();
    
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
            z-index: 10;
        }

        .webtoys-logo {
            position: absolute;
            bottom: 20px;
            right: 20px;
            width: 200px;
            height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .logo-burst {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 220px;
            height: 220px;
            background: radial-gradient(circle at center,
                rgba(255, 255, 200, 0.4) 0%,
                rgba(255, 235, 0, 0.3) 25%,
                rgba(255, 235, 0, 0.15) 50%,
                transparent 75%
            );
            border-radius: 50%;
            z-index: -1;
            opacity: 0.85;
        }

        .glow-core {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 180px;
            height: 180px;
            background: radial-gradient(circle,
                rgba(255, 255, 255, 0.3) 0%,
                rgba(255, 255, 200, 0.2) 40%,
                transparent 70%
            );
            border-radius: 50%;
            z-index: -1;
        }

        .logo-image {
            position: relative;
            width: 170px;
            height: 170px;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
        }

        .logo-image img {
            width: 170px;
            height: 170px;
            object-fit: contain;
            filter: drop-shadow(0 0 20px rgba(255, 235, 0, 0.4)) 
                    drop-shadow(0 0 10px rgba(255, 255, 255, 0.3))
                    saturate(1.1) contrast(1.1);
        }

        .logo-image .fallback-text {
            font-size: 64px;
            font-weight: 900;
            color: #FFD63D;
            text-shadow: 0 0 20px rgba(255, 235, 0, 0.4), 0 0 10px rgba(255, 255, 255, 0.3);
        }

        .crack-lines {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 200px;
            height: 200px;
            z-index: -2;
            overflow: hidden;
        }

        .crack {
            position: absolute;
            background: linear-gradient(var(--angle, 45deg), 
                transparent 0%, 
                rgba(255, 255, 255, 0.1) 50%, 
                transparent 100%);
            transform-origin: center;
        }

        .crack:nth-child(1) { width: 1px; height: 120px; top: 10%; left: 50%; transform: translateX(-50%) rotate(45deg); }
        .crack:nth-child(2) { width: 1px; height: 100px; top: 15%; right: 15%; transform: rotate(-30deg); }
        .crack:nth-child(3) { width: 1px; height: 90px; bottom: 15%; left: 20%; transform: rotate(120deg); }
        .crack:nth-child(4) { width: 1px; height: 110px; bottom: 10%; right: 25%; transform: rotate(-60deg); }

        .emoji-sequence {
            position: absolute;
            top: 60px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 35px;
        }

        .emoji-item {
            font-size: 117px;
            position: relative;
            filter: drop-shadow(0 8px 20px rgba(0, 0, 0, 0.1));
        }

        .emoji-item:nth-child(1) { transform: rotate(-5deg); }
        .emoji-item:nth-child(2) { transform: rotate(3deg); }
        .emoji-item:nth-child(3) { transform: rotate(-3deg); }
        .emoji-item:nth-child(4) { transform: rotate(5deg); }

        .arrow {
            position: absolute;
            font-size: 52px;
            color: ${config.colors.text[1]};
            opacity: 0.6;
            top: 50%;
            transform: translateY(-50%);
        }

        .arrow:nth-child(2) { left: 150px; }
        .arrow:nth-child(4) { left: 320px; }
        .arrow:nth-child(6) { left: 490px; }

        .main-text {
            position: absolute;
            top: 280px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 84px;
            font-weight: 800;
            letter-spacing: -1px;
            text-align: center;
            max-width: 900px;
            background: linear-gradient(135deg, ${config.colors.text.join(', ')});
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
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
            opacity: 0.8;
            transform: scale(1.1);
        }
    </style>
</head>
<body>
    <div class="grid-bg"></div>
    
    <!-- Decorative circles -->
    <div class="decoration" style="width: 120px; height: 120px; top: 80px; left: 100px; background: linear-gradient(135deg, ${config.colors.text[0]}, ${config.colors.text[1]})"></div>
    <div class="decoration" style="width: 80px; height: 80px; bottom: 100px; right: 150px; background: linear-gradient(135deg, ${config.colors.text[1]}, ${config.colors.text[2 % config.colors.text.length]})"></div>
    <div class="decoration" style="width: 60px; height: 60px; top: 120px; right: 120px; background: linear-gradient(135deg, ${config.colors.text[2 % config.colors.text.length]}, ${config.colors.text[0]})"></div>
    
    <!-- Badges positioned in zones -->
    <div class="badge" style="top: 200px; left: 50px; transform: rotate(-10deg); background: linear-gradient(135deg, ${config.colors.text[0]}, ${config.colors.text[1]})">${config.badges[0]}</div>
    <div class="badge" style="top: 180px; right: 80px; transform: rotate(7deg); background: linear-gradient(135deg, ${config.colors.text[1]}, ${config.colors.text[2 % config.colors.text.length]})">${config.badges[1]}</div>
    <div class="badge" style="bottom: 180px; left: 100px; transform: rotate(-5deg); background: linear-gradient(135deg, ${config.colors.text[2 % config.colors.text.length]}, ${config.colors.text[0]})">${config.badges[2]}</div>
    
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

        <!-- WEBTOYS Logo -->
        <div class="webtoys-logo">
            <div class="logo-burst"></div>
            <div class="glow-core"></div>
            <div class="crack-lines">
                <div class="crack"></div>
                <div class="crack"></div>
                <div class="crack"></div>
                <div class="crack"></div>
            </div>
            <div class="logo-image">
                ${logoBase64 ? 
                    `<img src="${logoBase64}" alt="WEBTOYS Logo" />` : 
                    `<div class="fallback-text">WT</div>`
                }
            </div>
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