import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface TextStyle {
  fontFamily: 'Arial' | 'Georgia' | 'Montserrat' | 'Impact';
  color: string;
  shadowStyle: 'none' | 'subtle' | 'bold';
  size: 'small' | 'medium' | 'large';
}

interface AnimationSettings {
  type: 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'ken-burns' | 'static';
  speed: 'slow' | 'medium' | 'fast';
  focusPoint: 'upper' | 'center' | 'lower';
}

interface VideoRequest {
  mode: 'video' | 'wall-of-text' | 'image';
  images: string[];
  audio: string;
  script?: string;
  overlays?: string[];
  textStyle?: TextStyle;
  animation?: AnimationSettings;
}

// Text style helpers
const FONT_SIZES: Record<string, number> = { small: 48, medium: 72, large: 96 };
const SHADOW_PARAMS: Record<string, string> = {
  none: '',
  subtle: ':shadowcolor=black@0.5:shadowx=1:shadowy=1',
  bold: ':shadowcolor=black@0.9:shadowx=3:shadowy=3',
};
const FOCUS_POINTS: Record<string, number> = { upper: 0.25, center: 0.5, lower: 0.75 };
const SPEED_MULTIPLIERS: Record<string, number> = { slow: 0.5, medium: 1.0, fast: 1.5 };

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

// Get zoom/pan filter based on animation settings
function getAnimationFilter(
  animation: AnimationSettings,
  totalFrames: number,
  videoWidth: number,
  videoHeight: number
): string {
  const focusY = FOCUS_POINTS[animation.focusPoint];
  const speedMult = SPEED_MULTIPLIERS[animation.speed];
  const baseZoom = 1.0 + (0.03 * speedMult); // Base 3% zoom, scaled by speed
  const zoomIncrement = (baseZoom - 1) / totalFrames;

  switch (animation.type) {
    case 'zoom-in':
      return `zoompan=z='1+${zoomIncrement}*on':x='iw/2-(iw/zoom/2)':y='ih*${focusY}-(ih/zoom*${focusY})':d=${totalFrames}:s=${videoWidth}x${videoHeight}:fps=30`;

    case 'zoom-out':
      return `zoompan=z='${baseZoom}-${zoomIncrement}*on':x='iw/2-(iw/zoom/2)':y='ih*${focusY}-(ih/zoom*${focusY})':d=${totalFrames}:s=${videoWidth}x${videoHeight}:fps=30`;

    case 'pan-left':
      const panLeftSpeed = (0.1 * speedMult) / totalFrames;
      return `zoompan=z='1':x='iw*${panLeftSpeed}*on':y='ih*${focusY}':d=${totalFrames}:s=${videoWidth}x${videoHeight}:fps=30`;

    case 'pan-right':
      const panRightSpeed = (0.1 * speedMult) / totalFrames;
      return `zoompan=z='1':x='iw-iw*${panRightSpeed}*on':y='ih*${focusY}':d=${totalFrames}:s=${videoWidth}x${videoHeight}:fps=30`;

    case 'static':
      return `zoompan=z='1':x='(iw-${videoWidth})/2':y='(ih-${videoHeight})/2':d=${totalFrames}:s=${videoWidth}x${videoHeight}:fps=30`;

    case 'ken-burns':
    default:
      // Subtle slow zoom with gentle movement
      const kbZoom = 0.0005 * speedMult;
      return `zoompan=z='1+${kbZoom}*on':x='iw/2-(iw/zoom/2)':y='ih*${focusY}-(ih/zoom*${focusY})':d=${totalFrames}:s=${videoWidth}x${videoHeight}:fps=30`;
  }
}

// Get drawtext params based on text style
function getDrawtextParams(textStyle: TextStyle, text: string, x: string, y: string): string {
  const fontSize = FONT_SIZES[textStyle.size];
  const color = textStyle.color.replace('#', '0x');
  const shadow = SHADOW_PARAMS[textStyle.shadowStyle];
  const escapedText = text.replace(/'/g, "'\\''").replace(/:/g, '\\:');

  return `drawtext=text='${escapedText}':fontsize=${fontSize}:fontcolor=${color}:font=${textStyle.fontFamily}:x=${x}:y=${y}${shadow}`;
}

export async function POST(request: NextRequest) {
  const tmpDir = path.join(os.tmpdir(), `inspiration-video-${Date.now()}`);

  try {
    const body = await request.json() as VideoRequest;
    const { mode, images, audio, script, overlays, textStyle, animation } = body;

    // Defaults
    const txtStyle: TextStyle = textStyle || {
      fontFamily: 'Arial',
      color: '#FFFFFF',
      shadowStyle: 'subtle',
      size: 'medium',
    };
    const anim: AnimationSettings = animation || {
      type: 'ken-burns',
      speed: 'medium',
      focusPoint: 'center',
    };

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
      await generateWallOfTextVideo(imagePaths[0], audioPath, script, audioDuration, outputPath, txtStyle, anim);
    } else if (mode === 'video' && imagePaths.length >= 2) {
      await generateTwoSceneVideo(imagePaths, audioPath, audioDuration, outputPath, overlays, txtStyle, anim);
    } else {
      await generateSingleImageVideo(imagePaths[0], audioPath, audioDuration, outputPath, anim);
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
  outputPath: string,
  textStyle: TextStyle,
  animation: AnimationSettings
) {
  const tmpDir = path.dirname(outputPath);
  const textFilePath = path.join(tmpDir, 'script.txt');

  const videoWidth = 1080;
  const videoHeight = 1920;
  const fps = 30;
  const totalFrames = Math.ceil(duration * fps);

  // Text styling from user settings
  const fontSize = FONT_SIZES[textStyle.size];
  const lineHeight = Math.ceil(fontSize * 1.4);
  const marginX = 80;
  const maxTextWidth = videoWidth - (marginX * 2);

  // Character width estimation (varies by font)
  const charWidthMultiplier = textStyle.fontFamily === 'Impact' ? 0.45 : textStyle.fontFamily === 'Georgia' ? 0.55 : 0.52;
  const avgCharWidth = fontSize * charWidthMultiplier;
  const charsPerLine = Math.floor(maxTextWidth / avgCharWidth);

  // Word-wrap
  const words = script.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length <= charsPerLine) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  const wrappedText = lines.join('\n');
  fs.writeFileSync(textFilePath, wrappedText, 'utf8');

  // Scroll params
  const totalTextHeight = lines.length * lineHeight;
  const totalScrollDistance = videoHeight + totalTextHeight;
  const scrollSpeed = totalScrollDistance / duration;

  const escapedTextPath = textFilePath.replace(/:/g, '\\:').replace(/'/g, "'\\''");
  const color = textStyle.color.replace('#', '0x');
  const shadow = SHADOW_PARAMS[textStyle.shadowStyle];

  // Animation filter
  const animFilter = getAnimationFilter(animation, totalFrames, videoWidth, videoHeight);

  const filterComplex = [
    `[0:v]format=rgba,${animFilter},format=yuv420p[bg]`,
    `[bg]drawbox=x=0:y=0:w=iw:h=ih:color=black@0.35:t=fill[bgdark]`,
    `[bgdark]drawtext=textfile='${escapedTextPath}':fontsize=${fontSize}:fontcolor=${color}:font=${textStyle.fontFamily}:x=${marginX}:y=h-(t*${scrollSpeed.toFixed(2)}):line_spacing=${lineHeight - fontSize}${shadow}[outv]`,
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
    '-colorspace', 'bt709',
    '-color_primaries', 'bt709',
    '-color_trc', 'bt709',
    outputPath,
  ];

  await runFFmpeg(args);
}

async function generateTwoSceneVideo(
  imagePaths: string[],
  audioPath: string,
  duration: number,
  outputPath: string,
  overlays: string[] | undefined,
  textStyle: TextStyle,
  animation: AnimationSettings
) {
  const fps = 30;
  const sceneDuration = duration / 2;
  const transitionDuration = 0.5;
  const totalFrames = Math.ceil(sceneDuration * fps);

  const focusY = FOCUS_POINTS[animation.focusPoint];
  const speedMult = SPEED_MULTIPLIERS[animation.speed];
  const baseZoom = 1.0 + (0.03 * speedMult);
  const zoomIncrement = (baseZoom - 1) / totalFrames;

  // Scene animations based on type
  let scene1Anim: string, scene2Anim: string;

  if (animation.type === 'ken-burns') {
    // Classic Ken Burns: zoom in on scene 1, zoom out on scene 2
    scene1Anim = `zoompan=z='1+${zoomIncrement}*on':x='iw/2-(iw/zoom/2)':y='ih*${focusY}-(ih/zoom*${focusY})':d=${totalFrames}:s=1080x1920:fps=${fps}`;
    scene2Anim = `zoompan=z='${baseZoom}-${zoomIncrement}*on':x='iw/2-(iw/zoom/2)':y='ih*${focusY}-(ih/zoom*${focusY})':d=${totalFrames}:s=1080x1920:fps=${fps}`;
  } else {
    // Same animation for both scenes
    const animFilter = getAnimationFilter(animation, totalFrames, 1080, 1920);
    scene1Anim = animFilter;
    scene2Anim = animFilter;
  }

  let filterComplex = [
    `[0:v]format=rgba,${scene1Anim},format=yuv420p,setsar=1[v0]`,
    `[1:v]format=rgba,${scene2Anim},format=yuv420p,setsar=1[v1]`,
  ];

  // Add text overlays
  if (overlays && overlays.length >= 2) {
    const fontSize = FONT_SIZES[textStyle.size];
    const color = textStyle.color.replace('#', '0x');
    const shadow = SHADOW_PARAMS[textStyle.shadowStyle];
    const escaped1 = overlays[0].replace(/'/g, "'\\''").replace(/:/g, '\\:');
    const escaped2 = overlays[1].replace(/'/g, "'\\''").replace(/:/g, '\\:');

    filterComplex.push(
      `[v0]drawtext=text='${escaped1}':fontsize=${fontSize}:fontcolor=${color}:x=(w-text_w)/2:y=h*0.8:font=${textStyle.fontFamily}${shadow}[v0t]`,
      `[v1]drawtext=text='${escaped2}':fontsize=${fontSize}:fontcolor=${color}:x=(w-text_w)/2:y=h*0.8:font=${textStyle.fontFamily}${shadow}[v1t]`,
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
    '-colorspace', 'bt709',
    '-color_primaries', 'bt709',
    '-color_trc', 'bt709',
    outputPath,
  ];

  await runFFmpeg(args);
}

async function generateSingleImageVideo(
  imagePath: string,
  audioPath: string,
  duration: number,
  outputPath: string,
  animation: AnimationSettings
) {
  const fps = 30;
  const totalFrames = Math.ceil(duration * fps);

  const animFilter = getAnimationFilter(animation, totalFrames, 1080, 1920);
  const filterComplex = `[0:v]format=rgba,${animFilter},format=yuv420p[outv]`;

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
    '-colorspace', 'bt709',
    '-color_primaries', 'bt709',
    '-color_trc', 'bt709',
    outputPath,
  ];

  await runFFmpeg(args);
}
