// Test wrapText function directly

function wrapText(text: string, width: number): string[] {
  if (!text) return [''];

  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const visualLength = testLine.replace(/\x1b\[[0-9;]*m/g, '').length;

    if (visualLength <= width) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}

// Test with actual /short content
const shortText = "The terminal UI experiment is working as expected. Native scrollback should allow you to scroll up through this history using your terminal's built-in mechanisms.";

console.log(`Text length: ${shortText.length}`);
console.log(`Terminal cols: ${process.stdout.columns}`);

const wrapWidth = Math.max(40, (process.stdout.columns || 80) - 4);
console.log(`Wrap width: ${wrapWidth}`);

const lines = wrapText(shortText, wrapWidth);
console.log(`Wrapped into ${lines.length} lines:`);
lines.forEach((line, i) => {
  console.log(`  [${i}] (${line.length} chars): "${line}"`);
});
