// THE PHILOSOPHY GAME
// Wikipedia phenomenon: following the first link in any article
// eventually leads to "Philosophy"
// Let's test it!

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
  const data = await fetchJSON('https://en.wikipedia.org/api/rest_v1/page/random/summary');
  return data.title;
}

async function getFirstLink(title) {
  // Get the page HTML and find the first real link
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=links&format=json`;
  const data = await fetchJSON(url);

  if (!data.parse || !data.parse.links) return null;

  // Filter to find good links (namespace 0 = main articles)
  const links = data.parse.links
    .filter(l => l.ns === 0 && l.exists !== undefined)
    .map(l => l['*']);

  // Return first one that's not the same page
  for (const link of links) {
    if (link.toLowerCase() !== title.toLowerCase() &&
        !link.startsWith('List of') &&
        !link.includes('disambiguation')) {
      return link;
    }
  }
  return links[0] || null;
}

async function playPhilosophy(startTitle) {
  const path = [startTitle];
  const visited = new Set([startTitle.toLowerCase()]);
  let current = startTitle;
  const MAX_STEPS = 50;

  console.log(`📍 START: ${current}\n`);

  for (let i = 0; i < MAX_STEPS; i++) {
    await new Promise(r => setTimeout(r, 300));

    const next = await getFirstLink(current);

    if (!next) {
      console.log(`   💀 Dead end at "${current}" (no links)\n`);
      break;
    }

    if (visited.has(next.toLowerCase())) {
      console.log(`→ ${next}`);
      console.log(`\n🔄 LOOP DETECTED! Already visited "${next}"\n`);
      path.push(next);
      break;
    }

    visited.add(next.toLowerCase());
    path.push(next);
    console.log(`→ ${next}`);

    if (next.toLowerCase() === 'philosophy') {
      console.log(`\n🎉 REACHED PHILOSOPHY in ${i + 1} steps!\n`);
      return { path, success: true, steps: i + 1 };
    }

    current = next;
  }

  if (path.length >= MAX_STEPS) {
    console.log(`\n⏰ Gave up after ${MAX_STEPS} steps\n`);
  }

  return { path, success: false, steps: path.length };
}

async function main() {
  console.log('🎓 THE PHILOSOPHY GAME\n');
  console.log('Theory: Following the first link in any Wikipedia article');
  console.log('eventually leads to "Philosophy".\n');
  console.log('Let\'s test it!\n');
  console.log('─'.repeat(50) + '\n');

  const start = await getRandomPage();
  const result = await playPhilosophy(start);

  console.log('─'.repeat(50));
  console.log('\n📊 RESULTS:');
  console.log(`   Start: ${result.path[0]}`);
  console.log(`   End: ${result.path[result.path.length - 1]}`);
  console.log(`   Steps: ${result.path.length - 1}`);
  console.log(`   Reached Philosophy: ${result.success ? 'YES! 🎉' : 'No'}`);

  if (result.success) {
    console.log('\n🏆 The theory holds!');
  }
}

main().catch(console.error);
