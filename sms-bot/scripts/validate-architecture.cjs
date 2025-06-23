#!/usr/bin/env node

/**
 * ARCHITECTURE VALIDATION SCRIPT
 * 
 * Enforces separation of concerns by scanning engine/*.ts files for violations:
 * - Hardcoded business logic that should be in JSON
 * - Switch statements on classification types
 * - Embedded prompts/templates
 * - Direct string literals for app types
 * 
 * Exits with code 1 if violations found, blocking commits/builds
 */

const fs = require('fs');
const path = require('path');

// Define violation patterns to detect
const VIOLATIONS = {
    hardcoded_classification_assignments: {
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
        patterns: [
            'return\\s*["\']ZAD_DETECTED["\']',
            'return\\s*["\']EMAIL_NEEDED=true["\']'
        ],
        message: 'Hardcoded classification return values found. Use JSON configuration instead'
    },
    
    hardcoded_step_titles_in_arrays: {
        patterns: [
            '\\{\\s*file:\\s*["\'][^"\']*["\'],\\s*title:\\s*["\']EMAIL DISPLAY["\']',
            '\\{\\s*file:\\s*["\'][^"\']*["\'],\\s*title:\\s*["\']ZERO ADMIN DATA["\']',
            '\\{\\s*file:\\s*["\'][^"\']*["\'],\\s*title:\\s*["\']ADMIN URL["\']'
        ],
        message: 'Hardcoded step titles in arrays found. Move these to JSON step_title fields'
    },
    
    switch_on_classification: {
        patterns: [
            'switch\\s*\\(.*classification_type.*\\)',
            'case\\s*["\']needs-email["\']',
            'case\\s*["\']zero-admin-data["\']',
            'case\\s*["\']needs-admin["\']'
        ],
        message: 'Switch statement on classification type found. Use JSON configuration instead'
    },
    
    embedded_decision_templates: {
        patterns: [
            'If YES:.*EMAIL_NEEDED=true.*STOP HERE',
            'If YES:.*ZAD_DETECTED.*STOP HERE',
            'If YES:.*APP_TYPE=data_collection.*STOP HERE'
        ],
        message: 'Embedded decision templates found. Move to decision_logic in JSON files'
    },
    
    embedded_prompts: {
        patterns: [
            'You are a request analyzer.*Take the user.*request',
            'SEQUENTIAL DECISION TREE',
            '---WTAF_METADATA---.*EMAIL_NEEDED.*---END_METADATA---'
        ],
        message: 'Embedded prompt templates found. Move to _classifier-config.json'
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

function scanFileForViolations(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const violations = [];
    
    // Check each violation type
    Object.entries(VIOLATIONS).forEach(([violationType, config]) => {
        config.patterns.forEach(pattern => {
            const regex = new RegExp(pattern, 'gi');
            
            lines.forEach((line, lineNumber) => {
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

function validateArchitecture() {
    log('🔍 Validating separation of concerns...', 'blue');
    
    const engineDir = path.join(__dirname, '..', 'engine');
    const engineFiles = fs.readdirSync(engineDir)
        .filter(file => file.endsWith('.ts') && !file.endsWith('.bak.ts'))
        .map(file => path.join(engineDir, file));
    
    let totalViolations = 0;
    let hasViolations = false;
    
    engineFiles.forEach(filePath => {
        const fileName = path.basename(filePath);
        const violations = scanFileForViolations(filePath);
        
        if (violations.length > 0) {
            hasViolations = true;
            log(`\n❌ VIOLATIONS in ${fileName}:`, 'red');
            
            violations.forEach(violation => {
                log(`   Line ${violation.line}: ${violation.message}`, 'yellow');
                log(`   Found: "${violation.content}"`, 'red');
                log(`   Pattern: ${violation.pattern}`, 'red');
                log('');
                totalViolations++;
            });
        } else {
            log(`✅ ${fileName} - Clean`, 'green');
        }
    });
    
    if (hasViolations) {
        log('\n' + '='.repeat(60), 'red');
        log(`❌ ARCHITECTURE VALIDATION FAILED`, 'red');
        log(`Found ${totalViolations} separation of concerns violations`, 'red');
        log('', 'red');
        log('RULES VIOLATED:', 'red');
        log('- Engine files must NOT contain hardcoded business logic', 'red');
        log('- Classification rules belong in content/classification/*.json', 'red');
        log('- Prompt templates belong in _classifier-config.json', 'red');
        log('- Use composition functions, not switch statements', 'red');
        log('', 'red');
        log('Fix violations and run again.', 'red');
        log('='.repeat(60), 'red');
        
        process.exit(1);
    } else {
        log('\n✅ All engine files pass separation of concerns validation!', 'green');
        log('🏗️  Clean microservices architecture maintained', 'green');
    }
}

// Run validation
try {
    validateArchitecture();
} catch (error) {
    log(`❌ Validation script error: ${error.message}`, 'red');
    process.exit(1);
} 