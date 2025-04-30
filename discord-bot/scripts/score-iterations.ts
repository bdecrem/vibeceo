import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

interface Scene {
    intro: string;
    outro: string;
}

interface Iteration {
    number: number;
    scenes: Scene[];
    scores: {
        structure: number;
        content: number;
        tone: number;
        wordChoice: number;
        thematicResonance: number;
        total: number;
    };
}

function parseIterations(content: string): Iteration[] {
    const iterations: Iteration[] = [];
    const lines = content.split('\n');
    let currentIteration: Partial<Iteration> = { scenes: [] };
    let currentScene: Partial<Scene> = {};

    for (const line of lines) {
        if (line.startsWith('=== Iteration')) {
            if (currentIteration.number) {
                iterations.push(currentIteration as Iteration);
            }
            const number = parseInt(line.match(/\d+/)?.[0] || '0');
            currentIteration = { number, scenes: [] };
        } else if (line.startsWith('Intro:')) {
            if (currentScene.intro && currentScene.outro) {
                currentIteration.scenes?.push(currentScene as Scene);
            }
            currentScene = { intro: line.replace('Intro:', '').trim() };
        } else if (line.startsWith('Outro:')) {
            currentScene.outro = line.replace('Outro:', '').trim();
        }
    }

    // Add the last iteration
    if (currentIteration.number) {
        iterations.push(currentIteration as Iteration);
    }

    return iterations;
}

function scoreScene(scene: Scene): {
    structure: number;
    content: number;
    tone: number;
    wordChoice: number;
    thematicResonance: number;
} {
    const scores = {
        structure: 0,
        content: 0,
        tone: 0,
        wordChoice: 0,
        thematicResonance: 0
    };

    // Structure scoring (20%)
    const hasValidStructure = 
        scene.intro.includes('They are') && 
        scene.outro.includes('They are');
    scores.structure = hasValidStructure ? 20 : 10;

    // Content scoring (20%)
    const hasPhysicalAction = 
        scene.intro.includes('adjusting') || 
        scene.intro.includes('stacking') || 
        scene.intro.includes('gathering') ||
        scene.intro.includes('moving');
    const hasDispersal = 
        scene.outro.includes('dispersing') || 
        scene.outro.includes('scattering') || 
        scene.outro.includes('dissolving');
    scores.content = (hasPhysicalAction && hasDispersal) ? 20 : 10;

    // Tone scoring (20%)
    const isDry = 
        !scene.intro.includes('!') && 
        !scene.outro.includes('!') &&
        !scene.intro.includes('?') &&
        !scene.outro.includes('?');
    const isSubtle = 
        !scene.intro.includes('laughing') && 
        !scene.outro.includes('laughing') &&
        !scene.intro.includes('joking') &&
        !scene.outro.includes('joking');
    scores.tone = (isDry && isSubtle) ? 20 : 10;

    // Word Choice scoring (20%)
    const hasVariedVocabulary = 
        scene.intro.split(' ').length > 5 && 
        scene.outro.split(' ').length > 5;
    const hasSpecificVerbs = 
        scene.intro.includes('adjusting') || 
        scene.intro.includes('stacking') || 
        scene.intro.includes('gathering') ||
        scene.intro.includes('moving');
    scores.wordChoice = (hasVariedVocabulary && hasSpecificVerbs) ? 20 : 10;

    // Thematic Resonance scoring (20%)
    const hasStartupTheme = 
        scene.intro.includes('standing desk') || 
        scene.intro.includes('coffee machine') || 
        scene.intro.includes('watercooler') ||
        scene.intro.includes('office');
    const hasAmbientDrift = 
        scene.outro.includes('dissolving') || 
        scene.outro.includes('scattering') || 
        scene.outro.includes('dispersing');
    scores.thematicResonance = (hasStartupTheme && hasAmbientDrift) ? 20 : 10;

    return scores;
}

function scoreIterations(iterations: Iteration[]): Iteration[] {
    return iterations.map(iteration => {
        const sceneScores = iteration.scenes.map(scene => scoreScene(scene));
        const averageScores = {
            structure: sceneScores.reduce((sum, score) => sum + score.structure, 0) / sceneScores.length,
            content: sceneScores.reduce((sum, score) => sum + score.content, 0) / sceneScores.length,
            tone: sceneScores.reduce((sum, score) => sum + score.tone, 0) / sceneScores.length,
            wordChoice: sceneScores.reduce((sum, score) => sum + score.wordChoice, 0) / sceneScores.length,
            thematicResonance: sceneScores.reduce((sum, score) => sum + score.thematicResonance, 0) / sceneScores.length
        };

        return {
            ...iteration,
            scores: {
                ...averageScores,
                total: Object.values(averageScores).reduce((sum, score) => sum + score, 0)
            }
        };
    });
}

function generateReport(iterations: Iteration[]): string {
    const sortedIterations = [...iterations].sort((a, b) => b.scores.total - a.scores.total);
    const report: string[] = [];

    // Add section for all max score iterations
    const maxScore = sortedIterations[0].scores.total;
    const maxScoreIterations = sortedIterations.filter(iter => iter.scores.total === maxScore);
    report.push(`=== All Iterations with Score ${maxScore.toFixed(1)} ===\n`);
    report.push(`Total count: ${maxScoreIterations.length}\n`);
    maxScoreIterations.forEach(iteration => {
        report.push(`Iteration ${iteration.number}`);
    });
    report.push('\n');

    report.push('=== Top 10 Iterations ===\n');
    sortedIterations.slice(0, 10).forEach((iteration, index) => {
        report.push(`Rank ${index + 1} - Iteration ${iteration.number} (Score: ${iteration.scores.total.toFixed(1)})`);
        report.push('Scenes:');
        iteration.scenes.forEach(scene => {
            report.push(`  ${scene.intro}`);
            report.push(`  ${scene.outro}`);
        });
        report.push('\nScores:');
        report.push(`  Structure: ${iteration.scores.structure.toFixed(1)}`);
        report.push(`  Content: ${iteration.scores.content.toFixed(1)}`);
        report.push(`  Tone: ${iteration.scores.tone.toFixed(1)}`);
        report.push(`  Word Choice: ${iteration.scores.wordChoice.toFixed(1)}`);
        report.push(`  Thematic Resonance: ${iteration.scores.thematicResonance.toFixed(1)}`);
        report.push('\n---\n');
    });

    // Add statistics
    const averageScore = iterations.reduce((sum, iter) => sum + iter.scores.total, 0) / iterations.length;
    const highestScore = Math.max(...iterations.map(iter => iter.scores.total));
    const minScore = Math.min(...iterations.map(iter => iter.scores.total));

    report.push('\n=== Statistics ===');
    report.push(`Average Score: ${averageScore.toFixed(1)}`);
    report.push(`Highest Score: ${highestScore.toFixed(1)}`);
    report.push(`Lowest Score: ${minScore.toFixed(1)}`);

    return report.join('\n');
}

function main() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const iterationsFile = path.join(__dirname, '../prompt-optimization-iterations.log');
    const outputFile = path.join(__dirname, '../prompt-optimization-scores.log');

    const content = fs.readFileSync(iterationsFile, 'utf-8');
    const iterations = parseIterations(content);
    const scoredIterations = scoreIterations(iterations);
    const report = generateReport(scoredIterations);

    fs.writeFileSync(outputFile, report);
    console.log(`Scoring complete. Results written to: ${outputFile}`);
}

main(); 