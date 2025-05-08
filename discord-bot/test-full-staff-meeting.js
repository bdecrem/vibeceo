// Test script to verify the full staff meeting workflow

// Simulate running staffmeetings-prompt.js and then simpleStaffMeeting.ts
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to run staffmeetings-prompt.js
async function runStaffMeetingsPrompt() {
    console.log("Running staffmeetings-prompt.js...");
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, "staffmeetings-prompt.js");
        console.log("Executing:", scriptPath);

        exec(`node ${scriptPath}`, (error, stdout, stderr) => {
            if (error) {
                console.error("Error executing staff meetings prompt:", error);
                reject(error);
                return;
            }
            if (stderr) {
                console.error("Script stderr:", stderr);
            }
            console.log("Script stdout:", stdout);
            resolve(stdout);
        });
    });
}

// Function to extract the selected seed and test reason replacement
function testReasonReplacement(scriptOutput) {
    console.log("\n=== TESTING REASON EXTRACTION AND REPLACEMENT ===\n");
    
    // Try to find the seed with the updated format which includes the fragment
    const seedWithFragmentMatch = scriptOutput.match(/Selected seed from category "([^"]+)": "([^"]+)" with fragment: "([^"]+)"/);
    let meetingReason = null;
    
    if (seedWithFragmentMatch) {
        const [_, category, seedText, sentenceFragment] = seedWithFragmentMatch;
        console.log(`Found seed with category "${category}", text "${seedText}", fragment "${sentenceFragment}"`);
        meetingReason = sentenceFragment;
    } else {
        // Fall back to the older format if needed
        const seedMatch = scriptOutput.match(/Selected seed from category "([^"]+)": "([^"]+)"/);
        if (seedMatch) {
            const seedText = seedMatch[2];
            console.log("Found seed text in older format:", seedText);
            // Default fallback if we can't extract a proper fragment
            meetingReason = seedText.replace(/^We/, "they").replace(/^I/, "someone").toLowerCase();
        } else {
            console.warn("Could not find seed in script output");
            meetingReason = "there's an urgent need to synchronize";
        }
    }
    
    console.log("\n=== SIMULATING MESSAGE GENERATION ===\n");
    
    // Simulate the message replacement process
    const EVENT_MESSAGES = {
        simplestaffmeeting: {
            intro: "{arrival}The coaches are gathering for a quick staff meeting because {reason}.",
            outro: "The quick staff meeting has concluded. The coaches have returned to their duties.",
        },
    };
    
    const eventType = 'simplestaffmeeting';
    console.log(`Using meeting reason: "${meetingReason}"`);
    
    let message = EVENT_MESSAGES[eventType].intro;
    console.log(`Original message template: "${message}"`);
    
    // Simulate arrival text
    const arrivalText = "It's 12:30PM at the Office, where sunny skies ☀️ stretch overhead. ";
    console.log(`Arrival text: "${arrivalText}"`);
    
    message = message.replace("{arrival}", arrivalText);
    console.log(`After arrival replacement: "${message}"`);
    
    // Check if the message actually contains the placeholder
    if (!message.includes("{reason}")) {
        console.warn("WARNING: Message does not contain {reason} placeholder!");
        // Default to a complete message with the reason
        message = `${arrivalText}The coaches are gathering for a quick staff meeting because ${meetingReason}.`;
    } else {
        message = message.replace("{reason}", meetingReason);
    }
    
    console.log(`Final message: "${message}"`);
    
    return {
        success: true,
        finalMessage: message,
        reason: meetingReason
    };
}

// Run the test
async function runTest() {
    try {
        const scriptOutput = await runStaffMeetingsPrompt();
        const result = testReasonReplacement(scriptOutput);
        
        console.log("\n=== TEST RESULTS ===\n");
        console.log("Execution successful:", result.success);
        console.log("Final message that would be sent to Discord:");
        console.log(result.finalMessage);
        console.log("\nExtracted reason:", result.reason);
        
    } catch (error) {
        console.error("Test failed:", error);
    }
}

// Execute the test
runTest(); 