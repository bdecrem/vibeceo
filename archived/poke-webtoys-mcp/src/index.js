#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { buildWebtoysApp } from './webtoys-client.js';

// Load environment variables
dotenv.config();

// Create MCP server instance
const server = new Server(
  {
    name: 'webtoys-builder-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define the build_webtoys_app tool
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'build_webtoys_app',
        description: 'Build a Webtoys app by describing what you want. Supports apps, games, memes, music players, voting systems, and more.',
        inputSchema: {
          type: 'object',
          properties: {
            description: {
              type: 'string',
              description: 'Description of the app to build (e.g., "todo list app", "snake game", "meme about coding", "voting app for lunch choices")',
            },
            user_id: {
              type: 'string',
              description: 'Optional unique identifier for the user making the request',
            },
          },
          required: ['description'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'build_webtoys_app') {
    const { description, user_id } = request.params.arguments || {};

    if (!description) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: Description is required. Please provide a description of what you want to build.',
          },
        ],
      };
    }

    try {
      console.error(`[MCP] Processing request: "${description}" for user: ${user_id || 'anonymous'}`);

      // Call the Webtoys API
      const result = await buildWebtoysApp(description, user_id);

      if (result.success) {
        // Format successful response
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

        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
          ],
        };
      } else {
        // Handle errors
        return {
          content: [
            {
              type: 'text',
              text: `❌ Failed to create app: ${result.error}\n\nPlease try again or use a different description.`,
            },
          ],
        };
      }
    } catch (error) {
      console.error('[MCP] Error building app:', error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ An error occurred: ${error.message}\n\nPlease try again.`,
          },
        ],
      };
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: `Unknown tool: ${request.params.name}`,
      },
    ],
  };
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP] Webtoys Builder MCP Server started');
}

main().catch((error) => {
  console.error('[MCP] Fatal error:', error);
  process.exit(1);
});