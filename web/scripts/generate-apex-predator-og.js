const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

// HTMLCSStoImage credentials
const HTMLCSS_USER_ID = process.env.HTMLCSS_USER_ID;
const HTMLCSS_API_KEY = process.env.HTMLCSS_API_KEY;

if (!HTMLCSS_USER_ID || !HTMLCSS_API_KEY) {
  console.error('❌ Missing HTMLCSStoImage credentials in .env.local');
  process.exit(1);
}

// Create OG template that looks like the actual page - bright red testimonial theme
function createApexPredatorOGTemplate() {
  return `
  <div style="
    width: 1200px;
    height: 630px;
    background: linear-gradient(135deg, #dc2626, #b91c1c, #991b1b, #7f1d1d);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    padding: 80px;
    box-sizing: border-box;
    text-align: center;
    position: relative;
    overflow: hidden;
  ">
    <!-- Background pattern -->
    <div style="
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: radial-gradient(circle at 20% 20%, rgba(255,255,255,0.1) 1px, transparent 1px),
                        radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1) 1px, transparent 1px);
      background-size: 50px 50px;
    "></div>
    
    <!-- Main content -->
    <div style="
      background: rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 60px;
      max-width: 900px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      position: relative;
      z-index: 1;
    ">
      <!-- WTAF branding -->
      <div style="
        font-size: 32px;
        font-weight: bold;
        margin-bottom: 20px;
        text-shadow: 0 2px 4px rgba(0,0,0,0.5);
        color: #fbbf24;
      ">
        WTAF.me
      </div>
      
      <!-- Main title -->
      <div style="
        font-size: 56px;
        font-weight: 900;
        line-height: 1.1;
        margin-bottom: 30px;
        text-shadow: 0 4px 8px rgba(0,0,0,0.5);
        letter-spacing: -1px;
        text-transform: uppercase;
      ">
        BART DECREM<br/>
        <span style="color: #fbbf24;">APEX PREDATOR</span>
      </div>
      
      <!-- Testimonial style quote -->
      <div style="
        font-size: 24px;
        font-style: italic;
        opacity: 0.9;
        margin-bottom: 30px;
        line-height: 1.3;
        border-left: 4px solid #fbbf24;
        padding-left: 20px;
        text-align: left;
        max-width: 600px;
      ">
        "The most ruthless developer in Silicon Valley. When Bart codes, competitors flee."
      </div>
      
      <!-- Subtitle -->
      <div style="
        font-size: 18px;
        opacity: 0.8;
        margin-bottom: 20px;
        color: #fbbf24;
      ">
        Testimonial • Vibecoded via SMS
      </div>
      
      <!-- URL -->
      <div style="
        font-size: 16px;
        opacity: 0.7;
        font-family: monospace;
        background: rgba(0,0,0,0.3);
        padding: 8px 16px;
        border-radius: 8px;
        display: inline-block;
      ">
        wtaf.me/bart/silver-tiger-building
      </div>
    </div>
    
    <!-- Decorative elements -->
    <div style="
      position: absolute;
      top: 50px;
      right: 50px;
      font-size: 80px;
      opacity: 0.1;
      transform: rotate(15deg);
    ">🦅</div>
    
    <div style="
      position: absolute;
      bottom: 50px;
      left: 50px;
      font-size: 60px;
      opacity: 0.1;
      transform: rotate(-15deg);
    ">🔥</div>
  </div>`;
}

async function generateApexPredatorOG() {
  try {
    console.log('🎨 Generating Apex Predator OG image...');
    
    const ogHTML = createApexPredatorOGTemplate();
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
    
    console.log('✅ Apex Predator OG image generated successfully!');
    console.log('🔗 Image URL:', imageData.url);
    console.log('');
    console.log('📋 Copy this URL to replace the hardcoded image in the landing page:');
    console.log(`"${imageData.url}"`);
    
    return imageData.url;
    
  } catch (error) {
    console.error('❌ Error generating OG image:', error);
    throw error;
  }
}

// Run the generation
generateApexPredatorOG().catch(console.error);
