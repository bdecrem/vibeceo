/**
 * Style loader - reads style definitions from .txt files.
 *
 * File format:
 *   Line 1: style name
 *   Line 2: short description
 *   Line 3: ---
 *   Lines 4+: prompt template (until next --- or EOF)
 *
 * Everything after the second --- is notes for editors (ignored by code).
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Style {
  name: string;
  description: string;
  promptTemplate: string;
}

function parseStyleFile(filePath: string): Style {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const name = lines[0].trim();
  const description = lines[1].trim();

  // Find prompt between first and second ---
  const firstSeparator = lines.findIndex(line => line.trim() === '---');
  const secondSeparator = lines.findIndex((line, i) => i > firstSeparator && line.trim() === '---');

  const promptLines = lines.slice(
    firstSeparator + 1,
    secondSeparator > 0 ? secondSeparator : undefined
  );

  const promptTemplate = promptLines.join('\n').trim();

  return { name, description, promptTemplate };
}

function loadStyles(): Style[] {
  const stylesDir = path.join(__dirname, 'styles');
  const files = fs.readdirSync(stylesDir).filter(f => f.endsWith('.txt'));

  return files.map(file => parseStyleFile(path.join(stylesDir, file)));
}

export const styles: Style[] = loadStyles();

export function getStyle(index: number): Style | undefined {
  return styles[index];
}

export function buildPrompt(style: Style, subject: string): string {
  return style.promptTemplate.replace('{subject}', subject);
}
