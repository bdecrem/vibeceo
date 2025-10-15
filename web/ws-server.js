const { WebSocketServer } = require('ws');
const WebSocket = require('ws');
const { config } = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
config({ path: path.resolve(__dirname, '.env.local') });

// Port selection priority:
// 1. PORT (Railway's public port when running as dedicated service)
// 2. WS_PORT (explicit WebSocket port for multi-process setup)
// 3. 3001 (default for local development)
const PORT = process.env.PORT || process.env.WS_PORT || 3001;

// Create standalone WebSocket server
const wss = new WebSocketServer({ port: PORT });

console.log('');
console.log('╔════════════════════════════════════════════════╗');
console.log('║        🎤 Realtime Audio WebSocket Server      ║');
console.log('╚════════════════════════════════════════════════╝');
console.log('');
console.log(`📍 Port: ${PORT}`);
console.log(`🎤 WebSocket: ws://localhost:${PORT}`);
console.log(`🔑 OpenAI API Key: ${process.env.OPENAI_API_KEY ? '✓ Configured' : '✗ Missing'}`);
console.log('');

wss.on('connection', (clientWs, req) => {
  console.log('🎤 Client connected to Realtime Audio from:', req.socket.remoteAddress);

  const messageBuffer = [];
  let isOpenAIReady = false;

  // Validate OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found in environment');
    clientWs.close(1008, 'Server configuration error');
    return;
  }

  // Connect to OpenAI Realtime API
  const openaiWs = new WebSocket(
    'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01',
    {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    }
  );

  // Forward messages from client to OpenAI
  clientWs.on('message', (data) => {
    const message = data.toString();

    // Don't log full audio data (too verbose)
    const logMessage = message.length > 200 ? message.substring(0, 200) + '...' : message;
    console.log('📤 Client → OpenAI:', logMessage);

    if (openaiWs.readyState === WebSocket.OPEN) {
      openaiWs.send(message);
    } else {
      console.log('⏳ Buffering message until OpenAI connection ready');
      messageBuffer.push(message);
    }
  });

  // Forward messages from OpenAI to client
  openaiWs.on('message', (data) => {
    const message = data.toString();

    // Log only event types, not full data
    try {
      const parsed = JSON.parse(message);
      if (parsed.type) {
        console.log('📥 OpenAI → Client:', parsed.type);
      }
    } catch (e) {
      // Not JSON, skip logging
    }

    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data);
    }
  });

  // Handle OpenAI connection opened
  openaiWs.on('open', () => {
    console.log('✅ Connected to OpenAI Realtime API');
    isOpenAIReady = true;

    // Send any buffered messages
    if (messageBuffer.length > 0) {
      console.log(`📨 Sending ${messageBuffer.length} buffered messages`);
      messageBuffer.forEach(msg => openaiWs.send(msg));
      messageBuffer.length = 0;
    }
  });

  // Handle OpenAI errors
  openaiWs.on('error', (error) => {
    console.error('❌ OpenAI WebSocket error:', error.message);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(1011, 'OpenAI connection error');
    }
  });

  // Handle OpenAI connection closed
  openaiWs.on('close', (code, reason) => {
    console.log(`🔌 OpenAI connection closed: ${code} ${reason}`);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close();
    }
  });

  // Handle client disconnection
  clientWs.on('close', (code, reason) => {
    console.log(`👋 Client disconnected: ${code} ${reason}`);
    if (openaiWs.readyState === WebSocket.OPEN) {
      // Send cancel message before closing
      try {
        openaiWs.send(JSON.stringify({ type: 'response.cancel' }));
      } catch (e) {
        console.error('Error sending cancel:', e.message);
      }
      setTimeout(() => {
        openaiWs.close();
      }, 100);
    }
  });

  // Handle client errors
  clientWs.on('error', (error) => {
    console.error('❌ Client WebSocket error:', error.message);
  });
});

// Handle server errors
wss.on('error', (error) => {
  console.error('❌ WebSocket Server error:', error);
});

console.log('✅ WebSocket server ready and waiting for connections...');
console.log('');
