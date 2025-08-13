/**
 * STARTUP GENERATOR MICROSERVICE
 * 
 * Generates dynamic lists of AI startups/unicorns for Hot or Not style rating apps
 * 
 * RESPONSIBILITIES:
 * - Generate realistic startup profiles with names, descriptions, valuations
 * - Provide different categories (AI, unicorns, emerging tech, etc.)
 * - Support different data formats for various app types
 * 
 * INTERFACES WITH:
 * - Hot or Not builder for rating interfaces
 * - ZAD builders for dynamic content population
 */

import { logWithTimestamp, logSuccess, logWarning } from './logger.js';

export interface StartupProfile {
    id: string;
    name: string;
    description: string;
    valuation: string;
    category: string;
    founded: number;
    stage: 'Seed' | 'Series A' | 'Series B' | 'Series C' | 'Unicorn' | 'Decacorn';
    industry: string;
    founders: string;
    tagline: string;
    imageUrl?: string;
}

export interface StartupGeneratorConfig {
    count: number;
    category: 'ai' | 'unicorns' | 'emerging' | 'fintech' | 'healthtech' | 'edtech' | 'all';
    includeUnicorns?: boolean;
    minValuation?: number;
    maxValuation?: number;
}

// AI Startup Templates
const AI_STARTUPS = [
    {
        nameTemplates: ['Neural{suffix}', 'AI{suffix}', 'Deep{suffix}', 'Quantum{suffix}', 'Cognitive{suffix}', 'Synthia{suffix}', 'Vertex{suffix}', 'Nexus{suffix}'],
        suffixes: ['Labs', 'AI', 'Mind', 'Logic', 'Flow', 'Core', 'Dynamics', 'Systems', 'Tech', 'Works', 'Labs', 'Intelligence'],
        descriptions: [
            'AI-powered customer service automation platform',
            'Machine learning infrastructure for enterprise data',
            'Computer vision platform for retail analytics',
            'Natural language processing for legal documents',
            'Autonomous drone delivery network',
            'AI-driven financial risk assessment',
            'Personalized learning AI for education',
            'Predictive maintenance for manufacturing',
            'AI content generation for marketing',
            'Conversational AI for healthcare'
        ],
        taglines: [
            'The future of intelligent automation',
            'Where data meets decision',
            'Powering tomorrow\'s insights today',
            'Intelligence amplified',
            'Making AI accessible to everyone',
            'The next generation of machine learning',
            'Transforming data into action',
            'Building the AI-first future',
            'Smart solutions for complex problems',
            'Democratizing artificial intelligence'
        ]
    }
];

// Unicorn Companies (Real and Generated)
const UNICORN_PROFILES = [
    {
        name: 'Stripe',
        description: 'Online payment processing platform for businesses',
        valuation: '$95 billion',
        category: 'Fintech',
        founded: 2010,
        stage: 'Decacorn' as const,
        industry: 'Financial Technology',
        founders: 'Patrick & John Collison',
        tagline: 'The new standard in online payments'
    },
    {
        name: 'SpaceX',
        description: 'Private space exploration and satellite internet',
        valuation: '$180 billion',
        category: 'Aerospace',
        founded: 2002,
        stage: 'Decacorn' as const,
        industry: 'Aerospace',
        founders: 'Elon Musk',
        tagline: 'Making humanity multiplanetary'
    },
    {
        name: 'ByteDance',
        description: 'AI-powered content platforms including TikTok',
        valuation: '$140 billion',
        category: 'Social Media',
        founded: 2012,
        stage: 'Decacorn' as const,
        industry: 'Social Technology',
        founders: 'Zhang Yiming',
        tagline: 'Inspiring creativity and enrich life'
    }
];

// Emerging Tech Categories
const EMERGING_CATEGORIES = {
    fintech: {
        nameTemplates: ['{prefix}Pay', '{prefix}Wallet', '{prefix}Fin', '{prefix}Bank', 'Neo{suffix}', 'Digital{suffix}'],
        prefixes: ['Quick', 'Smart', 'Fast', 'Easy', 'Flex', 'True', 'Clear', 'Pure'],
        suffixes: ['Finance', 'Pay', 'Capital', 'Lending', 'Credit', 'Wealth'],
        descriptions: [
            'Digital banking for millennials and Gen Z',
            'AI-powered investment advisory platform',
            'Peer-to-peer lending marketplace',
            'Cryptocurrency trading platform',
            'Small business expense management',
            'Real-time financial risk assessment',
            'Automated savings and budgeting app',
            'Cross-border payment solutions'
        ]
    },
    healthtech: {
        nameTemplates: ['Health{suffix}', 'Med{suffix}', 'Care{suffix}', '{prefix}Health', 'Bio{suffix}'],
        prefixes: ['Smart', 'Digital', 'Virtual', 'Remote', 'Precise', 'Vital'],
        suffixes: ['Tech', 'AI', 'Care', 'Labs', 'Systems', 'Analytics', 'Platform'],
        descriptions: [
            'AI-powered medical diagnosis platform',
            'Telemedicine for rural healthcare',
            'Wearable health monitoring devices',
            'Mental health therapy app',
            'Drug discovery using machine learning',
            'Personalized nutrition platform',
            'Digital therapeutics for chronic diseases',
            'Remote patient monitoring system'
        ]
    }
};

/**
 * Generate a random startup name
 */
function generateStartupName(category: string): string {
    const templates = AI_STARTUPS[0].nameTemplates;
    const suffixes = AI_STARTUPS[0].suffixes;
    
    const template = templates[Math.floor(Math.random() * templates.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    return template.replace('{suffix}', suffix);
}

/**
 * Generate a random valuation
 */
function generateValuation(min: number = 1, max: number = 100): string {
    const value = Math.floor(Math.random() * (max - min + 1)) + min;
    
    if (value >= 100) {
        return `$${(value / 10).toFixed(1)} billion`;
    } else if (value >= 10) {
        return `$${value} billion`;
    } else {
        return `$${value * 100} million`;
    }
}

/**
 * Generate a founding year
 */
function generateFoundingYear(): number {
    const currentYear = new Date().getFullYear();
    return Math.floor(Math.random() * (currentYear - 2010 + 1)) + 2010;
}

/**
 * Determine stage based on valuation
 */
function determineStage(valuation: string): StartupProfile['stage'] {
    const value = parseFloat(valuation.replace(/[^0-9.]/g, ''));
    if (valuation.includes('billion')) {
        if (value >= 100) return 'Decacorn';
        if (value >= 10) return 'Unicorn';
        return 'Series C';
    }
    return Math.random() > 0.5 ? 'Series B' : 'Series A';
}

/**
 * Generate founders names
 */
function generateFounders(): string {
    const firstNames = ['Alex', 'Sarah', 'Mike', 'Lisa', 'David', 'Emily', 'Chris', 'Anna', 'Ryan', 'Maya'];
    const lastNames = ['Chen', 'Smith', 'Johnson', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor'];
    
    const founder1 = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    
    if (Math.random() > 0.6) {
        const founder2 = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        return `${founder1} & ${founder2}`;
    }
    
    return founder1;
}

/**
 * Generate dynamic startup profiles
 */
export async function generateStartupProfiles(config: StartupGeneratorConfig): Promise<StartupProfile[]> {
    logWithTimestamp(`🚀 Generating ${config.count} startup profiles for category: ${config.category}`);
    
    const profiles: StartupProfile[] = [];
    
    // Include some real unicorns if requested
    if (config.includeUnicorns && (config.category === 'unicorns' || config.category === 'all')) {
        const unicornCount = Math.min(3, config.count);
        for (let i = 0; i < unicornCount && i < UNICORN_PROFILES.length; i++) {
            const unicorn = UNICORN_PROFILES[i];
            profiles.push({
                ...unicorn,
                id: `unicorn_${i + 1}`
            });
        }
    }
    
    // Generate synthetic profiles for the remaining slots
    const remaining = config.count - profiles.length;
    
    for (let i = 0; i < remaining; i++) {
        const name = generateStartupName(config.category);
        const valuation = generateValuation(config.minValuation, config.maxValuation);
        const founded = generateFoundingYear();
        const stage = determineStage(valuation);
        const founders = generateFounders();
        
        // Get description and tagline based on category
        const descriptions = AI_STARTUPS[0].descriptions;
        const taglines = AI_STARTUPS[0].taglines;
        
        const description = descriptions[Math.floor(Math.random() * descriptions.length)];
        const tagline = taglines[Math.floor(Math.random() * taglines.length)];
        
        profiles.push({
            id: `startup_${profiles.length + 1}`,
            name,
            description,
            valuation,
            category: config.category.charAt(0).toUpperCase() + config.category.slice(1),
            founded,
            stage,
            industry: 'Artificial Intelligence',
            founders,
            tagline
        });
    }
    
    logSuccess(`✅ Generated ${profiles.length} startup profiles`);
    return profiles;
}

/**
 * Generate Hot or Not style rating data
 */
export async function generateHotOrNotData(count: number = 20): Promise<StartupProfile[]> {
    const config: StartupGeneratorConfig = {
        count,
        category: 'ai',
        includeUnicorns: true,
        minValuation: 10,
        maxValuation: 500
    };
    
    const profiles = await generateStartupProfiles(config);
    
    // Shuffle array for random ordering
    for (let i = profiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [profiles[i], profiles[j]] = [profiles[j], profiles[i]];
    }
    
    return profiles;
}

/**
 * Format startup data for ZAD apps
 */
export function formatForZAD(profiles: StartupProfile[]) {
    return profiles.map(profile => ({
        startup_name: profile.name,
        description: profile.description,
        valuation: profile.valuation,
        stage: profile.stage,
        founders: profile.founders,
        tagline: profile.tagline,
        rating: 0,
        votes: 0
    }));
}

/**
 * Generate startup data as JavaScript array for injection
 */
export async function generateStartupJSArray(count: number = 20): Promise<string> {
    const profiles = await generateHotOrNotData(count);
    const jsData = formatForZAD(profiles);
    
    return `const STARTUP_DATA = ${JSON.stringify(jsData, null, 2)};`;
}