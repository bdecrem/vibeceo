const fs = require('fs');

// Read papers data
const data = JSON.parse(fs.readFileSync('/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot/data/arxiv-reports/arxiv_papers_combined_2025-10-28.json', 'utf8'));

// Notable researchers from graph context
const notableAuthors = {
  'Yong Jiang': { papers_today: 5, reason: 'Most productive researcher today' },
  'Xinyu Wang': { papers_today: 4, reason: 'Highly productive researcher' },
  'Jingren Zhou': { papers_today: 4, reason: 'Highly productive researcher' },
  'Pengjun Xie': { papers_today: 4, reason: 'Highly productive researcher' },
  'Jialong Wu': { papers_today: 3, reason: 'Productive researcher' },
  'Yu Wang': { papers_today: 0, reason: 'Rising star - 9.5x acceleration' },
  'Junyang Lin': { papers_today: 0, reason: 'Rising star - 9.0x acceleration, Shenzhen Tech' },
  'Junchi Yan': { papers_today: 0, reason: 'Rising star - 8.0x acceleration, Shanghai Jiao Tong' }
};

// Trending categories from graph
const trendingCategories = ['cs.IT', 'math.IT', 'cs.NA', 'math.NA', 'cs.LO'];

console.log(`\n=== PAPER ANALYSIS FOR 2025-10-28 ===`);
console.log(`Total papers: ${data.total_papers}`);
console.log(`Categories tracked: ${data.categories.join(', ')}\n`);

// Find papers by notable authors
console.log('=== PAPERS BY NOTABLE AUTHORS ===');
const papersByNotableAuthors = [];
data.papers.forEach(paper => {
  paper.authors.forEach(author => {
    if (notableAuthors[author.name]) {
      papersByNotableAuthors.push({
        title: paper.title,
        arxiv_id: paper.arxiv_id,
        author: author.name,
        categories: paper.categories,
        author_notability_score: paper.author_notability_score,
        abstract: paper.abstract
      });
    }
  });
});

console.log(`Found ${papersByNotableAuthors.length} papers by notable authors:\n`);
papersByNotableAuthors.forEach(p => {
  console.log(`[${p.author}] ${p.title}`);
  console.log(`  ID: ${p.arxiv_id}`);
  console.log(`  Categories: ${p.categories.join(', ')}`);
  console.log(`  Notability: ${p.author_notability_score}`);
  console.log('');
});

// Score papers based on criteria
console.log('\n=== TOP SCORING PAPERS ===');
const scoredPapers = data.papers.map(paper => {
  let score = 0;
  let reasoning = [];

  // Author notability (0-20 points)
  const hasNotableAuthor = paper.authors.some(a => notableAuthors[a.name]);
  if (hasNotableAuthor) {
    score += 20;
    const notableAuthorNames = paper.authors.filter(a => notableAuthors[a.name]).map(a => a.name);
    reasoning.push(`Notable author(s): ${notableAuthorNames.join(', ')}`);
  }
  score += Math.min(paper.author_notability_score || 0, 10);

  // Trending category (0-10 points)
  const hasTrendingCategory = paper.categories.some(cat => trendingCategories.includes(cat));
  if (hasTrendingCategory) {
    score += 10;
    reasoning.push('In trending research area');
  }

  // Title quality indicators (0-15 points)
  const titleLower = paper.title.toLowerCase();
  const noveltyKeywords = ['novel', 'new', 'first', 'breakthrough', 'unified', 'general'];
  const impactKeywords = ['efficient', 'scalable', 'practical', 'real-world', 'benchmark', 'sota', 'state-of-the-art'];
  const technicalKeywords = ['learning', 'optimization', 'framework', 'model', 'algorithm', 'system'];

  if (noveltyKeywords.some(kw => titleLower.includes(kw))) {
    score += 5;
    reasoning.push('Novel approach indicated');
  }
  if (impactKeywords.some(kw => titleLower.includes(kw))) {
    score += 5;
    reasoning.push('High impact potential');
  }
  if (technicalKeywords.some(kw => titleLower.includes(kw))) {
    score += 5;
  }

  // Abstract quality indicators (0-15 points)
  const abstractLower = paper.abstract.toLowerCase();
  if (abstractLower.includes('we propose') || abstractLower.includes('we introduce')) {
    score += 5;
  }
  if (abstractLower.includes('experiment') || abstractLower.includes('evaluation') || abstractLower.includes('benchmark')) {
    score += 5;
    reasoning.push('Strong experimental validation');
  }
  if (abstractLower.includes('outperform') || abstractLower.includes('superior') || abstractLower.includes('better than')) {
    score += 5;
    reasoning.push('Claims performance improvements');
  }

  // Hot topics (0-10 points)
  const hotTopics = ['llm', 'large language model', 'diffusion', 'transformer', 'multimodal', 'reinforcement learning', 'vision', 'robotics'];
  if (hotTopics.some(topic => titleLower.includes(topic) || abstractLower.includes(topic))) {
    score += 10;
    reasoning.push('Hot research topic');
  }

  return {
    ...paper,
    curation_score: score,
    reasoning: reasoning
  };
});

// Sort by score
scoredPapers.sort((a, b) => b.curation_score - a.curation_score);

// Print top 20
console.log('\nTop 20 papers by curation score:\n');
scoredPapers.slice(0, 20).forEach((paper, idx) => {
  console.log(`${idx + 1}. [Score: ${paper.curation_score}] ${paper.title}`);
  console.log(`   ID: ${paper.arxiv_id}`);
  console.log(`   Categories: ${paper.categories.join(', ')}`);
  console.log(`   Authors: ${paper.authors.slice(0, 3).map(a => a.name).join(', ')}${paper.authors.length > 3 ? ' et al.' : ''}`);
  console.log(`   Reasoning: ${paper.reasoning.join('; ')}`);
  console.log('');
});

// Category distribution
console.log('\n=== CATEGORY DISTRIBUTION ===');
const categoryCount = {};
data.papers.forEach(paper => {
  paper.categories.forEach(cat => {
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });
});
const sortedCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]);
console.log('Top 15 categories:');
sortedCategories.slice(0, 15).forEach(([cat, count]) => {
  const trending = trendingCategories.includes(cat) ? ' 🔥 TRENDING' : '';
  console.log(`  ${cat}: ${count} papers${trending}`);
});

// Save top papers for review
fs.writeFileSync(
  '/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot/data/arxiv-reports/top_papers_analysis_2025-10-28.json',
  JSON.stringify({
    analysis_date: '2025-10-28',
    total_papers: data.total_papers,
    top_papers: scoredPapers.slice(0, 30),
    papers_by_notable_authors: papersByNotableAuthors,
    category_distribution: sortedCategories
  }, null, 2)
);

console.log('\n✓ Detailed analysis saved to top_papers_analysis_2025-10-28.json');
