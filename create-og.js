const { createCanvas } = require('canvas');
const fs = require('fs');

const width = 1200;
const height = 630;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Black background
ctx.fillStyle = '#000000';
ctx.fillRect(0, 0, width, height);

// Teal grid
ctx.strokeStyle = 'rgba(45, 149, 150, 0.08)';
ctx.lineWidth = 1;
const gridSize = 40;

for (let x = 0; x < width; x += gridSize) {
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, height);
  ctx.stroke();
}

for (let y = 0; y < height; y += gridSize) {
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(width, y);
  ctx.stroke();
}

// Concentric circles
const centerX = width / 2;
const centerY = height / 2;

// Outer amber circle
ctx.strokeStyle = 'rgba(212, 165, 116, 0.3)';
ctx.lineWidth = 3;
ctx.beginPath();
ctx.arc(centerX, centerY, 200, 0, Math.PI * 2);
ctx.stroke();

// Inner amber circle
ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
ctx.lineWidth = 3;
ctx.beginPath();
ctx.arc(centerX, centerY, 150, 0, Math.PI * 2);
ctx.stroke();

// Teal ring
ctx.strokeStyle = 'rgba(45, 149, 150, 0.6)';
ctx.lineWidth = 2;
ctx.beginPath();
ctx.arc(centerX, centerY, 250, 0, Math.PI * 2);
ctx.stroke();

// Title
ctx.fillStyle = '#D4A574';
ctx.font = 'bold 80px monospace';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('BASEMENT PULSE', centerX, centerY - 40);

// Subtitle
ctx.fillStyle = '#2D9596';
ctx.font = '32px monospace';
ctx.fillText('128 BPM • TR-909 × TB-303', centerX, centerY + 40);

// Save
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('web/public/amber/basement-pulse-og.png', buffer);
console.log('OG image created successfully');
