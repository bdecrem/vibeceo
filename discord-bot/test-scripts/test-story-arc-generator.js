import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function buildStoryArcPrompt() {
  const activitiesData = JSON.parse(fs.readFileSync(path.join(__dirname, "data/weekend-activities.json"), "utf8"));
  const derailersData = JSON.parse(fs.readFileSync(path.join(__dirname, "data/weekend-derailers.json"), "utf8"));

  const cities = Object.keys(activitiesData);
  const city = cities[Math.floor(Math.random() * cities.length)];

  const durations = Object.keys(activitiesData[city]);
  const randomDuration = durations[Math.floor(Math.random() * durations.length)];
  const activityPool = activitiesData[city][randomDuration];
  const activity = activityPool[Math.floor(Math.random() * activityPool.length)];

  const coaches = Object.keys(derailersData);
  const coach = coaches[Math.floor(Math.random() * coaches.length)];
  const derailments = derailersData[coach];
  const derailment = derailments[Math.floor(Math.random() * derailments.length)];

  // Lightly structured story arc
  const beats = [
    `Scene 1: The group agrees to go to ${activity.name}, but no one confirms it aloud.`,
    `Scene 2: Everyone gets dressed. One outfit choice feels like a mistake.`,
    `Scene 3: ${coach} brings up something strange.`,
    "Scene 4: The Uber arrives early. No one's ready.",
    `Scene 5: ${coach} checks their phone again. Something lights up.`,
    "Scene 6: Route changes mid-ride.",
    "Scene 7: Someone jokes about being redirected. No one laughs.",
    `Scene 8: They arrive near ${activity.name}. It's unclear if this is the entrance.`,
    "Scene 9: The group stands still. The vibe changes.",
    `Scene 10: ${coach} quietly suggests an alternate idea.`,
    "Scene 11: Half follow. The rest hesitate.",
    "Scene 12: They walk into a new space. No one knows the name.",
    "Scene 13: Someone calls this a pivot. No one confirms.",
    "Scene 14: They try to participate. It's unclear how.",
    "Scene 15: Something ambient happens. Someone claps. It feels wrong.",
    "Scene 16: Someone finds a menu. It doesn't match the place.",
    `Scene 17: ${coach} re-mentions their plan.`,
    "Scene 18: Someone disappears. Someone else stays very still.",
    "Scene 19: The group drifts again. Music leaks from a side room.",
    "Scene 20: They walk without speaking.",
    "Scene 21: They arrive somewhere familiar. It's different now.",
    "Scene 22: A bird or machine moves overhead. Everyone watches it.",
    `Scene 23: They circle back toward ${activity.name}. No one says it.`,
    "Scene 24: The original location is behind them. The derailment happened. No one names it."
  ];

  return {
    city,
    activity,
    derailer: { coach, agenda: derailment },
    beats,
  };
}

// Generate a number of story arcs
function generateStoryArcs(count = 5) {
  console.log(`Generating ${count} story arcs...`);
  
  const storyArcs = [];
  
  for (let i = 0; i < count; i++) {
    console.log(`Generating story arc ${i + 1}/${count}`);
    const storyArc = buildStoryArcPrompt();
    storyArcs.push(storyArc);
  }
  
  return storyArcs;
}

// Format a story arc for output
function formatStoryArc(storyArc, index) {
  const { city, activity, derailer, beats } = storyArc;
  
  let output = `=== STORY ARC ${index + 1} ===\n\n`;
  output += `City: ${city}\n`;
  output += `Activity: ${activity.name} - ${activity.type}\n`;
  output += `Description: ${activity.description}\n`;
  output += `Duration: ${activity.duration || 'Unknown'}\n\n`;
  
  output += `Derailer: ${derailer.coach}\n`;
  output += `Agenda: ${derailer.agenda}\n\n`;
  
  output += "Story Beats:\n";
  beats.forEach(beat => {
    output += `${beat}\n`;
  });
  
  output += "\n";
  return output;
}

// Save story arcs to a file
function saveStoryArcs(storyArcs) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  
  const logsDir = path.join(__dirname, "..", "logs");
  // Ensure logs directory exists
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  const outputPath = path.join(logsDir, `story_arcs_output-${timestamp}.txt`);
  
  let content = `=== WEEKEND STORY ARCS ===\nGenerated: ${new Date().toISOString()}\nCount: ${storyArcs.length}\n\n`;
  
  storyArcs.forEach((storyArc, index) => {
    content += formatStoryArc(storyArc, index);
  });
  
  fs.writeFileSync(outputPath, content, "utf8");
  console.log(`Saved ${storyArcs.length} story arcs to ${outputPath}`);
  
  return outputPath;
}

// Main function
async function main() {
  try {
    const count = process.argv[2] ? parseInt(process.argv[2]) : 5;
    const storyArcs = generateStoryArcs(count);
    const outputPath = saveStoryArcs(storyArcs);
    
    // Print a sample of the first story arc
    console.log("\nSample story arc (first one generated):");
    console.log(`City: ${storyArcs[0].city}`);
    console.log(`Activity: ${storyArcs[0].activity.name}`);
    console.log(`Derailer: ${storyArcs[0].derailer.coach} with agenda: ${storyArcs[0].derailer.agenda}`);
    console.log(`First beat: ${storyArcs[0].beats[0]}`);
    console.log(`Last beat: ${storyArcs[0].beats[storyArcs[0].beats.length - 1]}`);
    
    console.log(`\nFull output saved to: ${outputPath}`);
  } catch (error) {
    console.error("Error generating story arcs:", error);
    process.exit(1);
  }
}

// Execute
main(); 