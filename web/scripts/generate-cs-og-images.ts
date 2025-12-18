import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Load environment variables
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

async function generateOGImage(variant: 'cs' | 'csx') {
  const userId = process.env.HTMLCSS_USER_ID
  const apiKey = process.env.HTMLCSS_API_KEY

  if (!userId || !apiKey) {
    throw new Error('HTMLCSS_USER_ID and HTMLCSS_API_KEY required in .env.local')
  }

  const subtitle = variant === 'cs' ? 'LINK FEED' : 'LAB'

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          width: 1200px;
          height: 630px;
          background: #000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: 'IBM Plex Mono', monospace;
        }
        .title {
          font-size: 72px;
          font-weight: 500;
          color: #fff;
          letter-spacing: -0.02em;
          display: flex;
          align-items: baseline;
        }
        .asterisk {
          color: #8b8b8b;
          margin-left: 8px;
        }
        .subtitle {
          font-size: 32px;
          font-weight: 400;
          color: #8b8b8b;
          margin-top: 16px;
          letter-spacing: 0.2em;
        }
      </style>
    </head>
    <body>
      <div class="title">
        <span>CTRL SHIFT</span>
        <span class="asterisk">*</span>
      </div>
      <div class="subtitle">${subtitle}</div>
    </body>
    </html>
  `

  const auth = Buffer.from(`${userId}:${apiKey}`).toString('base64')

  console.log(`Generating ${variant} OG image...`)

  const response = await fetch('https://hcti.io/v1/image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`
    },
    body: JSON.stringify({
      html: html,
      viewport_width: 1200,
      viewport_height: 630,
      device_scale_factor: 1,
      google_fonts: 'IBM Plex Mono'
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`HCTI API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  console.log(`Image URL: ${data.url}`)

  // Download the image
  const imageResponse = await fetch(data.url)
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())

  // Save to public folder
  const outputPath = path.join(process.cwd(), 'public', `${variant}-og.png`)
  fs.writeFileSync(outputPath, imageBuffer)
  console.log(`Saved to: ${outputPath}`)

  return data.url
}

async function main() {
  try {
    await generateOGImage('cs')
    await generateOGImage('csx')
    console.log('\nDone! OG images saved to web/public/')
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

main()
