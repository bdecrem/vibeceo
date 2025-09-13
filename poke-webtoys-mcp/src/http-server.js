#!/usr/bin/env node

import express from 'express';
import dotenv from 'dotenv';
import { buildWebtoysApp } from './webtoys-client.js';

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3456;

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'webtoys-builder-mcp',
    version: '1.0.0',
    status: 'running',
    description: 'MCP server for building Webtoys apps through Poke SMS'
  });
});

// MCP tools endpoint
app.get('/tools', (req, res) => {
  res.json({
    tools: [
      {
        name: 'build_webtoys_app',
        description: 'Build a Webtoys app by describing what you want. Supports apps, games, memes, music players, voting systems, and more.',
        inputSchema: {
          type: 'object',
          properties: {
            description: {
              type: 'string',
              description: 'Description of the app to build'
            },
            user_id: {
              type: 'string',
              description: 'Optional unique identifier for the user'
            }
          },
          required: ['description']
        }
      }
    ]
  });
});

// Tool execution endpoint
app.post('/tool/call', async (req, res) => {
  const { tool, arguments: args } = req.body;

  if (tool !== 'build_webtoys_app') {
    return res.status(400).json({
      error: `Unknown tool: ${tool}`
    });
  }

  const { description, user_id } = args || {};

  if (!description) {
    return res.status(400).json({
      error: 'Description is required'
    });
  }

  try {
    console.log(`[HTTP] Processing request: "${description}" for user: ${user_id || 'anonymous'}`);

    const result = await buildWebtoysApp(description, user_id);

    if (result.success) {
      let responseText = `✨ Your Webtoys app is ready!\n\n`;
      responseText += `🔗 ${result.appUrl}\n\n`;

      if (result.appType) {
        responseText += `Type: ${result.appType}\n`;
      }

      if (result.adminUrl) {
        responseText += `📊 Admin panel: ${result.adminUrl}\n\n`;
      }

      responseText += `Description: ${description}\n\n`;
      responseText += `Text me anytime to build another app!`;

      res.json({
        content: [{
          type: 'text',
          text: responseText
        }]
      });
    } else {
      res.status(500).json({
        error: result.error
      });
    }
  } catch (error) {
    console.error('[HTTP] Error:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

// Start server - bind to 0.0.0.0 for Railway/Docker compatibility
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🚀 Webtoys MCP HTTP Server running on ${HOST}:${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/`);
  console.log(`🔧 Tools list: http://localhost:${PORT}/tools`);
  console.log(`⚡ Tool call: POST http://localhost:${PORT}/tool/call`);
});