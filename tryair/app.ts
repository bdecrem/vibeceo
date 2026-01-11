#!/usr/bin/env npx tsx
/**
 * TryAir - AI Video Ad Scene Generator
 *
 * Interactive CLI for generating scene cards and video ads.
 *
 * Usage:
 *   cd tryair && npm start
 */

import * as fs from 'fs';
import * as readline from 'readline';

import { loadEnv } from './lib/env.js';
import { generateImage } from './lib/image.js';
import { overlayText } from './lib/overlay.js';
import { generateScript } from './lib/script.js';
import { synthesize } from './lib/voice.js';
import { generateVideo } from './lib/video.js';
import { createProject, type Project } from './lib/project.js';
import { styles, buildPrompt } from './content/styles.js';

// Load environment variables
loadEnv();

// =============================================================================
// CLI
// =============================================================================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// =============================================================================
// Single Image Flow
// =============================================================================

async function generateSingleImage(project: Project, caption: string): Promise<void> {
  const style = styles.find(s => s.name === project.metadata.style)!;
  const prompt = buildPrompt(style, project.metadata.subject);

  console.log(`\n✨ Generating with style: ${style.name}`);
  console.log('   This takes ~10-20 seconds...\n');

  const imageBuffer = await generateImage({ prompt });

  let finalImage = imageBuffer;
  if (caption) {
    finalImage = await overlayText(imageBuffer, { text: caption });
  }

  fs.writeFileSync(project.paths.image1, finalImage);
  console.log(`   Saved: scene-1.png`);
}

// =============================================================================
// Video Flow
// =============================================================================

async function generateVideoAssets(project: Project): Promise<void> {
  const style = styles.find(s => s.name === project.metadata.style)!;

  // Step 1: Generate storyboard
  console.log('📝 Step 1/5: Generating storyboard...');
  const script = await generateScript(project.metadata.subject, project.paths.script);
  const { storyboard } = script;

  console.log('\n   --- Storyboard ---');
  console.log(`   SCENE 1:`);
  console.log(`     Narration: ${storyboard.scene1.narration}`);
  console.log(`     Image: ${storyboard.scene1.image}`);
  console.log(`     Overlay: "${storyboard.scene1.overlay}"`);
  console.log(`   SCENE 2:`);
  console.log(`     Narration: ${storyboard.scene2.narration}`);
  console.log(`     Image: ${storyboard.scene2.image}`);
  console.log(`     Overlay: "${storyboard.scene2.overlay}"`);
  console.log('   ------------------\n');

  // Step 2: Generate image for Scene 1
  console.log('🎨 Step 2/5: Generating scene 1...');
  const prompt1 = buildPrompt(style, storyboard.scene1.image);
  const image1Buffer = await generateImage({ prompt: prompt1 });
  const image1WithText = await overlayText(image1Buffer, { text: storyboard.scene1.overlay });
  fs.writeFileSync(project.paths.image1, image1WithText);
  console.log(`   Saved: scene-1.png`);

  // Step 3: Generate image for Scene 2
  console.log('🎨 Step 3/5: Generating scene 2...');
  const prompt2 = buildPrompt(style, storyboard.scene2.image);
  const image2Buffer = await generateImage({ prompt: prompt2 });
  const image2WithText = await overlayText(image2Buffer, { text: storyboard.scene2.overlay });
  fs.writeFileSync(project.paths.image2, image2WithText);
  console.log(`   Saved: scene-2.png`);

  // Step 4: Generate audio narration
  console.log('🔊 Step 4/5: Generating narration...');
  const audioResult = await synthesize(storyboard.fullNarration, {
    description: 'Speak in a warm, engaging style. Natural pacing with appropriate pauses between scenes.',
  });
  fs.writeFileSync(project.paths.audio, audioResult.audioBuffer);
  console.log(`   Saved: narration.mp3 (${audioResult.duration.toFixed(1)}s)`);

  // Step 5: Render final video
  console.log('🎬 Step 5/5: Rendering final video...');
  await generateVideo(project);
  console.log(`   Saved: final.mp4`);
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('\n🎬 TryAir - AI Video Ad Generator\n');

  // Step 1: Get theme/subject
  const subject = await ask('What is the theme of the video?\n> ');
  if (!subject) {
    console.log('No theme provided. Exiting.');
    rl.close();
    return;
  }

  // Step 2: Single image or video
  console.log('\nWhat do you want to create?');
  console.log('  1: A single image');
  console.log('  2: A video (2 scenes + narration)');
  const formatChoice = await ask('\nEnter 1 or 2:\n> ');
  const isVideo = formatChoice === '2';

  // Step 3: Pick style
  console.log('\nPick a style:');
  styles.forEach((s, i) => {
    console.log(`  ${i + 1}: ${s.name}`);
    console.log(`     ${s.description}`);
  });

  const styleChoice = await ask(`\nEnter 1-${styles.length}:\n> `);
  const styleIndex = parseInt(styleChoice, 10) - 1;

  if (isNaN(styleIndex) || styleIndex < 0 || styleIndex >= styles.length) {
    console.log('Invalid choice. Exiting.');
    rl.close();
    return;
  }

  const style = styles[styleIndex];

  // Step 4: Create project
  const project = createProject(
    subject,
    style.name,
    isVideo ? 'video' : 'image'
  );

  if (isVideo) {
    // Video flow
    await generateVideoAssets(project);

    console.log('\n✅ Video generated!\n');
    console.log(`📁 Project: ${project.metadata.id}`);
    console.log(`   Location: file://${project.dir}`);
    console.log('\n   Files:');
    console.log('   - final.mp4      (ready to share!)');
    console.log('   - project.json   (metadata)');
    console.log('   - script.json    (narration script)');
    console.log('   - scene-1.png    (first scene)');
    console.log('   - scene-2.png    (second scene)');
    console.log('   - narration.mp3  (audio)');
    console.log(`\n🎬 Watch: file://${project.paths.video}\n`);
  } else {
    // Single image flow
    const caption = await ask('\nCaption text (or press Enter to skip):\n> ');
    await generateSingleImage(project, caption);

    console.log('\n✅ Done!\n');
    console.log(`📁 Project: ${project.metadata.id}`);
    console.log(`   Location: file://${project.dir}`);
    console.log('   File: scene-1.png\n');
  }

  rl.close();
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  rl.close();
  process.exit(1);
});
