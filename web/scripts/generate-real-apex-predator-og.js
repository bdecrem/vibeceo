const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

// HTMLCSStoImage credentials
const HTMLCSS_USER_ID = process.env.HTMLCSS_USER_ID;
const HTMLCSS_API_KEY = process.env.HTMLCSS_API_KEY;

if (!HTMLCSS_USER_ID || !HTMLCSS_API_KEY) {
  console.error('❌ Missing HTMLCSStoImage credentials in .env.local');
  process.exit(1);
}

// Create OG template that shows what the user actually CREATED - a bright red testimonial page
function createRealApexPredatorOGTemplate() {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700;900&family=Inter:wght@300;400;500;600&display=swap');
      
      :root {
        --gradient-start: #FF0000;
        --gradient-mid: #FF4D4D;
        --gradient-end: #800000;
      }
      
      body {
        margin: 0;
        font-family: 'Inter', sans-serif;
        background: linear-gradient(-45deg, var(--gradient-start), var(--gradient-mid), var(--gradient-end), #2B0000);
        background-size: 400% 400%;
        width: 1200px;
        height: 630px;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;
      }
      
      .floating-element {
        position: absolute;
        font-size: 2rem;
        opacity: 0.6;
        animation: float 6s ease-in-out infinite;
      }
      
      #emoji1 { top: 10%; left: 10%; }
      #emoji2 { top: 20%; right: 15%; }
      #emoji3 { bottom: 20%; left: 15%; }
      #emoji4 { bottom: 15%; right: 10%; }
      
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-20px); }
      }
      
      .container {
        max-width: 800px;
        text-align: center;
        padding: 40px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 20px;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .main-title {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 4rem;
        font-weight: 900;
        margin-bottom: 30px;
        text-shadow: 0 4px 8px rgba(0,0,0,0.5);
        letter-spacing: -2px;
        line-height: 1.1;
      }
      
      .testimonial {
        font-size: 1.5rem;
        font-style: italic;
        margin-bottom: 30px;
        opacity: 0.9;
        line-height: 1.4;
      }
      
      .subtitle {
        font-size: 1.2rem;
        opacity: 0.8;
        margin-bottom: 20px;
      }
      
      .url {
        font-family: monospace;
        font-size: 0.9rem;
        opacity: 0.7;
        background: rgba(255, 255, 255, 0.1);
        padding: 8px 16px;
        border-radius: 8px;
        display: inline-block;
      }
    </style>
  </head>
  <body>
    <div class="floating-element" id="emoji1">🦅</div>
    <div class="floating-element" id="emoji2">⚡</div>
    <div class="floating-element" id="emoji3">🔥</div>
    <div class="floating-element" id="emoji4">💻</div>
    
    <div class="container">
      <h1 class="main-title">BART DECREM<br/>APEX PREDATOR</h1>
      
      <div class="testimonial">
        "The most ruthless developer in Silicon Valley.<br/>
        When Bart codes, competitors flee."
      </div>
      
      <div class="subtitle">
        Digital Apex Predator | Testimonial
      </div>
      
      <div class="url">
        wtaf.me/bart/silver-tiger-building
      </div>
    </div>
  </body>
  </html>`;
}

async function generateRealApexPredatorOG() {
  try {
    console.log('🎨 Generating REAL Apex Predator page preview...');
    
    const ogHTML = createRealApexPredatorOGTemplate();
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
    
    console.log('✅ Real Apex Predator page preview generated successfully!');
    console.log('🔗 Image URL:', imageData.url);
    console.log('');
    console.log('📋 This shows what the user actually CREATED with their prompt:');
    console.log('   "a bright red testimonial web page for Bart Decrem referring to him as an apex predator"');
    console.log('');
    console.log('🎯 Copy this URL to replace the hardcoded image:');
    console.log(`"${imageData.url}"`);
    
    return imageData.url;
    
  } catch (error) {
    console.error('❌ Error generating OG image:', error);
    throw error;
  }
}

// Run the generation
generateRealApexPredatorOG().catch(console.error);
