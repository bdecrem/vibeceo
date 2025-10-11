// Simplified Next.js server - WebSocket on separate port (ws-server.js)
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  server.listen(port, '0.0.0.0', (err) => {
    if (err) throw err;

    console.log('');
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║          🚀 Vibeceo Next.js Server             ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log('');
    console.log(`📍 Environment: ${dev ? 'DEVELOPMENT' : 'PRODUCTION'}`);
    console.log(`🌐 Web server: http://localhost:${port}`);
    console.log('');
    console.log('📦 Key routes:');
    console.log('   • Music Player: http://localhost:' + port + '/music-player');
    console.log('   • API Health: http://localhost:' + port + '/api/health');
    console.log('');
    console.log('💡 WebSocket server runs separately on port 3001');
    console.log('   Start with: node ws-server.js');
    console.log('');
  });
});
