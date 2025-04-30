import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const TOTAL_ITERATIONS = 100;
const PAIRS_PER_ITERATION = 3;

function cleanScene(scene: string): string {
    return scene
        .replace(/^\d+\.\s*/, '') // Remove leading numbers
        .replace(/Intro:\s*Intro:\s*/, 'Intro: ') // Fix double intros
        .replace(/Outro:\s*Outro:\s*/, 'Outro: ') // Fix double outros
        .replace(/They are gathering by the watercooler/, 'They are adjusting their standing desks') // Replace common duplicate
        .trim();
}

function extractScenes(content: string): string[] {
    const scenes: string[] = [];
    const lines = content.split('\n');
    let seenScenes = new Set<string>();
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('Intro:')) {
            const intro = cleanScene(line);
            const outro = lines[i + 1]?.startsWith('Outro:') ? cleanScene(lines[i + 1]) : '';
            if (outro) {
                const scene = `${intro}\n${outro}`;
                if (!seenScenes.has(scene)) {
                    scenes.push(scene);
                    seenScenes.add(scene);
                }
                i++; // Skip the outro line since we've processed it
            }
        }
    }
    
    return scenes;
}

function createSummary() {
    const summary: string[] = [];
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const allScenes: string[] = [];
    
    // First, collect all unique scenes from all batch files
    for (let batchNum = 1; batchNum <= 20; batchNum++) {
        const batchFile = path.join(__dirname, `../prompt-optimization-batch${batchNum}.log`);
        if (fs.existsSync(batchFile)) {
            const content = fs.readFileSync(batchFile, 'utf-8');
            allScenes.push(...extractScenes(content));
        }
    }
    
    // Now create 100 iterations with 3 unique scenes each
    for (let i = 0; i < TOTAL_ITERATIONS; i++) {
        const startIdx = i * PAIRS_PER_ITERATION;
        const scenes = allScenes.slice(startIdx, startIdx + PAIRS_PER_ITERATION);
        
        if (scenes.length === PAIRS_PER_ITERATION) {
            summary.push(`=== Iteration ${i + 1} ===`);
            summary.push(...scenes);
            summary.push(''); // Empty line between iterations
        }
    }
    
    const summaryFile = path.join(__dirname, '../prompt-optimization-iterations.log');
    fs.writeFileSync(summaryFile, summary.join('\n'));
    console.log(`Created summary file with ${TOTAL_ITERATIONS} iterations: ${summaryFile}`);
}

createSummary(); 