// Simple test script to verify reason replacement

function testReasonReplacement() {
    const EVENT_MESSAGES = {
        simplestaffmeeting: {
            intro: "{arrival}The coaches are gathering for a quick staff meeting because {reason}.",
            outro: "The quick staff meeting has concluded. The coaches have returned to their duties.",
        },
    };

    // Simulate the replacement process
    const eventType = 'simplestaffmeeting';
    const meetingReason = "someone is allegedly microdosing in the pitch deck";
    
    let message = EVENT_MESSAGES[eventType].intro;
    console.log(`Original message: "${message}"`);
    
    // Simulate arrival text
    const arrivalText = "It's 12:30PM at the Office, where sunny skies ☀️ stretch overhead. ";
    console.log(`Arrival text: "${arrivalText}"`);
    
    message = message.replace("{arrival}", arrivalText);
    console.log(`After arrival replacement: "${message}"`);
    
    // Check if the message actually contains the placeholder
    if (!message.includes("{reason}")) {
        console.warn("WARNING: Message does not contain {reason} placeholder!");
    } else {
        console.log(`Replacing {reason} with: "${meetingReason}"`);
        message = message.replace("{reason}", meetingReason);
        console.log(`After reason replacement: "${message}"`);
    }
}

testReasonReplacement(); 