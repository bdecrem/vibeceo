// Test script to verify seed extraction

function extractSelectedSeed(output) {
    // Try to find the seed with the updated format which includes the fragment
    const seedWithFragmentMatch = output.match(/Selected seed from category "([^"]+)": "([^"]+)" with fragment: "([^"]+)"/);
    if (seedWithFragmentMatch) {
        const [_, category, seedText, sentenceFragment] = seedWithFragmentMatch;
        console.log(`Found seed with category "${category}", text "${seedText}", fragment "${sentenceFragment}"`);
        return {
            text: seedText,
            sentence_fragment: sentenceFragment
        };
    }
    
    // Fall back to the older format if needed
    const seedMatch = output.match(/Selected seed from category "([^"]+)": "([^"]+)"/);
    if (seedMatch) {
        const seedText = seedMatch[2];
        console.log("Found seed text in older format:", seedText);
        return {
            text: seedText,
            sentence_fragment: null // Would need to look up in JSON file in real implementation
        };
    }
    
    console.warn("Could not find seed in script output");
    return null;
}

// Test cases
const testOutput1 = `
Loading environment from: /some/path/.env.local
Selected seed from category "🌀 Emotional Spiral Starters": "I think someone is microdosing in the pitch deck." with fragment: "someone is allegedly microdosing in the pitch deck"
`;

const testOutput2 = `
Loading environment from: /some/path/.env.local
Selected seed from category "🧠 Strategic Nonsense": "We need to improve internal alignment."
`;

console.log("Test 1 - New format with fragment:");
const result1 = extractSelectedSeed(testOutput1);
console.log("Extraction result:", result1);

console.log("\nTest 2 - Old format without fragment:");
const result2 = extractSelectedSeed(testOutput2);
console.log("Extraction result:", result2); 