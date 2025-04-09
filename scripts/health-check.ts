import http from 'http';
import { client } from '../lib/discord/bot.js';

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    // Check Discord client status
    const isClientReady = client.isReady();
    
    if (isClientReady) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'healthy',
        discord: 'connected',
        uptime: process.uptime()
      }));
    } else {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'unhealthy',
        discord: 'disconnected',
        uptime: process.uptime()
      }));
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});

const PORT = process.env.HEALTH_CHECK_PORT || 3001;
server.listen(PORT, () => {
  console.log(`Health check server listening on port ${PORT}`);
}); 