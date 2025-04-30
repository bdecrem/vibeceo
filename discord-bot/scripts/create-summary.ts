import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const BATCH_COUNT = 20;
const SCENES_PER_BATCH = 5;

function extractScenes(batchContent: string): string[] {
    const scenes: string[] = [];
    const lines = batchContent.split('\n');
    let currentScene: string[] = [];
    let seenScenes = new Set<string>();
    
    for (const line of lines) {
        if (line.startsWith('=== Iteration')) {
            if (currentScene.length > 0) {
                const scene = currentScene.join('\n');
                if (!seenScenes.has(scene)) {
                    scenes.push(scene);
                    seenScenes.add(scene);
                }
                currentScene = [];
            }
        } else if (line.startsWith('Intro:') || line.startsWith('Outro:')) {
            // Skip lines that are just numbers or contain "Intro:" or "Outro:" in the middle
            if (!line.match(/^\d+\.$/) && !line.match(/Intro:.*Intro:/) && !line.match(/Outro:.*Outro:/)) {
                currentScene.push(line);
            }
        }
    }
    
    if (currentScene.length > 0) {
        const scene = currentScene.join('\n');
        if (!seenScenes.has(scene)) {
            scenes.push(scene);
            seenScenes.add(scene);
        }
    }
    
    return scenes.slice(0, SCENES_PER_BATCH);
}

function createSummary() {
    const summary: string[] = [];
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    for (let i = 1; i <= BATCH_COUNT; i++) {
        const batchFile = path.join(__dirname, `../prompt-optimization-batch${i}.log`);
        if (fs.existsSync(batchFile)) {
            const content = fs.readFileSync(batchFile, 'utf-8');
            const scenes = extractScenes(content);
            
            summary.push(`=== Batch ${i} ===`);
            summary.push(...scenes);
            summary.push(''); // Empty line between batches
        }
    }
    
    const summaryFile = path.join(__dirname, '../prompt-optimization-summary.log');
    fs.writeFileSync(summaryFile, summary.join('\n'));
    console.log(`Created summary file: ${summaryFile}`);
}

createSummary(); 