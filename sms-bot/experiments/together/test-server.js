#!/usr/bin/env node

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import qrcode from 'qrcode-terminal';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get local IP address
function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const app = express();
const PORT = 8888; // Different port from your main app
const localIp = getLocalIpAddress();

// Serve static files from the experiments/together directory
app.use(express.static(__dirname));

// List all HTML files
app.get('/', (req, res) => {
    const files = fs.readdirSync(__dirname)
        .filter(file => file.endsWith('.html'))
        .sort((a, b) => {
            // Sort by modification time, newest first
            const statA = fs.statSync(path.join(__dirname, a));
            const statB = fs.statSync(path.join(__dirname, b));
            return statB.mtime - statA.mtime;
        });
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WEBTOYS Test Server</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 {
            color: #333;
            border-bottom: 2px solid #4ecdc4;
            padding-bottom: 10px;
        }
        .info {
            background: #e8f4f8;
            border: 1px solid #4ecdc4;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
        }
        .info code {
            background: #fff;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: monospace;
        }
        .file-list {
            list-style: none;
            padding: 0;
        }
        .file-item {
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            margin: 10px 0;
            padding: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: all 0.2s;
        }
        .file-item:hover {
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transform: translateY(-2px);
        }
        .file-link {
            text-decoration: none;
            color: #333;
            font-weight: 500;
            flex: 1;
        }
        .file-time {
            color: #666;
            font-size: 0.9em;
        }
        .qr-note {
            margin-top: 30px;
            padding: 20px;
            background: #fff;
            border-radius: 8px;
            text-align: center;
            color: #666;
        }
        @media (max-width: 600px) {
            .file-item {
                flex-direction: column;
                align-items: flex-start;
            }
            .file-time {
                margin-top: 5px;
            }
        }
    </style>
</head>
<body>
    <h1>🎮 WEBTOYS Test Server</h1>
    
    <div class="info">
        <strong>Access from your iPhone:</strong><br>
        Make sure your phone is on the same WiFi network, then visit:<br>
        <code>http://${localIp}:${PORT}</code>
    </div>
    
    <h2>Generated Pages (${files.length} total)</h2>
    <ul class="file-list">
        ${files.map(file => {
            const stat = fs.statSync(path.join(__dirname, file));
            const timeAgo = getTimeAgo(stat.mtime);
            return `
                <li class="file-item">
                    <a href="/${file}" class="file-link">${file}</a>
                    <span class="file-time">${timeAgo}</span>
                </li>
            `;
        }).join('')}
    </ul>
    
    <div class="qr-note">
        <p>💡 Tip: Check the terminal for a QR code to scan with your phone!</p>
    </div>
</body>
</html>
    `;
    
    res.send(html);
});

// Helper function to format time ago
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' min ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
    return Math.floor(seconds / 86400) + ' days ago';
}

// Start the server
app.listen(PORT, '0.0.0.0', () => {
    console.log('\n🚀 WEBTOYS Test Server Started!');
    console.log('==================================\n');
    
    console.log(`📱 Local: http://localhost:${PORT}`);
    console.log(`📱 Network: http://${localIp}:${PORT}`);
    console.log('\n📱 Scan this QR code with your iPhone:\n');
    
    // Generate QR code in terminal
    qrcode.generate(`http://${localIp}:${PORT}`, { small: true });
    
    console.log('\n💡 Tips:');
    console.log('- Make sure your iPhone is on the same WiFi network');
    console.log('- Files are served from:', __dirname);
    console.log('- Press Ctrl+C to stop the server\n');
});