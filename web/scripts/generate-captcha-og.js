const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const width = 1200;
const height = 630;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Background
ctx.fillStyle = '#0D0D0D';
ctx.fillRect(0, 0, width, height);

// Container with teal border
const containerWidth = 700;
const containerHeight = 500;
const containerX = (width - containerWidth) / 2;
const containerY = (height - containerHeight) / 2;

ctx.fillStyle = '#000';
ctx.fillRect(containerX, containerY, containerWidth, containerHeight);
ctx.strokeStyle = '#2D9596';
ctx.lineWidth = 3;
ctx.strokeRect(containerX, containerY, containerWidth, containerHeight);

// Header with checkmark
ctx.fillStyle = '#D4A574';
ctx.fillRect(containerX + 30, containerY + 30, 30, 30);
ctx.fillStyle = '#999';
ctx.font = 'bold 18px monospace';
ctx.fillText('Security Check', containerX + 75, containerY + 52);

// Horizontal line
ctx.strokeStyle = '#2D9596';
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(containerX + 30, containerY + 80);
ctx.lineTo(containerX + containerWidth - 30, containerY + 80);
ctx.stroke();

// Prompt text
ctx.fillStyle = '#FFD700';
ctx.font = 'bold 22px monospace';
ctx.fillText('Select all squares with', containerX + 30, containerY + 130);
ctx.fillText('EXISTENTIAL DREAD', containerX + 30, containerY + 160);

// 3x3 grid
const gridSize = 3;
const tileSize = 80;
const gridGap = 12;
const gridStartX = containerX + (containerWidth - (tileSize * gridSize + gridGap * (gridSize - 1))) / 2;
const gridStartY = containerY + 200;

for (let row = 0; row < gridSize; row++) {
  for (let col = 0; col < gridSize; col++) {
    const x = gridStartX + col * (tileSize + gridGap);
    const y = gridStartY + row * (tileSize + gridGap);
    
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y, tileSize, tileSize);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, tileSize, tileSize);
  }
}

// Verify button
const buttonY = gridStartY + gridSize * (tileSize + gridGap) + 30;
ctx.fillStyle = '#D4A574';
ctx.fillRect(containerX + 30, buttonY, containerWidth - 60, 50);
ctx.fillStyle = '#000';
ctx.font = 'bold 20px monospace';
ctx.textAlign = 'center';
ctx.fillText('VERIFY', containerX + containerWidth / 2, buttonY + 32);

// Save
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(path.join(__dirname, '../public/amber/captcha-og.png'), buffer);
console.log('OG image created');
