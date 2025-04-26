// Test the intro generator function directly
const locationAndTime = {
  location: 'London office',
  localTime: '09:00'
};

const environment = {
  weather: 'overcast clouds',
  events: ['Yom HaShoah']
};

const coaches = ['alex', 'donte', 'venus'];

const episodeContext = {
  dayOfWeek: 'Thursday',
  theme: 'Controlled Distance',
  arc: {
    theme: 'Controlled Distance',
    arcSummary: 'Exploring the tension between connection and boundaries',
    toneKeywords: ['restrained', 'ambiguous', 'tense'],
    motifs: ['distance', 'boundaries', 'control']
  }
};

// Test different scene types
const sceneTypes = ['watercooler', 'newschat', 'tmzchat', 'pitchchat'];

function generateIntroPrompt(
  locationAndTime: { location: string; localTime: string },
  environment: { weather: string; events: string[] },
  coaches: string[],
  episodeContext: any,
  isWeekend: boolean = false,
  sceneType: string = 'watercooler'
): string {
  const weekdayLocation = locationAndTime.location;
  const weekendSettings = [
    'a quiet cafe', 'a shaded courtyard', 'an empty bookstore lounge', 
    'the waterfront', 'an open plaza', 'a sunlit park bench'
  ];
  const weekendLocation = weekendSettings[Math.floor(Math.random() * weekendSettings.length)];

  const effectiveLocation = isWeekend ? weekendLocation : weekdayLocation;

  const line1 = `It's ${locationAndTime.localTime} on a ${environment.weather} ${episodeContext.dayOfWeek} in ${effectiveLocation}.`;

  let line2 = '';

  if (sceneType === 'watercooler') {
    line2 = `They are gathered loosely, half-finished coffees and unfinished sentences between them.`;
  } else if (sceneType === 'newschat') {
    line2 = `They are clustered around a flickering tablet, trading glances at the morning's headlines.`;
  } else if (sceneType === 'tmzchat') {
    line2 = `They are leaning near the espresso machine, raising eyebrows at a forgotten tabloid headline.`;
  } else if (sceneType === 'pitchchat') {
    line2 = `They are seated at a long table, flipping through pitch decks with the patience of people who have already decided.`;
  }

  return `${line1}\n${line2}`;
}

// Test each scene type
console.log('=== Testing Scene Types ===');
sceneTypes.forEach(sceneType => {
  console.log(`\n${sceneType.toUpperCase()}:`);
  console.log(generateIntroPrompt(locationAndTime, environment, coaches, episodeContext, false, sceneType));
});

// Test weekend vs weekday
console.log('\n=== Testing Weekend vs Weekday ===');
console.log('\nWeekday:');
console.log(generateIntroPrompt(locationAndTime, environment, coaches, episodeContext, false, 'watercooler'));
console.log('\nWeekend:');
console.log(generateIntroPrompt(locationAndTime, environment, coaches, episodeContext, true, 'watercooler')); 