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

interface DecisionStep {
    stepNumber: number;
    stepTitle: string;
    description: string;
    examples: string[];
    indicators?: string[];
    rejectionCriteria?: string[];
    decision: string;
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
 * Load all classification modules in the correct order
 */
async function loadAllModules(): Promise<ClassificationLogic[]> {
    const moduleFiles = [
        { file: 'needs-email.json', title: 'EMAIL DISPLAY' },
        { file: 'is-it-a-zad.json', title: 'ZERO ADMIN DATA' },
        { file: 'needs-admin.json', title: 'ADMIN URL' }
    ];

    const modules = await Promise.all(
        moduleFiles.map(async ({ file, title }) => {
            const module = await loadClassificationLogic(file);
            if (module) {
                module._stepTitle = title; // Add step title for composition
            }
            return module;
        })
    );

    return modules.filter(Boolean) as ClassificationLogic[];
}

/**
 * Build a decision step section for a module
 */
function buildDecisionStep(module: ClassificationLogic, stepNumber: number): DecisionStep {
    const examples = module.examples.good_examples || [];
    const indicators = module.examples.key_indicators || module.examples.indicators || [];
    const rejectionCriteria = module.examples.rejection_criteria || [];

    return {
        stepNumber,
        stepTitle: module._stepTitle || module.classification_type,
        description: module.description,
        examples,
        indicators,
        rejectionCriteria,
        decision: buildDecisionText(module)
    };
}

/**
 * Build decision text for each module type
 */
function buildDecisionText(module: ClassificationLogic): string {
    switch (module.classification_type) {
        case 'needs-email':
            return '→ If YES: EMAIL_NEEDED=true, APP_TYPE=simple_email, STOP HERE\n→ If NO: Continue to Step 2';
        
        case 'zero-admin-data':
            return '→ If YES: Just return "ZAD_DETECTED" - no detailed brief needed for ZAD apps.\nSet: ZERO_ADMIN_DATA=true, APP_TYPE=zero_admin_data, STOP HERE\n→ If NO: Continue to Step 3';
        
        case 'needs-admin':
            return '→ If YES: APP_TYPE=data_collection, STOP HERE\n→ If NO: Continue to Step 4';
        
        default:
            return '→ Process as standard app';
    }
}

/**
 * Format examples list
 */
function formatExamples(examples: string[]): string {
    return examples.map(example => `- ${example}`).join('\n');
}

/**
 * Format indicators list
 */
function formatIndicators(indicators: string[]): string {
    return indicators.map(indicator => `- ${indicator}`).join('\n');
}

/**
 * Build a complete decision step section
 */
function buildStepSection(step: DecisionStep): string {
    // Step-specific titles and descriptions
    const stepInfo = {
        1: { 
            title: "EMAIL DISPLAY",
            description: "Check if this is a simple page that only needs to show contact information:"
        },
        2: { 
            title: "ZAD (Zero Admin Data)",
            description: "Check if this is a collaborative app for small groups:"
        },
        3: { 
            title: "ADMIN URL",
            description: "Check if this collects data FROM users and needs owner management:"
        }
    };

    const info = stepInfo[step.stepNumber as keyof typeof stepInfo];
    const title = info?.title || step.stepTitle;
    const description = info?.description || 'Check the request type:';

    let section = `🔍 STEP ${step.stepNumber}: Does it just need one thing (${title})?\n`;
    section += `${description}\n\n`;
    section += `${step.description}\n\n`;
    
    if (step.examples.length > 0) {
        section += `Examples:\n${formatExamples(step.examples)}\n\n`;
    }
    
    if (step.indicators && step.indicators.length > 0) {
        section += `Key Indicators:\n${formatIndicators(step.indicators)}\n\n`;
    }
    
    if (step.rejectionCriteria && step.rejectionCriteria.length > 0) {
        section += `Rejection Criteria:\n${formatIndicators(step.rejectionCriteria)}\n\n`;
    }
    
    section += `${step.decision}\n`;
    
    return section;
}

/**
 * Build the complete classifier prompt content
 */
function assembleClassifierPrompt(steps: DecisionStep[]): string {
    const instructions = `You are a request analyzer. Take the user's request and return a clear, detailed description of what they want built. If a coach personality is provided, incorporate their voice and style into your description of what should be built. The final description should include both the content requirements AND the personality/voice that should be used.

After providing the expanded description, classify the request using this SEQUENTIAL DECISION TREE:

`;

    const stepsContent = steps.map(step => buildStepSection(step)).join('\n');
    
    const fallbackStep = `🔍 STEP 4: Standard app design (fallback)
This is a regular app that doesn't fit the above categories.

→ APP_TYPE=standard_app

`;

    const metadataFormat = `After your expanded description, add this exact format:

---WTAF_METADATA---
EMAIL_NEEDED: [true/false]
EMAIL_CONTEXT: [brief description of why email display is needed, or 'none' if false]
ZERO_ADMIN_DATA: [true/false]
ZERO_ADMIN_CONTEXT: [brief description of multi-user social features needed, or 'none' if false]
APP_TYPE: [simple_email|data_collection|zero_admin_data|standard_app]
---END_METADATA---`;

    return instructions + stepsContent + fallbackStep + metadataFormat;
}

/**
 * Build complete classifier prompt from modular components
 * Returns the same format as the old classifier.json for drop-in replacement
 */
export async function buildClassifierPrompt(): Promise<ChatCompletionMessageParam | null> {
    logWithTimestamp("🔧 Building modular classifier prompt...");
    
    try {
        // Load all classification modules
        const modules = await loadAllModules();

        if (modules.length !== 3) {
            logWarning("Failed to load all classification logic files");
            return null;
        }

        logWithTimestamp(`✅ Loaded ${modules.length} classification modules: ${modules.map(m => m.classification_type).join(', ')}`);

        // Build decision steps from modules
        const steps = modules.map((module, index) => buildDecisionStep(module, index + 1));

        // Assemble the final prompt
        const classifierContent = assembleClassifierPrompt(steps);

        logSuccess("🔧 Modular classifier prompt built successfully");
        
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

/**
 * Get classification examples for debugging/testing
 */
export async function getClassificationExamples(): Promise<Record<string, ClassificationLogic> | null> {
    try {
        const modules = await loadAllModules();

        if (modules.length === 0) {
            return null;
        }

        return modules.reduce((acc, module) => {
            acc[module.classification_type] = module;
            return acc;
        }, {} as Record<string, ClassificationLogic>);
    } catch (error) {
        logWarning(`Error getting classification examples: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
} 