/**
 * Parser for Weekend Story GPT output
 * This module parses the raw GPT output and converts it into structured JSON
 * according to the WeekendStory type definition.
 */

/**
 * Extract time, location, and behavior from a scene intro line
 * @param {string} introLine - Line containing the scene intro (e.g., "It's 8:12 PM in Berlin and the streetlights are starting to blink.")
 * @returns {Object} Object containing time, location, and behavior
 */
export function parseIntroLine(introLine) {
  // Clean up the input text
  const cleanIntro = introLine.replace(/^\*\*|\*\*$/g, "").trim();
  
  // Two possible formats:
  // 1. "It's 8:12 PM in Berlin and the streetlights are starting to blink."
  // 2. "It's 8:45 PM in Berlin, outfits clash with personal doubts."
  
  // Try the first format with "and"
  const patternWithAnd = /It's\s+([0-9:]+\s+[AP]M)\s+in\s+([A-Za-z]+)\s+and\s+(.+?)\.?$/i;
  const matchWithAnd = cleanIntro.match(patternWithAnd);
  
  if (matchWithAnd) {
    return {
      time: matchWithAnd[1].trim(),
      location: matchWithAnd[2].trim(),
      behavior: matchWithAnd[3].trim()
    };
  }
  
  // Try the second format with a comma
  const patternWithComma = /It's\s+([0-9:]+\s+[AP]M)\s+in\s+([A-Za-z]+),\s+(.+?)\.?$/i;
  const matchWithComma = cleanIntro.match(patternWithComma);
  
  if (matchWithComma) {
    return {
      time: matchWithComma[1].trim(),
      location: matchWithComma[2].trim(),
      behavior: matchWithComma[3].trim()
    };
  }
  
  // Final fallback - extract time and location if possible
  const timeMatch = cleanIntro.match(/([0-9:]+\s+[AP]M)/i);
  const locationMatch = cleanIntro.match(/in\s+([A-Za-z]+)/i);
  
  return {
    time: timeMatch ? timeMatch[1].trim() : "unknown",
    location: locationMatch ? locationMatch[1].trim() : "unknown",
    behavior: cleanIntro
  };
}

/**
 * Parse a message line from the conversation
 * @param {string} messageLine - Line containing a message (e.g., "> 'kailey_sloan' 8:12 PM")
 * @param {string} contentLine - Line containing the message content
 * @returns {Object} Message object with coach, content, and timestamp
 */
export function parseMessage(messageLine, contentLine) {
  // Pattern: > 'coach_name' [TIME]
  const pattern = />\s+'?([^'\s]+(?:_[^'\s]+)?)'?\s+([0-9:]+\s+[AP]M)/i;
  const match = messageLine.match(pattern);

  if (match) {
    // Check if contentLine is empty or missing
    const content = contentLine ? contentLine.replace(/^>\s+/, "").trim() : "";
    
    return {
      coach: match[1].trim(),
      content: content,
      timestamp: match[2].trim()
    };
  }

  // Fallback
  return {
    coach: "unknown",
    content: contentLine ? contentLine.replace(/^>\s+/, "").trim() : "",
    timestamp: "unknown"
  };
}

/**
 * Parse the entire GPT output into structured scenes
 * @param {string} gptOutput - Raw GPT output text
 * @returns {Array} Array of scene objects
 */
export function parseScenes(gptOutput) {
  const scenes = [];
  
  // First check if the new scene marker format is used
  if (gptOutput.includes('[SCENE:') && gptOutput.includes('[/SCENE:')) {
    // Parse using the new scene marker format
    const sceneRegex = /\[SCENE:(\d+)\]([\s\S]*?)\[\/SCENE:\1\]/g;
    let match;
    
    while ((match = sceneRegex.exec(gptOutput)) !== null) {
      const sceneNumber = parseInt(match[1], 10);
      const sceneContent = match[2].trim();
      
      // Extract scene intro
      const introMatch = sceneContent.match(/\*\*It's([^*]+)\*\*/i);
      const introLine = introMatch ? "It's" + introMatch[1] : sceneContent.split('\n')[0];
      const intro = parseIntroLine(introLine);
      
      // Extract conversation messages
      const messageLines = sceneContent.split('\n').filter(line => line.trim().startsWith('>'));
      const conversation = [];
      
      for (let i = 0; i < messageLines.length; i += 2) {
        if (i + 1 < messageLines.length) {
          const messageLine = messageLines[i];
          const contentLine = messageLines[i + 1];
          conversation.push(parseMessage(messageLine, contentLine));
        }
      }
      
      scenes.push({
        number: sceneNumber,
        intro,
        conversation
      });
    }
    
    // Sort scenes by number to ensure they're in the right order
    scenes.sort((a, b) => a.number - b.number);
  } else {
    // Fallback to the old parsing method
    const sceneBlocks = gptOutput.split(/\*\*It's/).slice(1); // Split by scene intros, skip first empty part
    
    sceneBlocks.forEach((block, index) => {
      const lines = ("It's" + block).split("\n").filter(line => line.trim() !== "");
      const introLine = lines[0];
      const intro = parseIntroLine(introLine);
      
      const conversation = [];
      
      // Group messages (each message has a header line and possibly a content line)
      let i = 1;
      while (i < lines.length) {
        const messageLine = lines[i];
        
        // If this line starts with '>' it's a message header
        if (messageLine.trim().startsWith('>')) {
          // Check if next line is a content line (also starts with '>')
          const contentLine = (i + 1 < lines.length && lines[i + 1].trim().startsWith('>')) 
            ? lines[i + 1] 
            : null;
          
          // Add parsed message to conversation
          const message = parseMessage(messageLine, contentLine);
          if (message.coach !== "unknown" || message.content) {
            conversation.push(message);
          }
          
          // Skip the content line if it exists
          i += contentLine ? 2 : 1;
        } else {
          // Not a message line, skip it
          i++;
        }
      }

      scenes.push({
        number: index + 1,
        intro,
        conversation
      });
    });
  }

  return scenes;
}

/**
 * Parse GPT output and metadata into a complete WeekendStory object
 * @param {string} gptOutput - Raw GPT output text
 * @param {Object} metadata - Metadata object containing storyType, city, etc.
 * @returns {Object} Complete WeekendStory object
 */
export function parseWeekendStory(gptOutput, metadata = {}) {
  const scenes = parseScenes(gptOutput);
  
  return {
    metadata: {
      generated: new Date().toISOString(),
      storyType: metadata.storyType || "weekend2",
      city: metadata.city || (scenes[0]?.intro?.location || "Berlin"),
      locationGoal: metadata.locationGoal || "Berghain",
      object: metadata.object || "metal drink token",
      ...metadata
    },
    scenes
  };
} 