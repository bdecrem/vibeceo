#!/usr/bin/env node

/**
 * ARCHITECTURE VALIDATION SCRIPT
 *
 * Enforces codebase rules by scanning for violations:
 *
 * 1. Engine files (engine/*.ts):
 *    - Hardcoded business logic that should be in JSON
 *    - Switch statements on classification types
 *    - Embedded prompts/templates
 *
 * 2. Security (all .ts/.tsx files):
 *    - Hardcoded API keys, tokens, secrets
 *
 * 3. Incubator isolation (sms-bot/, web/):
 *    - Imports from incubator/ into main codebase
 *
 * Run: node scripts/validate-architecture.cjs
 * Exits with code 1 if violations found
 */

const fs = require('fs');
const path = require('path');

// Define violation patterns to detect
// scope: 'engine' = engine/*.ts only, 'all' = all .ts/.tsx, 'main' = sms-bot + web (not incubator)
const VIOLATIONS = {
    // === ENGINE-SPECIFIC (Webtoys separation of concerns) ===
    hardcoded_classification_assignments: {
        scope: 'engine',
        patterns: [
            'EMAIL_NEEDED\\s*=\\s*true',
            'EMAIL_NEEDED\\s*=\\s*false',
            'ZERO_ADMIN_DATA\\s*=\\s*true',
            'ZERO_ADMIN_DATA\\s*=\\s*false',
            'APP_TYPE\\s*=\\s*["\']simple_email["\']',
            'APP_TYPE\\s*=\\s*["\']data_collection["\']',
            'APP_TYPE\\s*=\\s*["\']zero_admin_data["\']',
            'APP_TYPE\\s*=\\s*["\']standard_app["\']'
        ],
        message: 'Hardcoded classification assignments found. These should come from JSON configuration'
    },

    hardcoded_return_statements: {
        scope: 'engine',
        patterns: [
            'return\\s*["\']ZAD_DETECTED["\']',
            'return\\s*["\']EMAIL_NEEDED=true["\']'
        ],
        message: 'Hardcoded classification return values found. Use JSON configuration instead'
    },

    hardcoded_step_titles_in_arrays: {
        scope: 'engine',
        patterns: [
            '\\{\\s*file:\\s*["\'][^"\']*["\'],\\s*title:\\s*["\']EMAIL DISPLAY["\']',
            '\\{\\s*file:\\s*["\'][^"\']*["\'],\\s*title:\\s*["\']ZERO ADMIN DATA["\']',
            '\\{\\s*file:\\s*["\'][^"\']*["\'],\\s*title:\\s*["\']ADMIN URL["\']'
        ],
        message: 'Hardcoded step titles in arrays found. Move these to JSON step_title fields'
    },

    switch_on_classification: {
        scope: 'engine',
        patterns: [
            'switch\\s*\\(.*classification_type.*\\)',
            'case\\s*["\']needs-email["\']',
            'case\\s*["\']zero-admin-data["\']',
            'case\\s*["\']needs-admin["\']'
        ],
        message: 'Switch statement on classification type found. Use JSON configuration instead'
    },

    embedded_decision_templates: {
        scope: 'engine',
        patterns: [
            'If YES:.*EMAIL_NEEDED=true.*STOP HERE',
            'If YES:.*ZAD_DETECTED.*STOP HERE',
            'If YES:.*APP_TYPE=data_collection.*STOP HERE'
        ],
        message: 'Embedded decision templates found. Move to decision_logic in JSON files'
    },

    embedded_prompts: {
        scope: 'engine',
        patterns: [
            'You are a request analyzer.*Take the user.*request',
            'SEQUENTIAL DECISION TREE',
            '---WTAF_METADATA---.*EMAIL_NEEDED.*---END_METADATA---'
        ],
        message: 'Embedded prompt templates found. Move to _classifier-config.json'
    },

    // === SECURITY (all files) ===
    hardcoded_secrets: {
        scope: 'all',
        patterns: [
            'SUPABASE_SERVICE_KEY\\s*=\\s*["\']eyJ',         // Supabase JWT
            'ANTHROPIC_API_KEY\\s*=\\s*["\']sk-ant-',        // Anthropic key
            'OPENAI_API_KEY\\s*=\\s*["\']sk-',               // OpenAI key
            'TWILIO_AUTH_TOKEN\\s*=\\s*["\'][a-f0-9]{32}',   // Twilio token
            'sbp_[a-f0-9]{40}',                              // Supabase access token
            'xoxb-[0-9]{10,}',                               // Slack bot token
            'ghp_[A-Za-z0-9]{36}',                           // GitHub PAT
        ],
        message: 'Hardcoded secret/API key detected. Use process.env.VARIABLE_NAME instead'
    },

    // === INCUBATOR ISOLATION (main codebase only) ===
    incubator_import: {
        scope: 'main',
        patterns: [
            'from\\s+["\']\\.\\..*incubator/',               // relative import
            'from\\s+["\'].*\\/incubator\\/',                // absolute import
            'import\\s+.*from\\s+["\'].*incubator/',         // ES import
            'require\\s*\\(["\'].*incubator',                // CommonJS require
        ],
        message: 'Incubator code imported into main codebase. Keep incubator/ isolated per CLAUDE.md rules'
    }
};

// Colors for terminal output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function isContextualUsage(line, pattern) {
    // Allow template string usage that references JSON values  
    if (line.includes('${') && line.includes('}')) {
        return true;
    }
    
    // Allow checking for classifier output (legitimate use)
    if (line.includes('.includes(') && (line.includes('content') || line.includes('response'))) {
        return true;
    }
    
    // Allow log messages
    if (line.includes('log') || line.includes('console.log')) {
        return true;
    }
    
    // Allow comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
        return true;
    }
    
    return false;
}

function scanFileForViolations(filePath, scope) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const violations = [];

    // Check each violation type for this scope
    Object.entries(VIOLATIONS)
        .filter(([, config]) => config.scope === scope)
        .forEach(([violationType, config]) => {
            config.patterns.forEach(pattern => {
                const regex = new RegExp(pattern, 'gi');

                lines.forEach((line, lineNumber) => {
                    // Reset regex lastIndex for global patterns
                    regex.lastIndex = 0;
                    if (regex.test(line)) {
                        // Check if this is contextual usage (allowed)
                        if (!isContextualUsage(line, pattern)) {
                            violations.push({
                                type: violationType,
                                line: lineNumber + 1,
                                content: line.trim(),
                                message: config.message,
                                pattern: pattern
                            });
                        }
                    }
                });
            });
        });

    return violations;
}

// Recursively get all .ts/.tsx files in a directory
function getFilesRecursive(dir, extensions = ['.ts', '.tsx']) {
    const files = [];
    if (!fs.existsSync(dir)) return files;

    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            // Skip node_modules, dist, .git
            if (!['node_modules', 'dist', '.git', '.next'].includes(item.name)) {
                files.push(...getFilesRecursive(fullPath, extensions));
            }
        } else if (extensions.some(ext => item.name.endsWith(ext)) && !item.name.endsWith('.bak.ts')) {
            files.push(fullPath);
        }
    }
    return files;
}

function validateArchitecture() {
    log('🔍 Validating architecture rules...', 'blue');

    const smsBotDir = path.join(__dirname, '..');
    const webDir = path.join(__dirname, '..', '..', 'web');
    const engineDir = path.join(smsBotDir, 'engine');

    // Build file lists for each scope
    const filesByScope = {
        engine: fs.existsSync(engineDir)
            ? fs.readdirSync(engineDir)
                .filter(file => file.endsWith('.ts') && !file.endsWith('.bak.ts'))
                .map(file => path.join(engineDir, file))
            : [],
        all: [
            ...getFilesRecursive(smsBotDir),
            ...getFilesRecursive(webDir)
        ],
        main: [
            ...getFilesRecursive(smsBotDir),
            ...getFilesRecursive(webDir)
        ].filter(f => !f.includes('/incubator/'))
    };

    let totalViolations = 0;
    let hasViolations = false;
    const checkedFiles = new Set();

    // Group violations by scope for cleaner output
    const scopes = [
        { name: 'engine', label: 'Engine (Webtoys)', files: filesByScope.engine },
        { name: 'all', label: 'Security', files: filesByScope.all },
        { name: 'main', label: 'Incubator Isolation', files: filesByScope.main }
    ];

    for (const { name: scopeName, label, files } of scopes) {
        const scopeViolations = Object.entries(VIOLATIONS).filter(([, config]) => config.scope === scopeName);
        if (scopeViolations.length === 0) continue;

        log(`\n📋 Checking ${label}...`, 'blue');

        for (const filePath of files) {
            const violations = scanFileForViolations(filePath, scopeName);

            if (violations.length > 0) {
                hasViolations = true;
                const relPath = path.relative(path.join(__dirname, '..', '..'), filePath);
                log(`\n❌ VIOLATIONS in ${relPath}:`, 'red');

                violations.forEach(violation => {
                    log(`   Line ${violation.line}: ${violation.message}`, 'yellow');
                    log(`   Found: "${violation.content.substring(0, 80)}${violation.content.length > 80 ? '...' : ''}"`, 'red');
                    log('');
                    totalViolations++;
                });
            }
            checkedFiles.add(filePath);
        }
    }

    log(`\n📊 Scanned ${checkedFiles.size} files`, 'blue');

    if (hasViolations) {
        log('\n' + '='.repeat(60), 'red');
        log(`❌ ARCHITECTURE VALIDATION FAILED`, 'red');
        log(`Found ${totalViolations} violation(s)`, 'red');
        log('', 'red');
        log('RULES:', 'red');
        log('- Engine files: no hardcoded business logic (use JSON)', 'red');
        log('- Security: no hardcoded secrets (use process.env)', 'red');
        log('- Isolation: no incubator imports in main codebase', 'red');
        log('', 'red');
        log('Fix violations and run again.', 'red');
        log('='.repeat(60), 'red');

        process.exit(1);
    } else {
        log('\n✅ All checks passed!', 'green');
        log('🏗️  Architecture rules maintained', 'green');
    }
}

// Run validation
try {
    validateArchitecture();
} catch (error) {
    log(`❌ Validation script error: ${error.message}`, 'red');
    process.exit(1);
} 