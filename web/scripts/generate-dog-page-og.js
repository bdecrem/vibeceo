const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

// HTMLCSStoImage credentials
const HTMLCSS_USER_ID = process.env.HTMLCSS_USER_ID;
const HTMLCSS_API_KEY = process.env.HTMLCSS_API_KEY;

if (!HTMLCSS_USER_ID || !HTMLCSS_API_KEY) {
  console.error('❌ Missing HTMLCSStoImage credentials in .env.local');
  process.exit(1);
}

// Create OG template that shows what the user actually CREATED - a luxury pet portrait page
function createDogPageOGTemplate() {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700;900&family=Inter:wght@300;400;500;600&display=swap');
      
      body {
        margin: 0;
        font-family: 'Inter', sans-serif;
        width: 1200px;
        height: 630px;
        background: linear-gradient(
          45deg,
          #ffd6a5,
          #ffb4a2,
          #e7c6ff,
          #b5deff
        );
        background-size: 400% 400%;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;
        padding: 40px;
        box-sizing: border-box;
      }
      
      .glass-card {
        background: rgba(255, 255, 255, 0.25);
        backdrop-filter: blur(15px);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 30px;
        padding: 40px;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        max-width: 900px;
        width: 100%;
      }
      
      .title {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 3.5rem;
        font-weight: 700;
        letter-spacing: -1px;
        margin-bottom: 30px;
        color: #2d3436;
        line-height: 1.1;
      }
      
      .dog-placeholder {
        width: 400px;
        height: 250px;
        background: linear-gradient(135deg, #ff9a9e, #fecfef, #fecfef);
        border-radius: 20px;
        margin: 20px auto 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 4rem;
        border: 3px solid rgba(255, 255, 255, 0.5);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
      }
      
      .subtitle {
        font-size: 1.2rem;
        color: #636e72;
        margin-bottom: 20px;
        font-weight: 500;
      }
      
      .url {
        font-family: monospace;
        font-size: 0.9rem;
        color: #74b9ff;
        background: rgba(255, 255, 255, 0.4);
        padding: 8px 16px;
        border-radius: 12px;
        display: inline-block;
        border: 1px solid rgba(255, 255, 255, 0.5);
      }
      
      .floating-emoji {
        position: absolute;
        font-size: 2.5rem;
        opacity: 0.6;
        animation: float 6s ease-in-out infinite;
      }
      
      @keyframes float {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-15px) rotate(5deg); }
      }
      
      #emoji1 { top: 8%; left: 8%; animation-delay: 0s; }
      #emoji2 { top: 15%; right: 12%; animation-delay: 2s; }
      #emoji3 { bottom: 15%; left: 10%; animation-delay: 1s; }
      #emoji4 { bottom: 8%; right: 8%; animation-delay: 3s; }
    </style>
  </head>
  <body>
    <div class="floating-emoji" id="emoji1">🐕</div>
    <div class="floating-emoji" id="emoji2">🌸</div>
    <div class="floating-emoji" id="emoji3">✨</div>
    <div class="floating-emoji" id="emoji4">🎨</div>
    
    <div class="glass-card">
      <h1 class="title">Luxury Pet Portraits</h1>
      
      <div class="dog-placeholder">
        🐕‍🦺
      </div>
      
      <div class="subtitle">
        Gorgeous pictures of our furry friends
      </div>
      
      <div class="url">
        wtaf.me/bart/pearl-whale-swimming
      </div>
    </div>
  </body>
  </html>`;
}

async function generateDogPageOG() {
  try {
    console.log('🎨 Generating Dog Page OG preview...');
    
    const ogHTML = createDogPageOGTemplate();
    const auth = Buffer.from(`${HTMLCSS_USER_ID}:${HTMLCSS_API_KEY}`).toString('base64');
    
    const imageResponse = await fetch('https://hcti.io/v1/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        html: ogHTML,
        viewport_width: 1200,
        viewport_height: 630,
        device_scale_factor: 1
      })
    });
    
    if (!imageResponse.ok) {
      throw new Error(`HTMLCSStoImage failed: ${imageResponse.status}`);
    }
    
    const imageData = await imageResponse.json();
    
    console.log('✅ Dog page preview generated successfully!');
    console.log('🔗 Image URL:', imageData.url);
    console.log('');
    console.log('🐕 This shows what the user actually CREATED:');
    console.log('   - Pastel gradient background');
    console.log('   - Glass card effects');
    console.log('   - "Luxury Pet Portraits" theme');
    console.log('   - Dog imagery and styling');
    console.log('');
    console.log('📋 Copy this URL to replace in the landing page:');
    console.log(`"${imageData.url}"`);
    
    return imageData.url;
    
  } catch (error) {
    console.error('❌ Error generating OG image:', error);
    throw error;
  }
}

// Run the generation
generateDogPageOG().catch(console.error);
