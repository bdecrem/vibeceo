import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Usage: node score-completions.js [path/to/split/files] [path/to/golden/comps.json] [output/directory]
 * 
 * Example: node score-completions.js ../experiments-chatgpt/200-prompts/split-output ./golden-comps.json ./scored-output
 */

// Parse command line arguments
const splitDir = process.argv[2];
const goldenCompsFile = process.argv[3];
const outputDir = process.argv[4] || './scored-output';

if (!splitDir || !goldenCompsFile) {
  console.error('Please provide paths for both split files and golden comps');
  console.error('Usage: node score-completions.js [path/to/split/files] [path/to/golden/comps.json] [output/directory]');
  process.exit(1);
}

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Function to calculate similarity between two strings
function calculateSimilarity(str1, str2) {
  // This is a simple implementation - for production, consider using more sophisticated
  // methods like cosine similarity, Levenshtein distance, or machine learning models
  
  // Convert both strings to lowercase and remove common punctuation
  const normalize = (str) => str.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
  
  const normalizedStr1 = normalize(str1);
  const normalizedStr2 = normalize(str2);
  
  // Split into words for keyword matching
  const words1 = normalizedStr1.split(/\s+/);
  const words2 = normalizedStr2.split(/\s+/);
  
  // Calculate word overlap
  const uniqueWords1 = new Set(words1);
  const uniqueWords2 = new Set(words2);
  
  let matchCount = 0;
  for (const word of uniqueWords1) {
    if (uniqueWords2.has(word)) {
      matchCount++;
    }
  }
  
  // Calculate Jaccard similarity: (intersection / union)
  const union = uniqueWords1.size + uniqueWords2.size - matchCount;
  const similarity = matchCount / union;
  
  // Length similarity factor
  const lengthRatio = Math.min(str1.length, str2.length) / Math.max(str1.length, str2.length);
  
  // Combined score (weighted average)
  const combinedScore = 0.7 * similarity + 0.3 * lengthRatio;
  
  return combinedScore;
}

// Function to score a single completion against a set of golden comps
function scoreCompletion(completion, goldenComps) {
  // We assume each completion should match with golden comps with the same prompt_id
  const promptId = completion.prompt_id;
  
  // Find matching golden comps
  const matchingGoldenComps = goldenComps.filter(comp => comp.prompt_id === promptId);
  
  if (matchingGoldenComps.length === 0) {
    console.warn(`No matching golden comps found for prompt_id: ${promptId}`);
    return { score: 0, reason: 'No matching golden comps found' };
  }
  
  // Calculate similarity scores against each matching golden comp
  const scores = matchingGoldenComps.map(goldenComp => {
    const similarity = calculateSimilarity(completion.response, goldenComp.response);
    return {
      goldenCompId: goldenComp.completion_id,
      similarity
    };
  });
  
  // Take the highest similarity score
  scores.sort((a, b) => b.similarity - a.similarity);
  const bestMatch = scores[0];
  
  // Scoring criteria (example):
  // 0.8 - 1.0: Excellent match
  // 0.6 - 0.8: Good match
  // 0.4 - 0.6: Fair match
  // 0.2 - 0.4: Poor match
  // 0.0 - 0.2: Very poor match
  
  let assessment;
  if (bestMatch.similarity >= 0.8) {
    assessment = 'Excellent match';
  } else if (bestMatch.similarity >= 0.6) {
    assessment = 'Good match';
  } else if (bestMatch.similarity >= 0.4) {
    assessment = 'Fair match';
  } else if (bestMatch.similarity >= 0.2) {
    assessment = 'Poor match';
  } else {
    assessment = 'Very poor match';
  }
  
  return {
    score: bestMatch.similarity,
    bestMatchId: bestMatch.goldenCompId,
    assessment,
    allScores: scores
  };
}

async function main() {
  try {
    // Load golden comps
    console.log(`Loading golden comps from ${goldenCompsFile}...`);
    const goldenCompsData = fs.readFileSync(goldenCompsFile, 'utf8');
    const goldenComps = JSON.parse(goldenCompsData);
    
    if (!Array.isArray(goldenComps)) {
      console.error('Golden comps file does not contain an array');
      process.exit(1);
    }
    
    console.log(`Loaded ${goldenComps.length} golden comps`);
    
    // Get all split files
    const files = fs.readdirSync(splitDir).filter(file => file.endsWith('.json'));
    console.log(`Found ${files.length} split files to process`);
    
    // Process each split file
    for (const file of files) {
      const filePath = path.join(splitDir, file);
      const outputFilePath = path.join(outputDir, `scored_${file}`);
      
      console.log(`Processing ${file}...`);
      
      // Load completions from the split file
      const data = fs.readFileSync(filePath, 'utf8');
      const completions = JSON.parse(data);
      
      if (!Array.isArray(completions)) {
        console.warn(`File ${file} does not contain an array, skipping`);
        continue;
      }
      
      // Score each completion
      const scoredCompletions = completions.map(completion => {
        const scores = scoreCompletion(completion, goldenComps);
        return {
          ...completion,
          scores
        };
      });
      
      // Calculate average score for this file
      const averageScore = scoredCompletions.reduce((sum, item) => sum + item.scores.score, 0) / scoredCompletions.length;
      console.log(`Average score for ${file}: ${averageScore.toFixed(4)}`);
      
      // Write scored completions to output file
      fs.writeFileSync(outputFilePath, JSON.stringify(scoredCompletions, null, 2));
      
      // Create a summary for this file
      const summary = {
        fileName: file,
        promptId: completions[0]?.prompt_id || 'unknown',
        totalCompletions: completions.length,
        averageScore,
        scoreDistribution: {
          excellent: scoredCompletions.filter(c => c.scores.score >= 0.8).length,
          good: scoredCompletions.filter(c => c.scores.score >= 0.6 && c.scores.score < 0.8).length,
          fair: scoredCompletions.filter(c => c.scores.score >= 0.4 && c.scores.score < 0.6).length,
          poor: scoredCompletions.filter(c => c.scores.score >= 0.2 && c.scores.score < 0.4).length,
          veryPoor: scoredCompletions.filter(c => c.scores.score < 0.2).length
        }
      };
      
      // Write summary to a separate file
      const summaryFilePath = path.join(outputDir, `summary_${file}`);
      fs.writeFileSync(summaryFilePath, JSON.stringify(summary, null, 2));
    }
    
    console.log(`\nScoring complete! Results saved to ${outputDir}`);
    
  } catch (err) {
    console.error('Error in main process:', err);
  }
}

main(); 