// Test parsing of bracket format timestamps in staff meetings
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock the message content with bracket format
const mockResponse = `
Donte [08:03]
The silence was a symphony, my friends. It's the universe telling us to cook with gas! 🔥 Let's marinate on that.

AlexirAlex [08:04]
Totally felt that silence in my chakras 🧘‍♂️. But like, are we going to address the awkward or what? 😬

RohanTheShark [08:05]
Silence is just undisrupted market space. We need less zen, more execution. When's the next vibe check? Yesterday?

VenusStrikes [08:06]
Please. The only thing that silence told me is our ROI on time is plummeting. Can we focus on data, not your "feelings"?

KaileyConnector [08:07]
Scheduled a follow-up meeting for vibe realignment and strategic planning.

EljasCouncil [08:09]
In Finland, silence is where wisdom enters. But in this group, it seems to be where wisdom goes to freeze to death.
`;

// Function to parse message (same as in staffmeetings-prompt.js)
function parseMessage(line) {
	// Skip empty lines
	if (!line.trim()) return null;

	// Improved regex to match multiple timestamp formats:
	// 1. "CoachName 9:00 AM" (original format)
	// 2. "CoachName [9:00]" or "CoachName [09:00]" (bracket format)
	// 3. "CoachName [9:00 AM]" (bracket with AM/PM)
	// This allows more flexible timestamp formats from GPT responses
	
	// Try standard format first: "CoachName 9:00 AM"
	let headerMatch = line.match(/^(\w+)\s+(\d{1,2}:\d{2}\s*[AP]M)$/i);
	
	if (!headerMatch) {
		// Try bracket format: "CoachName [9:00]" or "CoachName [09:00]"
		headerMatch = line.match(/^(\w+)\s*\[(\d{1,2}:\d{2})(?:\s*[AP]M)?\]$/i);
	}
	
	if (headerMatch) {
		// This is a message header line
		return {
			type: "header",
			coach: headerMatch[1],
			timestamp: headerMatch[2].trim()
		};
	} else {
		// This is likely a content line
		return {
			type: "content",
			content: line.trim()
		};
	}
}

// Process the mock response
function processResponse(response) {
	console.log("Starting test of bracket format parsing...");
    
	// Split the response into lines
	const lines = response.split("\n");
	console.log(`Found ${lines.length} total lines in response`);
    
	// Track parsing progress
	let parsedHeaders = 0;
	let parsedContent = 0;
    
	// First pass: identify headers and content lines
	const structuredMessages = [];
	let currentMessage = null;
    
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
        
		// Skip empty lines
		if (!line) continue;
        
		const parsedLine = parseMessage(line);
		
		if (parsedLine && parsedLine.type === "header") {
			console.log(`Parsed header: Coach=${parsedLine.coach}, Timestamp=${parsedLine.timestamp}`);
			
			// If we were building a previous message, finalize it now
			if (currentMessage) {
				structuredMessages.push(currentMessage);
				parsedContent++;
			}
            
			// Start a new message
			currentMessage = {
				coach: parsedLine.coach,
				timestamp: parsedLine.timestamp,
				content: "",
				rawLines: []
			};
			parsedHeaders++;
		} else if (currentMessage) {
			// Add content to the current message
			console.log(`  Content line: ${line.substring(0, 40)}${line.length > 40 ? "..." : ""}`);
			currentMessage.rawLines.push(line);
            
			// If current content is empty, this is the first content line
			if (!currentMessage.content) {
				currentMessage.content = line;
			} else {
				// Append with a space
				currentMessage.content += " " + line;
			}
		} else {
			console.log(`Skipping line that doesn't match any pattern: ${line}`);
		}
	}
    
	// Don't forget the last message
	if (currentMessage) {
		structuredMessages.push(currentMessage);
		parsedContent++;
	}
    
	console.log(`\nParsing summary:`);
	console.log(`- Found ${parsedHeaders} headers and ${parsedContent} content blocks`);
	console.log(`- Structured messages:`, JSON.stringify(structuredMessages, null, 2));
    
	return structuredMessages;
}

// Run the test
const messages = processResponse(mockResponse);
console.log(`\nTest completed. Found ${messages.length} valid messages.`);

// This should now correctly parse messages with bracket format timestamps 