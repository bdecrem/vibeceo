/**
 * Text overlay for images using sharp.
 */

import sharp from 'sharp';

export interface OverlayOptions {
  text: string;
  fontSize?: number;       // As percentage of image width (default: 7)
  position?: 'center' | 'bottom' | 'safe-zone';  // safe-zone = bottom 25% of frame
  color?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

export async function overlayText(
  imageBuffer: Buffer,
  options: OverlayOptions
): Promise<Buffer> {
  const {
    text,
    fontSize: fontSizePct = 7,
    position = 'safe-zone',  // Default to safe-zone (bottom 25%)
    color = 'white',
    strokeColor = 'black',
    strokeWidth = 3,
  } = options;

  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const width = metadata.width || 1024;
  const height = metadata.height || 1536;

  const fontSize = Math.floor(width * (fontSizePct / 100));
  const lineHeight = fontSize * 1.3;

  // Word wrap
  const lines = wordWrap(text, 22);

  // Calculate Y position
  const totalTextHeight = lines.length * lineHeight;
  let startY: number;

  if (position === 'safe-zone') {
    // Center text within bottom 25% of frame
    const safeZoneTop = height * 0.75;
    const safeZoneHeight = height * 0.25;
    startY = safeZoneTop + (safeZoneHeight - totalTextHeight) / 2 + fontSize * 0.5;
  } else if (position === 'bottom') {
    startY = height - totalTextHeight - fontSize;
  } else {
    startY = (height - totalTextHeight) / 2 + fontSize;
  }

  // Build SVG
  const textElements = lines.map((line, i) => {
    const y = startY + (i * lineHeight);
    const escaped = escapeXml(line);
    return `<text x="50%" y="${y}" text-anchor="middle"
      font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="bold"
      fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}" paint-order="stroke fill">${escaped}</text>`;
  }).join('\n');

  const svgOverlay = `<svg width="${width}" height="${height}">${textElements}</svg>`;

  return image
    .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
    .png()
    .toBuffer();
}

function wordWrap(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length > maxCharsPerLine) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine = (currentLine + ' ' + word).trim();
    }
  }
  if (currentLine) lines.push(currentLine.trim());

  return lines;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
