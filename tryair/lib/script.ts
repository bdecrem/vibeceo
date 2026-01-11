/**
 * Script/storyboard generation using Claude Sonnet 4
 *
 * Generates a complete storyboard with:
 * - Narration text (for voiceover)
 * - Image descriptions (for AI image generator)
 * - Overlay text (short punchy words for on-screen display)
 */

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { requireEnv } from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Scene {
  narration: string;   // Voiceover text for this scene
  image: string;       // Image description for AI generator
  overlay: string;     // 1-3 words to display on screen
}

export interface Storyboard {
  scene1: Scene;
  scene2: Scene;
  fullNarration: string;  // Combined narration for voiceover
}

export interface GeneratedScript {
  subject: string;
  storyboard: Storyboard;
  createdAt: string;
}

function loadPromptTemplate(): string {
  const promptPath = path.resolve(__dirname, '../content/prompts/video-script.txt');
  const content = fs.readFileSync(promptPath, 'utf-8');
  const lines = content.split('\n');

  // Find prompt between first and second ---
  const firstSeparator = lines.findIndex(line => line.trim() === '---');
  const secondSeparator = lines.findIndex((line, i) => i > firstSeparator && line.trim() === '---');

  const promptLines = lines.slice(
    firstSeparator + 1,
    secondSeparator > 0 ? secondSeparator : undefined
  );

  return promptLines.join('\n').trim();
}

function parseScene(sceneText: string): Scene {
  const narrationMatch = sceneText.match(/NARRATION:\s*(.+?)(?=IMAGE:|$)/is);
  const imageMatch = sceneText.match(/IMAGE:\s*(.+?)(?=OVERLAY:|$)/is);
  const overlayMatch = sceneText.match(/OVERLAY:\s*(.+?)$/is);

  return {
    narration: narrationMatch ? narrationMatch[1].trim() : '',
    image: imageMatch ? imageMatch[1].trim() : '',
    overlay: overlayMatch ? overlayMatch[1].trim() : '',
  };
}

function parseStoryboardResponse(response: string): Storyboard {
  // Split by SCENE markers
  const scene1Match = response.match(/SCENE\s*1:\s*([\s\S]*?)(?=SCENE\s*2:|$)/i);
  const scene2Match = response.match(/SCENE\s*2:\s*([\s\S]*?)$/i);

  const scene1 = scene1Match ? parseScene(scene1Match[1]) : { narration: '', image: '', overlay: '' };
  const scene2 = scene2Match ? parseScene(scene2Match[1]) : { narration: '', image: '', overlay: '' };

  return {
    scene1,
    scene2,
    fullNarration: `${scene1.narration}\n\n${scene2.narration}`,
  };
}

export async function generateScript(subject: string, outputPath: string): Promise<GeneratedScript> {
  const apiKey = requireEnv('ANTHROPIC_API_KEY');
  const client = new Anthropic({ apiKey });

  const promptTemplate = loadPromptTemplate();
  const prompt = promptTemplate.replace('{subject}', subject);

  console.log('   Generating storyboard with Claude Sonnet 4...');

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  // Extract text from response
  const responseText = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('\n');

  const storyboard = parseStoryboardResponse(responseText);

  const script: GeneratedScript = {
    subject,
    storyboard,
    createdAt: new Date().toISOString(),
  };

  // Save script to project folder
  fs.writeFileSync(outputPath, JSON.stringify(script, null, 2));

  return script;
}

export function loadScript(scriptPath: string): GeneratedScript | null {
  if (!fs.existsSync(scriptPath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(scriptPath, 'utf-8'));
}
