#!/usr/bin/env node
/**
 * Auto-generate documentation sections from code analysis
 */

import { readFile, writeFile, readdir } from 'fs/promises';
import { join } from 'path';
import { logSuccess, logWithTimestamp } from '../engine/shared/logger.js';

interface ModuleInfo {
    name: string;
    exports: string[];
    description: string;
}

async function analyzeModules(): Promise<ModuleInfo[]> {
    const engineDir = join(__dirname, '../engine');
    const files = await readdir(engineDir);
    const modules: ModuleInfo[] = [];
    
    for (const file of files) {
        if (!file.endsWith('.ts') || file.includes('.test.')) continue;
        
        const content = await readFile(join(engineDir, file), 'utf8');
        
        // Extract exports
        const exportPattern = /export\s+(?:async\s+)?function\s+(\w+)/g;
        const exports: string[] = [];
        let match;
        
        while ((match = exportPattern.exec(content)) !== null) {
            exports.push(match[1]);
        }
        
        // Extract module description from header comment
        const descMatch = content.match(/^\s*\/\*\*\s*\n\s*\*\s*(.+)/m);
        const description = descMatch ? descMatch[1] : 'No description';
        
        if (exports.length > 0) {
            modules.push({
                name: file,
                exports,
                description
            });
        }
    }
    
    return modules;
}

async function analyzeCommands(): Promise<string[]> {
    const controllerPath = join(__dirname, '../engine/controller.ts');
    const content = await readFile(controllerPath, 'utf8');
    
    // Find all command patterns
    const commandPattern = /userPrompt\.includes\(['"](--([\w-]+))/g;
    const commands = new Set<string>();
    let match;
    
    while ((match = commandPattern.exec(content)) !== null) {
        commands.add(match[1]);
    }
    
    return Array.from(commands).sort();
}

async function generateModuleReference(): Promise<string> {
    const modules = await analyzeModules();
    let content = '## Auto-Generated Module Reference\n\n';
    content += '_This section is auto-generated from code analysis_\n\n';
    
    for (const module of modules) {
        content += `### ${module.name}\n`;
        content += `${module.description}\n\n`;
        content += '**Exported Functions:**\n';
        module.exports.forEach(exp => {
            content += `- \`${exp}()\`\n`;
        });
        content += '\n';
    }
    
    return content;
}

async function generateCommandReference(): Promise<string> {
    const commands = await analyzeCommands();
    let content = '## Auto-Generated Command Reference\n\n';
    content += '_This section is auto-generated from controller.ts analysis_\n\n';
    content += '**Available Commands:**\n';
    
    commands.forEach(cmd => {
        content += `- \`${cmd}\`\n`;
    });
    
    return content;
}

async function updateClaudeMd() {
    const claudePath = join(__dirname, '../../CLAUDE.md');
    let content = await readFile(claudePath, 'utf8');
    
    // Generate new sections
    const moduleRef = await generateModuleReference();
    const commandRef = await generateCommandReference();
    
    // Replace or append auto-generated sections
    const autoGenMarker = '<!-- AUTO-GENERATED-START -->';
    const autoGenEnd = '<!-- AUTO-GENERATED-END -->';
    
    const autoGenContent = `${autoGenMarker}\n${moduleRef}\n${commandRef}\n${autoGenEnd}`;
    
    if (content.includes(autoGenMarker)) {
        // Replace existing auto-generated section
        const startIdx = content.indexOf(autoGenMarker);
        const endIdx = content.indexOf(autoGenEnd) + autoGenEnd.length;
        content = content.slice(0, startIdx) + autoGenContent + content.slice(endIdx);
    } else {
        // Append at the end
        content += '\n\n' + autoGenContent;
    }
    
    await writeFile(claudePath, content);
    logSuccess('✅ Updated CLAUDE.md with auto-generated content');
}

// Main execution
async function main() {
    logWithTimestamp('📝 Generating documentation from code...');
    
    await updateClaudeMd();
    
    // Also generate a standalone reference
    const fullRef = await generateModuleReference() + '\n' + await generateCommandReference();
    await writeFile(
        join(__dirname, '../documentation/AUTO-GENERATED-REFERENCE.md'), 
        fullRef
    );
    
    logSuccess('✅ Documentation generation complete!');
}

main().catch(console.error);