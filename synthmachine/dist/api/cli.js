#!/usr/bin/env node
/**
 * SynthMachine CLI
 *
 * Usage:
 *   npx ts-node api/cli.ts render --preset techno-basic --bars 2 --output beat.wav
 *   npx ts-node api/cli.ts list-presets
 *   npx ts-node api/cli.ts render --pattern '{"kick":[...]}' --bpm 128 --bars 4 --output custom.wav
 */
import * as fs from 'fs';
import * as path from 'path';
import { renderPatternOffline } from './cli-renderer.js';
import { getPreset, listPresetIds, TR909_PRESETS } from '../machines/tr909/presets.js';
async function renderPattern(options) {
    let pattern;
    let bpm = options.bpm ?? 128;
    if (options.preset) {
        const preset = getPreset(options.preset);
        if (!preset) {
            console.error(`Unknown preset: ${options.preset}`);
            console.error(`Available presets: ${listPresetIds().join(', ')}`);
            process.exit(1);
        }
        pattern = preset.pattern;
        bpm = options.bpm ?? preset.bpm;
        console.error(`Using preset: ${preset.name} (${preset.description})`);
    }
    else if (options.pattern) {
        try {
            pattern = JSON.parse(options.pattern);
        }
        catch (e) {
            console.error('Invalid pattern JSON:', e);
            process.exit(1);
        }
    }
    else {
        console.error('Either --preset or --pattern is required');
        process.exit(1);
    }
    const bars = options.bars ?? 2;
    console.error(`Rendering ${bars} bar(s) at ${bpm} BPM...`);
    const wavData = await renderPatternOffline(pattern, { bpm, bars });
    const outputPath = path.resolve(options.output);
    fs.writeFileSync(outputPath, Buffer.from(wavData));
    console.error(`Wrote ${outputPath} (${wavData.byteLength} bytes)`);
    // Output just the path to stdout for programmatic use
    console.log(outputPath);
}
function listPresetsCommand() {
    console.log('Available presets:\n');
    TR909_PRESETS.forEach((preset) => {
        console.log(`  ${preset.id.padEnd(20)} ${preset.name}`);
        console.log(`  ${''.padEnd(20)} ${preset.description} (${preset.bpm} BPM)\n`);
    });
}
function showHelp() {
    console.log(`
SynthMachine TR-909 CLI

Commands:
  render        Render a pattern to WAV file
  list-presets  Show available preset patterns

Options for 'render':
  --preset <id>     Use a preset pattern (see list-presets)
  --pattern <json>  Use a custom pattern as JSON
  --bpm <number>    Tempo in BPM (default: from preset or 128)
  --bars <number>   Number of bars to render (default: 2)
  --output <path>   Output WAV file path (required)

Examples:
  synthmachine render --preset techno-basic --bars 4 --output beat.wav
  synthmachine render --pattern '{"kick":[{"velocity":1},{"velocity":0},...]}' --bpm 140 --output custom.wav
  synthmachine list-presets
`);
}
async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        showHelp();
        process.exit(0);
    }
    const command = args[0];
    if (command === 'list-presets') {
        listPresetsCommand();
        process.exit(0);
    }
    if (command === 'render') {
        const options = { output: '' };
        for (let i = 1; i < args.length; i += 2) {
            const flag = args[i];
            const value = args[i + 1];
            switch (flag) {
                case '--preset':
                    options.preset = value;
                    break;
                case '--pattern':
                    options.pattern = value;
                    break;
                case '--bpm':
                    options.bpm = parseInt(value, 10);
                    break;
                case '--bars':
                    options.bars = parseInt(value, 10);
                    break;
                case '--output':
                case '-o':
                    options.output = value;
                    break;
            }
        }
        if (!options.output) {
            console.error('--output is required');
            process.exit(1);
        }
        await renderPattern(options);
        process.exit(0);
    }
    console.error(`Unknown command: ${command}`);
    showHelp();
    process.exit(1);
}
main().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map