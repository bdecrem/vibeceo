/**
 * Video generation using FFmpeg
 *
 * Combines scene images + audio narration into final MP4.
 *
 * Ken Burns effect:
 * - Subtle 3% zoom to add motion without cropping safe zones
 * - Focus point at 35% from top (where visual content lives)
 * - Scene 1 zooms IN, Scene 2 zooms OUT for variety
 * - Bottom 25% (text safe zone) stays visible throughout
 *
 * Crossfade transitions between scenes.
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import type { Project } from './project.js';

export interface VideoOptions {
  sceneDuration?: number;     // Duration per scene in seconds (default: auto from audio)
  transitionDuration?: number; // Crossfade duration in seconds (default: 0.5)
  zoomSpeed?: number;         // Ken Burns zoom factor (default: 1.05 = 5% zoom)
  fps?: number;               // Frame rate (default: 30)
}

async function getAudioDuration(audioPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      audioPath,
    ]);

    let output = '';
    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe failed with code ${code}`));
        return;
      }
      const duration = parseFloat(output.trim());
      if (isNaN(duration)) {
        reject(new Error('Could not parse audio duration'));
        return;
      }
      resolve(duration);
    });

    ffprobe.on('error', reject);
  });
}

function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', args);

    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`FFmpeg failed: ${stderr.slice(-500)}`));
        return;
      }
      resolve();
    });

    ffmpeg.on('error', reject);
  });
}

export async function generateVideo(project: Project, options: VideoOptions = {}): Promise<string> {
  const {
    transitionDuration = 0.5,
    zoomSpeed = 1.03,  // Subtle 3% zoom to preserve safe zone
    fps = 30,
  } = options;

  // Verify required files exist
  if (!fs.existsSync(project.paths.image1)) {
    throw new Error('scene-1.png not found');
  }
  if (!fs.existsSync(project.paths.image2)) {
    throw new Error('scene-2.png not found');
  }
  if (!fs.existsSync(project.paths.audio)) {
    throw new Error('narration.mp3 not found');
  }

  // Get audio duration to calculate scene timing
  console.log('   Analyzing audio duration...');
  const audioDuration = await getAudioDuration(project.paths.audio);
  const sceneDuration = options.sceneDuration || (audioDuration / 2);

  console.log(`   Audio: ${audioDuration.toFixed(1)}s, Scene duration: ${sceneDuration.toFixed(1)}s each`);

  // Calculate zoom parameters
  const totalFrames = Math.ceil(sceneDuration * fps);
  const zoomIncrement = (zoomSpeed - 1) / totalFrames;

  // Ken Burns focus point: 35% from top (where visual content is)
  // This preserves the bottom 25% safe zone where text lives
  // Formula: focus at 35% height, adjust position as zoom changes to keep focus stable
  const focusY = 0.35;

  // Build FFmpeg filter complex
  // - Scene 1: slow zoom IN, focus on upper portion
  // - Scene 2: slow zoom OUT for variety, same upper focus
  // - Crossfade between scenes
  const filterComplex = [
    // Scene 1: zoom in (1.0 -> zoomSpeed), upper focus
    `[0:v]zoompan=z='1+${zoomIncrement}*on':x='iw/2-(iw/zoom/2)':y='ih*${focusY}-(ih/zoom*${focusY})':d=${totalFrames}:s=1080x1920:fps=${fps},setsar=1[v0]`,
    // Scene 2: zoom out (zoomSpeed -> 1.0), upper focus - creates visual variety
    `[1:v]zoompan=z='${zoomSpeed}-${zoomIncrement}*on':x='iw/2-(iw/zoom/2)':y='ih*${focusY}-(ih/zoom*${focusY})':d=${totalFrames}:s=1080x1920:fps=${fps},setsar=1[v1]`,
    // Crossfade transition
    `[v0][v1]xfade=transition=fade:duration=${transitionDuration}:offset=${sceneDuration - transitionDuration}[outv]`,
  ].join(';');

  const args = [
    '-y', // Overwrite output
    '-loop', '1', '-t', sceneDuration.toString(), '-i', project.paths.image1,
    '-loop', '1', '-t', sceneDuration.toString(), '-i', project.paths.image2,
    '-i', project.paths.audio,
    '-filter_complex', filterComplex,
    '-map', '[outv]',
    '-map', '2:a',
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    '-pix_fmt', 'yuv420p',
    project.paths.video,
  ];

  console.log('   Rendering video...');
  await runFFmpeg(args);

  return project.paths.video;
}
