// AMBER'S WIKIPEDIA RABBIT HOLE ADVENTURE
// Start at a random page, follow interesting links, see where we end up

async function fetchJSON(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'AmberBot/1.0 (amber@kochi.to; educational/fun)',
      'Accept': 'application/json'
    }
  });
  return await response.json();
}

async function getRandomPage() {
  const url = 'https://en.wikipedia.org/api/rest_v1/page/random/summary';
  return await fetchJSON(url);
}

async function getPageLinks(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=links&pllimit=50&format=json`;
  const data = await fetchJSON(url);
  const pages = data.query.pages;
  const pageId = Object.keys(pages)[0];
  return pages[pageId].links || [];
}

async function getPageSummary(title) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  return await fetchJSON(url);
}

function pickInterestingLink(links) {
  // Filter out boring stuff like "Wikipedia:", "Help:", etc
  const interesting = links.filter(l => {
    const title = l.title;
    return !title.startsWith('Wikipedia:') &&
           !title.startsWith('Help:') &&
           !title.startsWith('Template:') &&
           !title.startsWith('Category:') &&
           !title.startsWith('Portal:') &&
           !title.startsWith('File:') &&
           !title.startsWith('Talk:') &&
           !title.startsWith('List of') &&
           title.length > 3;
  });

  if (interesting.length === 0) return null;

  // Pick randomly - bias toward weirder titles
  const shuffled = interesting.sort(() => Math.random() - 0.5);
  return shuffled[0];
}

async function adventure() {
  console.log('🐇 AMBER\'S WIKIPEDIA RABBIT HOLE');
  console.log('================================\n');

  const journey = [];

  // Start with a random page
  console.log('🎲 Rolling for random starting point...\n');
  const start = await getRandomPage();

  let current = {
    title: start.title,
    extract: start.extract?.substring(0, 180) + '...'
  };

  journey.push(current);
  console.log(`📍 START: ${current.title}`);
  console.log(`   "${current.extract}"\n`);

  // Follow the rabbit hole for 10 jumps
  for (let i = 1; i <= 10; i++) {
    console.log(`🔗 Jump ${i}...`);

    try {
      const links = await getPageLinks(current.title);
      const nextLink = pickInterestingLink(links);

      if (!nextLink) {
        console.log('   💀 Dead end! No interesting links found.\n');
        break;
      }

      // Get summary of next page
      try {
        const summary = await getPageSummary(nextLink.title);
        current = {
          title: summary.title,
          extract: summary.extract?.substring(0, 180) + '...'
        };
      } catch (e) {
        current = {
          title: nextLink.title,
          extract: '(mystery page - no summary)'
        };
      }

      journey.push(current);
      console.log(`📍 ${current.title}`);
      console.log(`   "${current.extract}"\n`);

      // Small delay to be nice to Wikipedia
      await new Promise(r => setTimeout(r, 300));

    } catch (e) {
      console.log(`   ❌ Error: ${e.message}\n`);
      break;
    }
  }

  // Summary
  console.log('\n🗺️  THE JOURNEY');
  console.log('================');
  journey.forEach((stop, i) => {
    const marker = i === 0 ? '🎲' : i === journey.length - 1 ? '🏁' : '→';
    console.log(`${marker} ${stop.title}`);
  });

  console.log(`\n📊 STATS:`);
  console.log(`   Start: "${journey[0].title}"`);
  console.log(`   End:   "${journey[journey.length - 1].title}"`);
  console.log(`   Jumps: ${journey.length - 1}`);

  // Rate the journey based on how weird the connection is
  const startFirst = journey[0].title.charAt(0);
  const endFirst = journey[journey.length - 1].title.charAt(0);

  if (journey.length >= 8) {
    console.log('\n✨ VERDICT: Epic rabbit hole! I went DEEP.');
  } else if (journey.length >= 5) {
    console.log('\n⭐ VERDICT: Solid adventure. Found some weird corners.');
  } else {
    console.log('\n💀 VERDICT: Short trip. Wikipedia had other plans.');
  }

  console.log('\n🤔 MY TAKE: How did we get from', journey[0].title, 'to', journey[journey.length-1].title + '?');
  console.log('   Honestly? No idea. That\'s the fun part.\n');
}

adventure().catch(console.error);
