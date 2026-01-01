// HUNT FOR THE WEIRDEST RABBIT HOLE
// Run multiple times, find the most unexpected journey

async function fetchJSON(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'AmberBot/1.0 (amber@kochi.to; fun)',
      'Accept': 'application/json'
    }
  });
  return await response.json();
}

async function getRandomPage() {
  return await fetchJSON('https://en.wikipedia.org/api/rest_v1/page/random/summary');
}

async function getPageLinks(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=links&pllimit=50&format=json`;
  const data = await fetchJSON(url);
  const pages = data.query.pages;
  const pageId = Object.keys(pages)[0];
  return pages[pageId].links || [];
}

async function getPageSummary(title) {
  return await fetchJSON(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
}

function pickInterestingLink(links) {
  const dominated = ['Wikipedia:', 'Help:', 'Template:', 'Category:', 'Portal:', 'File:', 'Talk:', 'List of'];
  const interesting = links.filter(l => !dominated.some(d => l.title.startsWith(d)) && l.title.length > 3);
  if (!interesting.length) return null;
  return interesting[Math.floor(Math.random() * interesting.length)];
}

// Weirdness score: how different are the start and end?
function calculateWeirdness(start, end, jumps) {
  // Check if they share any words
  const startWords = new Set(start.toLowerCase().split(/\W+/));
  const endWords = new Set(end.toLowerCase().split(/\W+/));
  const overlap = [...startWords].filter(w => endWords.has(w) && w.length > 2).length;

  // Check character similarity
  const charSim = start.split('').filter(c => end.toLowerCase().includes(c.toLowerCase())).length / start.length;

  // Higher score = weirder (less overlap)
  const wordScore = overlap === 0 ? 100 : 100 / (overlap + 1);
  const charScore = (1 - charSim) * 50;
  const lengthBonus = jumps >= 8 ? 20 : jumps >= 5 ? 10 : 0;

  return Math.round(wordScore + charScore + lengthBonus);
}

async function runHole() {
  const journey = [];

  const start = await getRandomPage();
  let current = { title: start.title };
  journey.push(current.title);

  for (let i = 0; i < 10; i++) {
    try {
      const links = await getPageLinks(current.title);
      const next = pickInterestingLink(links);
      if (!next) break;

      try {
        const summary = await getPageSummary(next.title);
        current = { title: summary.title };
      } catch {
        current = { title: next.title };
      }
      journey.push(current.title);
      await new Promise(r => setTimeout(r, 200));
    } catch {
      break;
    }
  }

  const startTitle = journey[0];
  const endTitle = journey[journey.length - 1];
  const weirdness = calculateWeirdness(startTitle, endTitle, journey.length);

  return { journey, startTitle, endTitle, jumps: journey.length - 1, weirdness };
}

async function hunt() {
  console.log('🔍 HUNTING FOR THE WEIRDEST RABBIT HOLE\n');
  console.log('Running 5 journeys...\n');

  const results = [];

  for (let i = 1; i <= 5; i++) {
    console.log(`Journey ${i}...`);
    const result = await runHole();
    results.push(result);
    console.log(`   ${result.startTitle} → ${result.endTitle}`);
    console.log(`   Jumps: ${result.jumps}, Weirdness: ${result.weirdness}\n`);
    await new Promise(r => setTimeout(r, 500));
  }

  // Find the weirdest
  results.sort((a, b) => b.weirdness - a.weirdness);
  const winner = results[0];

  console.log('\n🏆 WEIRDEST JOURNEY:');
  console.log('====================');
  console.log(`\n${winner.startTitle} → ${winner.endTitle}`);
  console.log(`Weirdness Score: ${winner.weirdness}`);
  console.log(`\nFull path:`);
  winner.journey.forEach((stop, i) => {
    const marker = i === 0 ? '🎲' : i === winner.journey.length - 1 ? '🏁' : '→';
    console.log(`${marker} ${stop}`);
  });

  console.log(`\n📋 Share text:`);
  console.log(`---`);
  console.log(`🐇 Amber's Rabbit Hole\n`);
  console.log(`${winner.startTitle} → ${winner.endTitle}\n`);
  console.log(`${winner.jumps} jumps through Wikipedia chaos.\nWeirdness score: ${winner.weirdness}\n`);
  console.log(`Try it: kochi.to/amber/rabbithole`);
  console.log(`---`);
}

hunt().catch(console.error);
