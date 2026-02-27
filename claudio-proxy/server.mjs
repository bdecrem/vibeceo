import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';

const GATEWAY = 'http://127.0.0.1:18789';
const PORT = 18790;
const OPENCLAW_HOME = path.join(process.env.HOME, '.openclaw');

// Read agent config and build /api/agents response
function getAgents() {
  const configPath = path.join(OPENCLAW_HOME, 'openclaw.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const agentsDir = path.join(OPENCLAW_HOME, 'agents');
  
  const agents = [];
  
  // Main agent
  const mainIdentity = readIdentity(path.join(OPENCLAW_HOME, 'workspace', 'IDENTITY.md'));
  agents.push({
    id: 'main',
    name: mainIdentity.name || 'Main',
    emoji: mainIdentity.emoji || '🤖',
    model: config.models?.default || 'anthropic/claude-opus-4-6',
    isDefault: true,
  });

  // Other agents
  if (fs.existsSync(agentsDir)) {
    for (const dir of fs.readdirSync(agentsDir)) {
      const agentPath = path.join(agentsDir, dir);
      if (!fs.statSync(agentPath).isDirectory()) continue;
      // Skip 'main' — already added above
      if (dir === 'main') continue;
      
      // Check workspace or agent dir for IDENTITY.md
      const identity = readIdentity(path.join(agentPath, 'workspace', 'IDENTITY.md'))
        || readIdentity(path.join(agentPath, 'agent', 'IDENTITY.md'))
        || {};
      
      // Skip agents with placeholder/unconfigured names
      if (!identity || !identity.name || identity.name.includes('pick something') || identity.name.includes('*(')) continue;

      agents.push({
        id: dir,
        name: identity.name,
        emoji: identity.emoji && !identity.emoji.includes('pick') ? identity.emoji : '🤖',
        model: config.models?.default || 'anthropic/claude-opus-4-6',
        isDefault: false,
      });
    }
  }

  return agents;
}

function readIdentity(filepath) {
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    const name = content.match(/\*\*Name:\*\*\s*(.+)/)?.[1]?.trim();
    const emoji = content.match(/\*\*Emoji:\*\*\s*(.+)/)?.[1]?.trim();
    return { name, emoji };
  } catch {
    return null;
  }
}

// Proxy request to gateway
function proxyToGateway(req, res) {
  const url = new URL(req.url, GATEWAY);
  
  const proxyReq = http.request(url, {
    method: req.method,
    headers: { ...req.headers, host: url.host },
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (e) => {
    res.writeHead(502);
    res.end(JSON.stringify({ error: 'Gateway unavailable' }));
  });

  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-openclaw-agent-id, x-openclaw-session-key');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // /api/agents — return agent list
  if (req.url === '/api/agents' && req.method === 'GET') {
    try {
      const agents = getAgents();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ agents }));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to read agents', detail: e.message }));
    }
    return;
  }

  // Everything else → proxy to gateway
  proxyToGateway(req, res);
});

server.listen(PORT, () => {
  console.log(`Claudio proxy listening on port ${PORT}`);
  console.log(`Proxying to gateway at ${GATEWAY}`);
  console.log(`/api/agents endpoint active`);
});
