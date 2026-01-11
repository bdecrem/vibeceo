import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface VideoRequest {
  mode: 'video' | 'wall-of-text' | 'image';
  images: string[];  // base64 encoded images
  audio: string;     // base64 encoded audio
  script?: string;   // for wall-of-text mode
  overlays?: string[]; // text overlays for video mode
}

function runFFmpeg(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', args);

    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`FFmpeg failed: ${stderr.slice(-1000)}`));
        return;
      }
      resolve(stderr);
    });

    ffmpeg.on('error', reject);
  });
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

export async function POST(request: NextRequest) {
  const tmpDir = path.join(os.tmpdir(), `inspiration-video-${Date.now()}`);

  try {
    const { mode, images, audio, script, overlays } = await request.json() as VideoRequest;

    if (!images || images.length === 0) {
      return NextResponse.json({ error: 'Images required' }, { status: 400 });
    }

    if (!audio) {
      return NextResponse.json({ error: 'Audio required' }, { status: 400 });
    }

    // Create temp directory
    fs.mkdirSync(tmpDir, { recursive: true });

    // Write images to temp files
    const imagePaths: string[] = [];
    for (let i = 0; i < images.length; i++) {
      const imgPath = path.join(tmpDir, `image-${i}.png`);
      fs.writeFileSync(imgPath, Buffer.from(images[i], 'base64'));
      imagePaths.push(imgPath);
    }

    // Write audio to temp file
    const audioPath = path.join(tmpDir, 'audio.mp3');
    fs.writeFileSync(audioPath, Buffer.from(audio, 'base64'));

    // Get audio duration
    const audioDuration = await getAudioDuration(audioPath);

    // Output path
    const outputPath = path.join(tmpDir, 'output.mp4');

    // Generate video based on mode
    if (mode === 'wall-of-text' && script) {
      await generateWallOfTextVideo(imagePaths[0], audioPath, script, audioDuration, outputPath);
    } else if (mode === 'video' && imagePaths.length >= 2) {
      await generateTwoSceneVideo(imagePaths, audioPath, audioDuration, outputPath, overlays);
    } else {
      // Single image mode - just image + audio
      await generateSingleImageVideo(imagePaths[0], audioPath, audioDuration, outputPath);
    }

    // Read output video
    const videoBuffer = fs.readFileSync(outputPath);

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });

    return NextResponse.json({
      video: videoBuffer.toString('base64'),
      duration: audioDuration,
    });

  } catch (error) {
    // Cleanup on error
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}

    console.error('Video generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function generateWallOfTextVideo(
  imagePath: string,
  audioPath: string,
  script: string,
  duration: number,
  outputPath: string
) {
  // Escape script for FFmpeg drawtext
  const escapedScript = script
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "'\\''")
    .replace(/:/g, '\\:')
    .replace(/\n/g, '\\n');

  // Calculate scroll speed based on duration
  // Text should scroll from bottom to top over the duration
  // Assuming ~60 chars per line, estimate total height
  const lineHeight = 60;
  const fontSize = 48;
  const lines = Math.ceil(script.length / 40);
  const textHeight = lines * lineHeight + 1920; // Add screen height for full scroll
  const scrollSpeed = textHeight / duration;

  const fps = 30;
  const totalFrames = Math.ceil(duration * fps);

  // Filter complex:
  // 1. Ken Burns on background image
  // 2. Scrolling text overlay
  const filterComplex = [
    // Ken Burns zoom on background
    `[0:v]zoompan=z='1.03':x='iw/2-(iw/zoom/2)':y='ih*0.35-(ih/zoom*0.35)':d=${totalFrames}:s=1080x1920:fps=${fps}[bg]`,
    // Add semi-transparent overlay for text readability
    `[bg]drawbox=x=0:y=0:w=iw:h=ih:color=black@0.4:t=fill[bgdark]`,
    // Scrolling text
    `[bgdark]drawtext=text='${escapedScript}':fontsize=${fontSize}:fontcolor=white:x=(w-text_w)/2:y=h-(t*${scrollSpeed}):font=Arial:line_spacing=20[outv]`,
  ].join(';');

  const args = [
    '-y',
    '-loop', '1', '-t', duration.toString(), '-i', imagePath,
    '-i', audioPath,
    '-filter_complex', filterComplex,
    '-map', '[outv]',
    '-map', '1:a',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    '-pix_fmt', 'yuv420p',
    outputPath,
  ];

  await runFFmpeg(args);
}

async function generateTwoSceneVideo(
  imagePaths: string[],
  audioPath: string,
  duration: number,
  outputPath: string,
  overlays?: string[]
) {
  const fps = 30;
  const sceneDuration = duration / 2;
  const transitionDuration = 0.5;
  const totalFrames = Math.ceil(sceneDuration * fps);
  const zoomSpeed = 1.03;
  const zoomIncrement = (zoomSpeed - 1) / totalFrames;
  const focusY = 0.35;

  let filterComplex = [
    // Scene 1: zoom in
    `[0:v]zoompan=z='1+${zoomIncrement}*on':x='iw/2-(iw/zoom/2)':y='ih*${focusY}-(ih/zoom*${focusY})':d=${totalFrames}:s=1080x1920:fps=${fps},setsar=1[v0]`,
    // Scene 2: zoom out
    `[1:v]zoompan=z='${zoomSpeed}-${zoomIncrement}*on':x='iw/2-(iw/zoom/2)':y='ih*${focusY}-(ih/zoom*${focusY})':d=${totalFrames}:s=1080x1920:fps=${fps},setsar=1[v1]`,
  ];

  // Add text overlays if provided
  if (overlays && overlays.length >= 2) {
    const escaped1 = overlays[0].replace(/'/g, "'\\''").replace(/:/g, '\\:');
    const escaped2 = overlays[1].replace(/'/g, "'\\''").replace(/:/g, '\\:');

    filterComplex.push(
      `[v0]drawtext=text='${escaped1}':fontsize=72:fontcolor=white:x=(w-text_w)/2:y=h*0.8:font=Arial:shadowcolor=black@0.7:shadowx=2:shadowy=2[v0t]`,
      `[v1]drawtext=text='${escaped2}':fontsize=72:fontcolor=white:x=(w-text_w)/2:y=h*0.8:font=Arial:shadowcolor=black@0.7:shadowx=2:shadowy=2[v1t]`,
      `[v0t][v1t]xfade=transition=fade:duration=${transitionDuration}:offset=${sceneDuration - transitionDuration}[outv]`
    );
  } else {
    filterComplex.push(
      `[v0][v1]xfade=transition=fade:duration=${transitionDuration}:offset=${sceneDuration - transitionDuration}[outv]`
    );
  }

  const args = [
    '-y',
    '-loop', '1', '-t', sceneDuration.toString(), '-i', imagePaths[0],
    '-loop', '1', '-t', sceneDuration.toString(), '-i', imagePaths[1],
    '-i', audioPath,
    '-filter_complex', filterComplex.join(';'),
    '-map', '[outv]',
    '-map', '2:a',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    '-pix_fmt', 'yuv420p',
    outputPath,
  ];

  await runFFmpeg(args);
}

async function generateSingleImageVideo(
  imagePath: string,
  audioPath: string,
  duration: number,
  outputPath: string
) {
  const fps = 30;
  const totalFrames = Math.ceil(duration * fps);
  const zoomSpeed = 1.03;
  const zoomIncrement = (zoomSpeed - 1) / totalFrames;

  const filterComplex = `[0:v]zoompan=z='1+${zoomIncrement}*on':x='iw/2-(iw/zoom/2)':y='ih*0.35-(ih/zoom*0.35)':d=${totalFrames}:s=1080x1920:fps=${fps}[outv]`;

  const args = [
    '-y',
    '-loop', '1', '-t', duration.toString(), '-i', imagePath,
    '-i', audioPath,
    '-filter_complex', filterComplex,
    '-map', '[outv]',
    '-map', '1:a',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    '-pix_fmt', 'yuv420p',
    outputPath,
  ];

  await runFFmpeg(args);
}
