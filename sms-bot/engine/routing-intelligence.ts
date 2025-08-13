/**
 * ROUTING INTELLIGENCE MICROSERVICE
 * 
 * Centralizes all routing knowledge and provides context-aware routing decisions.
 * This replaces the scattered routing logic across controller.ts and wtaf-processor.ts
 * with a unified, intelligent system that preserves shortcuts but informs the classifier.
 * 
 * RESPONSIBILITIES:
 * - Detect and apply routing shortcuts (flags, keywords, markers)
 * - Generate context for classifier about routing decisions
 * - Provide unified interface for all routing logic
 * - Maintain routing decision history for classifier learning
 * 
 * INTERFACES WITH:
 * - controller.ts (replaces flag-based routing)
 * - wtaf-processor.ts (replaces keyword-based routing)
 * - classifier-builder.ts (provides routing context)
 */

import { logWithTimestamp, logWarning, logSuccess } from './shared/logger.js';
import { detectRequestType } from './shared/utils.js';

// Type definitions for routing decisions
export interface RoutingDecision {
    routeType: 'shortcut' | 'classifier' | 'fallback';
    builderType: string;
    reason: string;
    bypassClassifier: boolean;
    context: string;
    confidence: 'high' | 'medium' | 'low';
}

export interface ShortcutMatch {
    type: 'flag' | 'keyword' | 'marker';
    pattern: string;
    builderType: string;
    priority: number; // Higher number = higher priority
}

// Complete registry of all available builders and their routing patterns
const BUILDER_REGISTRY = {
    // Game builders
    'game': {
        patterns: [
            { type: 'keyword', pattern: 'game', priority: 100 },
            { type: 'keyword', pattern: 'pong', priority: 100 },
            { type: 'keyword', pattern: 'tetris', priority: 100 },
            { type: 'keyword', pattern: 'snake', priority: 100 },
            { type: 'keyword', pattern: 'tic-tac-toe', priority: 100 },
            { type: 'keyword', pattern: 'memory game', priority: 100 },
            { type: 'keyword', pattern: 'arcade', priority: 100 },
            { type: 'keyword', pattern: 'solitaire', priority: 100 },
            { type: 'keyword', pattern: 'blackjack', priority: 100 },
            { type: 'keyword', pattern: 'breakout', priority: 100 },
            { type: 'keyword', pattern: 'flappy', priority: 100 },
            { type: 'keyword', pattern: 'platformer', priority: 100 }
        ],
        description: 'Interactive games with canvas/controls',
        bypasses_classifier: true
    },
    
    // Admin builders
    'admin-dual-page': {
        patterns: [
            { type: 'flag', pattern: '--admin', priority: 90 },
            { type: 'marker', pattern: 'ADMIN_DUAL_PAGE_REQUEST', priority: 90 }
        ],
        description: 'Dual-page admin system with form + dashboard',
        bypasses_classifier: true
    },
    
    'admin-minimal-test': {
        patterns: [
            { type: 'flag', pattern: '--admin-test', priority: 95 },
            { type: 'marker', pattern: 'ADMIN_TEST_MARKER', priority: 95 }
        ],
        description: 'Minimal test admin interface',
        bypasses_classifier: true
    },

    // ZAD (Zero Admin Data) builders
    'zad-comprehensive': {
        patterns: [
            { type: 'marker', pattern: 'ZAD_COMPREHENSIVE_REQUEST', priority: 85 }
        ],
        description: 'Multi-user collaborative apps (≤5 people)',
        bypasses_classifier: false // Uses classifier for ZAD detection
    },

    'zad-public': {
        patterns: [
            { type: 'flag', pattern: '--stackpublic', priority: 80 },
            { type: 'keyword', pattern: 'PUBLIC', priority: 80 },
            { type: 'keyword', pattern: 'public', priority: 80 },
            { type: 'marker', pattern: 'ZAD_PUBLIC_REQUEST', priority: 80 }
        ],
        description: 'Public collaborative apps with shared data',
        bypasses_classifier: true
    },

    'zad-simple-test': {
        patterns: [
            { type: 'flag', pattern: '--zad-test', priority: 88 },
            { type: 'marker', pattern: 'ZAD_TEST_MARKER', priority: 88 }
        ],
        description: 'Simple ZAD test with basic authentication',
        bypasses_classifier: true
    },

    'zad-comprehensive-api': {
        patterns: [
            { type: 'flag', pattern: '--zad-api', priority: 87 },
            { type: 'marker', pattern: 'ZAD_API_MARKER', priority: 87 }
        ],
        description: 'Comprehensive ZAD with API conversion',
        bypasses_classifier: true
    },

    'zad-stackzad': {
        patterns: [
            { type: 'flag', pattern: '--stackzad', priority: 82 }
        ],
        description: 'ZAD apps with shared data access',
        bypasses_classifier: true
    },

    // Music builders
    'music': {
        patterns: [
            { type: 'flag', pattern: '--music', priority: 75 },
            { type: 'marker', pattern: 'MUSIC_MARKER', priority: 75 }
        ],
        description: 'Music streaming/player applications',
        bypasses_classifier: true
    },

    // Rating/Hot-or-Not builders
    'hotnot-rating': {
        patterns: [
            { type: 'keyword', pattern: 'hot or not', priority: 70 },
            { type: 'keyword', pattern: 'hotnot', priority: 70 },
            { type: 'keyword', pattern: 'rate startups', priority: 70 },
            { type: 'keyword', pattern: 'rating app', priority: 70 },
            { type: 'marker', pattern: 'HOTNOT_RATING_REQUEST', priority: 70 }
        ],
        description: 'Rating interfaces for startups/items',
        bypasses_classifier: true
    },

    // Stack command builders
    'stackables': {
        patterns: [
            { type: 'flag', pattern: '--stack', priority: 60 }
        ],
        description: 'Template-based apps using existing HTML',
        bypasses_classifier: true
    },

    'stackdb': {
        patterns: [
            { type: 'flag', pattern: '--stackdb', priority: 85 }
        ],
        description: 'Apps with live database connection from existing app',
        bypasses_classifier: true
    },

    'stackdata': {
        patterns: [
            { type: 'flag', pattern: '--stackdata', priority: 65 }
        ],
        description: 'Apps using submission data from existing app',
        bypasses_classifier: true
    },

    'stackobjectify': {
        patterns: [
            { type: 'flag', pattern: '--stackobjectify', priority: 63 }
        ],
        description: 'Object pages from ZAD data (OPERATOR only)',
        bypasses_classifier: true
    },

    'stackemail': {
        patterns: [
            { type: 'flag', pattern: '--stackemail', priority: 55 }
        ],
        description: 'Email all app submitters',
        bypasses_classifier: true
    },

    'remix': {
        patterns: [
            { type: 'flag', pattern: '--remix', priority: 50 }
        ],
        description: 'Remix existing apps with changes',
        bypasses_classifier: true
    },

    // Standard app builders (used by classifier)
    'standard-app': {
        patterns: [],
        description: 'General purpose web applications',
        bypasses_classifier: false
    },

    'simple-email': {
        patterns: [],
        description: 'Simple pages that display contact information',
        bypasses_classifier: false
    },

    'data-collection': {
        patterns: [],
        description: 'Forms that collect data for the creator',
        bypasses_classifier: false
    }
} as const;

/**
 * Detect routing shortcuts in user input
 * Returns the highest priority shortcut match, if any
 */
export function detectShortcuts(userInput: string): ShortcutMatch | null {
    const inputLower = userInput.toLowerCase();
    let bestMatch: ShortcutMatch | null = null;
    let highestPriority = -1;

    for (const [builderType, config] of Object.entries(BUILDER_REGISTRY)) {
        for (const pattern of config.patterns) {
            let isMatch = false;

            switch (pattern.type) {
                case 'flag':
                    isMatch = userInput.startsWith(pattern.pattern + ' ') || 
                             userInput.startsWith('wtaf ' + pattern.pattern + ' ');
                    break;
                
                case 'keyword':
                    if (pattern.pattern.includes(' ')) {
                        // Phrase matching
                        isMatch = inputLower.includes(pattern.pattern);
                    } else {
                        // Word boundary matching for single words
                        const regex = new RegExp(`\\b${pattern.pattern.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`);
                        isMatch = regex.test(inputLower);
                    }
                    break;
                
                case 'marker':
                    isMatch = userInput.includes(pattern.pattern);
                    break;
            }

            if (isMatch && pattern.priority > highestPriority) {
                bestMatch = {
                    type: pattern.type,
                    pattern: pattern.pattern,
                    builderType: builderType,
                    priority: pattern.priority
                };
                highestPriority = pattern.priority;
            }
        }
    }

    return bestMatch;
}

/**
 * Make intelligent routing decision
 * This is the main entry point that replaces scattered routing logic
 */
export function makeRoutingDecision(userInput: string): RoutingDecision {
    logWithTimestamp("🧠 ROUTING INTELLIGENCE: Making routing decision...");
    
    // Step 1: Check for shortcuts (highest priority)
    const shortcut = detectShortcuts(userInput);
    if (shortcut) {
        const builderConfig = BUILDER_REGISTRY[shortcut.builderType as keyof typeof BUILDER_REGISTRY];
        const decision: RoutingDecision = {
            routeType: 'shortcut',
            builderType: shortcut.builderType,
            reason: `Detected ${shortcut.type}: "${shortcut.pattern}"`,
            bypassClassifier: builderConfig.bypasses_classifier,
            context: `${shortcut.type.toUpperCase()} SHORTCUT: "${shortcut.pattern}" → ${builderConfig.description}`,
            confidence: 'high'
        };
        
        logWithTimestamp(`🎯 SHORTCUT ROUTING: ${decision.context}`);
        logWithTimestamp(`🔀 Classifier bypass: ${decision.bypassClassifier}`);
        return decision;
    }

    // Step 2: Check for game detection using existing logic
    const requestType = detectRequestType(userInput);
    if (requestType === 'game') {
        const decision: RoutingDecision = {
            routeType: 'shortcut',
            builderType: 'game',
            reason: 'Game keywords detected in request',
            bypassClassifier: true,
            context: 'GAME DETECTION: Contains game-related keywords → Interactive games with canvas/controls',
            confidence: 'high'
        };
        
        logWithTimestamp(`🎮 GAME ROUTING: ${decision.context}`);
        return decision;
    }

    // Step 3: Route to classifier for intelligent analysis
    const decision: RoutingDecision = {
        routeType: 'classifier',
        builderType: 'to-be-determined',
        reason: 'No shortcuts detected, requires classifier analysis',
        bypassClassifier: false,
        context: 'CLASSIFIER ROUTE: Complex request requires intelligent analysis',
        confidence: 'medium'
    };
    
    logWithTimestamp(`📋 CLASSIFIER ROUTING: ${decision.context}`);
    return decision;
}

/**
 * Generate routing context for classifier
 * This provides the classifier with knowledge of all available builders
 */
export function generateRoutingContext(): string {
    const builderDescriptions = Object.entries(BUILDER_REGISTRY)
        .map(([builderType, config]) => {
            const patterns = config.patterns.length > 0 
                ? ` (shortcuts: ${config.patterns.map(p => p.pattern).join(', ')})` 
                : '';
            return `- **${builderType}**: ${config.description}${patterns}`;
        })
        .join('\n');

    return `
## AVAILABLE BUILDERS & ROUTING CONTEXT

The system has the following specialized builders available:

${builderDescriptions}

### ROUTING INTELLIGENCE:
- Shortcuts (flags, keywords, markers) bypass classifier for obvious cases
- Complex requests use classifier for intelligent analysis
- All routing decisions are context-aware and logged
- Classifier can recommend any builder based on request analysis

### DECISION PRIORITY:
1. **Flags** (--admin, --zad-test, etc.) - Explicit user intent
2. **Game Keywords** - Content-based detection  
3. **Special Keywords** (PUBLIC, hot or not, etc.) - Domain-specific patterns
4. **Classifier Analysis** - Intelligent routing for complex cases

When making routing recommendations, consider:
- User's explicit intent (flags)
- Content type and complexity
- Multi-user collaboration needs
- Data collection requirements
- Administrative features needed
`;
}

/**
 * Apply routing decision and generate appropriate markers/prompts
 * This replaces the marker injection logic scattered across wtaf-processor.ts
 */
export function applyRoutingDecision(decision: RoutingDecision, originalInput: string): string {
    if (decision.routeType === 'shortcut' && decision.bypassClassifier) {
        // Generate appropriate markers for wtaf-processor
        switch (decision.builderType) {
            case 'admin-dual-page':
                return originalInput.replace(originalInput, `ADMIN_DUAL_PAGE_REQUEST: ${originalInput}\n\nEMAIL_NEEDED: false\nZERO_ADMIN_DATA: false\nAPP_TYPE: data_collection`);
                
            case 'admin-minimal-test':
                return `ADMIN_TEST_REQUEST: ${originalInput.replace('ADMIN_TEST_MARKER', '').trim()}\n\nEMAIL_NEEDED: false\nZERO_ADMIN_DATA: false\nAPP_TYPE: data_collection`;
                
            case 'zad-public':
                return `ZAD_PUBLIC_REQUEST: ${originalInput}\n\nEMAIL_NEEDED: false\nZERO_ADMIN_DATA: true\nAPP_TYPE: zero_admin_data`;
                
            case 'zad-simple-test':
                return `ZAD_TEST_REQUEST: ${originalInput.replace('ZAD_TEST_MARKER', '').trim()}\n\nEMAIL_NEEDED: false\nZERO_ADMIN_DATA: true\nAPP_TYPE: zero_admin_data`;
                
            case 'zad-comprehensive-api':
                return `ZAD_API_REQUEST: ${originalInput.replace('ZAD_API_MARKER', '').trim()}\n\nEMAIL_NEEDED: false\nZERO_ADMIN_DATA: true\nAPP_TYPE: zero_admin_data`;
                
            case 'music':
                return `MUSIC_APP_REQUEST: ${originalInput.replace('MUSIC_MARKER', '').trim()}\n\nEMAIL_NEEDED: false\nZERO_ADMIN_DATA: false\nAPP_TYPE: music_app`;
                
            case 'hotnot-rating':
                return `HOTNOT_RATING_REQUEST: ${originalInput}\n\nEMAIL_NEEDED: false\nZERO_ADMIN_DATA: true\nAPP_TYPE: rating_interface`;
                
            case 'game':
                // Games don't need metadata modification
                return originalInput;
                
            default:
                logWarning(`Unknown shortcut builder type: ${decision.builderType}`);
                return originalInput;
        }
    }
    
    // For classifier routing, return original input
    return originalInput;
}

/**
 * Get builder information for a specific builder type
 */
export function getBuilderInfo(builderType: string): typeof BUILDER_REGISTRY[keyof typeof BUILDER_REGISTRY] | null {
    return BUILDER_REGISTRY[builderType as keyof typeof BUILDER_REGISTRY] || null;
}

/**
 * Get all available builder types
 */
export function getAllBuilderTypes(): string[] {
    return Object.keys(BUILDER_REGISTRY);
}

logSuccess("🧠 Routing Intelligence initialized with comprehensive builder knowledge");