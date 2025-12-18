import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Load environment variables
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

async function generateFavicon() {
  const userId = process.env.HTMLCSS_USER_ID
  const apiKey = process.env.HTMLCSS_API_KEY

  if (!userId || !apiKey) {
    throw new Error('HTMLCSS_USER_ID and HTMLCSS_API_KEY required in .env.local')
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          width: 128px;
          height: 128px;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'IBM Plex Mono', monospace;
        }
        .asterisk {
          font-size: 96px;
          font-weight: 500;
          color: #8b8b8b;
          line-height: 1;
        }
      </style>
    </head>
    <body>
      <span class="asterisk">*</span>
    </body>
    </html>
  `

  const auth = Buffer.from(`${userId}:${apiKey}`).toString('base64')

  console.log('Generating favicon...')

  const response = await fetch('https://hcti.io/v1/image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`
    },
    body: JSON.stringify({
      html: html,
      viewport_width: 128,
      viewport_height: 128,
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
  const outputPath = path.join(process.cwd(), 'public', 'cs-favicon.png')
  fs.writeFileSync(outputPath, imageBuffer)
  console.log(`Saved to: ${outputPath}`)

  return data.url
}

async function main() {
  try {
    await generateFavicon()
    console.log('\nDone! Favicon saved to web/public/cs-favicon.png')
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

main()
