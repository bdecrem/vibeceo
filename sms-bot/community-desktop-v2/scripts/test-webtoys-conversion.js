#!/usr/bin/env node

/**
 * Test the Webtoys conversion by creating a simple test app first
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });
if (!process.env.SUPABASE_URL) {
    dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function createTestWebtoysApp() {
    console.log('🎯 Creating a test Webtoys app to convert...');
    
    // Create a simple test app
    const testAppHtml = `<!DOCTYPE html>
<html>
<head>
    <title>Bouncing Ball</title>
    <style>
        body { margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        canvas { border: 2px solid white; background: rgba(255,255,255,0.1); }
    </style>
</head>
<body>
    <h2 style="color: white;">Bouncing Ball Demo</h2>
    <canvas id="canvas" width="400" height="300"></canvas>
    <script>
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        
        let ball = {
            x: 200,
            y: 100,
            vx: 3,
            vy: 2,
            radius: 20
        };
        
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw ball
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#FFD700';
            ctx.fill();
            ctx.strokeStyle = '#FFA500';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Update position
            ball.x += ball.vx;
            ball.y += ball.vy;
            
            // Bounce off walls
            if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
                ball.vx = -ball.vx;
            }
            if (ball.y + ball.radius > canvas.height || ball.y - ball.radius < 0) {
                ball.vy = -ball.vy;
            }
            
            requestAnimationFrame(animate);
        }
        
        animate();
    </script>
</body>
</html>`;
    
    // Save it as a Webtoys app
    const { error } = await supabase
        .from('wtaf_content')
        .upsert({
            user_slug: 'demo',
            app_slug: 'bouncing-ball',
            html_content: testAppHtml,
            original_prompt: 'A simple bouncing ball animation',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
    
    if (error) {
        console.error('Error creating test app:', error);
        return;
    }
    
    console.log('✅ Created test app: demo/bouncing-ball');
    console.log('📍 URL: https://webtoys.ai/demo/bouncing-ball');
    
    // Now convert it
    console.log('\n🔄 Now converting to ToyBox OS...');
    const { default: convertWebtoysApp } = await import('../convert-webtoys-app.js');
    const result = await convertWebtoysApp('bouncing-ball');
    
    if (result.success) {
        console.log('\n🎉 Conversion successful!');
        console.log(`📱 ToyBox app: ${result.toyboxSlug}`);
        console.log(`🏷️ Title: ${result.appTitle}`);
        console.log(`📍 URL: https://webtoys.ai/public/${result.toyboxSlug}`);
    }
}

createTestWebtoysApp();