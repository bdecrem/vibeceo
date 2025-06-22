/**
 * CLASSIFIER BUILDER MICROSERVICE
 * 
 * Replaces the monolithic classifier.json with a modular system.
 * Combines 3 separate classification logic files into a complete classifier prompt.
 * 
 * RESPONSIBILITIES:
 * - Load and parse the 3 classification files
 * - Combine them into proper format for AI classifier
 * - Return same interface as old classifier.json for drop-in replacement
 * 
 * INTERFACES WITH:
 * - wtaf-processor.ts (returns classifier prompt)
 * - content/classification/*.json (loads modular logic)
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logWithTimestamp, logWarning, logSuccess } from './shared/logger.js';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Type definitions for classification logic files
interface ClassificationLogic {
    classification_type: string;
    description: string;
    examples: {
        good_examples?: string[];
        bad_examples?: string[];
        indicators?: string[];
        key_indicators?: string[];
        rejection_criteria?: string[];
    };
    metadata_output: Record<string, string>;
    [key: string]: any; // Allow additional fields
}

/**
 * Load a classification logic file
 */
async function loadClassificationLogic(filename: string): Promise<ClassificationLogic | null> {
    try {
        const filePath = join(__dirname, '..', '..', 'content', 'classification', filename);
        const content = await readFile(filePath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        logWarning(`Error loading classification logic ${filename}: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/**
 * Build complete classifier prompt from modular components
 * Returns the same format as the old classifier.json for drop-in replacement
 */
export async function buildClassifierPrompt(): Promise<ChatCompletionMessageParam | null> {
    logWithTimestamp("🔧 Building modular classifier prompt...");
    
    try {
        // Load the 3 classification logic files (removed ZAD briefing - no longer needed)
        const [needsEmail, isZad, needsAdmin] = await Promise.all([
            loadClassificationLogic('needs-email.json'),
            loadClassificationLogic('is-it-a-zad.json'),
            loadClassificationLogic('needs-admin.json')
        ]);

        if (!needsEmail || !isZad || !needsAdmin) {
            logWarning("Failed to load one or more classification logic files");
            return null;
        }

        logWithTimestamp(`✅ Loaded 3 classification modules: ${needsEmail.classification_type}, ${isZad.classification_type}, ${needsAdmin.classification_type}`);

        // Build the simplified classifier prompt content using sequential decision tree
        const classifierContent = `You are a request analyzer. Take the user's request and return a clear, detailed description of what they want built. If a coach personality is provided, incorporate their voice and style into your description of what should be built. The final description should include both the content requirements AND the personality/voice that should be used.

After providing the expanded description, classify the request using this SEQUENTIAL DECISION TREE:

🔍 STEP 1: Does it just need one thing (EMAIL DISPLAY)?
Check if this is a simple page that only needs to show contact information:

${needsEmail.description}

Examples:
${needsEmail.examples.good_examples?.map(example => `- ${example}`).join('\n')}

→ If YES: EMAIL_NEEDED=true, APP_TYPE=simple_email, STOP HERE
→ If NO: Continue to Step 2

🔍 STEP 2: Is it a ZAD (Zero Admin Data)?  
Check if this is a collaborative app for small groups:

${isZad.description}

Examples:
${isZad.examples.good_examples?.map(example => `- ${example}`).join('\n')}

Key Indicators:
${isZad.examples.key_indicators?.map(indicator => `- ${indicator}`).join('\n')}

Rejection Criteria:
${isZad.examples.rejection_criteria?.map(criteria => `- ${criteria}`).join('\n')}

→ If YES: Just return "ZAD_DETECTED" - no detailed brief needed for ZAD apps.
Set: ZERO_ADMIN_DATA=true, APP_TYPE=zero_admin_data, STOP HERE
→ If NO: Continue to Step 3

🔍 STEP 3: Does it need an admin URL?
Check if this collects data FROM users and needs owner management:

${needsAdmin.description}

Examples:
${needsAdmin.examples.good_examples?.map(example => `- ${example}`).join('\n')}

→ If YES: APP_TYPE=data_collection, STOP HERE
→ If NO: Continue to Step 4

🔍 STEP 4: Standard app design (fallback)
This is a regular app that doesn't fit the above categories.

→ APP_TYPE=standard_app

After your expanded description, add this exact format:

---WTAF_METADATA---
EMAIL_NEEDED: [true/false]
EMAIL_CONTEXT: [brief description of why email display is needed, or 'none' if false]
ZERO_ADMIN_DATA: [true/false]
ZERO_ADMIN_CONTEXT: [brief description of multi-user social features needed, or 'none' if false]
APP_TYPE: [simple_email|data_collection|zero_admin_data|standard_app]
---END_METADATA---`;

        logSuccess("🔧 Simplified classifier prompt built successfully");
        
        // Return in the same format as old classifier.json
        return {
            role: "system",
            content: classifierContent
        } as ChatCompletionMessageParam;

    } catch (error) {
        logWarning(`Error building classifier prompt: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

// ZAD creative prompt function removed - instructions now integrated into classifier

/**
 * Get classification examples for debugging/testing
 */
export async function getClassificationExamples(): Promise<Record<string, ClassificationLogic> | null> {
    try {
        const [needsEmail, isZad, needsAdmin] = await Promise.all([
            loadClassificationLogic('needs-email.json'),
            loadClassificationLogic('is-it-a-zad.json'),
            loadClassificationLogic('needs-admin.json')
        ]);

        if (!needsEmail || !isZad || !needsAdmin) {
            return null;
        }

        return {
            'needs-email': needsEmail,
            'zero-admin-data': isZad,
            'needs-admin': needsAdmin
        };
    } catch (error) {
        logWarning(`Error getting classification examples: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
} 