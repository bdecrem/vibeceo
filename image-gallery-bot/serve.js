const express = require('express');
const path = require('path');
const fs = require('fs-extra');

const app = express();
const PORT = 3000;

// Serve static files from galleries directory
app.use('/galleries', express.static(path.join(__dirname, 'galleries')));
app.use('/images', express.static(path.join(__dirname, 'images')));

// Home page redirects to gallery index
app.get('/', (req, res) => {
  res.redirect('/galleries/index.html');
});

// Start server
app.listen(PORT, () => {
  console.log(`🎨 Image Gallery Server running at http://localhost:${PORT}`);
  console.log(`📁 Serving galleries from: ${path.join(__dirname, 'galleries')}`);
  console.log(`\nOpen http://localhost:${PORT} in your browser to view galleries`);
});