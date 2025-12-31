// SIX DEGREES OF WIKIPEDIA
// Can we connect two random articles in under 6 jumps?
// Using BFS to find the shortest path

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

async function getPageLinks(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=links&pllimit=500&format=json`;
  const data = await fetchJSON(url);
  const pages = data.query.pages;
  const pageId = Object.keys(pages)[0];
  const links = pages[pageId].links || [];

  // Filter out meta pages
  return links
    .map(l => l.title)
    .filter(t => !t.startsWith('Wikipedia:') && !t.startsWith('Help:') &&
                !t.startsWith('Template:') && !t.startsWith('Category:') &&
                !t.startsWith('Portal:') && !t.startsWith('File:') &&
                !t.startsWith('Talk:'));
}

async function bfs(start, end, maxDepth = 4) {
  console.log(`\n🔍 Searching for path from "${start}" to "${end}"...\n`);

  const queue = [[start]];
  const visited = new Set([start.toLowerCase()]);
  let nodesExplored = 0;

  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1];

    if (path.length > maxDepth) {
      console.log(`   Reached max depth ${maxDepth}, stopping search.`);
      return null;
    }

    nodesExplored++;
    if (nodesExplored % 10 === 0) {
      process.stdout.write(`   Explored ${nodesExplored} nodes, depth ${path.length}, queue size ${queue.length}\r`);
    }

    try {
      const links = await getPageLinks(current);

      for (const link of links) {
        if (link.toLowerCase() === end.toLowerCase()) {
          console.log(`\n\n✅ FOUND PATH in ${path.length} jumps!`);
          return [...path, link];
        }

        if (!visited.has(link.toLowerCase())) {
          visited.add(link.toLowerCase());
          queue.push([...path, link]);
        }
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 100));

    } catch (e) {
      // Skip errors, continue searching
    }
  }

  return null;
}

async function main() {
  console.log('🎲 SIX DEGREES OF WIKIPEDIA\n');
  console.log('Getting two random articles...\n');

  const start = await getRandomPage();
  const end = await getRandomPage();

  console.log(`📍 START: ${start}`);
  console.log(`🏁 END:   ${end}`);

  const startTime = Date.now();
  const path = await bfs(start, end, 4);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  if (path) {
    console.log(`\n🗺️  THE PATH (${path.length - 1} jumps, ${elapsed}s):`);
    path.forEach((stop, i) => {
      const marker = i === 0 ? '🎲' : i === path.length - 1 ? '🏁' : '→';
      console.log(`${marker} ${stop}`);
    });

    if (path.length <= 4) {
      console.log('\n🏆 UNDER 4 JUMPS! That\'s impressive.');
    } else if (path.length <= 6) {
      console.log('\n⭐ Six degrees of separation confirmed.');
    }
  } else {
    console.log(`\n❌ No path found within 4 jumps in ${elapsed}s.`);
    console.log('   These topics might be too obscure or distant.');
  }
}

main().catch(console.error);
