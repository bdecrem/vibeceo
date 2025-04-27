import fs from 'fs';
import path from 'path';
import { EpisodeContext } from './episodeContext.js';

interface PreGeneratedScene {
  index: number;
  type: string;
  coaches: string[];
  intro: string;
  messages: Array<{
    coach: string;
    message: string;
  }>;
  outro: string;
  context: {
    time: string;
    weather: string;
    location: string;
    events: string[];
  };
}

interface EpisodeMetadata {
  episodeNumber: number;
  episodeContext: {
    theme: string;
    arcSummary: string;
    toneKeywords: string[];
    motifs: string[];
    weather: string;
    location: string;
    events: string[];
  };
  status: {
    current: string;
    lastUpdated: string;
    nextEpisodeNumber: number;
  };
  sceneTracking: {
    totalScenes: number;
    usedScenes: number[];
    remainingScenes: number[];
    nextSceneIndex: number;
  };
  episodeProgress: {
    startTime: string;
    duration: number;
    completedScenes: number;
    totalScenes: number;
  };
}

const PRE_GENERATED_SCENES_DIR = path.join(process.cwd(), 'data', 'pre-generated-scenes');
const EPISODES_DIR = path.join(PRE_GENERATED_SCENES_DIR, 'episodes');
const CURRENT_EPISODE_SYMLINK = path.join(PRE_GENERATED_SCENES_DIR, 'current-episode');

export function getCurrentEpisodePath(): string {
  try {
    // Resolve the symlink to get the actual path
    const realPath = fs.realpathSync(CURRENT_EPISODE_SYMLINK);
    console.log('Resolved current episode path:', realPath);
    return realPath;
  } catch (error) {
    console.error('Error resolving current episode path:', error);
    throw error;
  }
}

export function createNewEpisode(episodeContext: EpisodeContext): string {
  try {
    // Get the next episode number
    const nextEpisodeNumber = getNextEpisodeNumber();
    const episodeDir = path.join(EPISODES_DIR, `episode-${String(nextEpisodeNumber).padStart(3, '0')}`);
    
    // Create episode directory and scenes subdirectory
    fs.mkdirSync(episodeDir, { recursive: true });
    fs.mkdirSync(path.join(episodeDir, 'scenes'), { recursive: true });
    
    // Create metadata
    const metadata: EpisodeMetadata = {
      episodeNumber: nextEpisodeNumber,
      episodeContext: {
        theme: episodeContext.theme,
        arcSummary: episodeContext.arc.arcSummary,
        toneKeywords: episodeContext.arc.toneKeywords,
        motifs: episodeContext.arc.motifs,
        weather: episodeContext.weatherByLocation[episodeContext.currentLocation] || 'unknown',
        location: episodeContext.currentLocation,
        events: episodeContext.holidaysByLocation[episodeContext.currentLocation] || []
      },
      status: {
        current: 'collecting',
        lastUpdated: new Date().toISOString(),
        nextEpisodeNumber: nextEpisodeNumber + 1
      },
      sceneTracking: {
        totalScenes: 0,
        usedScenes: [],
        remainingScenes: [],
        nextSceneIndex: 0
      },
      episodeProgress: {
        startTime: new Date().toISOString(),
        duration: 480, // 8 hours in minutes
        completedScenes: 0,
        totalScenes: 24
      }
    };
    
    // Write metadata
    fs.writeFileSync(
      path.join(episodeDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    // Update symlink
    if (fs.existsSync(CURRENT_EPISODE_SYMLINK)) {
      fs.unlinkSync(CURRENT_EPISODE_SYMLINK);
    }
    fs.symlinkSync(episodeDir, CURRENT_EPISODE_SYMLINK);
    
    console.log(`Created new episode ${nextEpisodeNumber} at ${episodeDir}`);
    return episodeDir;
  } catch (error) {
    console.error('Error creating new episode:', error);
    throw error;
  }
}

function getNextEpisodeNumber(): number {
  try {
    // Read all episode directories
    const episodes = fs.readdirSync(EPISODES_DIR)
      .filter(dir => dir.startsWith('episode-'))
      .map(dir => parseInt(dir.replace('episode-', '')))
      .filter(num => !isNaN(num));
    
    // If no episodes exist, start with 1
    if (episodes.length === 0) {
      return 1;
    }
    
    // Get the highest episode number and increment
    return Math.max(...episodes) + 1;
  } catch (error) {
    console.error('Error getting next episode number:', error);
    // If there's an error, start with 1
    return 1;
  }
}

export function getNextWatercoolerScene(): PreGeneratedScene | null {
  try {
    const currentEpisodePath = getCurrentEpisodePath();
    console.log('Current episode path:', currentEpisodePath);
    
    const metadataPath = path.join(currentEpisodePath, 'metadata.json');
    console.log('Reading metadata from:', metadataPath);
    
    // Read and parse metadata
    const metadata: EpisodeMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    console.log('Current metadata:', {
      episodeNumber: metadata.episodeNumber,
      remainingScenes: metadata.sceneTracking.remainingScenes,
      nextSceneIndex: metadata.sceneTracking.nextSceneIndex
    });
    
    // Check if we have remaining scenes
    if (metadata.sceneTracking.remainingScenes.length === 0) {
      console.log('No remaining watercooler scenes in current episode');
      return null;
    }
    
    // Get next scene index
    const nextIndex = metadata.sceneTracking.nextSceneIndex;
    const scenePath = path.join(currentEpisodePath, 'scenes', `watercooler-${nextIndex}.json`);
    console.log('Reading scene from:', scenePath);
    
    // Read and parse scene
    const scene: PreGeneratedScene = JSON.parse(fs.readFileSync(scenePath, 'utf8'));
    console.log('Found scene:', {
      index: scene.index,
      type: scene.type,
      coaches: scene.coaches
    });
    
    // Update metadata
    metadata.sceneTracking.usedScenes.push(nextIndex);
    metadata.sceneTracking.remainingScenes = metadata.sceneTracking.remainingScenes.filter(i => i !== nextIndex);
    metadata.sceneTracking.nextSceneIndex = metadata.sceneTracking.remainingScenes[0] || -1;
    metadata.episodeProgress.completedScenes++;
    
    // Write updated metadata
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log('Updated metadata with used scene:', nextIndex);
    
    return scene;
  } catch (error) {
    console.error('Error getting next watercooler scene:', error);
    return null;
  }
}

export function storeScene(scene: PreGeneratedScene, episodeDir: string): void {
  try {
    const scenePath = path.join(episodeDir, 'scenes', `watercooler-${scene.index}.json`);
    fs.writeFileSync(scenePath, JSON.stringify(scene, null, 2));
    console.log(`Stored scene ${scene.index} at ${scenePath}`);
  } catch (error) {
    console.error(`Error storing scene ${scene.index}:`, error);
    throw error;
  }
} 