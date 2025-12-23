import { readFileSync } from 'fs'
import { join } from 'path'

export const alt = 'CTRL SHIFT • LONG HORIZON LAB'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default function Image() {
  const imagePath = join(process.cwd(), 'public', 'csx-og.png')
  const imageBuffer = readFileSync(imagePath)

  return new Response(imageBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
