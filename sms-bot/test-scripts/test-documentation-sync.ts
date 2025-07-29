#!/usr/bin/env node
/**
 * Documentation Sync Validator
 * Ensures documentation stays in sync with actual code
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { logError, logSuccess, logWarning } from '../engine/shared/logger.js';

interface ValidationResult {
    file: string;
    issues: string[];
}

async function validateDocumentation(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    // 1. Validate module responsibilities in CLAUDE.md match actual exports
    const claudeMd = await readFile(join(__dirname, '../../CLAUDE.md'), 'utf8');
    const issues: string[] = [];
    
    // Check if all modules mentioned in CLAUDE.md actually exist
    const modulePattern = /`(\w+-\w+\.ts)`/g;
    const matches = claudeMd.matchAll(modulePattern);
    
    for (const match of matches) {
        const moduleName = match[1];
        try {
            await readFile(join(__dirname, '../engine', moduleName), 'utf8');
        } catch {
            issues.push(`Module ${moduleName} mentioned in CLAUDE.md but doesn't exist`);
        }
    }
    
    // 2. Validate special commands still exist in controller.ts
    const controllerPath = join(__dirname, '../engine/controller.ts');
    const controllerContent = await readFile(controllerPath, 'utf8');
    
    const commandsInDocs = [
        '--admin', '--admin-test', '--zad-test', '--zad-api', '--music',
        '--stack', '--stackdb', '--stackdata', '--stackemail', '--remix', '--stackzad'
    ];
    
    for (const cmd of commandsInDocs) {
        if (!controllerContent.includes(`'${cmd} `) && !controllerContent.includes(`'${cmd}'`)) {
            issues.push(`Command ${cmd} documented but not found in controller.ts`);
        }
    }
    
    // 3. Check if database tables match documentation
    const tables = ['wtaf_content', 'wtaf_submissions', 'wtaf_users', 'wtaf_zero_admin_collaborative'];
    const storageManager = await readFile(join(__dirname, '../engine/storage-manager.ts'), 'utf8');
    
    for (const table of tables) {
        if (!storageManager.includes(`'${table}'`)) {
            issues.push(`Table ${table} documented but not used in storage-manager.ts`);
        }
    }
    
    // 4. Validate API endpoints in ZAD documentation
    const zadDocs = await readFile(
        join(__dirname, '../documentation/ZAD-API-SYSTEM-OVERVIEW.md'), 
        'utf8'
    );
    
    if (zadDocs.includes('/api/zad/save') && !controllerContent.includes('zad/save')) {
        issues.push('ZAD save endpoint documented but implementation may have changed');
    }
    
    if (issues.length > 0) {
        results.push({ file: 'CLAUDE.md', issues });
    }
    
    return results;
}

// Run validation
async function main() {
    console.log('🔍 Validating documentation sync...\n');
    
    const results = await validateDocumentation();
    let hasIssues = false;
    
    for (const result of results) {
        if (result.issues.length > 0) {
            hasIssues = true;
            logError(`\n❌ ${result.file} has ${result.issues.length} issues:`);
            result.issues.forEach(issue => logWarning(`  - ${issue}`));
        }
    }
    
    if (!hasIssues) {
        logSuccess('\n✅ All documentation is in sync with code!');
    } else {
        logError('\n❌ Documentation needs updating');
        process.exit(1);
    }
}

main().catch(error => {
    logError(`Documentation validation failed: ${error.message}`);
    process.exit(1);
});