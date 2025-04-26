import { EpisodeContext } from '../lib/discord/episodeContext.ts';
import { generateSceneContent } from '../lib/discord/sceneFramework.ts';
import { SceneSeed } from '../lib/discord/sceneFramework.ts';

async function testWatercoolerScenes() {
  const episodeContext: EpisodeContext = {
    date: '2024-04-25',
    theme: 'Controlled Distance',
    startTime: '09:00',
    unitDurationMinutes: 15,
    dayOfWeek: 'Thursday',
    durationMinutes: 360,
    locationTimeline: Array(24).fill('09:00'),
    weatherByLocation: {
      'London': 'overcast clouds',
      'Los Angeles': 'sunny',
      'Singapore': 'rainy'
    },
    holidaysByLocation: {
      'London': ['Yom HaShoah'],
      'Los Angeles': [],
      'Singapore': []
    },
    currentLocation: 'London',
    arc: {
      theme: 'Controlled Distance',
      arcSummary: 'Exploring the tension between connection and boundaries',
      toneKeywords: ['restrained', 'ambiguous', 'tense'],
      motifs: ['distance', 'boundaries', 'control']
    }
  };

  // Test scene 1: Watercooler scene
  const scene1: SceneSeed = {
    index: 0,
    type: 'watercooler',
    location: 'London office',
    localTime: '09:00',
    weather: 'overcast clouds',
    events: ['Yom HaShoah'],
    coaches: ['alex', 'donte', 'venus'],
    coachStates: {
      alex: { emotionalTone: 'neutral', activeFlags: [], relationships: {} },
      donte: { emotionalTone: 'excited', activeFlags: [], relationships: {} },
      venus: { emotionalTone: 'analytical', activeFlags: [], relationships: {} }
    },
    isLocationTransition: false,
    introPrompt: '',
    convoPrompt: '',
    outroPrompt: ''
  };

  // Test scene 2: Newschat scene
  const scene2: SceneSeed = {
    index: 1,
    type: 'newschat',
    location: 'London office',
    localTime: '09:15',
    weather: 'overcast clouds',
    events: ['Yom HaShoah'],
    coaches: ['kailey', 'rohan'],
    coachStates: {
      kailey: { emotionalTone: 'calm', activeFlags: [], relationships: {} },
      rohan: { emotionalTone: 'determined', activeFlags: [], relationships: {} }
    },
    isLocationTransition: false,
    introPrompt: '',
    convoPrompt: '',
    outroPrompt: ''
  };

  console.log('=== Testing Scene 1 (Watercooler) ===');
  const response1 = await generateSceneContent(scene1, episodeContext);
  console.log('Scene 1 Intro:', response1.intro);

  console.log('\n=== Testing Scene 2 (NewsChat) ===');
  const response2 = await generateSceneContent(scene2, episodeContext);
  console.log('Scene 2 Intro:', response2.intro);
}

testWatercoolerScenes().catch(console.error); 