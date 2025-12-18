import { readFileSync } from 'fs'
import { join } from 'path'

export const size = {
  width: 128,
  height: 128,
}
export const contentType = 'image/png'

export default function Icon() {
  const imagePath = join(process.cwd(), 'public', 'cs-favicon-trW.png')
  const imageBuffer = readFileSync(imagePath)

  return new Response(imageBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
