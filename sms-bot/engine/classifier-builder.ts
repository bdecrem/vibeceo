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
    step_title: string;
    step_description: string;
    description: string;
    // Support both old nested format and new top-level format
    good_examples?: string[];
    bad_examples?: string[];
    indicators?: string[];
    key_indicators?: string[];
    rejection_criteria?: string[];
    examples?: {
        good_examples?: string[];
        bad_examples?: string[];
        indicators?: string[];
        key_indicators?: string[];
        rejection_criteria?: string[];
    };
    decision_logic: {
        if_yes: string;
        if_no: string;
    };
    metadata_output?: Record<string, string>;
    [key: string]: any; // Allow additional fields
}

interface ClassifierConfig {
    main_instructions: string;
    fallback_step: {
        step_number: number;
        title: string;
        description: string;
        decision: string;
    };
    metadata_format: {
        intro: string;
        template: string;
    };
}

interface DecisionStep {
    stepNumber: number;
    stepTitle: string;
    stepDescription: string;
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
 * Load classifier configuration
 */
async function loadClassifierConfig(): Promise<ClassifierConfig | null> {
    try {
        const filePath = join(__dirname, '..', '..', 'content', 'classification', '_classifier-config.json');
        const content = await readFile(filePath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        logWarning(`Error loading classifier config: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/**
 * Load all classification modules in the correct order
 */
async function loadAllModules(): Promise<ClassificationLogic[]> {
    const moduleFiles = [
        'needs-email.json',
        'is-it-a-zad.json', 
        'needs-admin.json'
    ];

    const modules = await Promise.all(
        moduleFiles.map(file => loadClassificationLogic(file))
    );

    return modules.filter(Boolean) as ClassificationLogic[];
}

/**
 * Build a decision step section for a module
 */
function buildDecisionStep(module: ClassificationLogic, stepNumber: number): DecisionStep {
    // Support both old nested format and new top-level format
    const examples = (module as any).good_examples || module.examples?.good_examples || [];
    const indicators = (module as any).indicators || (module as any).key_indicators || module.examples?.key_indicators || module.examples?.indicators || [];
    const rejectionCriteria = (module as any).rejection_criteria || module.examples?.rejection_criteria || [];
    
    const decision = `→ If YES: ${module.decision_logic.if_yes}\n→ If NO: ${module.decision_logic.if_no}`;

    return {
        stepNumber,
        stepTitle: module.step_title,
        stepDescription: module.step_description,
        description: module.description,
        examples,
        indicators,
        rejectionCriteria,
        decision
    };
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
async function buildStepSection(step: DecisionStep): Promise<string> {
    let section = `🔍 STEP ${step.stepNumber}: Does it just need one thing (${step.stepTitle})?\n`;
    section += `${step.stepDescription}\n\n`;
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
    
    let decision = step.decision;
    
    // Special handling for ZAD step: inject template content for smart recommendations
    if (step.stepTitle.includes('ZAD') && decision.includes('[TEMPLATE_CONTENT_PLACEHOLDER]')) {
        try {
            const templatePath = join(__dirname, '..', '..', 'content', 'builder-zad-v0.json');
            const templateContent = await readFile(templatePath, 'utf8');
            decision = decision.replace('[TEMPLATE_CONTENT_PLACEHOLDER]', templateContent);
            logWithTimestamp("📖 ZAD template injected into classifier for smart recommendations");
        } catch (error) {
            logWarning(`Failed to load ZAD template: ${error instanceof Error ? error.message : String(error)}`);
            decision = decision.replace('[TEMPLATE_CONTENT_PLACEHOLDER]', '[Template could not be loaded]');
        }
    }
    
    section += `${decision}\n`;
    
    return section;
}

/**
 * Build the complete classifier prompt content
 */
async function assembleClassifierPrompt(steps: DecisionStep[], config: ClassifierConfig): Promise<string> {
    const instructions = `${config.main_instructions}\n\n`;
    const stepsContent = await Promise.all(steps.map(step => buildStepSection(step)));
    const stepsText = stepsContent.join('\n');
    
    const fallbackStep = `🔍 STEP ${config.fallback_step.step_number}: ${config.fallback_step.title}\n${config.fallback_step.description}\n\n→ ${config.fallback_step.decision}\n\n`;

    const metadataFormat = `${config.metadata_format.intro}\n\n${config.metadata_format.template}`;

    return instructions + stepsText + fallbackStep + metadataFormat;
}

/**
 * Build complete classifier prompt from modular components
 * Returns the same format as the old classifier.json for drop-in replacement
 */
export async function buildClassifierPrompt(): Promise<ChatCompletionMessageParam | null> {
    logWithTimestamp("🔧 Building modular classifier prompt...");
    
    try {
        // Load all classification modules and config
        const [modules, config] = await Promise.all([
            loadAllModules(),
            loadClassifierConfig()
        ]);

        if (modules.length !== 3) {
            logWarning("Failed to load all classification logic files");
            return null;
        }

        if (!config) {
            logWarning("Failed to load classifier configuration");
            return null;
        }

        logWithTimestamp(`✅ Loaded ${modules.length} classification modules: ${modules.map(m => m.classification_type).join(', ')}`);

        // Build decision steps from modules
        const steps = modules.map((module, index) => buildDecisionStep(module, index + 1));

        // Assemble the final prompt
        const classifierContent = await assembleClassifierPrompt(steps, config);

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